#!/bin/bash

# Instalação Docker - PII Detector DataFog
# Script para instalação rápida usando Docker Compose

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "🐳 Instalação Docker - PII Detector DataFog"
echo "============================================"

# Verificar se está executando como root
if [ "$EUID" -ne 0 ]; then
    print_error "Execute como root: sudo ./docker-install.sh"
    exit 1
fi

# Detectar sistema operacional
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    print_error "Sistema operacional não suportado"
    exit 1
fi

print_info "Sistema detectado: $OS $VERSION"

# Instalar Docker
print_info "Instalando Docker..."
case $OS in
    ubuntu|debian)
        apt update
        apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
        curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt update
        apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        ;;
    centos|rhel|fedora)
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/$OS/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        systemctl start docker
        ;;
    *)
        print_error "Sistema operacional $OS não suportado"
        exit 1
        ;;
esac

# Iniciar e habilitar Docker
systemctl enable docker
systemctl start docker
print_status "Docker instalado e iniciado"

# Instalar Docker Compose (versão standalone se necessário)
if ! command -v docker-compose &> /dev/null; then
    print_info "Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose instalado"
fi

# Criar usuário para aplicação
APP_USER="datafog"
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$APP_USER"
    usermod -aG docker "$APP_USER"
    print_status "Usuário $APP_USER criado e adicionado ao grupo docker"
fi

# Criar estrutura de diretórios
APP_DIR="/home/datafog/pii-detector"
mkdir -p "$APP_DIR"
mkdir -p "/home/datafog/uploads"
mkdir -p "/home/datafog/logs"
mkdir -p "/home/datafog/backups"
mkdir -p "/home/datafog/ssl"

# Configurar permissões
chown -R "$APP_USER:$APP_USER" "/home/datafog"

print_status "Estrutura de diretórios criada"

# Configurar firewall
print_info "Configurando firewall..."
if command -v ufw &> /dev/null; then
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 5000/tcp
    ufw --force enable
    print_status "UFW configurado"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-port=5000/tcp
    firewall-cmd --reload
    print_status "Firewalld configurado"
fi

# Gerar senhas seguras
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

POSTGRES_PASSWORD=$(generate_password)
SESSION_SECRET=$(generate_password)
JWT_SECRET=$(generate_password)

# Criar arquivo .env
print_info "Criando arquivo de configuração..."
cat > "$APP_DIR/.env" << EOF
# Configuração Docker - PII Detector DataFog
NODE_ENV=production
PORT=5000

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://datafog_user:$POSTGRES_PASSWORD@postgres:5432/datafog

# Redis
REDIS_URL=redis://redis:6379

# Segurança
SESSION_SECRET=$SESSION_SECRET
JWT_SECRET=$JWT_SECRET

# OpenAI (opcional)
OPENAI_API_KEY=

# SFTP (opcional)
SFTP_HOST=
SFTP_PORT=22
SFTP_USERNAME=
SFTP_PASSWORD=
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
print_status "Arquivo .env criado com senhas seguras"

# Criar script de deploy
cat > "$APP_DIR/deploy.sh" << 'EOF'
#!/bin/bash

set -e

APP_DIR="/home/datafog/pii-detector"
BACKUP_DIR="/home/datafog/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Iniciando deploy Docker..."

cd "$APP_DIR"

# Backup da configuração atual
if [ -f ".env" ]; then
    cp .env "$BACKUP_DIR/env_backup_$DATE"
    echo "✓ Backup da configuração criado"
fi

# Parar containers
echo "🛑 Parando containers..."
docker-compose down

# Atualizar código
if [ -d ".git" ]; then
    echo "📥 Atualizando código..."
    git pull origin main
else
    echo "⚠ Repositório Git não encontrado. Clone o projeto primeiro."
fi

# Build e start
echo "🏗️ Building e iniciando containers..."
docker-compose build --no-cache
docker-compose up -d

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 30

# Verificar status
echo "📊 Status dos containers:"
docker-compose ps

# Verificar logs
echo "📝 Últimos logs:"
docker-compose logs --tail=20

echo "✅ Deploy concluído!"
echo "🌐 Aplicação disponível em: http://localhost:5000"
EOF

chmod +x "$APP_DIR/deploy.sh"
chown "$APP_USER:$APP_USER" "$APP_DIR/deploy.sh"

# Criar script de backup
cat > "$APP_DIR/backup.sh" << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/datafog/backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "💾 Iniciando backup..."

# Backup do database
echo "📊 Backup do database..."
docker-compose exec -T postgres pg_dump -U datafog_user datafog | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup dos volumes
echo "📁 Backup dos uploads..."
docker run --rm -v pii-detector_app_uploads:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/uploads_$DATE.tar.gz -C /data .

# Backup da configuração
echo "⚙️ Backup da configuração..."
cp .env "$BACKUP_DIR/env_$DATE"
cp docker-compose.yml "$BACKUP_DIR/docker-compose_$DATE.yml"

# Limpar backups antigos (30 dias)
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "env_*" -mtime +30 -delete
find "$BACKUP_DIR" -name "docker-compose_*" -mtime +30 -delete

echo "✅ Backup $DATE concluído"
EOF

chmod +x "$APP_DIR/backup.sh"
chown "$APP_USER:$APP_USER" "$APP_DIR/backup.sh"

# Criar script de monitoramento
cat > "$APP_DIR/monitor.sh" << 'EOF'
#!/bin/bash

LOG_FILE="/home/datafog/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

cd /home/datafog/pii-detector

# Verificar containers
if ! docker-compose ps | grep -q "Up"; then
    echo "[$DATE] ERRO: Containers não estão rodando" >> $LOG_FILE
    docker-compose up -d
fi

# Verificar saúde da aplicação
if ! curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "[$DATE] ERRO: Aplicação não responde" >> $LOG_FILE
    docker-compose restart app
fi

# Verificar espaço em disco
DISK_USAGE=$(df /home/datafog | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$DATE] AVISO: Uso de disco alto: $DISK_USAGE%" >> $LOG_FILE
fi

# Verificar logs de erro
ERROR_COUNT=$(docker-compose logs --since="5m" 2>&1 | grep -i error | wc -l)
if [ $ERROR_COUNT -gt 10 ]; then
    echo "[$DATE] AVISO: Muitos erros nos logs: $ERROR_COUNT" >> $LOG_FILE
fi
EOF

chmod +x "$APP_DIR/monitor.sh"
chown "$APP_USER:$APP_USER" "$APP_DIR/monitor.sh"

# Configurar cron para backup e monitoramento
print_info "Configurando tarefas automáticas..."
sudo -u "$APP_USER" crontab -l 2>/dev/null | { cat; echo "0 2 * * * /home/datafog/pii-detector/backup.sh"; echo "*/5 * * * * /home/datafog/pii-detector/monitor.sh"; } | sudo -u "$APP_USER" crontab -

print_status "Tarefas automáticas configuradas"

# Criar configuração do Nginx (opcional)
cat > "$APP_DIR/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:5000;
    }

    server {
        listen 80;
        server_name _;
        client_max_body_size 100M;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        location /health {
            proxy_pass http://app/api/health;
            access_log off;
        }
    }
}
EOF

print_status "Configuração Nginx criada"

print_status "Instalação Docker concluída!"

echo ""
echo "=============================================="
echo "🎉 INSTALAÇÃO DOCKER CONCLUÍDA!"
echo "=============================================="
echo ""
echo "📁 Diretório da aplicação: $APP_DIR"
echo "🔑 Senhas geradas automaticamente em: $APP_DIR/.env"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Mudar para usuário datafog:"
echo "   su - datafog"
echo ""
echo "2. Ir para diretório da aplicação:"
echo "   cd /home/datafog/pii-detector"
echo ""
echo "3. Clonar o repositório:"
echo "   git clone [URL_DO_SEU_REPO] ."
echo ""
echo "4. Executar deploy:"
echo "   ./deploy.sh"
echo ""
echo "🔧 Comandos úteis:"
echo "  • Status: docker-compose ps"
echo "  • Logs: docker-compose logs -f"
echo "  • Parar: docker-compose down"
echo "  • Reiniciar: docker-compose restart"
echo "  • Backup: ./backup.sh"
echo ""
echo "🌐 Acesso:"
echo "  • Aplicação: http://SEU_IP:5000"
echo "  • Com Nginx: http://SEU_IP"
echo ""
echo "✅ Sistema pronto para produção!"