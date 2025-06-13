# 🚀 Guia de Instalação Avançada - PII Detector n.CrisisOps

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Instalação Manual Completa](#instalação-manual-completa)
4. [Configuração Avançada](#configuração-avançada)
5. [Otimização de Performance](#otimização-de-performance)
6. [Segurança Empresarial](#segurança-empresarial)
7. [Monitoramento e Logs](#monitoramento-e-logs)
8. [Backup e Recuperação](#backup-e-recuperação)
9. [Escalabilidade](#escalabilidade)
10. [Troubleshooting Avançado](#troubleshooting-avançado)

---

## 🛠️ Pré-requisitos

### Sistema Operacional
- **Ubuntu 20.04+ LTS** (recomendado)
- **Debian 11+** (alternativo)
- **CentOS 8+** (suporte limitado)

### Hardware Mínimo
- **CPU**: 4 cores, 2.4GHz+
- **RAM**: 8GB (16GB recomendado)
- **Storage**: 100GB SSD (NVMe preferível)
- **Network**: 100Mbps+ (1Gbps para alto volume)

### Hardware Recomendado (Produção)
- **CPU**: 8+ cores, 3.0GHz+
- **RAM**: 32GB+
- **Storage**: 500GB+ NVMe SSD
- **Network**: 1Gbps+
- **GPU**: Opcional para processamento IA local

### Domínios e DNS
- Domínio configurado apontando para o servidor
- Certificados SSL (Let's Encrypt ou comercial)
- Subdominios opcionais (api.seudominio.com, admin.seudominio.com)

---

## 🏗️ Arquitetura do Sistema

### Componentes Principais
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend     │    │    Database     │
│   React/TS      │◄──►│   Node.js/TS    │◄──►│   PostgreSQL    │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Processing    │    │     Redis       │
│  Proxy/Static   │    │    Python       │    │  Cache/Session  │
│   Port: 80/443  │    │   DataFog/AI    │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Fluxo de Dados
1. **Upload** → Nginx → Backend → Storage
2. **Processing** → Queue → Python DataFog → Database
3. **Analysis** → OpenAI API → Semantic Validation
4. **Results** → Cache → Frontend → Dashboard

---

## 🔧 Instalação Manual Completa

### Etapa 1: Preparação do Sistema

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências base
sudo apt install -y curl wget git build-essential software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release unzip

# Configurar locale
sudo locale-gen pt_BR.UTF-8
sudo update-locale LANG=pt_BR.UTF-8

# Configurar timezone
sudo timedatectl set-timezone America/Sao_Paulo

# Criar usuário da aplicação
sudo useradd -m -s /bin/bash -G sudo,www-data piidetector
sudo passwd piidetector
```

### Etapa 2: Instalação PostgreSQL Avançada

```bash
# Instalar PostgreSQL 15
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib-15 postgresql-15-plpython3

# Configurar PostgreSQL para performance
sudo tee /etc/postgresql/15/main/postgresql.conf.d/performance.conf << EOF
# Performance tuning
shared_buffers = 2GB                    # 25% da RAM
effective_cache_size = 6GB              # 75% da RAM
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1                  # Para SSD
effective_io_concurrency = 200          # Para SSD
work_mem = 32MB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Logging para auditoria
log_destination = 'csvlog'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
EOF

# Configurar autenticação
sudo tee -a /etc/postgresql/15/main/pg_hba.conf << EOF

# Configuração para aplicação
local   pii_detector    piidetector                     md5
host    pii_detector    piidetector     127.0.0.1/32    md5
host    pii_detector    piidetector     ::1/128         md5
EOF

# Reiniciar PostgreSQL
sudo systemctl restart postgresql

# Criar database e usuário
sudo -u postgres createuser -P piidetector
sudo -u postgres createdb -O piidetector pii_detector

# Configurar extensões
sudo -u postgres psql -d pii_detector -c "
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";
CREATE EXTENSION IF NOT EXISTS \"btree_gin\";
CREATE EXTENSION IF NOT EXISTS \"pg_stat_statements\";
"
```

### Etapa 3: Instalação Redis Avançada

```bash
# Instalar Redis
sudo apt install -y redis-server

# Configurar Redis para performance
sudo tee /etc/redis/redis.conf.d/performance.conf << EOF
# Performance
maxmemory 1gb
maxmemory-policy allkeys-lru
tcp-keepalive 300
timeout 0

# Persistence otimizada
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Segurança
requirepass $(openssl rand -base64 32)
bind 127.0.0.1
protected-mode yes
EOF

# Reiniciar Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### Etapa 4: Instalação Node.js e Python

```bash
# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Python 3.11 e dependências
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Instalar ferramentas de build Python
sudo apt install -y python3.11-distutils python3-setuptools

# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar PM2 startup
sudo pm2 startup systemd -u piidetector --hp /home/piidetector
```

### Etapa 5: Instalação ClamAV (Antivírus)

```bash
# Instalar ClamAV
sudo apt install -y clamav clamav-daemon clamav-freshclam

# Configurar ClamAV
sudo tee /etc/clamav/clamd.conf.d/local.conf << EOF
# Performance
MaxThreads 4
MaxDirectoryRecursion 30
MaxFileSize 100M
MaxScanSize 100M

# Logging
LogFile /var/log/clamav/clamav.log
LogTime yes
LogSyslog yes
LogFacility LOG_LOCAL6
LogVerbose yes

# Network (opcional)
TCPSocket 3310
TCPAddr 127.0.0.1
EOF

# Atualizar definições de vírus
sudo freshclam

# Iniciar serviços
sudo systemctl enable clamav-daemon clamav-freshclam
sudo systemctl start clamav-daemon clamav-freshclam
```

### Etapa 6: Instalação Nginx Avançada

```bash
# Instalar Nginx
sudo apt install -y nginx nginx-extras

# Criar configuração avançada
sudo tee /etc/nginx/sites-available/pii-detector << 'EOF'
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

# Upstream servers
upstream backend {
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Upload limits
    client_max_body_size 100M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Upload routes with stricter rate limiting
    location /api/upload {
        limit_req zone=upload burst=5 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeouts for uploads
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
    
    # Root and other routes
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        access_log off;
        proxy_pass http://backend;
    }
    
    # Block common attack patterns
    location ~* (wp-admin|wp-login|xmlrpc|eval\(|base64_decode) {
        deny all;
        access_log off;
        log_not_found off;
        return 444;
    }
}
EOF

# Habilitar site
sudo ln -s /etc/nginx/sites-available/pii-detector /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## ⚙️ Configuração Avançada

### Configuração da Aplicação

```bash
# Mudar para usuário piidetector
sudo su - piidetector

# Criar estrutura de diretórios
mkdir -p {config,logs,uploads,backups,scripts,sftp,temp}
mkdir -p uploads/{pending,processing,completed,quarantine}

# Criar arquivo de configuração avançada
cat > config/.env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://piidetector:SUA_SENHA_AQUI@localhost:5432/pii_detector
PGUSER=piidetector
PGPASSWORD=SUA_SENHA_AQUI
PGDATABASE=pii_detector
PGHOST=localhost
PGPORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=SUA_SENHA_REDIS_AQUI

# Application Configuration
NODE_ENV=production
PORT=5000
SESSION_SECRET=SEU_SESSION_SECRET_256_BITS_AQUI
JWT_SECRET=SEU_JWT_SECRET_AQUI

# Upload Configuration
UPLOAD_DIR=/home/piidetector/uploads
MAX_FILE_SIZE=104857600  # 100MB
ALLOWED_EXTENSIONS=pdf,doc,docx,xls,xlsx,txt,csv,xml,zip
MAX_FILES_PER_UPLOAD=10

# Processing Configuration
MAX_CONCURRENT_JOBS=4
PROCESSING_TIMEOUT=300000  # 5 minutes
QUEUE_RETRY_ATTEMPTS=3
BATCH_SIZE=50

# Security Configuration
ENABLE_MALWARE_SCAN=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
QUARANTINE_SUSPICIOUS_FILES=true

# AI/ML Configuration
OPENAI_API_KEY=sk-seu-key-aqui
ENABLE_SEMANTIC_ANALYSIS=true
AI_CONFIDENCE_THRESHOLD=0.7
MAX_CONTEXT_LENGTH=2000

# SFTP Configuration
ENABLE_SFTP_MONITORING=true
SFTP_WATCH_DIR=/home/piidetector/sftp
SFTP_POLL_INTERVAL=30000  # 30 seconds

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=/home/piidetector/logs
MAX_LOG_SIZE=100MB
MAX_LOG_FILES=10

# Performance Configuration
ENABLE_CLUSTERING=true
CLUSTER_WORKERS=auto  # auto = CPU cores
ENABLE_COMPRESSION=true
CACHE_TTL=3600  # 1 hour

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000

# Email Configuration (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@empresa.com
SMTP_PASS=sua-senha-app
EMAIL_FROM=noreply@empresa.com

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESS=true

# Features Flags
ENABLE_CASE_MANAGEMENT=true
ENABLE_AUDIT_LOG=true
ENABLE_ADVANCED_REPORTS=true
ENABLE_USER_MANAGEMENT=true
ENABLE_API_RATE_LIMITING=true
EOF

# Criar script de inicialização avançado
cat > scripts/start.sh << 'EOF'
#!/bin/bash
set -e

# Configurar variáveis de ambiente
export NODE_ENV=production
export UV_THREADPOOL_SIZE=128

# Verificar dependências
echo "Verificando dependências..."
npm list --production > /dev/null 2>&1 || npm install --production

# Verificar conexões
echo "Verificando conectividade..."
pg_isready -h localhost -p 5432 -U piidetector || exit 1
redis-cli -p 6379 ping > /dev/null || exit 1

# Executar migrações se necessário
echo "Executando migrações..."
npm run db:push

# Iniciar aplicação com clustering
echo "Iniciando aplicação..."
exec node --max-old-space-size=4096 server/index.js
EOF

chmod +x scripts/start.sh
```

### Configuração PM2 Avançada

```bash
# Criar configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'pii-detector',
    script: './scripts/start.sh',
    cwd: '/home/piidetector/pii-detector',
    instances: 'max',
    exec_mode: 'cluster',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Restart conditions
    max_restarts: 10,
    min_uptime: '30s',
    max_memory_restart: '2G',
    
    // Logs
    log_file: '/home/piidetector/logs/app.log',
    error_file: '/home/piidetector/logs/error.log',
    out_file: '/home/piidetector/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Monitoring
    monitoring: true,
    pmx: true,
    
    // Auto restart on file changes (apenas desenvolvimento)
    watch: false,
    
    // Advanced options
    node_args: '--max-old-space-size=4096',
    kill_timeout: 10000,
    listen_timeout: 8000,
    
    // Environment variables file
    env_file: '/home/piidetector/config/.env'
  }]
};
EOF
```

---

## 🚀 Otimização de Performance

### Configuração de Cache Redis

```bash
# Criar configuração Redis personalizada
sudo tee /etc/redis/redis.conf.d/pii-detector.conf << EOF
# Memory optimization
maxmemory-policy allkeys-lru
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-entries 512
list-max-ziplist-value 64
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# Network optimization
tcp-keepalive 300
tcp-backlog 511
timeout 0

# Disk I/O optimization
stop-writes-on-bgsave-error no
rdbcompression yes
rdbchecksum yes

# Keyspace notifications (para cache invalidation)
notify-keyspace-events Ex
EOF
```

### Otimização Node.js

```bash
# Criar script de otimização
cat > scripts/optimize.sh << 'EOF'
#!/bin/bash

# Configurar limites do sistema
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "piidetector soft nproc 32768" | sudo tee -a /etc/security/limits.conf
echo "piidetector hard nproc 32768" | sudo tee -a /etc/security/limits.conf

# Configurar kernel parameters
sudo tee /etc/sysctl.d/99-pii-detector.conf << EOL
# Network optimizations
net.core.somaxconn = 1024
net.core.netdev_max_backlog = 5000
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_tw_reuse = 1

# File system optimizations
fs.file-max = 2097152
fs.nr_open = 1048576

# Virtual memory optimizations
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOL

# Aplicar configurações
sudo sysctl -p /etc/sysctl.d/99-pii-detector.conf

echo "Otimizações aplicadas. Reinicie o sistema para efeito completo."
EOF

chmod +x scripts/optimize.sh
./scripts/optimize.sh
```

---

## 🛡️ Segurança Empresarial

### Configuração Firewall UFW

```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (restrito a IPs específicos)
sudo ufw allow from 192.168.1.0/24 to any port 22
sudo ufw allow from SEU_IP_ESCRITORIO to any port 22

# Permitir HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir SFTP (restrito)
sudo ufw allow from 192.168.1.0/24 to any port 22

# Permitir acesso local para desenvolvimento
sudo ufw allow from 127.0.0.1

# Habilitar firewall
sudo ufw --force enable

# Ver status
sudo ufw status verbose
```

### Configuração Fail2Ban Avançada

```bash
# Instalar Fail2Ban
sudo apt install -y fail2ban

# Configurar filtros customizados
sudo tee /etc/fail2ban/filter.d/nginx-pii-detector.conf << 'EOF'
[Definition]
failregex = ^<HOST> -.*"(GET|POST|HEAD).*HTTP.*" (4|5)\d{2}
            ^<HOST> -.*"(GET|POST|HEAD).*(wp-admin|wp-login|xmlrpc|eval\(|base64_decode).*HTTP.*"
            ^<HOST> -.*"(GET|POST|HEAD).*HTTP.*" 400
ignoreregex =
EOF

# Configurar jail personalizado
sudo tee /etc/fail2ban/jail.d/pii-detector.conf << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-pii-detector]
enabled = true
filter = nginx-pii-detector
logpath = /var/log/nginx/access.log
maxretry = 10
bantime = 7200

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
bantime = 86400
EOF

# Reiniciar Fail2Ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

### Configuração SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Criar script de configuração SSL
cat > scripts/setup-ssl.sh << 'EOF'
#!/bin/bash
set -e

DOMAIN="$1"
EMAIL="$2"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Uso: $0 <dominio> <email>"
    echo "Exemplo: $0 pii.empresa.com admin@empresa.com"
    exit 1
fi

# Configurar domínio no Nginx
sudo sed -i "s/server_name _;/server_name $DOMAIN;/" /etc/nginx/sites-available/pii-detector

# Reiniciar Nginx
sudo nginx -t && sudo systemctl reload nginx

# Obter certificado SSL
sudo certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email

# Configurar renovação automática
sudo crontab -l 2>/dev/null | grep -v certbot || echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

echo "SSL configurado para $DOMAIN"
echo "Aplicação disponível em: https://$DOMAIN"
EOF

chmod +x scripts/setup-ssl.sh
```

---

## 📊 Monitoramento e Logs

### Configuração de Logs Avançada

```bash
# Criar configuração de logs
mkdir -p /home/piidetector/logs

# Configurar logrotate
sudo tee /etc/logrotate.d/pii-detector << 'EOF'
/home/piidetector/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 piidetector piidetector
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Configurar rsyslog para capturar logs da aplicação
sudo tee /etc/rsyslog.d/30-pii-detector.conf << 'EOF'
# PII Detector logs
local0.*    /var/log/pii-detector/app.log
local1.*    /var/log/pii-detector/security.log
local2.*    /var/log/pii-detector/performance.log
& stop
EOF

# Criar diretório de logs do sistema
sudo mkdir -p /var/log/pii-detector
sudo chown syslog:adm /var/log/pii-detector

# Reiniciar rsyslog
sudo systemctl restart rsyslog
```

### Script de Monitoramento

```bash
# Criar script de monitoramento
cat > scripts/monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/home/piidetector/logs/monitor.log"
ALERT_EMAIL="admin@empresa.com"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

check_service() {
    local service=$1
    if ! systemctl is-active --quiet "$service"; then
        log_message "ALERT: $service is not running"
        # Tentar reiniciar
        sudo systemctl restart "$service"
        if systemctl is-active --quiet "$service"; then
            log_message "INFO: $service restarted successfully"
        else
            log_message "ERROR: Failed to restart $service"
            # Enviar email de alerta (opcional)
            # echo "$service failed to restart" | mail -s "PII Detector Alert" "$ALERT_EMAIL"
        fi
    fi
}

check_disk_space() {
    local usage=$(df /home/piidetector | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    if [ "$usage" -gt 90 ]; then
        log_message "ALERT: Disk usage is $usage%"
        # Limpeza automática
        find /home/piidetector/uploads/completed -name "*" -mtime +30 -delete
        find /home/piidetector/logs -name "*.log.*" -mtime +7 -delete
    fi
}

check_memory() {
    local usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$usage" -gt 90 ]; then
        log_message "WARNING: Memory usage is $usage%"
        pm2 restart pii-detector
    fi
}

check_database() {
    if ! pg_isready -h localhost -p 5432 -U piidetector > /dev/null 2>&1; then
        log_message "ALERT: PostgreSQL is not responding"
        sudo systemctl restart postgresql
    fi
}

check_redis() {
    if ! redis-cli ping > /dev/null 2>&1; then
        log_message "ALERT: Redis is not responding"
        sudo systemctl restart redis-server
    fi
}

check_application() {
    if ! curl -s http://localhost:5000/health > /dev/null; then
        log_message "ALERT: Application is not responding"
        pm2 restart pii-detector
    fi
}

# Executar verificações
log_message "Starting monitoring checks"

check_service "postgresql"
check_service "redis-server"
check_service "nginx"
check_database
check_redis
check_application
check_disk_space
check_memory

log_message "Monitoring checks completed"
EOF

chmod +x scripts/monitor.sh

# Adicionar ao crontab para execução a cada 5 minutos
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/piidetector/scripts/monitor.sh") | crontab -
```

---

## 💾 Backup e Recuperação

### Sistema de Backup Automatizado

```bash
# Criar script de backup completo
cat > scripts/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/home/piidetector/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pii_detector_backup_$DATE"
RETENTION_DAYS=30

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_message "Starting backup process"

# Criar diretório de backup
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup do banco de dados
log_message "Backing up database"
pg_dump -h localhost -U piidetector -d pii_detector --verbose \
    --format=custom --compress=9 \
    --file="$BACKUP_DIR/$BACKUP_NAME/database.dump"

# Backup dos arquivos de configuração
log_message "Backing up configuration"
cp -r /home/piidetector/config "$BACKUP_DIR/$BACKUP_NAME/"

# Backup dos uploads (apenas metadados, não os arquivos)
log_message "Backing up upload metadata"
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/uploads"
find /home/piidetector/uploads -name "*.json" -exec cp {} "$BACKUP_DIR/$BACKUP_NAME/uploads/" \;

# Backup dos logs importantes
log_message "Backing up logs"
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/logs"
cp /home/piidetector/logs/*.log "$BACKUP_DIR/$BACKUP_NAME/logs/" 2>/dev/null || true

# Backup do código da aplicação (apenas se for customizado)
log_message "Backing up application code"
if [ -d "/home/piidetector/pii-detector" ]; then
    tar -czf "$BACKUP_DIR/$BACKUP_NAME/application.tar.gz" \
        -C /home/piidetector/pii-detector \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=uploads \
        --exclude=logs \
        .
fi

# Compactar backup completo
log_message "Compressing backup"
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Limpeza de backups antigos
log_message "Cleaning old backups"
find "$BACKUP_DIR" -name "pii_detector_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verificar integridade do backup
log_message "Verifying backup integrity"
if tar -tzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" > /dev/null; then
    log_message "Backup completed successfully: $BACKUP_NAME.tar.gz"
    echo "$BACKUP_NAME.tar.gz" > "$BACKUP_DIR/latest_backup.txt"
else
    log_message "ERROR: Backup verification failed"
    exit 1
fi

# Opcional: Upload para storage externo (S3, etc.)
# aws s3 cp "$BACKUP_DIR/$BACKUP_NAME.tar.gz" s3://seu-bucket/backups/
EOF

chmod +x scripts/backup.sh

# Criar script de restauração
cat > scripts/restore.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_FILE="$1"
BACKUP_DIR="/home/piidetector/backups"

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: $0 <arquivo_backup.tar.gz>"
    echo "Backups disponíveis:"
    ls -la "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "Nenhum backup encontrado"
    exit 1
fi

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_message "Starting restore process from $BACKUP_FILE"

# Extrair backup
RESTORE_DIR="/tmp/pii_restore_$$"
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
BACKUP_PATH="$RESTORE_DIR/$BACKUP_NAME"

# Parar aplicação
log_message "Stopping application"
pm2 stop pii-detector || true

# Restaurar banco de dados
if [ -f "$BACKUP_PATH/database.dump" ]; then
    log_message "Restoring database"
    dropdb -h localhost -U piidetector pii_detector || true
    createdb -h localhost -U piidetector pii_detector
    pg_restore -h localhost -U piidetector -d pii_detector \
        --verbose --clean --if-exists "$BACKUP_PATH/database.dump"
fi

# Restaurar configurações
if [ -d "$BACKUP_PATH/config" ]; then
    log_message "Restoring configuration"
    cp -r "$BACKUP_PATH/config/"* /home/piidetector/config/
fi

# Restaurar aplicação se presente
if [ -f "$BACKUP_PATH/application.tar.gz" ]; then
    log_message "Restoring application code"
    cd /home/piidetector/pii-detector
    tar -xzf "$BACKUP_PATH/application.tar.gz"
    npm install --production
fi

# Limpeza
rm -rf "$RESTORE_DIR"

# Reiniciar aplicação
log_message "Starting application"
pm2 start pii-detector

log_message "Restore completed successfully"
EOF

chmod +x scripts/restore.sh

# Configurar backup automático diário
(crontab -l 2>/dev/null; echo "0 2 * * * /home/piidetector/scripts/backup.sh") | crontab -
```

---

## 📈 Escalabilidade

### Configuração para Múltiplos Servidores

```bash
# Criar configuração para load balancer
cat > scripts/setup-cluster.sh << 'EOF'
#!/bin/bash

# Para configuração multi-servidor, você precisará:

# 1. Servidor de banco de dados dedicado
# Configurar PostgreSQL para aceitar conexões remotas
# /etc/postgresql/15/main/postgresql.conf:
# listen_addresses = '*'
# 
# /etc/postgresql/15/main/pg_hba.conf:
# host pii_detector piidetector 0.0.0.0/0 md5

# 2. Servidor Redis dedicado
# /etc/redis/redis.conf:
# bind 0.0.0.0
# protected-mode yes
# requirepass SUA_SENHA_REDIS

# 3. Shared storage para uploads (NFS, S3, etc.)
# sudo apt install nfs-common
# sudo mount -t nfs4 servidor-nfs:/exports/pii-uploads /home/piidetector/uploads

# 4. Load balancer (HAProxy/Nginx)
# Configuração HAProxy para múltiplos backends

echo "Configuração de cluster requer servidores adicionais"
echo "Consulte a documentação para configuração multi-servidor"
EOF

chmod +x scripts/setup-cluster.sh
```

---

## 🔧 Troubleshooting Avançado

### Ferramentas de Diagnóstico

```bash
# Criar script de diagnóstico completo
cat > scripts/diagnose.sh << 'EOF'
#!/bin/bash

echo "=== DIAGNÓSTICO COMPLETO PII DETECTOR ==="
echo "Data: $(date)"
echo ""

echo "=== SISTEMA ==="
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "Uptime: $(uptime)"
echo "Load: $(cat /proc/loadavg)"
echo ""

echo "=== RECURSOS ==="
echo "CPU: $(nproc) cores"
echo "RAM: $(free -h | grep Mem | awk '{print $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $4}' | tr -d '\n') free"
echo ""

echo "=== SERVIÇOS ==="
services=("postgresql" "redis-server" "nginx" "clamav-daemon")
for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "✓ $service: RUNNING"
    else
        echo "✗ $service: STOPPED"
    fi
done
echo ""

echo "=== APLICAÇÃO ==="
if pm2 list | grep -q "pii-detector"; then
    echo "✓ PM2: RUNNING"
    pm2 show pii-detector | grep -E "(status|cpu|memory)"
else
    echo "✗ PM2: NOT RUNNING"
fi
echo ""

echo "=== CONECTIVIDADE ==="
if pg_isready -h localhost -p 5432 -U piidetector > /dev/null 2>&1; then
    echo "✓ PostgreSQL: CONNECTED"
else
    echo "✗ PostgreSQL: DISCONNECTED"
fi

if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis: CONNECTED"
else
    echo "✗ Redis: DISCONNECTED"
fi

if curl -s http://localhost:5000/health > /dev/null; then
    echo "✓ Application: RESPONDING"
else
    echo "✗ Application: NOT RESPONDING"
fi
echo ""

echo "=== PORTAS ==="
netstat -tlnp | grep -E "(5000|5432|6379|80|443)"
echo ""

echo "=== LOGS RECENTES ==="
echo "--- Application Logs ---"
tail -10 /home/piidetector/logs/app.log 2>/dev/null || echo "No app logs found"
echo ""

echo "--- Error Logs ---"
tail -10 /home/piidetector/logs/error.log 2>/dev/null || echo "No error logs found"
echo ""

echo "--- System Logs ---"
journalctl -u pii-detector --no-pager -n 5 2>/dev/null || echo "No system logs found"
echo ""

echo "=== ESPAÇO EM DISCO ==="
df -h
echo ""

echo "=== PROCESSOS ==="
ps aux | grep -E "(node|postgres|redis|nginx)" | grep -v grep
echo ""

echo "=== DIAGNÓSTICO COMPLETO ==="
EOF

chmod +x scripts/diagnose.sh
```

### Coleta de Logs para Suporte

```bash
# Criar script de coleta de logs
cat > scripts/collect-logs.sh << 'EOF'
#!/bin/bash

COLLECTION_DIR="/tmp/pii-detector-logs-$(date +%Y%m%d_%H%M%S)"
ARCHIVE_NAME="pii-detector-logs-$(date +%Y%m%d_%H%M%S).tar.gz"

echo "Coletando logs para suporte..."

mkdir -p "$COLLECTION_DIR"

# Executar diagnóstico
./scripts/diagnose.sh > "$COLLECTION_DIR/diagnostic.txt"

# Coletar logs da aplicação
cp -r /home/piidetector/logs "$COLLECTION_DIR/" 2>/dev/null || true

# Coletar logs do sistema
journalctl -u postgresql --no-pager -n 100 > "$COLLECTION_DIR/postgresql.log" 2>/dev/null || true
journalctl -u redis-server --no-pager -n 100 > "$COLLECTION_DIR/redis.log" 2>/dev/null || true
journalctl -u nginx --no-pager -n 100 > "$COLLECTION_DIR/nginx.log" 2>/dev/null || true

# Coletar configurações (sem senhas)
cp /home/piidetector/config/.env "$COLLECTION_DIR/env-example.txt"
sed -i 's/=.*/=***HIDDEN***/' "$COLLECTION_DIR/env-example.txt"

# Coletar informações do PM2
pm2 list > "$COLLECTION_DIR/pm2-list.txt" 2>/dev/null || true
pm2 show pii-detector > "$COLLECTION_DIR/pm2-show.txt" 2>/dev/null || true

# Compactar
cd /tmp
tar -czf "$ARCHIVE_NAME" "$(basename "$COLLECTION_DIR")"
rm -rf "$COLLECTION_DIR"

echo "Logs coletados em: /tmp/$ARCHIVE_NAME"
echo "Envie este arquivo para o suporte técnico."
EOF

chmod +x scripts/collect-logs.sh
```

---

## ✅ Verificação Final

### Script de Verificação Completa

```bash
# Criar script de verificação final
cat > scripts/verify-installation.sh << 'EOF'
#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "✓ ${GREEN}$2${NC}"
    else
        echo -e "✗ ${RED}$2${NC}"
    fi
}

print_warning() {
    echo -e "⚠ ${YELLOW}$1${NC}"
}

echo "=== VERIFICAÇÃO DE INSTALAÇÃO AVANÇADA ==="
echo ""

# Verificar serviços
echo "Verificando serviços..."
systemctl is-active --quiet postgresql && pg_status=0 || pg_status=1
systemctl is-active --quiet redis-server && redis_status=0 || redis_status=1
systemctl is-active --quiet nginx && nginx_status=0 || nginx_status=1
systemctl is-active --quiet clamav-daemon && clamav_status=0 || clamav_status=1

print_status $pg_status "PostgreSQL"
print_status $redis_status "Redis"
print_status $nginx_status "Nginx"
print_status $clamav_status "ClamAV"

# Verificar conectividade
echo ""
echo "Verificando conectividade..."
pg_isready -h localhost -p 5432 -U piidetector > /dev/null 2>&1 && db_conn=0 || db_conn=1
redis-cli ping > /dev/null 2>&1 && redis_conn=0 || redis_conn=1

print_status $db_conn "Conexão PostgreSQL"
print_status $redis_conn "Conexão Redis"

# Verificar aplicação
echo ""
echo "Verificando aplicação..."
pm2 list | grep -q "pii-detector" && pm2_status=0 || pm2_status=1
curl -s http://localhost:5000/health > /dev/null && app_status=0 || app_status=1

print_status $pm2_status "PM2 Process"
print_status $app_status "Application Health"

# Verificar configurações
echo ""
echo "Verificando configurações..."
[ -f "/home/piidetector/config/.env" ] && env_status=0 || env_status=1
[ -d "/home/piidetector/uploads" ] && uploads_status=0 || uploads_status=1

print_status $env_status "Arquivo .env"
print_status $uploads_status "Diretório uploads"

# Verificar permissões
echo ""
echo "Verificando permissões..."
[ -w "/home/piidetector/uploads" ] && perm_status=0 || perm_status=1
print_status $perm_status "Permissões de escrita"

# Verificar firewall
echo ""
echo "Verificando segurança..."
sudo ufw status | grep -q "Status: active" && fw_status=0 || fw_status=1
systemctl is-active --quiet fail2ban && f2b_status=0 || f2b_status=1

print_status $fw_status "Firewall UFW"
print_status $f2b_status "Fail2Ban"

# Verificar espaço em disco
echo ""
echo "Verificando recursos..."
usage=$(df /home/piidetector | awk 'NR==2 {print $5}' | cut -d'%' -f1)
if [ "$usage" -lt 80 ]; then
    disk_status=0
else
    disk_status=1
fi
print_status $disk_status "Espaço em disco ($usage% usado)"

# Verificar performance
echo ""
echo "Verificando performance..."
load=$(cat /proc/loadavg | cut -d' ' -f1)
cores=$(nproc)
if (( $(echo "$load < $cores" | bc -l) )); then
    load_status=0
else
    load_status=1
fi
print_status $load_status "Load average ($load/$cores)"

# Resumo final
echo ""
echo "=== RESUMO ==="
total_checks=12
passed_checks=$((12 - pg_status - redis_status - nginx_status - clamav_status - db_conn - redis_conn - pm2_status - app_status - env_status - uploads_status - perm_status - fw_status - f2b_status - disk_status - load_status))

if [ $passed_checks -eq $total_checks ]; then
    echo -e "${GREEN}✓ Instalação completa e funcional! ($passed_checks/$total_checks)${NC}"
elif [ $passed_checks -gt 8 ]; then
    echo -e "${YELLOW}⚠ Instalação funcional com avisos ($passed_checks/$total_checks)${NC}"
else
    echo -e "${RED}✗ Problemas na instalação ($passed_checks/$total_checks)${NC}"
fi

echo ""
echo "Aplicação disponível em: http://$(hostname -I | awk '{print $1}'):5000"
echo "Para diagnóstico detalhado, execute: ./scripts/diagnose.sh"
EOF

chmod +x scripts/verify-installation.sh
```

---

## 🎯 Próximos Passos

Após completar a instalação avançada:

1. **Execute a verificação**: `./scripts/verify-installation.sh`
2. **Configure SSL**: `./scripts/setup-ssl.sh seudominio.com admin@empresa.com`
3. **Teste backup**: `./scripts/backup.sh`
4. **Configure monitoramento**: Verifique se o cron está rodando
5. **Teste upload**: Faça upload de um documento teste
6. **Configure usuários**: Crie as primeiras contas na aplicação
7. **Monitore logs**: `tail -f /home/piidetector/logs/app.log`

## 📞 Suporte

Para problemas ou dúvidas:
- Execute: `./scripts/diagnose.sh`
- Colete logs: `./scripts/collect-logs.sh`
- Consulte: `TROUBLESHOOTING_VPS.md`

---

**Instalação avançada completa! 🚀**