# Ness DataFog - Aplicação de Proteção de Dados

Uma aplicação web moderna em português para processamento e detecção de dados sensíveis em documentos brasileiros, desenvolvida pela Ness.

## Funcionalidades

### 🔒 Detecção de Dados Sensíveis
- **Documentos Brasileiros**: CPF, CNPJ, RG, Telefone, CEP
- **Dados Financeiros**: Contas bancárias, cartões de crédito, PIX
- **Documentos Pessoais**: CNH, Título de eleitor, Cartão SUS
- **Regex Personalizados**: Padrões customizáveis para necessidades específicas

### 📁 Upload e Processamento
- **Interface Web**: Upload via drag-and-drop
- **SFTP**: Monitoramento automático de diretório
- **Formatos Suportados**: PDF, DOC/DOCX, TXT, ZIP, CSV
- **Processamento em Lote**: Extração e análise de arquivos ZIP

### 📊 Dashboard em Tempo Real
- **Status de Processamento**: Acompanhamento em tempo real
- **Estatísticas**: Distribuição por nível de risco
- **Visualização**: Detecções por tipo de documento
- **Progresso**: Barras de progresso para cada arquivo

### 📈 Relatórios e Exportação
- **Formato JSON**: Relatórios estruturados
- **Formato CSV**: Compatível com Excel
- **Filtros**: Por arquivo, tipo de dados, nível de risco
- **Histórico**: Controle de processamentos anteriores

## Tecnologias

### Frontend
- **React + TypeScript**: Interface moderna e tipada
- **Tailwind CSS**: Design system responsivo
- **Shadcn/UI**: Componentes acessíveis
- **TanStack Query**: Gerenciamento de estado e cache
- **Wouter**: Roteamento leve

### Backend
- **Node.js + Express**: API RESTful
- **TypeScript**: Tipagem estática
- **PostgreSQL**: Banco de dados relacional
- **Drizzle ORM**: Type-safe database queries
- **Multer**: Upload de arquivos

### Processamento
- **DataFog Python**: Engine de detecção
- **Regex Brasileiros**: Padrões otimizados
- **ZIP Extraction**: Processamento de arquivos compactados
- **SFTP Monitor**: Monitoramento automático

## Instalação

### Pré-requisitos
```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.11+
sudo apt-get install python3.11 python3.11-pip

# PostgreSQL
sudo apt-get install postgresql postgresql-contrib
```

### Configuração do Projeto
```bash
# Clone o repositório
git clone <repository-url>
cd ness-datafog

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env

# Configure o banco de dados
npm run db:push

# Inicie o servidor
npm run dev
```

### Configuração SFTP (Opcional)
```bash
# Criar estrutura de diretórios
sudo mkdir -p /home/datafog/uploads/sftp/{incoming,processing,processed}
sudo mkdir -p /home/datafog/exports/{csv,json}

# Configurar usuário SFTP
sudo useradd -m -s /bin/bash datafog-sftp
sudo chown -R datafog-sftp:datafog-sftp /home/datafog/

# Ver SFTP_SETUP.md para configuração completa
```

## Uso

### Upload via Interface Web
1. Acesse a aplicação
2. Selecione "Upload de Arquivos"
3. Arraste arquivos ou clique para selecionar
4. Configure padrões de detecção
5. Clique em "Iniciar Processamento"

### Upload via SFTP
1. Configure credenciais SFTP
2. Envie arquivos ZIP para `/uploads/sftp/incoming/`
3. O sistema processa automaticamente
4. Resultados disponíveis no dashboard

### Visualização de Resultados
1. Acesse "Buscar Dados" ou "Dashboard"
2. Visualize detecções por nível de risco
3. Filtre por tipo de documento
4. Exporte relatórios em JSON/CSV

## Padrões de Detecção

### Documentos Pessoais
- **CPF**: Formato XXX.XXX.XXX-XX ou 11 dígitos
- **CNPJ**: Formato XX.XXX.XXX/XXXX-XX ou 14 dígitos
- **RG**: Diversos formatos estaduais
- **Telefone**: Celular e fixo brasileiro

### Documentos Financeiros
- **Conta Bancária**: Números de conta
- **Agência Bancária**: Códigos de agência
- **Cartão de Crédito**: 16 dígitos formatados

### Documentos Governamentais
- **CNH**: Carteira Nacional de Habilitação
- **Título de Eleitor**: 12 dígitos
- **Cartão SUS**: 15 dígitos
- **PIS/PASEP**: Formato XXX.XXXXX.XX-X

## API Endpoints

### Upload
- `POST /api/files/upload` - Upload de arquivos
- `GET /api/files` - Listar arquivos

### Processamento
- `POST /api/processing/start` - Iniciar processamento
- `GET /api/processing/jobs` - Status dos jobs
- `GET /api/processing/stats` - Estatísticas

### Resultados
- `GET /api/detections` - Listar detecções
- `GET /api/reports/export` - Exportar JSON
- `GET /api/reports/export/csv` - Exportar CSV

## Configuração de Desenvolvimento

### Estrutura do Projeto
```
├── client/           # Frontend React
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
├── server/           # Backend Node.js
│   ├── routes.ts
│   ├── storage.ts
│   └── datafog-processor.ts
├── shared/           # Tipos compartilhados
│   └── schema.ts
└── docs/            # Documentação
```

### Scripts Disponíveis
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run db:push      # Atualizar schema do banco
npm run lint         # Verificar código
npm run test         # Executar testes
```

## Segurança

### Proteção de Dados
- Criptografia de dados sensíveis
- Logs de auditoria
- Acesso controlado via SFTP
- Isolamento de processos

### Compliance
- LGPD - Lei Geral de Proteção de Dados
- Anonimização de dados sensíveis
- Relatórios de conformidade
- Controle de retenção

## Suporte

### Logs
- Aplicação: Console do browser
- Servidor: `npm run dev` logs
- SFTP: `/var/log/datafog/`
- Processamento: Logs em tempo real

### Troubleshooting
1. Verifique logs do servidor
2. Confirme configuração do banco
3. Valide permissões SFTP
4. Teste conectividade Python

## Contribuição

### Padrões de Código
- TypeScript estrito
- ESLint + Prettier
- Commits semânticos
- Testes unitários

### Workflow
1. Fork do repositório
2. Branch para feature
3. Implementação + testes
4. Pull request com descrição

---

Desenvolvido com ❤️ pela **Ness** para proteção de dados brasileiros.