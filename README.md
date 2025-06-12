# DataFog PII Detector

Sistema avançado para detecção de informações pessoais identificáveis (PII) em documentos brasileiros utilizando DataFog oficial, com interface moderna em português e processamento inteligente.

## 🚀 Deploy Rápido para VPS

### Pré-requisitos
- VPS com Ubuntu 20.04+ (mín. 4GB RAM, 2 CPU)
- Docker e Docker Compose
- Chave da OpenAI API

### Instalação
```bash
# 1. Clonar repositório
git clone <seu-repositorio>
cd datafog-pii-detector

# 2. Executar deploy automatizado
./deploy.sh
```

O script irá:
- Instalar Docker automaticamente
- Configurar PostgreSQL e Redis
- Criar arquivos de configuração
- Iniciar todos os serviços

### Configuração Obrigatória
Editar `.env`:
```bash
OPENAI_API_KEY=sk-sua-chave-aqui
POSTGRES_PASSWORD=senha-segura
SESSION_SECRET=chave-sessao-secreta
```

## 📋 Funcionalidades

### 🔍 Detecção de PII Brasileira
- **CPF**: Validação com dígitos verificadores
- **CNPJ**: Detecção de empresas brasileiras
- **RG**: Números de identidade regionais
- **CEP**: Códigos postais brasileiros
- **Telefones**: Celulares e fixos nacionais
- **Email**: Endereços eletrônicos
- **Endereços**: Logradouros completos

### 🧠 Processamento Inteligente
- **Regex Avançado**: Padrões específicos brasileiros
- **IA Semântica**: Validação contextual com OpenAI
- **Híbrido**: Combina ambas as abordagens
- **Redução de Falsos Positivos**: Análise de contexto

### 📁 Suporte a Arquivos
- **Formatos**: TXT, PDF, DOCX, XLSX
- **ZIP**: Extração automática de compactados
- **Múltiplos**: Upload simultâneo
- **Segurança**: Escaneamento antivírus (ClamAV)

### 🏢 Gestão de Casos
- **Informações do Cliente**: Nome, empresa, contato
- **Detalhes do Incidente**: Data, tipo, observações
- **Organização**: Agrupamento por projeto
- **Histórico**: Rastreamento completo

### 📊 Dashboard em Tempo Real
- **Status de Processamento**: Progresso visual
- **Estatísticas**: Contadores de detecções
- **Resultados Detalhados**: Contexto e posição
- **Classificação de Risco**: Alto, médio, baixo

## 🛠️ Arquitetura

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Banco**: PostgreSQL com Drizzle ORM
- **Cache**: Redis para sessões
- **IA**: OpenAI GPT-4o para análise semântica
- **PII Detection**: DataFog Python oficial
- **Segurança**: ClamAV antivírus

### Fluxo de Processamento
```
Upload → Validação → Extração → Regex → IA → Resultados
```

1. **Upload**: Validação de tipos e tamanhos
2. **Segurança**: Scan antivírus automático
3. **Extração**: Texto de PDFs/DOCs
4. **Detecção**: Regex + DataFog + OpenAI
5. **Classificação**: Análise de risco contextual
6. **Armazenamento**: Banco PostgreSQL

## 🔧 Comandos Úteis

### Docker
```bash
# Ver logs
docker-compose logs -f app

# Parar sistema
docker-compose down

# Reiniciar aplicação
docker-compose restart app

# Backup banco
docker-compose exec postgres pg_dump -U datafog_user datafog > backup.sql
```

### Desenvolvimento
```bash
# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Migrações banco
npm run db:push
```

## 📈 Otimização para Alto Volume

### Configurações Recomendadas
```env
# Processamento
MAX_CONCURRENT_JOBS=10
PROCESSING_TIMEOUT_MS=300000

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=500
MAX_FILE_SIZE=1073741824  # 1GB

# Pool de Conexões
DB_POOL_SIZE=20
```

### Scaling
- **Horizontal**: Múltiplas instâncias da aplicação
- **Load Balancer**: Nginx com SSL
- **Cache**: Redis distribuído
- **Storage**: Volume persistente

## 🔒 Segurança

### Medidas Implementadas
- **Antivírus**: ClamAV integrado
- **Validação**: Tipos de arquivo seguros
- **Rate Limiting**: Proteção contra abuso
- **Sessões**: Autenticação segura
- **HTTPS**: SSL/TLS em produção
- **Firewall**: Portas específicas

### Conformidade
- **LGPD**: Processamento local de dados
- **ISO 27001**: Práticas de segurança
- **SOC 2**: Controles de acesso

## 📞 Suporte

### Logs e Monitoramento
- **Health Check**: `/api/health`
- **Logs Estruturados**: JSON format
- **Métricas**: CPU, memória, disco
- **Alertas**: Falhas críticas

### Troubleshooting
```bash
# Status dos serviços
docker-compose ps

# Verificar conectividade
curl http://localhost:5000/api/health

# Logs detalhados
docker-compose logs --tail=100 app
```

## 🌟 Diferenciais

### Interface Brasileira
- **Português**: Idioma nativo completo
- **UX Otimizada**: Fluxo intuitivo
- **Responsiva**: Mobile e desktop
- **Acessível**: WCAG 2.1 compliant

### Performance
- **Processing**: DataFog oficial otimizado
- **Caching**: Redis para velocidade
- **Async**: Processamento não-bloqueante
- **Streaming**: Upload progressivo

### Escalabilidade
- **Microserviços**: Arquitetura modular
- **Docker**: Deploy consistente
- **Load Balancing**: Distribuição automática
- **Monitoramento**: Observabilidade completa

---

**Desenvolvido especificamente para o mercado brasileiro com foco em dados sensíveis locais e conformidade com LGPD.**