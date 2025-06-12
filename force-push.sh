#!/bin/bash

echo "Forçando push completo para GitHub..."
echo "Repositório: https://github.com/resper1965/PIIDetector"

# Criar backup temporário do projeto
TEMP_DIR="/tmp/pii-detector-backup-$(date +%s)"
mkdir -p $TEMP_DIR

# Copiar todos os arquivos essenciais
cp -r client/ $TEMP_DIR/
cp -r server/ $TEMP_DIR/
cp -r shared/ $TEMP_DIR/
cp package*.json $TEMP_DIR/
cp tsconfig.json $TEMP_DIR/
cp vite.config.ts $TEMP_DIR/
cp tailwind.config.ts $TEMP_DIR/
cp postcss.config.js $TEMP_DIR/
cp components.json $TEMP_DIR/
cp drizzle.config.ts $TEMP_DIR/
cp Dockerfile $TEMP_DIR/
cp docker-compose.yml $TEMP_DIR/
cp *.md $TEMP_DIR/
cp *.sh $TEMP_DIR/

# Criar .gitignore
cat > $TEMP_DIR/.gitignore << 'EOF'
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
*.swp
.replit
replit.nix
tmp/
temp/
EOF

cd $TEMP_DIR

# Inicializar git limpo
git init
git config user.name "PII Detector Bot"
git config user.email "bot@piidetector.com"

# Adicionar remote
git remote add origin https://github.com/resper1965/PIIDetector.git

# Commit tudo
git add .
git commit -m "feat: sistema PII Detector n.CrisisOps completo

Sistema empresarial de detecção de dados pessoais brasileiros:
- Interface React/TypeScript moderna e responsiva
- Detecção avançada: CPF, CNPJ, RG, CEP, emails, telefones
- Filtros específicos para domínio @ness.com.br
- Sistema de relatórios com gráficos interativos
- Processamento DataFog + regex brasileiros
- Configurações operacionais completas
- Deploy Docker pronto para produção
- Branding n.CrisisOps integrado

Funcionalidades testadas e operacionais:
✓ Upload e processamento de arquivos
✓ Detecção em tempo real
✓ Filtros avançados funcionais
✓ Sistema de configurações
✓ Exportação CSV/PDF
✓ Notificações aprimoradas"

# Force push
git branch -M main
echo "Fazendo force push..."
git push --force origin main

if [ $? -eq 0 ]; then
    echo "✅ Push realizado com sucesso!"
    echo "Verifique: https://github.com/resper1965/PIIDetector"
else
    echo "❌ Erro no push. Tentando push normal..."
    git push origin main
fi

# Limpeza
cd /home/runner/workspace
rm -rf $TEMP_DIR

echo "Processo concluído!"