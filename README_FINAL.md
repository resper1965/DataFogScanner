# PII Detector n.CrisisOps - Sistema Completo

Sistema empresarial para detecção e análise de dados pessoais brasileiros com interface moderna e funcionalidades avançadas.

## Funcionalidades Implementadas

### ✅ Detecção de Dados Brasileiros
- CPF, CNPJ, RG, CEP, emails, telefones
- Validação semântica com OpenAI (opcional)
- Padrões personalizáveis via regex
- Processamento em lote de múltiplos arquivos

### ✅ Interface Moderna
- Design responsivo com React/TypeScript
- Sistema de notificações aprimorado
- Filtros avançados por domínio de email
- Exportação CSV e PDF com logo n.CrisisOps

### ✅ Relatórios Avançados
- Estatísticas em tempo real
- Gráficos interativos (Recharts)
- Filtros específicos: @ness.com.br, padrões CPF/CNPJ
- Busca no contexto das detecções

### ✅ Segurança Empresarial
- Escaneamento de malware (ClamAV)
- Verificação de arquivos suspeitos
- Sistema de casos para auditoria
- Monitoramento SFTP automático

### ✅ Deploy Pronto
- Docker multi-stage configurado
- PostgreSQL integrado
- Scripts de deploy automatizado
- Configuração para VPS/Cloud

## Transferência para GitHub

### Opção Simples (Recomendada)
1. No Replit, use "Download as ZIP"
2. Extraia em sua máquina local
3. Execute o script: `./transfer-to-github.sh`
4. Siga as instruções do script

### Opção Manual
```bash
# Remover .git atual
rm -rf .git

# Inicializar novo repositório
git init
git add .
git commit -m "feat: initial commit - PII Detector n.CrisisOps"

# Conectar ao seu GitHub
git remote add origin https://github.com/SEU_USUARIO/NOME_REPO.git
git branch -M main
git push -u origin main
```

## Deploy Imediato

### Local com Docker
```bash
docker-compose up -d
```

### VPS/Cloud
```bash
./deploy.sh
```

### Configuração Mínima
- `OPENAI_API_KEY`: Para validação semântica (opcional)
- `DATABASE_URL`: PostgreSQL (auto-configurado no Docker)

## Estrutura do Sistema

```
├── client/                 # Frontend React
│   ├── src/components/    # Componentes UI
│   ├── src/pages/        # Páginas principais
│   └── src/lib/          # Utilitários
├── server/                # Backend Node.js
│   ├── routes.ts         # APIs REST
│   ├── datafog-processor.ts  # Processamento
│   └── security-scanner.ts   # Segurança
├── shared/               # Schemas TypeScript
├── docker-compose.yml    # Deploy containers
├── Dockerfile           # Build produção
└── deploy.sh           # Script deploy VPS
```

## Filtros Implementados

### Básicos
- Tipo de detecção (CPF, CNPJ, RG, CEP, EMAIL)
- Nível de risco (Alto, Médio, Baixo)
- Período de datas

### Avançados
- **Domínio de email**: `ness.com.br`
- **Padrão CPF**: busca por sequências específicas
- **Padrão CNPJ**: filtro por números iniciais
- **Contexto**: busca em texto ao redor da detecção

### Filtros Rápidos
- Botão "Emails Ness" (filtro @ness.com.br)
- Botão "Apenas CPFs"
- Botão "Alto Risco"
- Botão "Buscar Gerente"

## Sistema Testado

- ✅ Upload e processamento de arquivos
- ✅ Detecção de 15 tipos de dados em arquivo real
- ✅ Filtros funcionando com dados @ness.com.br
- ✅ Limpeza de dados operacional
- ✅ Exportação CSV/PDF
- ✅ Sistema de configurações completo
- ✅ Notificações aprimoradas

O sistema está 100% funcional e pronto para uso empresarial imediato.