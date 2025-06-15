#!/bin/bash
# ============================================================================
# n.PIIdetector - Instalação de Produção VPS
# ============================================================================
# Instalação completa e definitiva para VPS Ubuntu/Debian
# URL: https://github.com/resper1965/DataFogScanner.git
# Domínio: monster.e-ness.com.br
# ============================================================================

set -e

# Cores para output
G='\033[0;32m' # Verde
R='\033[0;31m' # Vermelho
Y='\033[1;33m' # Amarelo
B='\033[0;34m' # Azul
NC='\033[0m'   # Sem cor

log() { echo -e "${G}[$(date '+%H:%M:%S')] $1${NC}"; }
error() { echo -e "${R}[ERROR] $1${NC}"; exit 1; }
warn() { echo -e "${Y}[WARN] $1${NC}"; }
info() { echo -e "${B}[INFO] $1${NC}"; }

# Verificar se é executado como root
[[ $EUID -eq 0 ]] || error "Execute como root: sudo $0"

log "🚀 Instalação de Produção n.PIIdetector"

# ============================================================================
# 1. LIMPEZA COMPLETA
# ============================================================================
log "Limpando instalações anteriores..."

# Parar todos os processos
pkill -f node 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true
systemctl stop n-piidetector 2>/dev/null || true
systemctl disable n-piidetector 2>/dev/null || true

# Remover usuário e diretórios
userdel -rf piidetector 2>/dev/null || true
rm -rf /opt/n-piidetector /home/piidetector 2>/dev/null || true
rm -f /etc/systemd/system/n-piidetector.service 2>/dev/null || true

# Limpar PM2 global se existir
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

systemctl daemon-reload

log "✓ Limpeza concluída"

# ============================================================================
# 2. INSTALAÇÃO DE DEPENDÊNCIAS
# ============================================================================

log "Instalando dependências do sistema..."

export DEBIAN_FRONTEND=noninteractive
apt update -qq 2>/dev/null
apt install -y git curl build-essential postgresql postgresql-contrib redis-server nginx python3 python3-pip unzip rsync 2>/dev/null

# Remover versões antigas do Node.js/npm para evitar conflitos
if dpkg -s nodejs >/dev/null 2>&1 || dpkg -s npm >/dev/null 2>&1; then
    warn "Removendo pacotes antigos do Node.js e npm..."
    apt remove -y nodejs npm >/dev/null 2>&1 || true
fi

# Node.js 20
if ! node -v 2>/dev/null | grep -q "v20"; then
    info "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
    apt install -y nodejs 2>/dev/null
fi

# Instalar tsx globalmente
npm install -g tsx 2>/dev/null

# Python dependencies
info "Instalando dependências Python..."
if dpkg -s python3-typing-extensions >/dev/null 2>&1; then
    warn "Removendo pacote python3-typing-extensions..."
    apt remove -y python3-typing-extensions >/dev/null 2>&1 || true
fi
pip3 install --break-system-packages --ignore-installed typing_extensions \
    datafog PyPDF2 python-docx openpyxl pandas regex 2>/dev/null || \
pip3 install --ignore-installed typing_extensions \
    datafog PyPDF2 python-docx openpyxl pandas regex 2>/dev/null

log "✓ Dependências instaladas - Node: $(node -v) | NPM: $(npm -v)"

# ============================================================================
# 3. CONFIGURAÇÃO DO USUÁRIO
# ============================================================================
log "Criando usuário do sistema..."

useradd -r -m -s /bin/bash piidetector
mkdir -p /opt/n-piidetector
chown -R piidetector:piidetector /opt/n-piidetector /home/piidetector

log "✓ Usuário 'piidetector' criado"

# ============================================================================
# 4. DOWNLOAD DO CÓDIGO FONTE
# ============================================================================
log "Baixando código fonte do GitHub..."

cd /tmp
rm -rf DataFogScanner 2>/dev/null || true
git clone https://github.com/resper1965/DataFogScanner.git 2>/dev/null
rsync -a --exclude='.git' --exclude='node_modules' /tmp/DataFogScanner/ /opt/n-piidetector/
chown -R piidetector:piidetector /opt/n-piidetector

log "✓ Código fonte baixado para /opt/n-piidetector"

# ============================================================================
# 5. CONFIGURAÇÃO DO POSTGRESQL
# ============================================================================
log "Configurando PostgreSQL..."

systemctl start postgresql
systemctl enable postgresql

# Reset completo do banco
sudo -u postgres dropdb piidetector 2>/dev/null || true
sudo -u postgres dropuser piidetector 2>/dev/null || true
sudo -u postgres createuser -s piidetector
sudo -u postgres psql -c "ALTER USER piidetector PASSWORD 'pii_prod_$(date +%s)';"
sudo -u postgres createdb -O piidetector piidetector

# Configurar acesso local
PG_VERSION=$(ls /etc/postgresql/ | head -1)
if [[ -n "$PG_VERSION" ]]; then
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/$PG_VERSION/main/postgresql.conf
    echo "local all piidetector md5" >> /etc/postgresql/$PG_VERSION/main/pg_hba.conf
    systemctl restart postgresql
fi

log "✓ PostgreSQL configurado"

# ============================================================================
# 6. CONFIGURAÇÃO DO REDIS
# ============================================================================
log "Configurando Redis..."

systemctl start redis-server
systemctl enable redis-server

# Testar Redis
if redis-cli ping >/dev/null 2>&1; then
    log "✓ Redis funcionando"
else
    warn "Redis pode ter problemas"
fi

# ============================================================================
# 7. CONFIGURAÇÃO DA APLICAÇÃO
# ============================================================================
log "Configurando aplicação..."

cd /opt/n-piidetector

# Gerar senha segura para o banco
DB_PASS="pii_$(openssl rand -hex 16)"
SESSION_SECRET="$(openssl rand -hex 32)"

# Criar arquivo de ambiente
cat > .env << EOF
NODE_ENV=production
PORT=5000
DOMAIN=monster.e-ness.com.br
DATABASE_URL=postgresql://piidetector:${DB_PASS}@localhost:5432/piidetector
REDIS_URL=redis://localhost:6379
SESSION_SECRET=${SESSION_SECRET}
UPLOAD_DIR=./uploads
SFTP_DIR=./uploads/sftp
PYTHON_PATH=/usr/bin/python3
EOF

# Atualizar senha no PostgreSQL
sudo -u postgres psql -c "ALTER USER piidetector PASSWORD '${DB_PASS}';"

# Criar diretórios necessários
mkdir -p uploads/sftp logs
chown -R piidetector:piidetector /opt/n-piidetector

log "✓ Ambiente de produção configurado"

# ============================================================================
# 8. INSTALAÇÃO DE DEPENDÊNCIAS NODE.JS
# ============================================================================
log "Instalando dependências Node.js..."

sudo -u piidetector bash -c "cd /opt/n-piidetector && npm install --silent --production"
sudo -u piidetector bash -c "cd /opt/n-piidetector && npm install --silent redis connect-redis"

log "✓ Dependências Node.js instaladas"

# ============================================================================
# 9. BUILD DA APLICAÇÃO
# ============================================================================
log "Fazendo build da aplicação..."

sudo -u piidetector bash -c "cd /opt/n-piidetector && npm run build"

if [[ ! -d "/opt/n-piidetector/dist" ]]; then
    error "Build falhou - diretório dist não encontrado"
fi

log "✓ Build concluído"

# ============================================================================
# 10. APLICAR MIGRATIONS DO BANCO
# ============================================================================
log "Aplicando migrations do banco de dados..."

sudo -u piidetector bash -c "cd /opt/n-piidetector && npm run db:push"

log "✓ Migrations aplicadas"

# ============================================================================
# 11. CONFIGURAÇÃO DO SYSTEMD
# ============================================================================
log "Configurando serviço systemd..."

cat > /etc/systemd/system/n-piidetector.service << 'EOF'
[Unit]
Description=n.PIIdetector - Sistema de Detecção de PII Brasileiro
Documentation=https://github.com/resper1965/DataFogScanner
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=piidetector
Group=piidetector
WorkingDirectory=/opt/n-piidetector
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/tsx server/index.ts
Restart=always
RestartSec=10
KillMode=process
TimeoutSec=300
StandardOutput=journal
StandardError=journal
SyslogIdentifier=n-piidetector

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/n-piidetector/uploads /opt/n-piidetector/logs

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable n-piidetector

log "✓ Serviço systemd configurado"

# ============================================================================
# 12. CONFIGURAÇÃO DO NGINX
# ============================================================================
log "Configurando Nginx..."

cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name monster.e-ness.com.br;
    
    client_max_body_size 100M;
    client_body_timeout 300s;
    client_header_timeout 60s;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
        
        limit_req zone=api burst=20 nodelay;
    }
    
    # Static files caching
    location /static/ {
        alias /opt/n-piidetector/dist/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
    
    # Security - block sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Configuração de rate limit em contexto http
cat > /etc/nginx/conf.d/ratelimit.conf << 'EOF'
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
EOF

# Testar configuração do Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

log "✓ Nginx configurado e testado"

# ============================================================================
# 13. CONFIGURAÇÃO DO FIREWALL
# ============================================================================
log "Configurando firewall..."

# Reset e configuração do UFW
ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
ufw allow ssh >/dev/null 2>&1
ufw allow 'Nginx Full' >/dev/null 2>&1

# Ativar firewall
echo "y" | ufw enable >/dev/null 2>&1

log "✓ Firewall configurado"

# ============================================================================
# 14. INICIALIZAÇÃO DOS SERVIÇOS
# ============================================================================
log "Iniciando serviços..."

# Garantir que todos os serviços estão rodando
systemctl start postgresql redis-server nginx
systemctl start n-piidetector

# Aguardar inicialização completa
sleep 15

log "✓ Serviços iniciados"

# ============================================================================
# 15. VERIFICAÇÕES FINAIS
# ============================================================================
log "Executando verificações finais..."

# Status dos serviços críticos
services=("postgresql" "redis-server" "nginx" "n-piidetector")
all_services_ok=true

for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        info "✅ $service ativo"
    else
        warn "❌ $service inativo"
        all_services_ok=false
        journalctl -u "$service" --no-pager -n 5 2>/dev/null || true
    fi
done

# Teste de conectividade da API
sleep 5
if curl -s -f -m 10 http://localhost:5000 >/dev/null 2>&1; then
    info "✅ API respondendo na porta 5000"
elif curl -s -f -m 10 http://localhost:5000/health >/dev/null 2>&1; then
    info "✅ Health check OK"
else
    warn "❌ API não está respondendo"
    echo "Logs recentes da aplicação:"
    journalctl -u n-piidetector --no-pager -n 10 2>/dev/null || true
    all_services_ok=false
fi

# Verificar se o build foi criado corretamente
if [[ -d "/opt/n-piidetector/dist" && -f "/opt/n-piidetector/dist/index.html" ]]; then
    info "✅ Frontend build OK"
else
    warn "❌ Frontend build pode ter problemas"
fi

# ============================================================================
# 16. RESULTADO FINAL
# ============================================================================
echo
if $all_services_ok; then
    log "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
else
    warn "⚠️ INSTALAÇÃO CONCLUÍDA COM ALGUNS AVISOS"
fi

echo
info "🌐 URL Principal: http://monster.e-ness.com.br"
info "📁 Diretório da Aplicação: /opt/n-piidetector"
info "👤 Usuário do Sistema: piidetector"
info "🗄️ Banco de Dados: PostgreSQL (piidetector)"
info "📦 Cache: Redis"
info "🌐 Servidor Web: Nginx"
info "🎨 Recursos: Tema claro/escuro, Detecção PII, LGPD"
echo
log "📋 Comandos de Gerenciamento:"
echo "  systemctl status n-piidetector    # Status da aplicação"
echo "  systemctl restart n-piidetector   # Reiniciar aplicação"  
echo "  journalctl -u n-piidetector -f    # Logs em tempo real"
echo "  systemctl status nginx postgresql redis-server  # Status dos serviços"
echo "  ufw status                         # Status do firewall"
echo
info "🔐 Configurações de produção salvas em: /opt/n-piidetector/.env"
echo

# Mostrar status final dos serviços
log "📊 Status Final dos Serviços:"
systemctl status n-piidetector --no-pager -l --lines=3 2>/dev/null || true

echo
log "✅ n.PIIdetector está pronto para produção!"
log "🚀 Acesse http://monster.e-ness.com.br para usar o sistema"