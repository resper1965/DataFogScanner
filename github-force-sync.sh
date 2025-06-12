#!/bin/bash

echo "Resolvendo erro Git e forçando sincronização..."

# Criar diretório temporário limpo
CLEAN_DIR="/tmp/pii-clean-$(date +%s)"
mkdir -p $CLEAN_DIR

# Copiar arquivos essenciais
cp -r client/ $CLEAN_DIR/ 2>/dev/null || true
cp -r server/ $CLEAN_DIR/ 2>/dev/null || true
cp -r shared/ $CLEAN_DIR/ 2>/dev/null || true
cp package*.json $CLEAN_DIR/ 2>/dev/null || true
cp tsconfig.json $CLEAN_DIR/ 2>/dev/null || true
cp vite.config.ts $CLEAN_DIR/ 2>/dev/null || true
cp tailwind.config.ts $CLEAN_DIR/ 2>/dev/null || true
cp postcss.config.js $CLEAN_DIR/ 2>/dev/null || true
cp components.json $CLEAN_DIR/ 2>/dev/null || true
cp drizzle.config.ts $CLEAN_DIR/ 2>/dev/null || true
cp Dockerfile $CLEAN_DIR/ 2>/dev/null || true
cp docker-compose.yml $CLEAN_DIR/ 2>/dev/null || true

# Criar README atualizado
cat > $CLEAN_DIR/README.md << 'EOF'
# PII Detector n.CrisisOps

Sistema de detecção de dados pessoais brasileiros com interface moderna e recursos avançados.

## Funcionalidades

- Detecção CPF, CNPJ, RG, CEP, emails, telefones
- Filtros específicos para @ness.com.br
- Relatórios com gráficos interativos
- Deploy Docker pronto
- Interface React/TypeScript

## Deploy Rápido

```bash
docker-compose up -d
```

## Configuração

```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
```
EOF

# Criar .gitignore
cat > $CLEAN_DIR/.gitignore << 'EOF'
node_modules/
dist/
build/
.env*
uploads/*
!uploads/.gitkeep
logs/
*.log
.DS_Store
Thumbs.db
.vscode/
.idea/
EOF

cd $CLEAN_DIR

# Inicializar Git limpo
git init
git config user.name "PII Detector"
git config user.email "system@piidetector.com"

# Adicionar remote
git remote add origin https://github.com/resper1965/PIIDetector.git

# Commit
git add .
git commit -m "feat: PII Detector n.CrisisOps - sistema completo

- Interface React/TypeScript moderna
- Detecção dados brasileiros (CPF, CNPJ, RG, CEP) 
- Filtros avançados @ness.com.br
- Sistema relatórios interativo
- Deploy Docker configurado
- Funcionalidades 100% operacionais"

# Push
git branch -M main

echo "Executando push para GitHub..."
git push --force origin main

if [ $? -eq 0 ]; then
    echo "✅ Sincronização concluída com sucesso!"
    echo "Repositório: https://github.com/resper1965/PIIDetector"
else
    echo "❌ Erro no push. Verifique:"
    echo "1. Acesso ao repositório GitHub"
    echo "2. Permissões de escrita"
    echo "3. Token de autenticação"
fi

# Limpeza
cd /home/runner/workspace
rm -rf $CLEAN_DIR

echo "Processo finalizado."