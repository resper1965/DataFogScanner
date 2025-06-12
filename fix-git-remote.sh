#!/bin/bash

# Script para corrigir problema de remote Git
echo "=== Corrigindo Remote Git ==="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se estamos em um repositório Git
if [ ! -d ".git" ]; then
    print_error "Não estamos em um repositório Git. Executando git init..."
    git init
    git add .
    git commit -m "Initial commit"
fi

# Mostrar remotes atuais
print_step "Remotes atuais:"
git remote -v

# Remover todos os remotes existentes
print_step "Removendo remotes existentes..."
for remote in $(git remote); do
    print_warning "Removendo remote: $remote"
    git remote remove $remote
done

# Adicionar o remote correto
print_step "Adicionando remote correto..."
git remote add origin https://github.com/resper1965/PIIDetector.git

# Verificar novamente
print_step "Verificando remote adicionado:"
git remote -v

# Configurar upstream e fazer push
print_step "Configurando branch main e fazendo push..."
git branch -M main

# Verificar se há commits
if git log --oneline -n 1 > /dev/null 2>&1; then
    print_step "Fazendo push para o repositório..."
    git push -u origin main --force-with-lease
else
    print_warning "Nenhum commit encontrado. Criando commit inicial..."
    git add .
    git commit -m "feat: Initial commit - DataFog PII Detector

Complete web application for Brazilian PII detection with:
- React/TypeScript frontend
- Node.js/Express backend  
- DataFog integration
- Docker deployment
- PostgreSQL database
- Security scanning
- AI semantic analysis"
    
    print_step "Fazendo push inicial..."
    git push -u origin main
fi

print_step "✅ Repositório configurado com sucesso!"
echo ""
print_step "🌐 Repositório disponível em:"
echo "https://github.com/resper1965/PIIDetector"
echo ""
print_warning "📋 Para deploy em VPS, execute:"
echo "git clone https://github.com/resper1965/PIIDetector.git"
echo "cd PIIDetector"
echo "./deploy.sh"