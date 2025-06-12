#!/bin/bash

# DataFog PII Detector - Git Repository Setup Script
echo "=== DataFog PII Detector - Configuração do Repositório Git ==="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Git não encontrado. Instalando..."
    sudo apt update && sudo apt install -y git
fi

# Initialize repository if not already done
if [ ! -d ".git" ]; then
    print_step "Inicializando repositório Git..."
    git init
else
    print_warning "Repositório Git já existe"
fi

# Configure git user if not set
if [ -z "$(git config user.name)" ]; then
    echo "Configure seu nome de usuário Git:"
    read -p "Nome: " git_name
    git config user.name "$git_name"
fi

if [ -z "$(git config user.email)" ]; then
    echo "Configure seu email Git:"
    read -p "Email: " git_email
    git config user.email "$git_email"
fi

# Add all files
print_step "Adicionando arquivos ao repositório..."
git add .

# Show status
print_step "Status do repositório:"
git status

# Create initial commit
print_step "Criando commit inicial..."
git commit -m "feat: Initial commit - DataFog PII Detector

- Complete web application for Brazilian PII detection
- React/TypeScript frontend with Portuguese interface
- Node.js/Express backend with DataFog integration
- PostgreSQL database with Drizzle ORM
- Docker containerization for VPS deployment
- Security scanning with ClamAV
- Semantic AI analysis with OpenAI
- Case management system
- Real-time processing dashboard
- Brazilian document support (CPF, CNPJ, RG, CEP)
- SFTP integration for file monitoring
- Production-ready deployment scripts"

print_step "Repositório configurado com sucesso!"
echo ""
print_warning "Próximos passos:"
echo "1. Adicione o remote do seu repositório"
echo "2. Envie o código para o GitHub"
echo ""
print_warning "Comandos para conectar ao seu repositório:"
echo "git remote add origin https://github.com/resper1965/PIIDetector.git"
echo "git branch -M main"
echo "git push -u origin main"