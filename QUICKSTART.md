# DataFog PII Detector - Guia Rápido

## 🚀 Setup do Repositório Git

### 1. Configurar Repositório Local
```bash
# Execute o script de configuração
./setup-git.sh
```

### 2. Criar Repositório no GitHub
1. Acesse: https://github.com/new
2. Nome: `datafog-pii-detector`
3. Descrição: `Sistema avançado para detecção de PII em documentos brasileiros`
4. Marque como **Público** ou **Privado**
5. NÃO inicialize com README (já temos)
6. Clique em **Create repository**

### 3. Conectar e Enviar Código
```bash
# Adicionar remote origin
git remote add origin https://github.com/SEU-USUARIO/datafog-pii-detector.git

# Enviar código
git branch -M main
git push -u origin main
```

## 📦 Deploy Rápido em VPS

### Pré-requisitos
- Ubuntu 20.04+ VPS (4GB RAM mínimo)
- Chave OpenAI API

### Comandos de Deploy
```bash
# 1. Clonar repositório na VPS
git clone https://github.com/SEU-USUARIO/datafog-pii-detector.git
cd datafog-pii-detector

# 2. Executar deploy automatizado
./deploy.sh

# 3. Configurar variáveis (.env será criado)
nano .env
# Adicionar: OPENAI_API_KEY=sk-sua-chave-aqui

# 4. Reiniciar aplicação
docker-compose restart app
```

## 🔧 Desenvolvimento Local

### Requisitos
- Node.js 20+
- Python 3.11+
- PostgreSQL (opcional - usa in-memory por padrão)

### Comandos
```bash
# Instalar dependências
npm install
pip install -r requirements.txt

# Modo desenvolvimento
npm run dev

# Acessar: http://localhost:5000
```

## 📚 Estrutura do Projeto

```
datafog-pii-detector/
├── client/              # Frontend React/TypeScript
├── server/              # Backend Node.js/Express
├── shared/              # Schemas compartilhados
├── docker-compose.yml   # Orquestração containers
├── Dockerfile          # Build da aplicação
├── deploy.sh           # Script de deploy VPS
└── setup-git.sh        # Configuração Git
```

## 🎯 Funcionalidades Principais

- **Detecção PII Brasileira**: CPF, CNPJ, RG, CEP, telefones
- **Processamento Inteligente**: Regex + IA semântica
- **Interface Portuguesa**: UX otimizada para Brasil
- **Segurança**: ClamAV antivírus integrado
- **Casos**: Gestão por cliente/projeto
- **Dashboard**: Monitoramento em tempo real
- **Docker**: Deploy production-ready

## 📞 Suporte

- **Logs**: `docker-compose logs -f app`
- **Status**: `curl localhost:5000/api/health`
- **Documentação**: Ver `DEPLOY_GUIDE.md`