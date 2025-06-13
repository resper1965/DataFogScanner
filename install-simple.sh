#!/bin/bash

# Script de Instalação Simplificado - PII Detector
# Para quando o script principal falha

set -e

echo "🚀 Instalação Simplificada PII Detector"
echo "================================="

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Execute como root: sudo $0"
    exit 1
fi

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar dependências básicas
echo "📦 Instalando dependências..."
apt install -y curl wget git build-essential nginx redis-server \
    postgresql postgresql-contrib python3 python3-pip python3-venv \
    ufw fail2ban htop nano

# Criar usuário
echo "👤 Criando usuário piidetector..."
if ! id "piidetector" >/dev/null 2>&1; then
    useradd -m -s /bin/bash -G sudo,www-data piidetector
    echo "piidetector:$(openssl rand -base64 12)" | chpasswd
fi

# Criar estrutura
echo "📁 Criando estrutura de diretórios..."
sudo -u piidetector bash << 'EOF'
cd /home/piidetector
mkdir -p {config,logs,uploads,backups,scripts,pii-detector}
mkdir -p uploads/{pending,processing,completed,quarantine,sftp}
chmod 755 uploads uploads/*
chmod 750 config
chmod 755 logs
EOF

# Configurar PostgreSQL
echo "🗄️ Configurando PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

PGPASS=$(openssl rand -base64 16)
sudo -u postgres psql << EOF
CREATE USER piidetector WITH PASSWORD '$PGPASS';
CREATE DATABASE pii_detector OWNER piidetector;
GRANT ALL PRIVILEGES ON DATABASE pii_detector TO piidetector;
ALTER USER piidetector CREATEDB;
EOF

# Configurar Redis
echo "🔴 Configurando Redis..."
systemctl enable redis-server
systemctl start redis-server

# Instalar Node.js
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# Instalar Python packages
echo "🐍 Instalando packages Python..."
pip3 install --break-system-packages datafog openpyxl pypdf2 python-docx regex || \
pip3 install datafog openpyxl pypdf2 python-docx regex

# Configurar Nginx
echo "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/pii-detector << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pii-detector /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Configurar firewall
echo "🔒 Configurando segurança..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Criar configuração da aplicação
echo "⚙️ Criando configuração..."
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

cat > /home/piidetector/config/.env << EOF
# Database
DATABASE_URL=postgresql://piidetector:$PGPASS@localhost:5432/pii_detector
PGUSER=piidetector
PGPASSWORD=$PGPASS
PGDATABASE=pii_detector
PGHOST=localhost
PGPORT=5432

# Application
NODE_ENV=production
PORT=5000
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET

# Upload Configuration
UPLOAD_DIR=/home/piidetector/uploads
MAX_FILE_SIZE=104857600
ALLOWED_EXTENSIONS=pdf,doc,docx,xls,xlsx,txt,csv,xml,zip

# Processing
MAX_CONCURRENT_JOBS=4
PROCESSING_TIMEOUT=300000

# Security
ENABLE_MALWARE_SCAN=false
QUARANTINE_SUSPICIOUS_FILES=true

# AI/ML (configure se tiver OpenAI API)
# OPENAI_API_KEY=sk-seu-key-aqui
ENABLE_SEMANTIC_ANALYSIS=false

# SFTP
ENABLE_SFTP_MONITORING=true
SFTP_WATCH_DIR=/home/piidetector/uploads/sftp

# Logging
LOG_LEVEL=info
LOG_DIR=/home/piidetector/logs
EOF

chown piidetector:piidetector /home/piidetector/config/.env
chmod 600 /home/piidetector/config/.env

# Clonar aplicação
echo "📥 Baixando código da aplicação..."
sudo -u piidetector bash << 'EOF'
cd /home/piidetector/pii-detector
git clone https://github.com/resper1965/DataFogScanner.git .

if [ -f "package.json" ]; then
    echo "📦 Instalando dependências Node.js..."
    npm install --production
    
    echo "🗄️ Configurando banco de dados..."
    npm run db:push
    
    # Criar configuração PM2
    cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'pii-detector',
    script: 'server/index.js',
    cwd: '/home/piidetector/pii-detector',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: '/home/piidetector/logs/app.log',
    error_file: '/home/piidetector/logs/error.log',
    out_file: '/home/piidetector/logs/out.log',
    env_file: '/home/piidetector/config/.env'
  }]
};
EOFPM2
    
    echo "🚀 Iniciando aplicação..."
    pm2 start ecosystem.config.js
    pm2 save
    
    echo "✅ Aplicação iniciada!"
else
    echo "❌ Erro ao baixar código"
fi
EOF

# Criar scripts utilitários
cat > /home/piidetector/check-system.sh << 'EOF'
#!/bin/bash
echo "=== STATUS DO SISTEMA ==="
echo "PostgreSQL: $(systemctl is-active postgresql)"
echo "Redis: $(systemctl is-active redis-server)"
echo "Nginx: $(systemctl is-active nginx)"
echo "PM2: $(pm2 list | grep pii-detector | awk '{print $12}')"
echo ""
echo "Conectividade:"
pg_isready -h localhost -p 5432 -U piidetector && echo "✅ PostgreSQL OK" || echo "❌ PostgreSQL ERRO"
curl -s http://localhost:5000/health > /dev/null && echo "✅ App OK" || echo "⚠️ App não responde"
echo ""
echo "Espaço: $(df -h /home/piidetector | tail -1 | awk '{print $4}') livre"
EOF

chmod +x /home/piidetector/check-system.sh
chown piidetector:piidetector /home/piidetector/check-system.sh

echo ""
echo "✅ INSTALAÇÃO CONCLUÍDA!"
echo "========================"
echo "🌐 Acesso: http://$(hostname -I | awk '{print $1}')"
echo "📁 Diretório: /home/piidetector"
echo "📝 Config: /home/piidetector/config/.env"
echo ""
echo "🔧 Comandos úteis:"
echo "  su - piidetector && ./check-system.sh"
echo "  pm2 logs pii-detector"
echo "  pm2 restart pii-detector"
echo ""
echo "Para configurar OpenAI API:"
echo "  nano /home/piidetector/config/.env"
echo "  # Adicionar: OPENAI_API_KEY=sk-sua-chave"
echo "  pm2 restart pii-detector"