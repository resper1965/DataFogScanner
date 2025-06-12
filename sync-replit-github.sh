#!/bin/bash

# Script para sincronizar Replit com GitHub
echo "=== Sincronizando Replit com GitHub ==="

# Configurar Git se necessário
git config --global user.name "resper1965" 2>/dev/null || true
git config --global user.email "your-email@example.com" 2>/dev/null || true

# Verificar se já existe repositório local
if [ ! -d ".git" ]; then
    echo "Inicializando repositório Git..."
    git init
fi

# Adicionar todos os arquivos importantes
echo "Adicionando arquivos..."
git add .

# Fazer commit se houver mudanças
if ! git diff --cached --quiet; then
    echo "Fazendo commit das mudanças..."
    git commit -m "sync: Update from Replit

- DataFog PII Detector complete system
- Brazilian document processing
- Production Docker setup
- VPS deployment ready"
fi

# Configurar remote se não existir
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "Configurando remote GitHub..."
    git remote add origin https://github.com/resper1965/PIIDetector.git
fi

# Configurar branch main
git branch -M main

# Sincronizar com GitHub
echo "Sincronizando com GitHub..."
git pull origin main --allow-unrelated-histories --no-rebase || true
git push -u origin main

echo "✅ Sincronização concluída!"
echo "Repositório: https://github.com/resper1965/PIIDetector"