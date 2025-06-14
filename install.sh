#!/bin/bash

# Instalador PII Detector para VPS Ubuntu/Debian
# Execute: sudo ./install.sh

set -e

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo $0"
    exit 1
fi

echo "=== Instalação PII Detector ==="
echo ""

# Atualizar sistema
echo "Atualizando sistema..."
apt update && apt upgrade -y

# Instalar dependências básicas
echo "Instalando dependências..."
apt install -y curl wget git build-essential software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release unzip \
    htop tree ufw fail2ban openssl

# Instalar PostgreSQL
echo "Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Instalar Redis
echo "Instalando Redis..."
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server

# Instalar Node.js 20
echo "Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar ferramentas globais
echo "Instalando ferramentas Node.js..."
npm install -g pm2 tsx typescript

# Instalar Python e ambiente virtual
echo "Configurando Python..."
apt install -y python3 python3-venv python3-dev python3-pip python3-full pipx

# Criar usuário piidetector
echo "Criando usuário do sistema..."
if ! id "piidetector" &>/dev/null; then
    useradd -m -s /bin/bash piidetector
    usermod -aG sudo piidetector
fi

# Criar estrutura de diretórios
echo "Criando diretórios..."
sudo -u piidetector mkdir -p /home/piidetector/{pii-detector,config,uploads,logs,backups}
sudo -u piidetector mkdir -p /home/piidetector/uploads/{sftp,completed,quarantine}

# Criar ambiente virtual Python
echo "Configurando ambiente Python..."
sudo -u piidetector python3 -m venv /home/piidetector/venv
sudo -u piidetector /home/piidetector/venv/bin/pip install --upgrade pip
sudo -u piidetector /home/piidetector/venv/bin/pip install datafog openpyxl pypdf2 python-docx regex

# Configurar PostgreSQL
echo "Configurando banco de dados..."
PGPASS=$(openssl rand -base64 16)
sudo -u postgres psql -c "CREATE USER piidetector WITH PASSWORD '$PGPASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE pii_detector OWNER piidetector;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pii_detector TO piidetector;" 2>/dev/null || true

# Configurar Redis
REDIS_PASS=$(openssl rand -base64 16)
echo "requirepass $REDIS_PASS" >> /etc/redis/redis.conf
systemctl restart redis-server

# Criar arquivo de configuração
echo "Criando configuração..."
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

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=$REDIS_PASS

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

# SFTP
ENABLE_SFTP_MONITORING=true
SFTP_WATCH_DIR=/home/piidetector/uploads/sftp

# Logging
LOG_LEVEL=info
LOG_DIR=/home/piidetector/logs

# Python Environment
PYTHON_PATH=/home/piidetector/venv/bin/python3
EOF

chown piidetector:piidetector /home/piidetector/config/.env
chmod 600 /home/piidetector/config/.env

# Baixar código da aplicação
echo "Baixando aplicação..."
sudo -u piidetector bash << 'EOF'
cd /home/piidetector/pii-detector
git clone https://github.com/resper1965/DataFogScanner.git . 2>/dev/null || {
    git init
    git remote add origin https://github.com/resper1965/DataFogScanner.git
    git pull origin main
}

# Instalar dependências
npm install

# Executar migrações
npm run db:push

# Criar configuração PM2
cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'pii-detector',
    script: 'server/index.ts',
    interpreter: 'tsx',
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
    env_file: '/home/piidetector/config/.env',
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
EOFPM2

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u piidetector --hp /home/piidetector
EOF

# Instalar Nginx
echo "Configurando Nginx..."
apt install -y nginx

cat > /etc/nginx/sites-available/pii-detector << 'EOF'
server {
    listen 80 default_server;
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
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pii-detector /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# Configurar firewall
echo "Configurando segurança..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Criar script de status
cat > /home/piidetector/check-status.sh << 'EOF'
#!/bin/bash
echo "=== Status do Sistema ==="
echo "PostgreSQL: $(systemctl is-active postgresql)"
echo "Redis: $(systemctl is-active redis-server)"
echo "Nginx: $(systemctl is-active nginx)"
echo ""
echo "Aplicação:"
pm2 list | grep pii-detector
echo ""
echo "Conectividade:"
curl -s http://localhost:5000/api/health > /dev/null && echo "Backend: OK" || echo "Backend: ERRO"
EOF

chmod +x /home/piidetector/check-status.sh
chown piidetector:piidetector /home/piidetector/check-status.sh

echo ""
echo "=== Instalação Concluída ==="
echo ""
echo "Aplicação: http://$(hostname -I | awk '{print $1}')"
echo "Logs: tail -f /home/piidetector/logs/app.log"
echo "Status: su - piidetector && ./check-status.sh"
echo ""
echo "Para configurar SSL:"
echo "  apt install certbot python3-certbot-nginx"
echo "  certbot --nginx -d seu-dominio.com"