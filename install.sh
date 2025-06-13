#!/bin/bash

# Script de Instalação Única - PII Detector n.CrisisOps
# Versão: 1.0
# Data: 13/06/2025

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se está executando como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Execute como root: sudo $0${NC}"
    exit 1
fi

echo -e "${BLUE}================================================================="
echo "🚀 INSTALAÇÃO PII DETECTOR - VERSÃO ÚNICA"
echo -e "=================================================================${NC}"
echo ""

# Função de log
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"
    exit 1
}

# Detectar sistema operacional
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Sistema operacional não suportado"
    fi
    
    log "Sistema detectado: $OS $VER"
}

# Atualizar sistema
update_system() {
    log "Atualizando sistema..."
    apt update && apt upgrade -y
    
    log "Instalando dependências básicas..."
    apt install -y curl wget git build-essential software-properties-common \
        apt-transport-https ca-certificates gnupg lsb-release unzip \
        htop tree nano vim ufw fail2ban
}

# Configurar locale e timezone
configure_locale() {
    log "Configurando locale e timezone..."
    locale-gen pt_BR.UTF-8
    update-locale LANG=pt_BR.UTF-8
    timedatectl set-timezone America/Sao_Paulo
}

# Criar usuário
create_user() {
    log "Criando usuário piidetector..."
    
    # Remover usuário datafog se existir (correção de inconsistência)
    if id "datafog" >/dev/null 2>&1; then
        warning "Removendo usuário datafog (migração para piidetector)"
        userdel -r datafog 2>/dev/null || true
    fi
    
    # Criar usuário piidetector
    if ! id "piidetector" >/dev/null 2>&1; then
        useradd -m -s /bin/bash -G sudo,www-data piidetector
        echo "piidetector:$(openssl rand -base64 12)" | chpasswd
        log "Usuário piidetector criado com senha gerada automaticamente"
    else
        log "Usuário piidetector já existe"
    fi
}

# Criar estrutura de diretórios
create_directories() {
    log "Criando estrutura de diretórios..."
    
    sudo -u piidetector bash << 'EOF'
cd /home/piidetector

# Estrutura principal
mkdir -p {config,logs,uploads,backups,scripts,temp}
mkdir -p uploads/{pending,processing,completed,quarantine,sftp}
mkdir -p logs/{app,security,performance}
mkdir -p backups/{daily,weekly,monthly}
mkdir -p config/{ssl,monitoring}
mkdir -p scripts/{maintenance,monitoring,backup}
mkdir -p pii-detector

# Configurar permissões
chmod 755 uploads uploads/*
chmod 750 config
chmod 755 logs logs/*
chmod 700 backups backups/*
chmod 755 scripts scripts/*

# Arquivo de configuração da estrutura
cat > config/directories.conf << 'EOD'
BASE_DIR=/home/piidetector
APP_DIR=$BASE_DIR/pii-detector
UPLOAD_DIR=$BASE_DIR/uploads
LOG_DIR=$BASE_DIR/logs
BACKUP_DIR=$BASE_DIR/backups
CONFIG_DIR=$BASE_DIR/config
SCRIPTS_DIR=$BASE_DIR/scripts
SFTP_DIR=$BASE_DIR/uploads/sftp
TEMP_DIR=$BASE_DIR/temp
UPLOAD_RETENTION=90
LOG_RETENTION=30
BACKUP_RETENTION=90
EOD

EOF

    # Logs do sistema
    mkdir -p /var/log/pii-detector
    chown piidetector:piidetector /var/log/pii-detector
    chmod 755 /var/log/pii-detector
    
    log "Estrutura de diretórios criada"
}

# Instalar PostgreSQL
install_postgresql() {
    log "Instalando PostgreSQL..."
    
    # Instalar PostgreSQL 15
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    apt update
    apt install -y postgresql-15 postgresql-contrib-15
    
    # Configurar PostgreSQL
    systemctl enable postgresql
    systemctl start postgresql
    
    # Criar banco e usuário
    PGPASS=$(openssl rand -base64 16)
    sudo -u postgres psql << EOF
CREATE USER piidetector WITH PASSWORD '$PGPASS';
CREATE DATABASE pii_detector OWNER piidetector;
GRANT ALL PRIVILEGES ON DATABASE pii_detector TO piidetector;
ALTER USER piidetector CREATEDB;
EOF
    
    # Salvar senha no arquivo de configuração
    echo "PGPASSWORD=$PGPASS" >> /home/piidetector/config/.env.generated
    chown piidetector:piidetector /home/piidetector/config/.env.generated
    chmod 600 /home/piidetector/config/.env.generated
    
    log "PostgreSQL configurado com senha gerada automaticamente"
}

# Instalar Redis
install_redis() {
    log "Instalando Redis..."
    
    apt install -y redis-server
    
    # Configurar Redis
    REDIS_PASS=$(openssl rand -base64 16)
    
    # Método alternativo de configuração para compatibilidade
    if [ -d "/etc/redis" ]; then
        # Criar diretório de configuração se não existir
        mkdir -p /etc/redis/redis.conf.d
        
        cat > /etc/redis/redis.conf.d/pii-detector.conf << EOF
requirepass $REDIS_PASS
maxmemory 512mb
maxmemory-policy allkeys-lru
EOF
    else
        # Configuração alternativa diretamente no arquivo principal
        echo "requirepass $REDIS_PASS" >> /etc/redis.conf
        echo "maxmemory 512mb" >> /etc/redis.conf
        echo "maxmemory-policy allkeys-lru" >> /etc/redis.conf
    fi
    
    systemctl restart redis-server
    systemctl enable redis-server
    
    # Salvar senha
    echo "REDIS_PASSWORD=$REDIS_PASS" >> /home/piidetector/config/.env.generated
    
    log "Redis configurado"
}

# Instalar Node.js
install_nodejs() {
    log "Instalando Node.js..."
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    # PM2
    npm install -g pm2
    
    log "Node.js e PM2 instalados"
}

# Instalar Python
install_python() {
    log "Instalando Python e dependências..."
    
    apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
    
    # Instalar DataFog e dependências Python
    pip3 install --break-system-packages datafog openpyxl pypdf2 python-docx regex
    
    log "Python configurado"
}

# Instalar Nginx
install_nginx() {
    log "Instalando e configurando Nginx..."
    
    apt install -y nginx
    
    # Configuração do Nginx
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
    
    # Habilitar site
    ln -sf /etc/nginx/sites-available/pii-detector /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t
    systemctl restart nginx
    systemctl enable nginx
    
    log "Nginx configurado"
}

# Configurar segurança
configure_security() {
    log "Configurando segurança..."
    
    # UFW
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    # Fail2Ban
    systemctl enable fail2ban
    systemctl start fail2ban
    
    log "Segurança configurada"
}

# Criar arquivo de configuração da aplicação
create_app_config() {
    log "Criando configuração da aplicação..."
    
    # Gerar secrets
    SESSION_SECRET=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Obter senhas geradas
    source /home/piidetector/config/.env.generated
    
    cat > /home/piidetector/config/.env << EOF
# Database
DATABASE_URL=postgresql://piidetector:$PGPASSWORD@localhost:5432/pii_detector
PGUSER=piidetector
PGPASSWORD=$PGPASSWORD
PGDATABASE=pii_detector
PGHOST=localhost
PGPORT=5432

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=$REDIS_PASSWORD

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

# AI/ML (opcional - configure se tiver OpenAI API)
# OPENAI_API_KEY=sk-seu-key-aqui
ENABLE_SEMANTIC_ANALYSIS=false
AI_CONFIDENCE_THRESHOLD=0.7

# SFTP
ENABLE_SFTP_MONITORING=true
SFTP_WATCH_DIR=/home/piidetector/uploads/sftp

# Logging
LOG_LEVEL=info
LOG_DIR=/home/piidetector/logs
EOF
    
    chown piidetector:piidetector /home/piidetector/config/.env
    chmod 600 /home/piidetector/config/.env
    
    log "Configuração da aplicação criada"
}

# Clonar e configurar aplicação
setup_application() {
    log "Clonando código da aplicação..."
    
    sudo -u piidetector bash << 'EOF'
cd /home/piidetector/pii-detector

# Clonar repositório do GitHub
if [ ! -f "package.json" ]; then
    echo "📥 Baixando código da aplicação..."
    git clone https://github.com/resper1965/DataFogScanner.git .
    
    if [ -f "package.json" ]; then
        echo "✅ Código baixado com sucesso"
        
        # Instalar dependências
        echo "📦 Instalando dependências..."
        npm install --production
        
        # Executar migrações do banco
        echo "🗄️  Configurando banco de dados..."
        npm run db:push
        
    else
        echo "❌ Erro ao baixar código da aplicação"
        echo "📋 Alternativa manual:"
        echo "   1. git clone https://github.com/resper1965/DataFogScanner.git ."
        echo "   2. npm install"
        echo "   3. npm run db:push"
    fi
else
    echo "✅ Código da aplicação já existe"
fi

# Criar arquivo de configuração PM2
cat > ecosystem.config.js << 'EOE'
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
EOE

EOF
    
    log "Aplicação configurada"
}

# Criar scripts utilitários
create_utility_scripts() {
    log "Criando scripts utilitários..."
    
    # Script de verificação
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
pm2 list | grep -q "pii-detector" && echo "✅ PM2 rodando" || echo "⚠️  PM2 não iniciado"
curl -s http://localhost:5000/health > /dev/null && echo "✅ App respondendo" || echo "⚠️  App não responde"

echo ""
echo "Espaço em disco:"
df -h /home/piidetector | tail -1
EOF
    
    # Script de backup
    cat > /home/piidetector/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/piidetector/backups/daily"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Iniciando backup..."

# Backup do banco
pg_dump -h localhost -U piidetector -d pii_detector --format=custom > "$BACKUP_DIR/db_$DATE.dump"

# Backup da configuração
cp /home/piidetector/config/.env "$BACKUP_DIR/env_$DATE.backup"

# Limpeza de backups antigos (mais de 7 dias)
find "$BACKUP_DIR" -name "*.dump" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.backup" -mtime +7 -delete

echo "Backup concluído: $DATE"
EOF
    
    # Tornar executáveis
    chmod +x /home/piidetector/check-system.sh
    chmod +x /home/piidetector/backup.sh
    chown piidetector:piidetector /home/piidetector/*.sh
    
    log "Scripts utilitários criados"
}

# Iniciar aplicação
start_application() {
    log "Iniciando aplicação..."
    
    sudo -u piidetector bash << 'EOF'
cd /home/piidetector/pii-detector

if [ -f "package.json" ]; then
    echo "🚀 Iniciando aplicação com PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    
    # Configurar PM2 para inicialização automática
    pm2 startup systemd -u piidetector --hp /home/piidetector
    
    echo "✅ Aplicação iniciada e configurada para auto-start"
else
    echo "⚠️  Aplicação não pode ser iniciada - código não encontrado"
fi
EOF
    
    log "Aplicação configurada para inicialização"
}

# Função principal
main() {
    detect_os
    update_system
    configure_locale
    create_user
    create_directories
    install_postgresql
    install_redis
    install_nodejs
    install_python
    install_nginx
    configure_security
    create_app_config
    setup_application
    create_utility_scripts
    start_application
    
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
    echo -e "${BLUE}📝 Para configurar OpenAI API:${NC}"
    echo "  nano /home/piidetector/config/.env"
    echo "  # Adicionar: OPENAI_API_KEY=sk-sua-chave"
    echo "  # Alterar: ENABLE_SEMANTIC_ANALYSIS=true"
    echo "  pm2 restart pii-detector"
}

# Executar instalação
main "$@"