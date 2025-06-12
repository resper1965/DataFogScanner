#!/bin/bash

echo "🔄 Script de Transferência - PII Detector n.CrisisOps para GitHub"
echo "================================================================"

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependências
if ! command_exists git; then
    echo "❌ Git não encontrado. Instale o Git primeiro."
    exit 1
fi

echo "📋 Este script irá preparar o sistema para transferência para seu GitHub"
echo ""
echo "Opções disponíveis:"
echo "1) Preparar arquivos (limpar .git atual)"
echo "2) Criar commit inicial"
echo "3) Mostrar comandos para conectar ao seu repositório"
echo ""

read -p "Escolha uma opção (1-3): " choice

case $choice in
    1)
        echo "🧹 Limpando configuração Git atual..."
        rm -rf .git
        echo "✅ Diretório .git removido"
        
        echo "📝 Criando .gitignore atualizado..."
        cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite
*.sqlite3

# Uploads
uploads/*
!uploads/.gitkeep

# Logs
logs/
*.log

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Docker
.docker/

# Temporary files
tmp/
temp/
EOF
        
        echo "🗂️ Criando estrutura de uploads..."
        mkdir -p uploads
        touch uploads/.gitkeep
        
        echo "✅ Preparação concluída!"
        echo ""
        echo "📋 Próximos passos:"
        echo "1. Execute: ./transfer-to-github.sh e escolha opção 2"
        echo "2. Crie um repositório no seu GitHub"
        echo "3. Execute: ./transfer-to-github.sh e escolha opção 3"
        ;;
        
    2)
        if [ -d ".git" ]; then
            echo "⚠️  Diretório .git já existe. Execute a opção 1 primeiro."
            exit 1
        fi
        
        echo "🔧 Inicializando repositório Git..."
        git init
        
        echo "📄 Adicionando arquivos..."
        git add .
        
        echo "💾 Criando commit inicial..."
        git commit -m "feat: initial commit - PII Detector n.CrisisOps system

Sistema completo de detecção de dados pessoais brasileiros:
- Frontend React/TypeScript responsivo
- Backend Node.js com processamento DataFog
- Filtros avançados para domínios específicos
- Sistema de relatórios e exportação
- Deploy Docker pronto para produção
- Branding n.CrisisOps integrado"

        echo "✅ Commit inicial criado!"
        echo ""
        echo "📋 Próximo passo:"
        echo "Execute: ./transfer-to-github.sh e escolha opção 3"
        ;;
        
    3)
        if [ ! -d ".git" ]; then
            echo "❌ Repositório Git não inicializado. Execute a opção 2 primeiro."
            exit 1
        fi
        
        echo "🔗 Comandos para conectar ao seu repositório GitHub:"
        echo ""
        echo "1. Crie um novo repositório no GitHub (se ainda não criou)"
        echo "2. Execute os comandos abaixo substituindo SEU_USUARIO e SEU_REPOSITORIO:"
        echo ""
        echo "git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git"
        echo "git branch -M main"
        echo "git push -u origin main"
        echo ""
        echo "📝 Exemplo:"
        echo "git remote add origin https://github.com/johndoe/pii-detector-ness.git"
        echo "git branch -M main"
        echo "git push -u origin main"
        echo ""
        echo "🔐 Se solicitado, use um Personal Access Token como senha"
        echo "📖 Mais info: https://docs.github.com/pt/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
        ;;
        
    *)
        echo "❌ Opção inválida. Execute novamente e escolha 1, 2 ou 3."
        exit 1
        ;;
esac

echo ""
echo "📚 Para mais informações, consulte: DEPLOY_TO_GITHUB.md"