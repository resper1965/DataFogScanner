#!/bin/bash

# ============================================================================
# PII Detector - Script de Instalação Completa para VPS
# ============================================================================
# Sistema completo de detecção de PII brasileiro com interface moderna
# Domínio: monster.e-ness.com.br
# Usuário: piidetector
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
DOMAIN="monster.e-ness.com.br"
USER="piidetector"
APP_DIR="/home/$USER/pii-detector"
DB_NAME="piidetector"
DB_USER="piidetector"
DB_PASS="piidetector123"

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Verificar se é executado como root
if [[ $EUID -ne 0 ]]; then
   error "Este script deve ser executado como root (use sudo)"
fi

log "=== Iniciando Instalação do PII Detector ==="

# ============================================================================
# 1. ATUALIZAÇÃO DO SISTEMA
# ============================================================================
log "Atualizando sistema..."
apt update && apt upgrade -y

# ============================================================================
# 2. INSTALAÇÃO DE DEPENDÊNCIAS BÁSICAS
# ============================================================================
log "Instalando dependências básicas..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https \
    build-essential git nginx ufw fail2ban unzip python3 python3-pip \
    python3-venv postgresql postgresql-contrib redis-server

# ============================================================================
# 3. INSTALAÇÃO DO NODE.JS
# ============================================================================
log "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalação
node_version=$(node -v 2>/dev/null || echo "não instalado")
npm_version=$(npm -v 2>/dev/null || echo "não instalado")
log "Node.js: $node_version | NPM: $npm_version"

# Instalar PM2 globalmente
npm install -g pm2 tsx typescript

# ============================================================================
# 4. CONFIGURAÇÃO DO USUÁRIO piidetector
# ============================================================================
log "Configurando usuário $USER..."
if ! id "$USER" &>/dev/null; then
    useradd -m -s /bin/bash "$USER"
    log "Usuário $USER criado"
else
    log "Usuário $USER já existe"
fi

# Adicionar ao grupo sudo se necessário
usermod -aG sudo "$USER"

# ============================================================================
# 5. CONFIGURAÇÃO DO POSTGRESQL
# ============================================================================
log "Configurando PostgreSQL..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || log "Usuário PostgreSQL já existe"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || log "Database PostgreSQL já existe"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

# Configurar PostgreSQL para aceitar conexões locais
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" /etc/postgresql/*/main/pg_hba.conf

systemctl restart postgresql
systemctl enable postgresql

# ============================================================================
# 6. CONFIGURAÇÃO DO REDIS
# ============================================================================
log "Configurando Redis..."
systemctl enable redis-server
systemctl start redis-server

# Teste Redis
redis-cli ping &>/dev/null && log "Redis funcionando" || warning "Redis pode ter problemas"

# ============================================================================
# 7. CONFIGURAÇÃO DO FIREWALL
# ============================================================================
log "Configurando firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 5000/tcp
echo "y" | ufw enable

# ============================================================================
# 8. CLONAGEM/PREPARAÇÃO DO PROJETO
# ============================================================================
log "Preparando diretório do projeto..."
mkdir -p "$APP_DIR"
chown -R "$USER:$USER" "$APP_DIR"

# Se não estamos no diretório do projeto, clonar do repositório
if [[ ! -f "package.json" ]]; then
    warning "Execute este script dentro do diretório do projeto ou clone o repositório primeiro"
    error "Script deve ser executado no diretório raiz do projeto"
fi

# Copiar arquivos para o diretório de produção
log "Copiando arquivos do projeto..."
rsync -av --exclude=node_modules --exclude=.git --exclude=uploads . "$APP_DIR/"
chown -R "$USER:$USER" "$APP_DIR"

# ============================================================================
# 9. CONFIGURAÇÃO DO PYTHON E DEPENDÊNCIAS
# ============================================================================
log "Configurando ambiente Python..."
sudo -u "$USER" bash << 'PYTHON_SETUP'
cd /home/piidetector/pii-detector
python3 -m venv venv --system-site-packages
source venv/bin/activate

# Instalar dependências Python
pip install --upgrade pip
pip install datafog PyPDF2 python-docx openpyxl pandas regex

# Verificar instalação
python -c "import datafog; print('DataFog instalado com sucesso')" || echo "Erro ao instalar DataFog"
PYTHON_SETUP

# ============================================================================
# 10. INSTALAÇÃO DE DEPENDÊNCIAS NODE.JS
# ============================================================================
log "Instalando dependências Node.js..."
sudo -u "$USER" bash -c "cd $APP_DIR && npm install"

# Instalar dependências específicas para produção
sudo -u "$USER" bash -c "cd $APP_DIR && npm install redis connect-redis"

# ============================================================================
# 11. CONFIGURAÇÃO DE AMBIENTE
# ============================================================================
log "Configurando variáveis de ambiente..."
sudo -u "$USER" bash -c "cat > $APP_DIR/.env << 'ENV_EOF'
# Configuração de Produção - PII Detector
NODE_ENV=production
PORT=5000
DOMAIN=$DOMAIN

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME

# Redis
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=pii-detector-production-secret-$(openssl rand -hex 32)

# Paths
UPLOAD_DIR=./uploads
SFTP_DIR=./uploads/sftp
PYTHON_PATH=/home/$USER/pii-detector/venv/bin/python

# Opcional - OpenAI (configure se necessário)
# OPENAI_API_KEY=sua_chave_aqui
ENV_EOF"

# ============================================================================
# 12. BUILD DO FRONTEND
# ============================================================================
log "Fazendo build do frontend..."
sudo -u "$USER" bash -c "cd $APP_DIR && npm run build"

# Verificar se o build foi criado
if [[ ! -d "$APP_DIR/dist" ]]; then
    error "Build do frontend falhou - diretório dist não encontrado"
fi

# ============================================================================
# 13. CONFIGURAÇÃO DO PM2
# ============================================================================
log "Configurando PM2..."
sudo -u "$USER" bash -c "cat > $APP_DIR/ecosystem.config.cjs << 'PM2_EOF'
module.exports = {
  apps: [{
    name: 'pii-detector',
    script: './server/index.ts',
    interpreter: 'tsx',
    cwd: '/home/piidetector/pii-detector',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    out_file: './logs/out.log',
    error_file: './logs/err.log',
    combine_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
PM2_EOF"

# Criar diretório de logs
sudo -u "$USER" mkdir -p "$APP_DIR/logs"
sudo -u "$USER" mkdir -p "$APP_DIR/uploads/sftp"

# ============================================================================
# 14. CONFIGURAÇÃO DO NGINX
# ============================================================================
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/pii-detector << 'NGINX_EOF'
server {
    listen 80;
    server_name monster.e-ness.com.br;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Increase client max body size for file uploads
    client_max_body_size 100M;
    
    # Main application
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files with caching
    location /static/ {
        alias /home/piidetector/pii-detector/dist/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
NGINX_EOF

# Ativar site
ln -sf /etc/nginx/sites-available/pii-detector /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração e reiniciar
nginx -t && systemctl restart nginx && systemctl enable nginx

# ============================================================================
# 15. INICIALIZAÇÃO DOS SERVIÇOS
# ============================================================================
log "Inicializando serviços..."

# Aplicar migrations do banco
log "Aplicando migrations do banco..."
sudo -u "$USER" bash -c "cd $APP_DIR && npm run db:push"

# Iniciar aplicação com PM2
log "Iniciando aplicação..."
sudo -u "$USER" bash -c "cd $APP_DIR && pm2 start ecosystem.config.cjs"
sudo -u "$USER" bash -c "cd $APP_DIR && pm2 save"

# Configurar PM2 para inicializar no boot
sudo -u "$USER" bash -c "pm2 startup | tail -1" | bash
sudo -u "$USER" bash -c "pm2 save"

# ============================================================================
# 16. VERIFICAÇÕES FINAIS
# ============================================================================
log "Executando verificações finais..."

# Verificar serviços
services=("postgresql" "redis-server" "nginx")
for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        log "✓ $service está rodando"
    else
        error "✗ $service não está rodando"
    fi
done

# Verificar PM2
if sudo -u "$USER" bash -c "cd $APP_DIR && pm2 list" | grep -q "online"; then
    log "✓ Aplicação PM2 está online"
else
    warning "✗ Aplicação PM2 pode ter problemas"
fi

# Verificar conectividade
sleep 5
if curl -s http://localhost:5000/api/health &>/dev/null; then
    log "✓ API respondendo localmente"
else
    warning "✗ API não está respondendo"
fi

# ============================================================================
# 17. INFORMAÇÕES FINAIS
# ============================================================================
echo
log "=== INSTALAÇÃO CONCLUÍDA ==="
echo
info "🌐 Domínio: http://$DOMAIN"
info "📂 Diretório: $APP_DIR"
info "👤 Usuário: $USER"
info "🗄️  Database: $DB_NAME"
echo
log "Comandos úteis:"
echo "  • Logs da aplicação: sudo -u $USER pm2 logs pii-detector"
echo "  • Status dos serviços: sudo -u $USER pm2 list"
echo "  • Reiniciar aplicação: sudo -u $USER pm2 restart pii-detector"
echo "  • Parar aplicação: sudo -u $USER pm2 stop pii-detector"
echo "  • Logs do Nginx: tail -f /var/log/nginx/error.log"
echo
log "Teste a aplicação em: http://$DOMAIN"
echo

# Mostrar status final
log "Status dos serviços:"
sudo -u "$USER" bash -c "cd $APP_DIR && pm2 list"

log "=== Instalação finalizada com sucesso! ==="