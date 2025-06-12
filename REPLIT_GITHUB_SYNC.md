# Sincronizar Replit com GitHub

## Método Integrado do Replit

### 1. Conectar repositório GitHub
1. No Replit, clique no ícone de **controle de versão** (lado esquerdo)
2. Clique em **"Connect to GitHub"**
3. Autorize o Replit a acessar sua conta GitHub
4. Selecione o repositório: `resper1965/PIIDetector`

### 2. Configurar sincronização
1. Após conectar, clique em **"Create Repl from repo"** ou **"Import from GitHub"**
2. Ou use **"Push to GitHub"** se já estiver trabalhando no projeto

### 3. Sincronização contínua
- Use o painel de controle de versão para commits
- Clique em **"Commit & Push"** para enviar mudanças
- Use **"Pull"** para receber atualizações do GitHub

## Método Manual Alternativo

### 1. Via interface web do GitHub
1. Acesse: https://github.com/resper1965/PIIDetector
2. Clique em **"Add file"** → **"Upload files"**
3. Arraste arquivos modificados do Replit
4. Faça commit das mudanças

### 2. Usando GitHub Codespaces
1. No repositório GitHub, clique em **"Code"** → **"Codespaces"**
2. Crie um novo Codespace
3. Copie arquivos do Replit para o Codespace
4. Use git normalmente no Codespace

## Arquivos para sincronizar

Principais arquivos que devem estar sincronizados:
- `client/` - Frontend completo
- `server/` - Backend com DataFog
- `shared/` - Schemas
- `package.json` - Dependências
- `docker-compose.yml` - Deploy
- `README.md` - Documentação
- Scripts: `deploy.sh`, `setup-git.sh`

## Deploy após sincronização

Uma vez sincronizado, o deploy em VPS funciona com:
```bash
git clone https://github.com/resper1965/PIIDetector.git
cd PIIDetector
./deploy.sh
```

O sistema DataFog PII Detector estará pronto para processamento em larga escala.