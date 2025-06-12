# Guia de Deploy - DataFog PII Detector

## 📋 Pré-requisitos

### VPS Recomendada
- **CPU**: 2+ cores
- **RAM**: 4GB+ (8GB recomendado para volumes altos)
- **Disco**: 20GB+ SSD
- **OS**: Ubuntu 20.04+ ou CentOS 7+
- **Rede**: Porta 80/443 abertas

### Serviços Externos
- **OpenAI API Key** (obrigatório)
- **Domínio** (opcional, para HTTPS)

## 🚀 Deploy Rápido

### 1. Preparar VPS
```bash
# Conectar na VPS
ssh root@seu-servidor.com

# Criar usuário (não use root)
adduser datafog
usermod -aG sudo datafog
su - datafog
```

### 2. Baixar Código
```bash
# Clonar o repositório
git clone <seu-repositorio>
cd datafog-pii-detector

# Dar permissão ao script
chmod +x deploy.sh
```

### 3. Executar Deploy
```bash
./deploy.sh
```

O script irá:
- Instalar Docker e Docker Compose
- Criar arquivo `.env`
- Configurar banco PostgreSQL
- Iniciar todos os serviços
- Verificar saúde da aplicação

### 4. Configurar Variáveis
Edite o arquivo `.env`:
```bash
nano .env
```

**Obrigatório configurar:**
```env
OPENAI_API_KEY=sk-sua-chave-aqui
POSTGRES_PASSWORD=senha-segura-aqui
SESSION_SECRET=chave-sessao-super-secreta
```

### 5. Reiniciar após configuração
```bash
docker-compose restart app
```

## 🔧 Configuração Detalhada

### Estrutura dos Serviços
```
┌─────────────────┐
│   Nginx (80)    │ ← Proxy reverso + SSL
└─────────────────┘
         │
┌─────────────────┐
│   App (5000)    │ ← Aplicação principal
└─────────────────┘
         │
├─────────────────┼─────────────────┐
│                 │                 │
▼                 ▼                 ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │    Redis    │ │  Volumes    │
│   (5432)    │ │   (6379)    │ │  (uploads)  │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Variáveis de Ambiente
```env
# === OBRIGATÓRIAS ===
OPENAI_API_KEY=sk-proj-xxxx           # Chave OpenAI
DATABASE_URL=postgresql://...         # URL do banco
SESSION_SECRET=chave-super-secreta    # Chave de sessão

# === SEGURANÇA ===
RATE_LIMIT_MAX_REQUESTS=100          # Max requests por IP
MAX_FILE_SIZE=104857600              # 100MB por arquivo
MAX_FILES_PER_UPLOAD=10              # Max arquivos por upload

# === PERFORMANCE ===
MAX_CONCURRENT_JOBS=5                # Jobs simultâneos
PROCESSING_TIMEOUT_MS=300000         # 5 min timeout

# === SFTP (OPCIONAL) ===
SFTP_HOST=sftp.exemplo.com
SFTP_USERNAME=usuario
SFTP_PASSWORD=senha
```

## 📊 Monitoramento

### Verificar Status
```bash
# Status dos containers
docker-compose ps

# Logs da aplicação
docker-compose logs -f app

# Logs do banco
docker-compose logs -f postgres

# Uso de recursos
docker stats
```

### Health Checks
```bash
# Verificar saúde da API
curl http://localhost:5000/api/health

# Verificar banco
docker-compose exec postgres pg_isready -U datafog_user
```

## 🔒 Segurança

### SSL/HTTPS (Produção)
1. Obter certificado SSL (Let's Encrypt)
```bash
# Instalar certbot
sudo apt install certbot

# Obter certificado
sudo certbot certonly --standalone -d seudominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/seudominio.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/seudominio.com/privkey.pem ssl/key.pem
```

2. Ativar Nginx com SSL
```bash
docker-compose --profile production up -d nginx
```

### Firewall
```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

## 📈 Otimização para Alto Volume

### 1. Recursos da VPS
```yaml
# Para alto volume, recomendado:
CPU: 4+ cores
RAM: 16GB+
Disco: 100GB+ SSD NVMe
```

### 2. Configurações Otimizadas
```env
# Aumentar limites
MAX_CONCURRENT_JOBS=10
RATE_LIMIT_MAX_REQUESTS=500
MAX_FILE_SIZE=1073741824  # 1GB

# Pool de conexões
DB_POOL_SIZE=20
REDIS_POOL_SIZE=10
```

### 3. Scaling Horizontal
```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  app:
    scale: 3  # 3 instâncias da aplicação
  
  # Load balancer
  nginx:
    depends_on:
      - app
```

## 🛠️ Comandos Úteis

### Gerenciamento
```bash
# Parar tudo
docker-compose down

# Reiniciar aplicação
docker-compose restart app

# Atualizar código
git pull
docker-compose build app
docker-compose up -d app

# Limpar volumes (CUIDADO!)
docker-compose down -v
```

### Backup
```bash
# Backup do banco
docker-compose exec postgres pg_dump -U datafog_user datafog > backup_$(date +%Y%m%d).sql

# Backup dos uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Restaurar banco
cat backup.sql | docker-compose exec -T postgres psql -U datafog_user datafog
```

### Logs e Debug
```bash
# Logs em tempo real
docker-compose logs -f --tail=100 app

# Entrar no container
docker-compose exec app sh

# Verificar uso de disco
docker system df
docker system prune  # Limpar unused
```

## 🔍 Troubleshooting

### Problemas Comuns

**Aplicação não inicia:**
```bash
# Verificar logs
docker-compose logs app

# Verificar variáveis
docker-compose exec app printenv | grep -E "(DATABASE|OPENAI)"
```

**Banco não conecta:**
```bash
# Status do PostgreSQL
docker-compose logs postgres

# Testar conexão
docker-compose exec postgres psql -U datafog_user -d datafog -c "SELECT 1;"
```

**Performance lenta:**
```bash
# Verificar recursos
docker stats

# Verificar disco
df -h
docker system df
```

**Uploads falhando:**
```bash
# Verificar permissões
ls -la uploads/
chmod -R 755 uploads/

# Verificar logs de upload
docker-compose logs app | grep -i upload
```

## 📞 Suporte

Para problemas específicos:
1. Verificar logs: `docker-compose logs app`
2. Testar health check: `curl localhost:5000/api/health`
3. Verificar recursos: `docker stats`
4. Consultar documentação oficial do DataFog

---

**Nota**: Este sistema está pronto para processamento em larga escala com DataFog oficial, detecção de PII brasileira e interface moderna em português.