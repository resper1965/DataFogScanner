#!/bin/bash

# Instalação Completa VPS - PII Detector DataFog
# Script único que executa toda a instalação automaticamente

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "${BLUE}==>${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}!${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "🚀 Instalação Completa - PII Detector DataFog"
echo "============================================="

# Verificar root
if [ "$EUID" -ne 0 ]; then
    print_error "Execute como root: sudo ./install-complete.sh"
    exit 1
fi

# Detectar sistema
if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_success "Sistema: $PRETTY_NAME"
else
    print_error "Sistema não suportado"
    exit 1
fi

# Atualizar sistema
print_step "Atualizando sistema..."
apt update && apt upgrade -y
print_success "Sistema atualizado"

# Instalar dependências básicas
print_step "Instalando dependências..."
apt install -y curl wget git unzip nginx postgresql postgresql-contrib \
    redis-server supervisor ufw fail2ban htop nano vim tree rsync \
    openssh-server python3 python3-pip python3-venv build-essential \
    libpq-dev python3-dev bc
print_success "Dependências instaladas"

# Instalar Node.js 20
print_step "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
print_success "Node.js $(node --version) e PM2 instalados"

# Instalar dependências Python
print_step "Instalando dependências Python..."
pip3 install datafog pypdf2 python-docx openpyxl psycopg2-binary redis celery supervisor
print_success "Dependências Python instaladas"

# Criar usuário
APP_USER="datafog"
print_step "Criando usuário $APP_USER..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$APP_USER"
    usermod -aG www-data "$APP_USER"
    print_success "Usuário $APP_USER criado"
else
    print_warning "Usuário já existe"
fi

# Criar estrutura completa de pastas
print_step "Criando estrutura de diretórios..."
BASE_DIR="/home/datafog"
APP_DIR="$BASE_DIR/pii-detector"
UPLOADS_DIR="$BASE_DIR/uploads"
SFTP_DIR="$UPLOADS_DIR/sftp"
LOG_DIR="/var/log/pii-detector"
BACKUP_DIR="$BASE_DIR/backups"
CONFIG_DIR="$BASE_DIR/config"

# Função para criar diretórios
create_dir() {
    local dir=$1 owner=${2:-$APP_USER:$APP_USER} perms=${3:-755}
    mkdir -p "$dir" && chown "$owner" "$dir" && chmod "$perms" "$dir"
}

# Criar todos os diretórios
create_dir "$BASE_DIR"
create_dir "$APP_DIR"
create_dir "$CONFIG_DIR" "$APP_USER:$APP_USER" "700"
create_dir "$UPLOADS_DIR" "$APP_USER:www-data"
create_dir "$UPLOADS_DIR/temp" "$APP_USER:www-data"
create_dir "$UPLOADS_DIR/processed" "$APP_USER:www-data"
create_dir "$UPLOADS_DIR/quarantine" "$APP_USER:www-data" "750"
create_dir "$SFTP_DIR"
create_dir "$SFTP_DIR/incoming" "$APP_USER:$APP_USER" "700"
create_dir "$SFTP_DIR/processed"
create_dir "$SFTP_DIR/quarantine" "$APP_USER:$APP_USER" "750"
create_dir "$LOG_DIR"
create_dir "$BACKUP_DIR" "$APP_USER:$APP_USER" "750"

print_success "Estrutura de diretórios criada"

# Configurar PostgreSQL
print_step "Configurando PostgreSQL..."
sudo -u postgres createuser --createdb --pwprompt "$APP_USER" 2>/dev/null || print_warning "Usuário PostgreSQL já existe"
sudo -u postgres createdb -O "$APP_USER" pii_detector 2>/dev/null || print_warning "Database já existe"
systemctl enable postgresql
systemctl start postgresql
print_success "PostgreSQL configurado"

# Configurar Redis
print_step "Configurando Redis..."
systemctl enable redis-server
systemctl start redis-server
print_success "Redis configurado"

# Configurar SFTP
print_step "Configurando SFTP..."
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
print_success "SFTP configurado"

# Configurar Nginx
print_step "Configurando Nginx..."
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
}
EOF

ln -sf /etc/nginx/sites-available/pii-detector /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx
systemctl restart nginx
print_success "Nginx configurado"

# Configurar Firewall
print_step "Configurando Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_success "Firewall configurado"

# Configurar Fail2Ban
print_step "Configurando Fail2Ban..."
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
EOF
systemctl enable fail2ban
systemctl restart fail2ban
print_success "Fail2Ban configurado"

# Gerar senhas seguras
print_step "Gerando configurações seguras..."
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
SESSION_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Criar arquivo de configuração
cat > "$CONFIG_DIR/.env" << EOF
# Configuração PII Detector DataFog - Gerado em $(date)
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://$APP_USER:$POSTGRES_PASSWORD@localhost/pii_detector
PGUSER=$APP_USER
PGPASSWORD=$POSTGRES_PASSWORD
PGDATABASE=pii_detector
PGHOST=localhost
PGPORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# Segurança
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET

# Uploads
UPLOAD_DIR=$UPLOADS_DIR
MAX_FILE_SIZE=104857600
ALLOWED_EXTENSIONS=pdf,doc,docx,xls,xlsx,txt,csv,xml

# SFTP
SFTP_DIR=$SFTP_DIR
SFTP_INCOMING=$SFTP_DIR/incoming
SFTP_PROCESSED=$SFTP_DIR/processed
SFTP_QUARANTINE=$SFTP_DIR/quarantine

# Logs
LOG_LEVEL=info
LOG_DIR=$LOG_DIR

# OpenAI (configure se necessário)
OPENAI_API_KEY=

# Email (configure se necessário)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
EOF

chown "$APP_USER:$APP_USER" "$CONFIG_DIR/.env"
chmod 600 "$CONFIG_DIR/.env"
print_success "Arquivo .env criado com senhas seguras"

# Configurar senha do PostgreSQL automaticamente
print_step "Configurando senha do PostgreSQL..."
sudo -u postgres psql -c "ALTER USER $APP_USER PASSWORD '$POSTGRES_PASSWORD';"
print_success "Senha do PostgreSQL configurada"

# Criar configuração PM2
print_step "Criando configuração PM2..."
cat > "$BASE_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'pii-detector',
    script: './server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_file: '$CONFIG_DIR/.env',
    log_file: '$LOG_DIR/app.log',
    error_file: '$LOG_DIR/error.log',
    out_file: '$LOG_DIR/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
chown "$APP_USER:$APP_USER" "$BASE_DIR/ecosystem.config.js"

# Criar script de deploy
cat > "$BASE_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

APP_DIR="/home/datafog/pii-detector"
BACKUP_DIR="/home/datafog/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Iniciando deploy..."

cd "$APP_DIR"

# Backup da configuração atual
if [ -f "package.json" ]; then
    tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" --exclude=node_modules --exclude=uploads .
    echo "✓ Backup criado"
fi

# Atualizar código se git estiver configurado
if [ -d ".git" ]; then
    echo "📥 Atualizando código..."
    git pull origin main
fi

# Instalar dependências
if [ -f "package.json" ]; then
    echo "📦 Instalando dependências..."
    npm install --production
    
    # Build se necessário
    if npm run build --if-present; then
        echo "✓ Build realizado"
    fi
    
    # Migrar database
    if npm run db:push --if-present; then
        echo "✓ Database migrado"
    fi
fi

# Restart da aplicação
echo "🔄 Reiniciando aplicação..."
pm2 restart pii-detector 2>/dev/null || pm2 start /home/datafog/ecosystem.config.js

# Verificar status
echo "📊 Status da aplicação:"
pm2 list

echo "✅ Deploy concluído!"
EOF

chmod +x "$BASE_DIR/deploy.sh"
chown "$APP_USER:$APP_USER" "$BASE_DIR/deploy.sh"

# Criar script de backup
cat > "$BASE_DIR/backup.sh" << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/datafog/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "💾 Iniciando backup..."

# Backup do database
pg_dump pii_detector | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup do código (sem node_modules)
if [ -d "/home/datafog/pii-detector" ]; then
    tar -czf "$BACKUP_DIR/code_$DATE.tar.gz" -C "/home/datafog/pii-detector" --exclude=node_modules --exclude=uploads .
fi

# Backup dos uploads importantes (últimos 7 dias)
find /home/datafog/uploads -type f -mtime -7 | tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -T - 2>/dev/null || true

# Limpar backups antigos (30 dias)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup $DATE concluído"
EOF

chmod +x "$BASE_DIR/backup.sh"
chown "$APP_USER:$APP_USER" "$BASE_DIR/backup.sh"

# Criar script de monitoramento
cat > "$BASE_DIR/monitor.sh" << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/pii-detector/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Verificar aplicação
if ! pm2 list | grep -q "pii-detector.*online"; then
    echo "[$DATE] ERRO: Aplicação offline - reiniciando" >> $LOG_FILE
    pm2 restart pii-detector
fi

# Verificar serviços
for service in postgresql redis-server nginx; do
    if ! systemctl is-active --quiet $service; then
        echo "[$DATE] ERRO: $service parado - reiniciando" >> $LOG_FILE
        systemctl restart $service
    fi
done

# Verificar espaço em disco
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$DATE] AVISO: Disco $DISK_USAGE% cheio" >> $LOG_FILE
fi
EOF

chmod +x "$BASE_DIR/monitor.sh"
chown "$APP_USER:$APP_USER" "$BASE_DIR/monitor.sh"

# Configurar tarefas automáticas
print_step "Configurando tarefas automáticas..."
sudo -u "$APP_USER" crontab -l 2>/dev/null | { 
    cat
    echo "0 2 * * * /home/datafog/backup.sh >> /var/log/pii-detector/backup.log 2>&1"
    echo "*/5 * * * * /home/datafog/monitor.sh"
    echo "0 3 * * * find /home/datafog/uploads/temp -type f -mtime +1 -delete"
} | sudo -u "$APP_USER" crontab -

print_success "Tarefas automáticas configuradas"

# Criar script de verificação
cat > "$BASE_DIR/check-install.sh" << 'EOF'
#!/bin/bash
echo "🔍 Verificando instalação..."

# Verificar serviços
for service in postgresql redis-server nginx; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: Ativo"
    else
        echo "❌ $service: Inativo"
    fi
done

# Verificar conectividade
echo "🔗 Testando conectividade:"
pg_isready -h localhost -p 5432 && echo "✅ PostgreSQL: OK" || echo "❌ PostgreSQL: Falha"
redis-cli ping > /dev/null && echo "✅ Redis: OK" || echo "❌ Redis: Falha"
curl -s http://localhost > /dev/null && echo "✅ Nginx: OK" || echo "❌ Nginx: Falha"

# Verificar estrutura
echo "📁 Verificando estrutura:"
for dir in /home/datafog/pii-detector /home/datafog/uploads /home/datafog/backups; do
    [ -d "$dir" ] && echo "✅ $dir: Existe" || echo "❌ $dir: Não existe"
done

# Verificar configuração
[ -f "/home/datafog/config/.env" ] && echo "✅ .env: Configurado" || echo "❌ .env: Não encontrado"

echo "📊 Resumo do sistema:"
echo "  - Usuário: $(whoami)"
echo "  - Espaço: $(df -h / | awk 'NR==2 {print $4}') livres"
echo "  - Memória: $(free -h | awk 'NR==2 {print $7}') livres"
echo "  - Uptime: $(uptime -p)"
EOF

chmod +x "$BASE_DIR/check-install.sh"
chown "$APP_USER:$APP_USER" "$BASE_DIR/check-install.sh"

print_success "Instalação base concluída!"

echo ""
echo "=================================================================="
echo "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo "=================================================================="
echo ""
echo "📋 O que foi instalado:"
echo "  ✅ Usuário: $APP_USER"
echo "  ✅ PostgreSQL com database: pii_detector"
echo "  ✅ Redis para cache e sessões"
echo "  ✅ Nginx como proxy reverso"
echo "  ✅ PM2 para gerenciar a aplicação"
echo "  ✅ Firewall e Fail2Ban para segurança"
echo "  ✅ Estrutura completa de diretórios"
echo "  ✅ Scripts de deploy, backup e monitoramento"
echo "  ✅ Configuração .env com senhas seguras"
echo "  ✅ Tarefas automáticas (backup e monitoramento)"
echo ""
echo "🔑 Credenciais geradas:"
echo "  📊 Database: datafog / $POSTGRES_PASSWORD"
echo "  🔐 Senhas salvas em: $CONFIG_DIR/.env"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1️⃣ Mudar para usuário datafog:"
echo "   su - datafog"
echo ""
echo "2️⃣ Clonar o repositório da aplicação:"
echo "   cd /home/datafog/pii-detector"
echo "   git clone https://github.com/SEU_USUARIO/pii-detector.git ."
echo ""
echo "3️⃣ Configurar OpenAI (opcional):"
echo "   nano /home/datafog/config/.env"
echo "   # Adicionar: OPENAI_API_KEY=sk-sua-chave"
echo ""
echo "4️⃣ Executar deploy:"
echo "   ./deploy.sh"
echo ""
echo "5️⃣ Verificar instalação:"
echo "   ./check-install.sh"
echo ""
echo "🌐 Acessar aplicação:"
echo "  📱 Local: http://localhost:5000"
echo "  🌍 Externo: http://$(curl -s ifconfig.me):5000"
echo ""
echo "🔧 Comandos úteis:"
echo "  📊 Status: pm2 status"
echo "  📝 Logs: pm2 logs pii-detector"
echo "  💾 Backup: ./backup.sh"
echo "  🔍 Verificar: ./check-install.sh"
echo ""
echo "✅ Sistema pronto para receber a aplicação!"

# Executar verificação final
print_step "Executando verificação final..."
sudo -u "$APP_USER" "$BASE_DIR/check-install.sh"