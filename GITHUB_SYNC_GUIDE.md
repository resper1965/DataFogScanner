# Sincronização Direta Replit → GitHub

## Método 1: Via Interface Replit (Mais Simples)

### Passo 1: Conectar GitHub no Replit
1. No Replit, vá para **Settings** → **Connected Services**
2. Conecte sua conta GitHub
3. No seu Repl, clique em **Version Control** (ícone Git)
4. Selecione **Create a Git repository**
5. Escolha **Connect to GitHub repository**

### Passo 2: Configurar Repositório
- Nome: `pii-detector-n-crisisops`
- Descrição: `Sistema de detecção de dados pessoais brasileiros - n.CrisisOps`
- Visibilidade: Private (recomendado para código empresarial)

### Passo 3: Commit Inicial
```
feat: sistema PII Detector n.CrisisOps completo

- Detecção de dados brasileiros (CPF, CNPJ, RG, CEP)
- Filtros avançados para @ness.com.br
- Sistema de relatórios com gráficos
- Interface React/TypeScript responsiva
- Deploy Docker pronto para produção
- Branding n.CrisisOps integrado
```

## Método 2: Download e Upload Manual

### Passo 1: Download do Replit
1. No Replit, clique nos **3 pontos** → **Download as ZIP**
2. Extraia o arquivo ZIP em sua máquina

### Passo 2: Criar Repositório GitHub
1. Vá para github.com/new
2. Nome: `pii-detector-n-crisisops`
3. Descrição: `Sistema de detecção de dados pessoais brasileiros - n.CrisisOps`
4. Deixe **Private**
5. NÃO marque "Add a README file"

### Passo 3: Upload via Terminal
```bash
cd caminho/para/codigo/extraido
git init
git add .
git commit -m "feat: sistema PII Detector n.CrisisOps completo"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/pii-detector-n-crisisops.git
git push -u origin main
```

### Passo 4: Upload via GitHub Web
1. No repositório criado, clique **uploading an existing file**
2. Arraste todos os arquivos do projeto
3. Commit message: `feat: sistema PII Detector n.CrisisOps completo`

## Método 3: GitHub CLI (Para Desenvolvedores)

```bash
# Instalar GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Autenticar
gh auth login

# Criar repositório e fazer push
gh repo create pii-detector-n-crisisops --private --description "Sistema de detecção de dados pessoais brasileiros - n.CrisisOps"
git remote add origin https://github.com/SEU_USUARIO/pii-detector-n-crisisops.git
git add .
git commit -m "feat: sistema PII Detector n.CrisisOps completo"
git push -u origin main
```

## Arquivos Já Prontos no Projeto

### ✅ Configuração Deploy
- `Dockerfile` - Build produção
- `docker-compose.yml` - Deploy completo
- `deploy.sh` - Script deploy VPS
- `.gitignore` - Arquivos a ignorar

### ✅ Documentação
- `README_FINAL.md` - Documentação completa
- `DEPLOY_TO_GITHUB.md` - Guia de deploy
- `SECURITY_FEATURES.md` - Recursos de segurança
- `QUICKSTART.md` - Início rápido

### ✅ Sistema Funcional
- Interface completa React/TypeScript
- Backend Node.js com APIs
- Processamento DataFog integrado
- Sistema de relatórios avançado
- Filtros específicos @ness.com.br

## Configuração Pós-Deploy

### Environment Variables
```bash
# Obrigatórias
DATABASE_URL=postgresql://user:pass@host:5432/dbname
OPENAI_API_KEY=sk-...

# Opcionais
NODE_ENV=production
PORT=5000
```

### Deploy Imediato
```bash
# Local
docker-compose up -d

# VPS
./deploy.sh

# Cloud (Heroku, Railway, etc.)
git push heroku main
```

O sistema está 100% pronto para sincronização e deploy imediato!