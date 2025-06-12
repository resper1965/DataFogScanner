#!/bin/bash
set -e

echo "=== DataFog PII Detector - Deploy Script ==="
echo "Iniciando deploy em VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Não execute este script como root. Use um usuário com sudo."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker não encontrado. Instalando Docker..."
    
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    
    print_warning "Docker instalado. Você precisa fazer logout/login para usar Docker sem sudo."
    print_warning "Ou execute: newgrp docker"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_status "Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Criando arquivo .env..."
    cp .env.example .env
    
    print_warning "Configure o arquivo .env com suas credenciais:"
    print_warning "- OPENAI_API_KEY (obrigatório)"
    print_warning "- POSTGRES_PASSWORD (altere a senha padrão)"
    print_warning "- SESSION_SECRET (altere a chave padrão)"
    print_warning ""
    print_warning "Execute: nano .env"
    print_warning "Depois execute novamente: ./deploy.sh"
    exit 1
fi

# Check required environment variables
print_status "Verificando variáveis de ambiente..."

if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    print_error "OPENAI_API_KEY não configurada no arquivo .env"
    print_warning "Obtenha sua chave em: https://platform.openai.com/api-keys"
    exit 1
fi

if grep -q "your-super-secret-session-key-change-this" .env; then
    print_error "Altere SESSION_SECRET no arquivo .env para uma chave segura"
    exit 1
fi

if grep -q "datafog_secure_password" .env; then
    print_warning "Recomendado: altere POSTGRES_PASSWORD no arquivo .env"
fi

# Create necessary directories
print_status "Criando diretórios necessários..."
mkdir -p uploads/sftp/incoming
mkdir -p uploads/processed
mkdir -p logs
mkdir -p ssl

# Set permissions
chmod 755 uploads/sftp/incoming
chmod 755 uploads/processed
chmod 755 logs

# Pull latest images
print_status "Baixando imagens Docker..."
docker-compose pull postgres redis

# Build application
print_status "Construindo aplicação..."
docker-compose build app

# Run database migrations
print_status "Executando migrações do banco de dados..."
docker-compose up -d postgres redis
sleep 10

# Wait for database to be ready
print_status "Aguardando banco de dados ficar pronto..."
until docker-compose exec -T postgres pg_isready -U datafog_user -d datafog; do
    sleep 2
done

# Run Drizzle migrations
print_status "Aplicando schema do banco de dados..."
docker-compose run --rm app npx drizzle-kit push:pg || true

# Start all services
print_status "Iniciando todos os serviços..."
docker-compose up -d

# Wait for application to be ready
print_status "Aguardando aplicação ficar pronta..."
sleep 15

# Health check
print_status "Verificando saúde da aplicação..."
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    print_status "✅ Aplicação rodando com sucesso!"
    print_status "🌐 Acesse: http://localhost:5000"
    print_status "📊 Logs: docker-compose logs -f app"
    print_status "🔧 Parar: docker-compose down"
else
    print_error "❌ Aplicação não está respondendo"
    print_error "Verifique os logs: docker-compose logs app"
    exit 1
fi

# Show running containers
print_status "Containers em execução:"
docker-compose ps

# Show useful commands
echo ""
print_status "=== Comandos Úteis ==="
echo "Ver logs:           docker-compose logs -f app"
echo "Parar aplicação:    docker-compose down"
echo "Reiniciar:          docker-compose restart app"
echo "Backup banco:       docker-compose exec postgres pg_dump -U datafog_user datafog > backup.sql"
echo "Shell da app:       docker-compose exec app sh"
echo "Atualizar:          git pull && docker-compose build app && docker-compose up -d app"

print_status "Deploy concluído com sucesso! 🚀"