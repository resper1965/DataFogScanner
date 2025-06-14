#!/bin/bash

# Instalador completo para Sistema de Detecção PII Brasileiro
# VPS: 62.72.8.164 | Domínio: monster.e-ness.com.br
# Execute como root: sudo ./install.sh

set -e

DOMAIN="monster.e-ness.com.br"
USER="piidetector"
APP_DIR="/home/$USER/pii-detector"

# Função para log colorido
log_info() { echo -e "\033[32m[INFO]\033[0m $1"; }
log_warn() { echo -e "\033[33m[WARN]\033[0m $1"; }
log_error() { echo -e "\033[31m[ERROR]\033[0m $1"; }

# Verificar root
if [ "$EUID" -ne 0 ]; then
    log_error "Execute como root: sudo $0"
    exit 1
fi

echo "=========================================="
echo "     SISTEMA DE DETECÇÃO PII BRASILEIRO  "
echo "=========================================="
echo "Domínio: $DOMAIN"
echo "VPS: 62.72.8.164"
echo "Repositório: https://github.com/resper1965/DataFogScanner.git"
echo ""

# 1. Atualizar sistema
log_info "Atualizando sistema..."
apt update -qq && apt upgrade -y

# 2. Instalar dependências básicas
log_info "Instalando dependências do sistema..."
apt install -y curl wget git build-essential software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release unzip \
    htop tree ufw fail2ban openssl postgresql postgresql-contrib \
    redis-server nginx python3 python3-venv python3-dev python3-pip

# 3. Verificar e criar usuário
if ! id $USER &>/dev/null; then
    log_info "Criando usuário $USER..."
    useradd -m -s /bin/bash $USER
    usermod -aG sudo $USER
fi

# 4. Criar estrutura completa de diretórios
log_info "Criando estrutura de diretórios..."
sudo -u $USER mkdir -p /home/$USER/{pii-detector,config,logs,backups}
sudo -u $USER mkdir -p /home/$USER/uploads/{sftp/{incoming,processing,processed},completed,quarantine}

# 5. Instalar Node.js 20
if ! command -v node &>/dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    log_info "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# 6. Instalar ferramentas globais Node.js
log_info "Instalando ferramentas globais..."
rm -rf /usr/lib/node_modules/{pm2,tsx,typescript} 2>/dev/null || true
npm install -g pm2 tsx typescript --force

# 7. Configurar PostgreSQL
if ! sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='$USER';" | grep -q 1; then
    log_info "Configurando PostgreSQL..."
    PGPASS=$(openssl rand -base64 16)
    sudo -u postgres psql -c "CREATE USER $USER WITH PASSWORD '$PGPASS';"
    sudo -u postgres psql -c "CREATE DATABASE pii_detector OWNER $USER;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pii_detector TO $USER;"
    systemctl enable postgresql
    systemctl start postgresql
else
    PGPASS=$(grep PGPASSWORD /home/$USER/config/.env 2>/dev/null | cut -d'=' -f2 || openssl rand -base64 16)
fi

# 8. Configurar Redis
log_info "Configurando Redis..."
if ! grep -q "requirepass" /etc/redis/redis.conf; then
    REDIS_PASS=$(openssl rand -base64 16)
    echo "requirepass $REDIS_PASS" >> /etc/redis/redis.conf
    systemctl restart redis-server
else
    REDIS_PASS=$(grep REDIS_PASSWORD /home/$USER/config/.env 2>/dev/null | cut -d'=' -f2 || openssl rand -base64 16)
fi
systemctl enable redis-server

# 9. Baixar/atualizar código da aplicação
log_info "Configurando código da aplicação..."
cd $APP_DIR
if [ ! -d ".git" ]; then
    sudo -u $USER git clone https://github.com/resper1965/DataFogScanner.git .
else
    sudo -u $USER git pull origin main
fi

# 10. Criar arquivo .env completo
log_info "Criando configuração da aplicação..."
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

sudo -u $USER cat > /home/$USER/config/.env << EOF
DATABASE_URL=postgresql://$USER:$PGPASS@localhost:5432/pii_detector
PGUSER=$USER
PGPASSWORD=$PGPASS
PGDATABASE=pii_detector
PGHOST=localhost
PGPORT=5432
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=$REDIS_PASS
NODE_ENV=production
PORT=5000
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET
UPLOAD_DIR=/home/$USER/uploads
MAX_FILE_SIZE=104857600
ALLOWED_EXTENSIONS=pdf,doc,docx,xls,xlsx,txt,csv,xml,zip
MAX_CONCURRENT_JOBS=4
PROCESSING_TIMEOUT=300000
ENABLE_MALWARE_SCAN=false
QUARANTINE_SUSPICIOUS_FILES=true
ENABLE_SFTP_MONITORING=true
SFTP_WATCH_DIR=/home/$USER/uploads/sftp
LOG_LEVEL=info
LOG_DIR=/home/$USER/logs
PYTHON_PATH=/home/$USER/venv/bin/python3
EOF

chmod 600 /home/$USER/config/.env
chown $USER:$USER /home/$USER/config/.env

# 11. Configurar ambiente Python
log_info "Configurando ambiente Python..."
if [ ! -d "/home/$USER/venv" ]; then
    sudo -u $USER python3 -m venv /home/$USER/venv
    sudo -u $USER /home/$USER/venv/bin/pip install --upgrade pip
    sudo -u $USER /home/$USER/venv/bin/pip install datafog openpyxl pypdf2 python-docx regex
fi

# 12. Configurar aplicação Node.js
log_info "Configurando aplicação Node.js..."
sudo -u $USER npm install

# 13. Executar migrações do banco
log_info "Configurando banco de dados..."
sudo -u $USER npm run db:push 2>/dev/null || log_warn "Banco já configurado"

# 14. Buildar frontend para produção
log_info "Buildando frontend..."
sudo -u $USER npm run build

# 15. Copiar build para local correto
if [ -d "dist/public" ]; then
    log_info "Copiando build para produção..."
    sudo -u $USER mkdir -p server/public
    sudo -u $USER cp -r dist/public/* server/public/
    sudo -u $USER chmod -R 755 server/public
fi

# 16. Configurar PM2 para produção
log_info "Configurando PM2..."
sudo -u $USER cat > ecosystem.config.cjs << 'EOF'
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
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads']
  }]
};
EOF

# 17. Configurar Nginx
log_info "Configurando Nginx..."
cat > /etc/nginx/sites-available/pii-detector << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 100M;
    
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
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
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

ln -sf /etc/nginx/sites-available/pii-detector /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

# 18. Configurar firewall
log_info "Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 19. Configurar permissões finais
chown -R $USER:$USER /home/$USER/
chmod -R 755 /home/$USER/uploads/
chmod -R 644 /home/$USER/logs/

# 20. Parar aplicação anterior e iniciar nova
log_info "Iniciando aplicação..."
sudo -u $USER pm2 delete pii-detector 2>/dev/null || true
sudo -u $USER pm2 start ecosystem.config.cjs
sudo -u $USER pm2 save

# Configurar PM2 para iniciar automaticamente
env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# 21. Aguardar inicialização
log_info "Aguardando inicialização..."
sleep 15

# 22. Verificação final completa
echo ""
echo "=========================================="
echo "           VERIFICAÇÃO FINAL             "
echo "=========================================="
echo ""

echo "Serviços:"
systemctl is-active postgresql && echo "✓ PostgreSQL ativo" || echo "✗ PostgreSQL inativo"
systemctl is-active redis-server && echo "✓ Redis ativo" || echo "✗ Redis inativo"
systemctl is-active nginx && echo "✓ Nginx ativo" || echo "✗ Nginx inativo"

echo ""
echo "Aplicação PM2:"
sudo -u $USER pm2 list | grep pii-detector && echo "✓ PM2 ativo" || echo "✗ PM2 offline"

echo ""
echo "Conectividade:"
if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
    echo "✓ Backend respondendo na porta 5000"
else
    echo "✗ Backend não responde"
    log_error "Últimos logs da aplicação:"
    sudo -u $USER pm2 logs pii-detector --lines 10 2>/dev/null || echo "Sem logs disponíveis"
fi

echo ""
echo "Teste externo:"
status=$(curl -s -o /dev/null -w "%{http_code}" http://62.72.8.164/ 2>/dev/null || echo "000")
case $status in
    200) echo "✓ Site funcionando: http://62.72.8.164/" ;;
    502) echo "✗ Erro 502 - verificar logs" ;;
    *) echo "Status HTTP: $status" ;;
esac

echo ""
echo "Arquivos de configuração:"
[ -f "/home/$USER/config/.env" ] && echo "✓ Arquivo .env criado" || echo "✗ Arquivo .env faltando"
[ -d "$APP_DIR/server/public" ] && echo "✓ Frontend buildado" || echo "✗ Frontend não buildado"

echo ""
echo "=========================================="
echo "         INSTALAÇÃO CONCLUÍDA            "
echo "=========================================="
echo ""
echo "Site: http://62.72.8.164/"
echo "Domínio: http://$DOMAIN/ (configure DNS)"
echo ""
echo "Comandos úteis:"
echo "sudo -u $USER pm2 logs pii-detector"
echo "sudo -u $USER pm2 restart pii-detector"
echo "sudo -u $USER pm2 status"
echo ""

log_info "Sistema de Detecção PII instalado com sucesso!"