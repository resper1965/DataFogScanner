#!/bin/bash

echo "Configuração GitHub - PII Detector n.CrisisOps"
echo "=============================================="

# Criar arquivo de instruções para o usuário
cat > UPLOAD_TO_GITHUB.md << 'EOF'
# Como Sincronizar com GitHub

## Método 1: Criar Repositório Manualmente

1. **Ir para GitHub**: https://github.com/new
2. **Nome**: PIIDetector
3. **Descrição**: Sistema de detecção de dados pessoais brasileiros - n.CrisisOps
4. **Visibilidade**: Private
5. **NÃO marcar** "Add a README file"

## Método 2: Download + Upload

1. **No Replit**: Menu → Download as ZIP
2. **Extrair** o arquivo ZIP
3. **GitHub**: Arrastar arquivos para o repositório criado
4. **Commit**: "feat: sistema PII Detector n.CrisisOps completo"

## Método 3: Git Clone (Local)

```bash
# Baixar ZIP do Replit
# Extrair para pasta local
# Depois:

git init
git add .
git commit -m "feat: sistema PII Detector n.CrisisOps completo"
git branch -M main
git remote add origin https://github.com/resper1965/PIIDetector.git
git push -u origin main
```

## Arquivos Incluídos

- `client/` - Interface React completa
- `server/` - Backend Node.js funcional
- `shared/` - Schemas TypeScript
- `Dockerfile` - Deploy produção
- `docker-compose.yml` - Setup completo
- Documentação completa

## Deploy Imediato

```bash
docker-compose up -d
```

## Funcionalidades Prontas

- Detecção CPF, CNPJ, RG, CEP, emails, telefones
- Filtros avançados @ness.com.br
- Sistema de relatórios com gráficos
- Configurações operacionais
- Deploy Docker configurado
EOF

echo "Instruções criadas em: UPLOAD_TO_GITHUB.md"

# Mostrar opções disponíveis
echo ""
echo "OPÇÕES PARA SINCRONIZAR:"
echo ""
echo "1. DOWNLOAD ZIP (Mais Simples):"
echo "   - Menu Replit → Download as ZIP"
echo "   - Criar repositório no GitHub"
echo "   - Arrastar arquivos para o repositório"
echo ""
echo "2. INTERFACE REPLIT:"
echo "   - Sidebar → Git → Connect to GitHub"
echo "   - Autorizar conta GitHub"
echo "   - Create repository"
echo ""
echo "3. MANUAL COMMAND:"
echo "   - Primeiro criar repositório em: https://github.com/new"
echo "   - Nome: PIIDetector"
echo "   - Depois executar comandos Git"
echo ""
echo "Arquivo com instruções completas: UPLOAD_TO_GITHUB.md"