#!/bin/bash

# Script de Instalação VPS - PII Detector DataFog
# Sistema completo para detecção de dados sensíveis brasileiros

set -e

echo "🚀 Iniciando instalação do PII Detector na VPS..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar se está executando como root
if [ "$EUID" -ne 0 ]; then
    print_error "Execute como root: sudo ./install-vps.sh"
    exit 1
fi

# Variáveis de configuração
APP_USER="datafog"
APP_DIR="/home/datafog/pii-detector"
UPLOADS_DIR="/home/datafog/uploads"
SFTP_DIR="/home/datafog/uploads/sftp"
LOG_DIR="/var/log/pii-detector"
SERVICE_NAME="pii-detector"

print_info "Instalando dependências do sistema..."

# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências básicas
apt install -y \
    curl \
    wget \
    git \
    unzip \
    nginx \
    postgresql \
    postgresql-contrib \
    redis-server \
    supervisor \
    ufw \
    fail2ban \
    htop \
    nano \
    vim \
    tree \
    rsync \
    openssh-server \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    libpq-dev \
    python3-dev

print_status "Dependências básicas instaladas"

# Instalar Node.js 20
print_info "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
print_status "Node.js $(node --version) instalado"

# Instalar PM2 globalmente
npm install -g pm2
print_status "PM2 instalado"

# Criar usuário para aplicação
print_info "Criando usuário $APP_USER..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$APP_USER"
    usermod -aG www-data "$APP_USER"
    print_status "Usuário $APP_USER criado"
else
    print_warning "Usuário $APP_USER já existe"
fi

# Criar estrutura de diretórios
print_info "Criando estrutura de diretórios..."

mkdir -p "$APP_DIR"
mkdir -p "$UPLOADS_DIR"
mkdir -p "$SFTP_DIR/incoming"
mkdir -p "$SFTP_DIR/processed"
mkdir -p "$SFTP_DIR/quarantine"
mkdir -p "$LOG_DIR"
mkdir -p "/home/datafog/.pm2"
mkdir -p "/home/datafog/backups"
mkdir -p "/home/datafog/ssl"
mkdir -p "/home/datafog/config"

# Configurar permissões
chown -R "$APP_USER:$APP_USER" "/home/datafog"
chmod 755 "$UPLOADS_DIR"
chmod 755 "$SFTP_DIR"
chmod 700 "$SFTP_DIR/incoming"
chmod 755 "$LOG_DIR"

print_status "Estrutura de diretórios criada"

# Configurar PostgreSQL
print_info "Configurando PostgreSQL..."
sudo -u postgres createuser --createdb --pwprompt "$APP_USER" || print_warning "Usuário PostgreSQL já existe"
sudo -u postgres createdb -O "$APP_USER" pii_detector || print_warning "Database já existe"

# Configurar Redis
print_info "Configurando Redis..."
systemctl enable redis-server
systemctl start redis-server
print_status "Redis configurado"

# Instalar dependências Python
print_info "Instalando dependências Python..."
pip3 install \
    datafog \
    pypdf2 \
    python-docx \
    openpyxl \
    psycopg2-binary \
    redis \
    celery \
    supervisor

print_status "Dependências Python instaladas"

# Configurar SFTP
print_info "Configurando SFTP..."
cat > /etc/ssh/sshd_config.d/sftp-datafog.conf << EOF
Match User $APP_USER
    ChrootDirectory /home/datafog
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
    PasswordAuthentication yes
    PubkeyAuthentication yes
EOF

systemctl restart sshd
print_status "SFTP configurado"

# Configurar Nginx
print_info "Configurando Nginx..."
cat > /etc/nginx/sites-available/pii-detector << EOF
server {
    listen 80;
    listen [::]:80;
    server_name _;

    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /uploads/ {
        alias $UPLOADS_DIR/;
        internal;
    }

    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        log_not_found off;
        access_log off;
        allow all;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pii-detector /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx
print_status "Nginx configurado"

# Configurar Firewall
print_info "Configurando Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_status "Firewall configurado"

# Configurar Fail2Ban
print_info "Configurando Fail2Ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 1800

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
EOF

systemctl enable fail2ban
systemctl restart fail2ban
print_status "Fail2Ban configurado"

# Criar arquivo de ambiente
print_info "Criando arquivo de configuração..."
cat > "/home/datafog/config/.env" << EOF
# Configuração do PII Detector
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://$APP_USER:senha_aqui@localhost/pii_detector
PGUSER=$APP_USER
PGPASSWORD=senha_aqui
PGDATABASE=pii_detector
PGHOST=localhost
PGPORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# Uploads
UPLOAD_DIR=$UPLOADS_DIR
MAX_FILE_SIZE=100000000
ALLOWED_EXTENSIONS=pdf,doc,docx,xls,xlsx,txt,csv,xml

# SFTP
SFTP_DIR=$SFTP_DIR
SFTP_INCOMING=$SFTP_DIR/incoming
SFTP_PROCESSED=$SFTP_DIR/processed
SFTP_QUARANTINE=$SFTP_DIR/quarantine

# Logs
LOG_LEVEL=info
LOG_DIR=$LOG_DIR

# Security
SESSION_SECRET=gerar_secret_seguro_aqui
JWT_SECRET=gerar_jwt_secret_aqui

# Email (opcional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# OpenAI (opcional para análise semântica)
OPENAI_API_KEY=
EOF

chown "$APP_USER:$APP_USER" "/home/datafog/config/.env"
chmod 600 "/home/datafog/config/.env"
print_status "Arquivo de configuração criado"

# Criar script de deploy
print_info "Criando script de deploy..."
cat > "/home/datafog/deploy.sh" << 'EOF'
#!/bin/bash

APP_DIR="/home/datafog/pii-detector"
BACKUP_DIR="/home/datafog/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Iniciando deploy..."

# Backup
if [ -d "$APP_DIR" ]; then
    echo "📦 Criando backup..."
    tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$APP_DIR" .
    echo "✓ Backup criado: backup_$DATE.tar.gz"
fi

# Atualizar código
cd "$APP_DIR"
git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
npm install --production

# Build do frontend
echo "🏗️ Building frontend..."
npm run build

# Migrar database
echo "🗄️ Migrando database..."
npm run db:push

# Restart da aplicação
echo "🔄 Reiniciando aplicação..."
pm2 restart pii-detector || pm2 start ecosystem.config.js

# Restart do Nginx
sudo systemctl reload nginx

echo "✅ Deploy concluído!"
EOF

chmod +x "/home/datafog/deploy.sh"
chown "$APP_USER:$APP_USER" "/home/datafog/deploy.sh"
print_status "Script de deploy criado"

# Criar configuração do PM2
print_info "Criando configuração PM2..."
cat > "/home/datafog/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'pii-detector',
    script: './server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    cwd: '$APP_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_file: '/home/datafog/config/.env',
    log_file: '$LOG_DIR/app.log',
    error_file: '$LOG_DIR/error.log',
    out_file: '$LOG_DIR/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

chown "$APP_USER:$APP_USER" "/home/datafog/ecosystem.config.js"
print_status "Configuração PM2 criada"

# Configurar logrotate
print_info "Configurando rotação de logs..."
cat > /etc/logrotate.d/pii-detector << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

print_status "Rotação de logs configurada"

# Configurar backup automático
print_info "Configurando backup automático..."
cat > "/home/datafog/backup.sh" << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/datafog/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/home/datafog/pii-detector"

# Backup do código
tar -czf "$BACKUP_DIR/code_$DATE.tar.gz" -C "$APP_DIR" --exclude=node_modules --exclude=uploads .

# Backup do database
pg_dump pii_detector | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup dos uploads (últimos 7 dias)
find /home/datafog/uploads -type f -mtime -7 | tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -T -

# Limpar backups antigos (manter 30 dias)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup $DATE concluído"
EOF

chmod +x "/home/datafog/backup.sh"
chown "$APP_USER:$APP_USER" "/home/datafog/backup.sh"

# Agendar backup diário
echo "0 2 * * * /home/datafog/backup.sh >> /var/log/pii-detector/backup.log 2>&1" | crontab -u "$APP_USER" -
print_status "Backup automático configurado"

# Criar script de monitoramento
print_info "Criando script de monitoramento..."
cat > "/home/datafog/monitor.sh" << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/pii-detector/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Verificar se a aplicação está rodando
if ! pm2 list | grep -q "pii-detector.*online"; then
    echo "[$DATE] ERRO: Aplicação não está rodando. Tentando reiniciar..." >> $LOG_FILE
    pm2 restart pii-detector
fi

# Verificar espaço em disco
DISK_USAGE=$(df /home/datafog | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$DATE] AVISO: Uso de disco alto: $DISK_USAGE%" >> $LOG_FILE
fi

# Verificar memória
MEM_USAGE=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "[$DATE] AVISO: Uso de memória alto: $MEM_USAGE%" >> $LOG_FILE
fi

# Verificar database
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "[$DATE] ERRO: PostgreSQL não está respondendo" >> $LOG_FILE
fi

# Verificar Nginx
if ! systemctl is-active --quiet nginx; then
    echo "[$DATE] ERRO: Nginx não está rodando" >> $LOG_FILE
    systemctl restart nginx
fi
EOF

chmod +x "/home/datafog/monitor.sh"
chown "$APP_USER:$APP_USER" "/home/datafog/monitor.sh"

# Agendar monitoramento a cada 5 minutos
echo "*/5 * * * * /home/datafog/monitor.sh" | crontab -u "$APP_USER" -
print_status "Monitoramento configurado"

# Configurar SSL (Let's Encrypt)
print_info "Preparando configuração SSL..."
cat > "/home/datafog/setup-ssl.sh" << 'EOF'
#!/bin/bash

# Execute este script após configurar o domínio
# Substitua SEU_DOMINIO.com pelo domínio real

DOMAIN="SEU_DOMINIO.com"

# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Configurar renovação automática
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
EOF

chmod +x "/home/datafog/setup-ssl.sh"
print_status "Script SSL preparado"

print_status "Instalação VPS concluída!"

echo ""
echo "=============================================="
echo "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=============================================="
echo ""
echo "📁 Estrutura criada:"
echo "  • Aplicação: $APP_DIR"
echo "  • Uploads: $UPLOADS_DIR"
echo "  • SFTP: $SFTP_DIR"
echo "  • Logs: $LOG_DIR"
echo "  • Backups: /home/datafog/backups"
echo ""
echo "👤 Usuário: $APP_USER"
echo "🗄️ Database: pii_detector"
echo "🌐 Nginx: Configurado na porta 80"
echo "🔒 Firewall: Ativo (SSH, HTTP, HTTPS)"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Configure as senhas do PostgreSQL:"
echo "   sudo -u postgres psql"
echo "   ALTER USER $APP_USER PASSWORD 'sua_senha_segura';"
echo ""
echo "2. Edite o arquivo de configuração:"
echo "   nano /home/datafog/config/.env"
echo "   (Configure DATABASE_URL, SESSION_SECRET, JWT_SECRET)"
echo ""
echo "3. Clone o repositório da aplicação:"
echo "   cd $APP_DIR"
echo "   git clone [URL_DO_SEU_REPO] ."
echo ""
echo "4. Execute o deploy:"
echo "   ./deploy.sh"
echo ""
echo "5. Para SSL (após configurar domínio):"
echo "   ./setup-ssl.sh"
echo ""
echo "🔧 Comandos úteis:"
echo "  • Ver logs: tail -f $LOG_DIR/app.log"
echo "  • Status PM2: pm2 status"
echo "  • Reiniciar app: pm2 restart pii-detector"
echo "  • Status Nginx: systemctl status nginx"
echo "  • Backup manual: ./backup.sh"
echo ""
echo "✅ Sistema pronto para produção!"