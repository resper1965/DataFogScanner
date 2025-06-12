#!/bin/bash

echo "🔗 Conectando PII Detector n.CrisisOps ao GitHub"
echo "================================================"

# Verificar se GitHub CLI está instalado
if ! command -v gh &> /dev/null; then
    echo "📦 Instalando GitHub CLI..."
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update && sudo apt install -y gh
fi

echo "🔐 Para autenticar no GitHub:"
echo "1. Vá para: https://github.com/settings/tokens"
echo "2. Crie um Personal Access Token com permissões: repo, workflow"
echo "3. Cole o token quando solicitado"
echo ""

read -p "Pressione Enter para continuar com a autenticação..."

# Autenticar no GitHub
gh auth login --with-token

echo ""
echo "📝 Criando repositório no GitHub..."

# Criar repositório
gh repo create pii-detector-n-crisisops \
  --private \
  --description "Sistema de detecção de dados pessoais brasileiros - n.CrisisOps" \
  --clone=false

if [ $? -eq 0 ]; then
    echo "✅ Repositório criado com sucesso!"
    
    # Obter username
    USERNAME=$(gh api user --jq .login)
    
    echo ""
    echo "🎯 Próximos passos no Replit:"
    echo "1. No painel lateral esquerdo, clique no ícone Git"
    echo "2. Se aparecer 'Connect to GitHub', clique e autorize"
    echo "3. Use este repositório: https://github.com/$USERNAME/pii-detector-n-crisisops"
    echo ""
    echo "📋 Ou execute manualmente:"
    echo "git remote set-url origin https://github.com/$USERNAME/pii-detector-n-crisisops.git"
    echo "git push -u origin main"
    
else
    echo "❌ Erro ao criar repositório. Verifique se:"
    echo "- Você tem permissões suficientes"
    echo "- O nome do repositório não existe"
    echo "- O token tem as permissões corretas"
fi

echo ""
echo "💡 Alternativa via interface Replit:"
echo "1. Settings → Connected Services → Connect GitHub"
echo "2. Version Control → Create Git repository"
echo "3. Connect to GitHub repository"
echo "4. Nome: pii-detector-n-crisisops"