#!/bin/bash

# Script para Criação de Estrutura de Pastas VPS - PII Detector DataFog
# Cria todas as pastas necessárias com permissões corretas

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "📁 Criando Estrutura de Pastas VPS - PII Detector"
echo "================================================"

# Verificar se está executando como root
if [ "$EUID" -ne 0 ]; then
    print_error "Execute como root: sudo ./create-folders-vps.sh"
    exit 1
fi

# Variáveis de configuração
APP_USER="datafog"
BASE_DIR="/home/datafog"
APP_DIR="$BASE_DIR/pii-detector"
UPLOADS_DIR="$BASE_DIR/uploads"
SFTP_DIR="$UPLOADS_DIR/sftp"
LOG_DIR="/var/log/pii-detector"
BACKUP_DIR="$BASE_DIR/backups"
CONFIG_DIR="$BASE_DIR/config"
SSL_DIR="$BASE_DIR/ssl"
CACHE_DIR="$BASE_DIR/cache"
TEMP_DIR="$BASE_DIR/temp"

print_info "Criando usuário $APP_USER (se não existir)..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$APP_USER"
    print_status "Usuário $APP_USER criado"
else
    print_warning "Usuário $APP_USER já existe"
fi

print_info "Criando estrutura principal de diretórios..."

# Função para criar diretório com permissões
create_dir() {
    local dir=$1
    local owner=${2:-$APP_USER:$APP_USER}
    local perms=${3:-755}
    
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        chown "$owner" "$dir"
        chmod "$perms" "$dir"
        print_status "Criado: $dir ($owner, $perms)"
    else
        # Corrigir permissões se diretório já existe
        chown "$owner" "$dir"
        chmod "$perms" "$dir"
        print_warning "Já existe: $dir (permissões corrigidas)"
    fi
}

# 1. Diretórios principais
print_info "1. Criando diretórios principais..."
create_dir "$BASE_DIR" "$APP_USER:$APP_USER" "755"
create_dir "$APP_DIR" "$APP_USER:$APP_USER" "755"
create_dir "$CONFIG_DIR" "$APP_USER:$APP_USER" "700"
create_dir "$SSL_DIR" "$APP_USER:$APP_USER" "700"
create_dir "$CACHE_DIR" "$APP_USER:$APP_USER" "755"
create_dir "$TEMP_DIR" "$APP_USER:$APP_USER" "755"

# 2. Diretórios de uploads
print_info "2. Criando diretórios de uploads..."
create_dir "$UPLOADS_DIR" "$APP_USER:www-data" "755"
create_dir "$UPLOADS_DIR/temp" "$APP_USER:www-data" "755"
create_dir "$UPLOADS_DIR/processed" "$APP_USER:www-data" "755"
create_dir "$UPLOADS_DIR/quarantine" "$APP_USER:www-data" "750"
create_dir "$UPLOADS_DIR/archive" "$APP_USER:www-data" "755"

# 3. Estrutura SFTP
print_info "3. Criando estrutura SFTP..."
create_dir "$SFTP_DIR" "$APP_USER:$APP_USER" "755"
create_dir "$SFTP_DIR/incoming" "$APP_USER:$APP_USER" "700"
create_dir "$SFTP_DIR/processed" "$APP_USER:$APP_USER" "755"
create_dir "$SFTP_DIR/quarantine" "$APP_USER:$APP_USER" "750"
create_dir "$SFTP_DIR/failed" "$APP_USER:$APP_USER" "755"
create_dir "$SFTP_DIR/logs" "$APP_USER:$APP_USER" "755"

# 4. Diretórios de backup
print_info "4. Criando diretórios de backup..."
create_dir "$BACKUP_DIR" "$APP_USER:$APP_USER" "750"
create_dir "$BACKUP_DIR/daily" "$APP_USER:$APP_USER" "750"
create_dir "$BACKUP_DIR/weekly" "$APP_USER:$APP_USER" "750"
create_dir "$BACKUP_DIR/monthly" "$APP_USER:$APP_USER" "750"
create_dir "$BACKUP_DIR/database" "$APP_USER:$APP_USER" "750"
create_dir "$BACKUP_DIR/uploads" "$APP_USER:$APP_USER" "750"
create_dir "$BACKUP_DIR/config" "$APP_USER:$APP_USER" "700"

# 5. Diretórios de logs
print_info "5. Criando diretórios de logs..."
create_dir "$LOG_DIR" "$APP_USER:$APP_USER" "755"
create_dir "$LOG_DIR/app" "$APP_USER:$APP_USER" "755"
create_dir "$LOG_DIR/processing" "$APP_USER:$APP_USER" "755"
create_dir "$LOG_DIR/sftp" "$APP_USER:$APP_USER" "755"
create_dir "$LOG_DIR/security" "$APP_USER:$APP_USER" "755"
create_dir "$LOG_DIR/backup" "$APP_USER:$APP_USER" "755"
create_dir "$LOG_DIR/monitor" "$APP_USER:$APP_USER" "755"

# 6. Diretórios de trabalho da aplicação
print_info "6. Criando diretórios de trabalho..."
create_dir "$APP_DIR/uploads" "$APP_USER:www-data" "755"
create_dir "$APP_DIR/logs" "$APP_USER:$APP_USER" "755"
create_dir "$APP_DIR/temp" "$APP_USER:$APP_USER" "755"
create_dir "$APP_DIR/cache" "$APP_USER:$APP_USER" "755"
create_dir "$APP_DIR/scripts" "$APP_USER:$APP_USER" "755"
create_dir "$APP_DIR/data" "$APP_USER:$APP_USER" "755"

# 7. Diretórios do sistema
print_info "7. Criando diretórios do sistema..."
create_dir "/var/cache/pii-detector" "$APP_USER:$APP_USER" "755"
create_dir "/var/lib/pii-detector" "$APP_USER:$APP_USER" "755"
create_dir "/etc/pii-detector" "root:$APP_USER" "750"

# 8. Configurar links simbólicos
print_info "8. Criando links simbólicos..."
if [ ! -L "$APP_DIR/uploads" ]; then
    rm -rf "$APP_DIR/uploads" 2>/dev/null || true
    ln -sf "$UPLOADS_DIR" "$APP_DIR/uploads"
    print_status "Link criado: $APP_DIR/uploads -> $UPLOADS_DIR"
fi

if [ ! -L "$APP_DIR/logs" ]; then
    rm -rf "$APP_DIR/logs" 2>/dev/null || true
    ln -sf "$LOG_DIR" "$APP_DIR/logs"
    print_status "Link criado: $APP_DIR/logs -> $LOG_DIR"
fi

# 9. Criar arquivos de configuração básicos
print_info "9. Criando arquivos de configuração..."

# Arquivo .gitkeep para manter diretórios vazios no git
touch "$UPLOADS_DIR/temp/.gitkeep"
touch "$UPLOADS_DIR/processed/.gitkeep"
touch "$UPLOADS_DIR/quarantine/.gitkeep"
touch "$BACKUP_DIR/.gitkeep"
touch "$LOG_DIR/.gitkeep"

# Arquivo de configuração de diretórios
cat > "$CONFIG_DIR/directories.conf" << EOF
# Configuração de Diretórios - PII Detector DataFog
# Criado automaticamente em $(date)

BASE_DIR=$BASE_DIR
APP_DIR=$APP_DIR
UPLOADS_DIR=$UPLOADS_DIR
SFTP_DIR=$SFTP_DIR
LOG_DIR=$LOG_DIR
BACKUP_DIR=$BACKUP_DIR
CONFIG_DIR=$CONFIG_DIR
SSL_DIR=$SSL_DIR
CACHE_DIR=$CACHE_DIR
TEMP_DIR=$TEMP_DIR

# Usuário da aplicação
APP_USER=$APP_USER

# Status da criação
CREATED_AT=$(date -Iseconds)
SCRIPT_VERSION=1.0
EOF

chown "$APP_USER:$APP_USER" "$CONFIG_DIR/directories.conf"
chmod 644 "$CONFIG_DIR/directories.conf"

# 10. Criar script de verificação de estrutura
print_info "10. Criando script de verificação..."
cat > "$BASE_DIR/check-folders.sh" << 'EOF'
#!/bin/bash

# Script de Verificação da Estrutura de Pastas

CONFIG_FILE="/home/datafog/config/directories.conf"

if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo "❌ Arquivo de configuração não encontrado: $CONFIG_FILE"
    exit 1
fi

echo "🔍 Verificando estrutura de pastas..."

check_dir() {
    local dir=$1
    local expected_owner=$2
    local expected_perms=$3
    
    if [ -d "$dir" ]; then
        actual_owner=$(stat -c '%U:%G' "$dir")
        actual_perms=$(stat -c '%a' "$dir")
        
        if [ "$actual_owner" = "$expected_owner" ] && [ "$actual_perms" = "$expected_perms" ]; then
            echo "✅ $dir ($actual_owner, $actual_perms)"
        else
            echo "⚠️  $dir ($actual_owner, $actual_perms) - Esperado: ($expected_owner, $expected_perms)"
        fi
    else
        echo "❌ $dir - NÃO EXISTE"
    fi
}

echo "Diretórios principais:"
check_dir "$BASE_DIR" "datafog:datafog" "755"
check_dir "$APP_DIR" "datafog:datafog" "755"
check_dir "$CONFIG_DIR" "datafog:datafog" "700"

echo -e "\nDiretórios de uploads:"
check_dir "$UPLOADS_DIR" "datafog:www-data" "755"
check_dir "$UPLOADS_DIR/temp" "datafog:www-data" "755"
check_dir "$UPLOADS_DIR/processed" "datafog:www-data" "755"

echo -e "\nDiretórios SFTP:"
check_dir "$SFTP_DIR" "datafog:datafog" "755"
check_dir "$SFTP_DIR/incoming" "datafog:datafog" "700"
check_dir "$SFTP_DIR/processed" "datafog:datafog" "755"

echo -e "\nDiretórios de backup:"
check_dir "$BACKUP_DIR" "datafog:datafog" "750"
check_dir "$BACKUP_DIR/daily" "datafog:datafog" "750"

echo -e "\nDiretórios de logs:"
check_dir "$LOG_DIR" "datafog:datafog" "755"
check_dir "$LOG_DIR/app" "datafog:datafog" "755"

echo -e "\n📊 Verificação concluída!"
EOF

chmod +x "$BASE_DIR/check-folders.sh"
chown "$APP_USER:$APP_USER" "$BASE_DIR/check-folders.sh"

# 11. Criar script de limpeza
print_info "11. Criando script de limpeza..."
cat > "$BASE_DIR/cleanup-folders.sh" << 'EOF'
#!/bin/bash

# Script de Limpeza de Diretórios

echo "🧹 Iniciando limpeza de diretórios..."

# Limpar arquivos temporários (mais de 1 dia)
find /home/datafog/temp -type f -mtime +1 -delete 2>/dev/null || true
find /home/datafog/uploads/temp -type f -mtime +1 -delete 2>/dev/null || true

# Limpar arquivos processados antigos (mais de 30 dias)
find /home/datafog/uploads/processed -type f -mtime +30 -delete 2>/dev/null || true

# Limpar logs antigos (mais de 7 dias)
find /var/log/pii-detector -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Limpar cache antigo (mais de 3 dias)
find /home/datafog/cache -type f -mtime +3 -delete 2>/dev/null || true

# Limpar backups antigos (mais de 30 dias)
find /home/datafog/backups/daily -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true

# Remover diretórios vazios
find /home/datafog/uploads -type d -empty -delete 2>/dev/null || true

echo "✅ Limpeza concluída!"

# Mostrar uso de espaço
echo -e "\n📊 Uso atual de espaço:"
du -sh /home/datafog/* 2>/dev/null | sort -hr
EOF

chmod +x "$BASE_DIR/cleanup-folders.sh"
chown "$APP_USER:$APP_USER" "$BASE_DIR/cleanup-folders.sh"

# 12. Configurar rotação automática de limpeza
print_info "12. Configurando limpeza automática..."
echo "0 3 * * * /home/datafog/cleanup-folders.sh >> /var/log/pii-detector/cleanup.log 2>&1" | crontab -u "$APP_USER" -

# 13. Criar arquivo de status
cat > "$CONFIG_DIR/folder-status.json" << EOF
{
  "created_at": "$(date -Iseconds)",
  "version": "1.0",
  "user": "$APP_USER",
  "directories_created": true,
  "permissions_set": true,
  "scripts_installed": true,
  "cleanup_scheduled": true,
  "total_directories": $(find "$BASE_DIR" -type d | wc -l),
  "structure": {
    "base": "$BASE_DIR",
    "app": "$APP_DIR", 
    "uploads": "$UPLOADS_DIR",
    "sftp": "$SFTP_DIR",
    "logs": "$LOG_DIR",
    "backups": "$BACKUP_DIR",
    "config": "$CONFIG_DIR"
  }
}
EOF

chown "$APP_USER:$APP_USER" "$CONFIG_DIR/folder-status.json"
chmod 644 "$CONFIG_DIR/folder-status.json"

print_status "Estrutura de pastas criada com sucesso!"

echo ""
echo "=============================================="
echo "📁 ESTRUTURA DE PASTAS CRIADA!"
echo "=============================================="
echo ""
echo "📊 Resumo da estrutura:"
echo "  • Usuário: $APP_USER"
echo "  • Base: $BASE_DIR"
echo "  • Aplicação: $APP_DIR"
echo "  • Uploads: $UPLOADS_DIR"
echo "  • SFTP: $SFTP_DIR"
echo "  • Logs: $LOG_DIR"
echo "  • Backups: $BACKUP_DIR"
echo "  • Total de diretórios: $(find "$BASE_DIR" -type d | wc -l)"
echo ""
echo "🔧 Scripts criados:"
echo "  • $BASE_DIR/check-folders.sh - Verificar estrutura"
echo "  • $BASE_DIR/cleanup-folders.sh - Limpeza automática"
echo ""
echo "📋 Para verificar a estrutura:"
echo "  su - datafog"
echo "  ./check-folders.sh"
echo ""
echo "🧹 Limpeza automática agendada para 03:00 diariamente"
echo ""
echo "✅ Pronto para instalação da aplicação!"

# Executar verificação final
print_info "Executando verificação final..."
sudo -u "$APP_USER" "$BASE_DIR/check-folders.sh"