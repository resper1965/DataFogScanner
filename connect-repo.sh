#!/bin/bash

# Script para conectar ao repositório específico do usuário
echo "=== Conectando ao repositório PIIDetector ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Remove remote origin se existir
if git remote | grep -q "origin"; then
    print_step "Removendo remote origin existente..."
    git remote remove origin
fi

# Adiciona o remote correto
print_step "Adicionando remote origin..."
git remote add origin https://github.com/resper1965/PIIDetector.git

# Verifica se o remote foi adicionado
print_step "Verificando remote..."
git remote -v

# Configura branch main
print_step "Configurando branch main..."
git branch -M main

# Força o push inicial
print_step "Enviando código para o repositório..."
git push -u origin main --force

print_step "Repositório conectado com sucesso!"
echo "URL: https://github.com/resper1965/PIIDetector"