#!/bin/bash

echo "Sincronização Replit → GitHub - PII Detector n.CrisisOps"
echo "======================================================="

# Verificar se estamos no Replit
if [ ! -f ".replit" ]; then
    echo "ERRO: Este script deve ser executado no ambiente Replit"
    exit 1
fi

echo "1. Preparando arquivos para sincronização..."

# Criar diretório temporário para o projeto limpo
mkdir -p /tmp/pii-detector-sync
cd /tmp/pii-detector-sync

# Copiar arquivos essenciais (excluindo node_modules, .git, etc.)
echo "2. Copiando arquivos do projeto..."
cp -r /home/runner/workspace/client .
cp -r /home/runner/workspace/server .
cp -r /home/runner/workspace/shared .
cp /home/runner/workspace/package.json .
cp /home/runner/workspace/package-lock.json .
cp /home/runner/workspace/tsconfig.json .
cp /home/runner/workspace/vite.config.ts .
cp /home/runner/workspace/tailwind.config.ts .
cp /home/runner/workspace/postcss.config.js .
cp /home/runner/workspace/components.json .
cp /home/runner/workspace/drizzle.config.ts .
cp /home/runner/workspace/Dockerfile .
cp /home/runner/workspace/docker-compose.yml .
cp /home/runner/workspace/deploy.sh .
cp /home/runner/workspace/README_FINAL.md .
cp /home/runner/workspace/GITHUB_SYNC_GUIDE.md .

# Criar .gitignore otimizado
echo "3. Criando .gitignore..."
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
Thumbs.db

# IDE files
.vscode/
.idea/

# Replit files
.replit
replit.nix

# Docker
.docker/

# Temporary files
tmp/
temp/
EOF

# Criar README específico para GitHub
echo "4. Criando README para GitHub..."
cat > README.md << 'EOF'
# PII Detector n.CrisisOps

Sistema empresarial para detecção e análise de dados pessoais brasileiros com interface moderna e funcionalidades avançadas.

## Características Principais

- 🔍 **Detecção Avançada**: CPF, CNPJ, RG, CEP, emails, telefones
- 🎯 **Filtros Específicos**: Busca por domínio @ness.com.br e padrões customizados
- 📊 **Relatórios Visuais**: Gráficos interativos e estatísticas em tempo real
- 🛡️ **Segurança**: Escaneamento de malware e verificação de arquivos
- 🚀 **Deploy Pronto**: Docker configurado para produção
- 🎨 **Design Moderno**: Interface responsiva com branding n.CrisisOps

## Início Rápido

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/pii-detector-n-crisisops.git
cd pii-detector-n-crisisops

# Deploy com Docker
docker-compose up -d

# Acesse: http://localhost:5000
```

## Configuração

```bash
# Variáveis de ambiente necessárias
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...  # Opcional para validação semântica
```

## Tecnologias

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Drizzle ORM
- **Database**: PostgreSQL
- **Deploy**: Docker, Nginx

## Licença

Proprietary - n.CrisisOps
EOF

echo "5. Iniciializando Git..."
git init
git add .
git commit -m "feat: sistema PII Detector n.CrisisOps completo

Sistema de detecção de dados pessoais brasileiros com:
- Interface React/TypeScript responsiva
- Filtros avançados para domínio @ness.com.br
- Sistema de relatórios com gráficos interativos
- Processamento DataFog + regex brasileiros
- Deploy Docker pronto para produção
- Branding n.CrisisOps integrado"

echo ""
echo "✅ Projeto preparado em: /tmp/pii-detector-sync"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Crie um repositório no GitHub: pii-detector-n-crisisops"
echo "2. Execute os comandos abaixo:"
echo ""
echo "cd /tmp/pii-detector-sync"
echo "git remote add origin https://github.com/SEU_USUARIO/pii-detector-n-crisisops.git"
echo "git branch -M main"
echo "git push -u origin main"
echo ""
echo "🔗 Substitua SEU_USUARIO pelo seu username do GitHub"
echo ""
echo "📦 Alternativamente, você pode comprimir a pasta e fazer upload manual:"
echo "tar -czf pii-detector-n-crisisops.tar.gz -C /tmp pii-detector-sync"
EOF

chmod +x sync-to-github.sh

echo "Script de sincronização criado com sucesso!"
echo ""
echo "Para sincronizar com o GitHub, execute:"
echo "./sync-to-github.sh"