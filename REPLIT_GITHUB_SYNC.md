# Sincronização Direta Replit ↔ GitHub

## Método 1: Via Interface Replit (Direto)

### 1. Conectar GitHub ao Replit
1. **Sidebar esquerda** → Clique no ícone **Git** (ou Version Control)
2. Se não aparece opção de conectar:
   - Vá em **Settings** (canto superior direito)
   - **Connected Services** → **Connect GitHub**
   - Autorize o Replit a acessar sua conta GitHub

### 2. Criar Repositório Diretamente
1. No painel Git do Replit, clique **"Create a Git repository"**
2. Escolha **"Connect to GitHub repository"**
3. Configure:
   - **Name**: `pii-detector-n-crisisops`
   - **Description**: `Sistema de detecção de dados pessoais brasileiros - n.CrisisOps`
   - **Visibility**: Private (recomendado)
4. Clique **"Create repository"**

### 3. Commit Inicial Automático
O Replit fará automaticamente:
- Commit de todos os arquivos atuais
- Push para o repositório GitHub
- Configuração do remote origin

### 4. Commits Futuros
Sempre que modificar algo:
1. **Git panel** → **Stage all changes**
2. **Commit message**: "feat: descrição da mudança"
3. **Commit & Push**

## Método 2: GitHub CLI no Replit

Se a interface não funcionar:

```bash
# Instalar GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install -y gh

# Autenticar (usar Personal Access Token)
gh auth login --with-token

# Criar repositório e sincronizar
gh repo create pii-detector-n-crisisops \
  --private \
  --description "Sistema de detecção de dados pessoais brasileiros - n.CrisisOps" \
  --clone=false

# Configurar remote (se necessário limpar Git)
rm -rf .git
git init
git add .
git commit -m "feat: sistema PII Detector n.CrisisOps completo"
git branch -M main
git remote add origin https://github.com/$(gh api user --jq .login)/pii-detector-n-crisisops.git
git push -u origin main
```

## Método 3: Import Existing Repository

Se você já tem um repositório:

1. **Replit** → **Create Repl** → **Import from GitHub**
2. Cole a URL: `https://github.com/SEU_USUARIO/pii-detector-n-crisisops`
3. O Replit sincronizará automaticamente

## Status Atual do Projeto

✅ **Arquivos Prontos para Sync**:
- Frontend React completo
- Backend Node.js funcional  
- Database schema configurado
- Docker setup completo
- Documentação detalhada

✅ **Funcionalidades Testadas**:
- Upload e processamento de arquivos
- Detecção de dados brasileiros
- Filtros avançados @ness.com.br
- Sistema de relatórios
- Configurações operacionais

## Pós-Sincronização

### Deploy Imediato:
```bash
git clone https://github.com/SEU_USUARIO/pii-detector-n-crisisops.git
cd pii-detector-n-crisisops
docker-compose up -d
```

### Configuração Mínima:
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
OPENAI_API_KEY=sk-... # Opcional
```

O sistema está 100% pronto para sincronização e uso empresarial!