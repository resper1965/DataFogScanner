#!/bin/bash

# Script para continuar a instalação a partir do ponto onde parou
# Execute este script para completar a instalação

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

echo -e "${BLUE}Continuando instalação PII Detector...${NC}"
echo ""

# Pular instalação de Python 3.11 e usar o Python 3.12 já instalado
log "Configurando Python com ambiente virtual..."

# Instalar pipx e dependências
apt install -y pipx python3-full

# Criar ambiente virtual para piidetector
log "Criando ambiente virtual Python..."
sudo -u piidetector python3 -m venv /home/piidetector/venv

# Instalar pacotes Python no ambiente virtual
log "Instalando DataFog e dependências..."
sudo -u piidetector /home/piidetector/venv/bin/pip install --upgrade pip
sudo -u piidetector /home/piidetector/venv/bin/pip install datafog openpyxl pypdf2 python-docx regex

# Continuar com Nginx
log "Instalando e configurando Nginx..."
apt install -y nginx

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

# Configurar segurança
log "Configurando segurança..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable fail2ban
systemctl start fail2ban

# Instalar SSL
log "Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx

# Criar script SSL
mkdir -p /home/piidetector/scripts
cat > /home/piidetector/scripts/setup-ssl.sh << 'EOF'
#!/bin/bash

DOMAIN="$1"
EMAIL="$2"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Uso: $0 <dominio> <email>"
    echo "Exemplo: $0 monster.e-ness.com.br admin@e-ness.com.br"
    exit 1
fi

echo "Configurando SSL para $DOMAIN..."

sudo sed -i "s/server_name _;/server_name $DOMAIN;/" /etc/nginx/sites-available/pii-detector
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    sudo certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --non-interactive
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL configurado com sucesso para $DOMAIN"
        echo "🌐 Acesse: https://$DOMAIN"
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        echo "🔄 Renovação automática configurada"
    else
        echo "❌ Erro ao obter certificado SSL"
    fi
else
    echo "❌ Erro na configuração do Nginx"
fi
EOF

chmod +x /home/piidetector/scripts/setup-ssl.sh
chown piidetector:piidetector /home/piidetector/scripts/setup-ssl.sh

# Criar configuração da aplicação
log "Criando configuração da aplicação..."

# Obter senhas geradas anteriormente ou criar novas
if [ -f "/home/piidetector/config/.env.generated" ]; then
    source /home/piidetector/config/.env.generated
else
    PGPASS=$(openssl rand -base64 16)
    REDIS_PASS=$(openssl rand -base64 16)
    echo "PGPASSWORD=$PGPASS" > /home/piidetector/config/.env.generated
    echo "REDIS_PASSWORD=$REDIS_PASS" >> /home/piidetector/config/.env.generated
fi

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
QUEUE_RETRY_ATTEMPTS=3

# Security
ENABLE_MALWARE_SCAN=false
QUARANTINE_SUSPICIOUS_FILES=true

# AI/ML (opcional)
# OPENAI_API_KEY=sk-seu-key-aqui
ENABLE_SEMANTIC_ANALYSIS=false
AI_CONFIDENCE_THRESHOLD=0.7

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

# Baixar e configurar aplicação
log "Baixando código da aplicação..."

sudo -u piidetector bash << 'EOF'
cd /home/piidetector/pii-detector

if [ ! -f "package.json" ]; then
    echo "📥 Baixando código da aplicação..."
    git clone https://github.com/resper1965/DataFogScanner.git .
    
    if [ -f "package.json" ]; then
        echo "✅ Código baixado com sucesso"
        
        echo "📦 Instalando dependências..."
        npm install --production
        
        echo "🗄️ Configurando banco de dados..."
        npm run db:push
        
    else
        echo "❌ Erro ao baixar código da aplicação"
        exit 1
    fi
else
    echo "✅ Código da aplicação já existe"
fi

# Criar configuração PM2
cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'pii-detector',
    script: 'server/index.js',
    cwd: '/home/piidetector/pii-detector',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: '/home/piidetector/logs/app.log',
    error_file: '/home/piidetector/logs/error.log',
    out_file: '/home/piidetector/logs/out.log',
    env_file: '/home/piidetector/config/.env',
    max_restarts: 10,
    min_uptime: '30s',
    max_memory_restart: '1G'
  }]
};
EOFPM2

EOF

# Criar scripts utilitários
log "Criando scripts utilitários..."

cat > /home/piidetector/check-system.sh << 'EOF'
#!/bin/bash
echo "=== VERIFICAÇÃO DO SISTEMA ==="
echo "Data: $(date)"
echo ""

echo "Serviços:"
systemctl is-active postgresql && echo "✅ PostgreSQL" || echo "❌ PostgreSQL"
systemctl is-active redis-server && echo "✅ Redis" || echo "❌ Redis"
systemctl is-active nginx && echo "✅ Nginx" || echo "❌ Nginx"

echo ""
echo "Conectividade:"
pg_isready -h localhost -p 5432 -U piidetector && echo "✅ PostgreSQL conectado" || echo "❌ PostgreSQL desconectado"
redis-cli ping > /dev/null 2>&1 && echo "✅ Redis conectado" || echo "❌ Redis desconectado"

echo ""
echo "Aplicação:"
pm2 list | grep -q "pii-detector" && echo "✅ PM2 rodando" || echo "⚠️ PM2 não iniciado"
curl -s http://localhost:5000/health > /dev/null && echo "✅ App respondendo" || echo "⚠️ App não responde"

echo ""
echo "Espaço em disco:"
df -h /home/piidetector | tail -1
EOF

cat > /home/piidetector/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/piidetector/backups/daily"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Iniciando backup..."

pg_dump -h localhost -U piidetector -d pii_detector --format=custom > "$BACKUP_DIR/db_$DATE.dump"
cp /home/piidetector/config/.env "$BACKUP_DIR/env_$DATE.backup"

find "$BACKUP_DIR" -name "*.dump" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.backup" -mtime +7 -delete

echo "Backup concluído: $DATE"
EOF

chmod +x /home/piidetector/check-system.sh
chmod +x /home/piidetector/backup.sh
chown piidetector:piidetector /home/piidetector/*.sh

# Iniciar aplicação
log "Iniciando aplicação..."

sudo -u piidetector bash << 'EOF'
cd /home/piidetector/pii-detector

if [ -f "package.json" ]; then
    echo "🚀 Iniciando aplicação com PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Aplicação iniciada"
else
    echo "⚠️ Aplicação não pode ser iniciada - código não encontrado"
fi
EOF

echo ""
echo -e "${GREEN}================================================================="
echo "✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo -e "=================================================================${NC}"
echo ""
echo -e "${BLUE}📋 Sistema instalado:${NC}"
echo "  • Aplicação: PII Detector n.CrisisOps"
echo "  • Usuário: piidetector"
echo "  • Diretório: /home/piidetector"
echo "  • Repositório: https://github.com/resper1965/DataFogScanner.git"
echo ""
echo -e "${GREEN}🌐 Acessos:${NC}"
echo "  • Web: http://$(hostname -I | awk '{print $1}')"
echo "  • Configuração: /home/piidetector/config/.env"
echo "  • Logs: /home/piidetector/logs/"
echo ""
echo -e "${YELLOW}🔧 Comandos úteis:${NC}"
echo "  • Verificar: su - piidetector && ./check-system.sh"
echo "  • Backup: su - piidetector && ./backup.sh"
echo "  • Logs: tail -f /home/piidetector/logs/app.log"
echo "  • PM2: pm2 list, pm2 restart pii-detector"
echo ""
echo -e "${BLUE}📝 Configurações opcionais:${NC}"
echo ""
echo -e "${YELLOW}🔒 Para configurar SSL (HTTPS):${NC}"
echo "  su - piidetector"
echo "  ./scripts/setup-ssl.sh monster.e-ness.com.br admin@e-ness.com.br"
echo ""
echo -e "${YELLOW}🤖 Para configurar OpenAI API:${NC}"
echo "  nano /home/piidetector/config/.env"
echo "  # Adicionar: OPENAI_API_KEY=sk-sua-chave"
echo "  # Alterar: ENABLE_SEMANTIC_ANALYSIS=true"
echo "  pm2 restart pii-detector"