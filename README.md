# PII Detector - Sistema de Detecção de Dados Sensíveis

Sistema avançado para detecção de informações pessoais identificáveis (PII) em documentos brasileiros com React, Node.js e análise de IA.

## Características

- 🔍 Detecção inteligente de CPF, CNPJ, RG, emails, telefones
- 🛡️ Scanner de segurança com verificação de malware  
- 📊 Relatórios e dashboards interativos
- 🤖 Validação semântica com OpenAI
- 📁 Suporte a PDF, DOC, XLS, TXT, CSV, XML
- 🚀 Processamento otimizado para produção

## Tecnologias

**Frontend**: React 18 + TypeScript + Tailwind CSS + Radix UI  
**Backend**: Node.js + Express + TypeScript + Drizzle ORM  
**Database**: PostgreSQL + Redis  
**AI**: DataFog + OpenAI API  
**Deploy**: PM2 + Nginx + Docker

## Instalação

```bash
git clone https://github.com/resper1965/DataFogScanner.git
cd DataFogScanner
sudo ./install.sh
```

O instalador configura automaticamente PostgreSQL, Redis, Node.js, Python, Nginx e firewall.

## Configuração

### Variáveis principais

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/pii_detector
OPENAI_API_KEY=sk-sua-chave  # opcional
MAX_FILE_SIZE=104857600
ENABLE_SEMANTIC_ANALYSIS=true
```

### Comandos úteis

```bash
# Status da aplicação
pm2 list
pm2 logs pii-detector

# Verificar serviços  
systemctl status postgresql redis-server nginx

# Backup
pg_dump pii_detector > backup.sql
```

## Tipos de Dados Detectados

- CPF (Cadastro de Pessoa Física)
- CNPJ (Cadastro Nacional da Pessoa Jurídica)
- RG (Registro Geral)
- Email, Telefone, CEP
- PIS/PASEP, NIRE

## Desenvolvimento

```bash
npm install
npm run db:push
npm run dev
```

## Acesso

Após instalação: `http://seu-servidor/`

Para SSL: `certbot --nginx -d seu-dominio.com`

## Licença

MIT License

---

Desenvolvido por E-NESS