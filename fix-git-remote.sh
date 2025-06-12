#!/bin/bash

echo "Configurando remote correto para GitHub..."

# Limpar diretório .git problemático
rm -rf .git/index.lock 2>/dev/null || true

# Reconfigurar remote com token se necessário
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/resper1965/PIIDetector.git

# Verificar se remote foi configurado
git remote -v

echo ""
echo "Remote configurado. Para forçar push:"
echo "1. No painel Git do Replit (barra lateral)"
echo "2. Stage all changes"
echo "3. Commit: 'feat: sistema PII Detector completo'"
echo "4. Force push"
echo ""
echo "Ou use comandos manuais no terminal:"
echo "git add ."
echo "git commit -m 'feat: sistema PII Detector n.CrisisOps completo'"
echo "git push --force origin main"