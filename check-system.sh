#!/bin/bash

# Script de Verificação do Sistema - PII Detector DataFog
# Verifica se todos os componentes estão funcionando corretamente

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "🔍 Verificação do Sistema PII Detector"
echo "====================================="

ERRORS=0
WARNINGS=0

# Função para incrementar contadores
error() {
    print_error "$1"
    ((ERRORS++))
}

warning() {
    print_warning "$1"
    ((WARNINGS++))
}

# Verificar se está rodando como usuário correto
if [ "$USER" != "datafog" ] && [ "$EUID" -ne 0 ]; then
    warning "Execute como usuário 'datafog' ou root para verificação completa"
fi

# 1. Verificar sistema operacional
print_info "1. Verificando sistema operacional..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_success "Sistema: $PRETTY_NAME"
else
    error "Arquivo /etc/os-release não encontrado"
fi

# 2. Verificar recursos do sistema
print_info "2. Verificando recursos do sistema..."

# RAM
TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
if [ "$TOTAL_RAM" -ge 2 ]; then
    print_success "RAM: ${TOTAL_RAM}GB (Suficiente)"
else
    warning "RAM: ${TOTAL_RAM}GB (Recomendado: 2GB+)"
fi

# Espaço em disco
DISK_SPACE=$(df -h / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "${DISK_SPACE%.*}" -ge 10 ]; then
    print_success "Espaço livre: ${DISK_SPACE}G (Suficiente)"
else
    warning "Espaço livre: ${DISK_SPACE}G (Recomendado: 10GB+)"
fi

# 3. Verificar dependências
print_info "3. Verificando dependências instaladas..."

check_command() {
    if command -v "$1" &> /dev/null; then
        VERSION=$($1 --version 2>/dev/null | head -1 || echo "Instalado")
        print_success "$1: $VERSION"
    else
        error "$1 não está instalado"
    fi
}

check_command node
check_command npm
check_command python3
check_command pip3
check_command psql
check_command redis-cli

# 4. Verificar serviços
print_info "4. Verificando serviços do sistema..."

check_service() {
    if systemctl is-active --quiet "$1"; then
        print_success "Serviço $1: Ativo"
    else
        error "Serviço $1: Inativo"
    fi
}

check_service postgresql
check_service redis-server
check_service nginx

# 5. Verificar estrutura de diretórios
print_info "5. Verificando estrutura de diretórios..."

check_directory() {
    if [ -d "$1" ]; then
        OWNER=$(stat -c '%U:%G' "$1")
        PERMS=$(stat -c '%a' "$1")
        print_success "$1 (${OWNER}, ${PERMS})"
    else
        error "Diretório $1 não existe"
    fi
}

check_directory "/home/datafog"
check_directory "/home/datafog/pii-detector"
check_directory "/home/datafog/uploads"
check_directory "/home/datafog/uploads/sftp"
check_directory "/var/log/pii-detector"

# 6. Verificar configurações
print_info "6. Verificando configurações..."

if [ -f "/home/datafog/config/.env" ]; then
    print_success "Arquivo .env encontrado"
    
    # Verificar variáveis essenciais
    if grep -q "DATABASE_URL=" "/home/datafog/config/.env"; then
        print_success "DATABASE_URL configurada"
    else
        error "DATABASE_URL não configurada"
    fi
    
    if grep -q "SESSION_SECRET=" "/home/datafog/config/.env"; then
        print_success "SESSION_SECRET configurada"
    else
        error "SESSION_SECRET não configurada"
    fi
else
    error "Arquivo .env não encontrado"
fi

# 7. Verificar conexões de rede
print_info "7. Verificando conectividade..."

# PostgreSQL
if pg_isready -h localhost -p 5432 &> /dev/null; then
    print_success "PostgreSQL: Conectável"
else
    error "PostgreSQL: Não conectável"
fi

# Redis
if redis-cli ping &> /dev/null; then
    print_success "Redis: Conectável"
else
    error "Redis: Não conectável"
fi

# Nginx
if curl -f http://localhost &> /dev/null; then
    print_success "Nginx: Respondendo"
else
    warning "Nginx: Não respondendo ou sem configuração"
fi

# 8. Verificar aplicação
print_info "8. Verificando aplicação..."

if [ -d "/home/datafog/pii-detector" ]; then
    cd /home/datafog/pii-detector
    
    if [ -f "package.json" ]; then
        print_success "package.json encontrado"
    else
        error "package.json não encontrado"
    fi
    
    if [ -d "node_modules" ]; then
        print_success "node_modules instalado"
    else
        warning "node_modules não encontrado (execute npm install)"
    fi
    
    # Verificar se PM2 está rodando a aplicação
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "pii-detector"; then
            STATUS=$(pm2 list | grep "pii-detector" | awk '{print $10}')
            if [ "$STATUS" = "online" ]; then
                print_success "PM2: Aplicação online"
            else
                error "PM2: Aplicação $STATUS"
            fi
        else
            warning "PM2: Aplicação não encontrada"
        fi
    else
        warning "PM2 não instalado"
    fi
fi

# 9. Verificar logs
print_info "9. Verificando logs..."

check_log() {
    if [ -f "$1" ]; then
        SIZE=$(du -h "$1" | cut -f1)
        print_success "$1 (${SIZE})"
    else
        warning "$1 não encontrado"
    fi
}

check_log "/var/log/pii-detector/app.log"
check_log "/var/log/pii-detector/error.log"
check_log "/var/log/nginx/access.log"
check_log "/var/log/nginx/error.log"

# 10. Verificar firewall e segurança
print_info "10. Verificando segurança..."

if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        print_success "UFW: Ativo"
    else
        warning "UFW: Inativo"
    fi
else
    warning "UFW não instalado"
fi

if command -v fail2ban-client &> /dev/null; then
    if systemctl is-active --quiet fail2ban; then
        print_success "Fail2Ban: Ativo"
    else
        warning "Fail2Ban: Inativo"
    fi
else
    warning "Fail2Ban não instalado"
fi

# 11. Verificar backup
print_info "11. Verificando sistema de backup..."

if [ -f "/home/datafog/backup.sh" ]; then
    print_success "Script de backup encontrado"
else
    warning "Script de backup não encontrado"
fi

if crontab -u datafog -l 2>/dev/null | grep -q "backup.sh"; then
    print_success "Backup agendado no cron"
else
    warning "Backup não agendado no cron"
fi

# 12. Teste de performance
print_info "12. Teste básico de performance..."

# CPU
CPU_CORES=$(nproc)
print_success "CPU: $CPU_CORES núcleos"

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
if (( $(echo "$LOAD_AVG < $CPU_CORES" | bc -l) )); then
    print_success "Load average: $LOAD_AVG (Normal)"
else
    warning "Load average: $LOAD_AVG (Alto)"
fi

# Uso de memória
MEM_USAGE=$(free | awk '/^Mem:/ {printf "%.1f", $3/$2 * 100}')
if (( $(echo "$MEM_USAGE < 80" | bc -l) )); then
    print_success "Uso de memória: ${MEM_USAGE}% (Normal)"
else
    warning "Uso de memória: ${MEM_USAGE}% (Alto)"
fi

# 13. Teste de funcionalidade
print_info "13. Teste de funcionalidade..."

if [ -f "/home/datafog/pii-detector/test-multiformat.py" ]; then
    print_info "Executando teste de detecção..."
    if cd /home/datafog/pii-detector && python3 test-multiformat.py &> /dev/null; then
        print_success "Teste de detecção: PASSOU"
    else
        error "Teste de detecção: FALHOU"
    fi
else
    warning "Arquivo de teste não encontrado"
fi

# Resumo final
echo ""
echo "==============================="
echo "📊 RESUMO DA VERIFICAÇÃO"
echo "==============================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    print_success "Sistema perfeito! Todos os componentes funcionando."
elif [ $ERRORS -eq 0 ]; then
    print_warning "Sistema funcionando com $WARNINGS avisos."
else
    print_error "Sistema com problemas: $ERRORS erros, $WARNINGS avisos."
fi

echo ""
echo "📋 RECOMENDAÇÕES:"

if [ $ERRORS -gt 0 ]; then
    echo "• Corrigir os erros listados acima"
    echo "• Consultar logs para mais detalhes"
    echo "• Verificar documentação de instalação"
fi

if [ $WARNINGS -gt 0 ]; then
    echo "• Considerar resolver os avisos"
    echo "• Monitorar recursos do sistema"
fi

echo "• Executar backup regularmente"
echo "• Monitorar logs de aplicação"
echo "• Manter sistema atualizado"

# Status de saída
if [ $ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi