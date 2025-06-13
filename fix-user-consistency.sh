#!/bin/bash

# Script para corrigir inconsistências entre usuários datafog/piidetector
# Este script padroniza tudo para o usuário 'piidetector'

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================="
echo "🔧 CORREÇÃO DE INCONSISTÊNCIAS DE USUÁRIO"
echo -e "===================================================${NC}"
echo ""

# Verificar se está executando como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Este script deve ser executado como root (sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Verificando usuários existentes...${NC}"

# Verificar se usuário datafog existe
if id "datafog" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Usuário 'datafog' encontrado - será migrado para 'piidetector'${NC}"
    MIGRATE_DATAFOG=true
else
    echo -e "${GREEN}✅ Usuário 'datafog' não existe${NC}"
    MIGRATE_DATAFOG=false
fi

# Verificar se usuário piidetector existe
if id "piidetector" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Usuário 'piidetector' já existe${NC}"
    USER_EXISTS=true
else
    echo -e "${YELLOW}⚠️  Usuário 'piidetector' não existe - será criado${NC}"
    USER_EXISTS=false
fi

echo ""

# Função para migrar dados do datafog para piidetector
migrate_datafog_data() {
    if [ "$MIGRATE_DATAFOG" = true ]; then
        echo -e "${YELLOW}🔄 Migrando dados do usuário 'datafog' para 'piidetector'...${NC}"
        
        # Parar serviços se estiverem rodando
        systemctl stop nginx postgresql redis-server 2>/dev/null || true
        
        # Migrar diretório home se existir
        if [ -d "/home/datafog" ]; then
            echo "📁 Migrando diretório home..."
            
            if [ ! -d "/home/piidetector" ]; then
                mv /home/datafog /home/piidetector
                chown -R piidetector:piidetector /home/piidetector
            else
                # Mesclar conteúdo
                cp -r /home/datafog/* /home/piidetector/ 2>/dev/null || true
                chown -R piidetector:piidetector /home/piidetector
                rm -rf /home/datafog
            fi
        fi
        
        # Atualizar configurações do banco de dados
        if [ -f "/home/piidetector/config/.env" ]; then
            echo "🔧 Atualizando configurações do banco..."
            sed -i 's/datafog/piidetector/g' /home/piidetector/config/.env
        fi
        
        # Atualizar banco PostgreSQL
        if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw pii_detector; then
            echo "🗄️  Atualizando usuário do banco de dados..."
            sudo -u postgres psql << EOF
-- Renomear usuário se existir
DO \$\$
BEGIN
   IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'datafog') THEN
      ALTER USER datafog RENAME TO piidetector;
   END IF;
END
\$\$;

-- Garantir que o usuário piidetector existe
CREATE USER piidetector WITH PASSWORD 'temp_password';
ALTER DATABASE pii_detector OWNER TO piidetector;
GRANT ALL PRIVILEGES ON DATABASE pii_detector TO piidetector;
EOF
        fi
        
        # Remover usuário datafog do sistema
        echo "🗑️  Removendo usuário 'datafog' do sistema..."
        userdel datafog 2>/dev/null || true
        
        echo -e "${GREEN}✅ Migração do usuário 'datafog' concluída${NC}"
    fi
}

# Criar usuário piidetector se não existir
create_piidetector_user() {
    if [ "$USER_EXISTS" = false ]; then
        echo -e "${YELLOW}👤 Criando usuário 'piidetector'...${NC}"
        
        useradd -m -s /bin/bash -G sudo,www-data piidetector
        
        echo -e "${BLUE}🔑 Defina uma senha para o usuário 'piidetector':${NC}"
        passwd piidetector
        
        echo -e "${GREEN}✅ Usuário 'piidetector' criado${NC}"
    fi
}

# Corrigir referências em arquivos de configuração
fix_config_references() {
    echo -e "${YELLOW}🔧 Corrigindo referências em arquivos de configuração...${NC}"
    
    # Corrigir nginx
    if [ -f "/etc/nginx/sites-available/pii-detector" ]; then
        sed -i 's/datafog/piidetector/g' /etc/nginx/sites-available/pii-detector
        echo "✅ Nginx atualizado"
    fi
    
    # Corrigir systemd services
    find /etc/systemd/system -name "*datafog*" -exec rename 's/datafog/piidetector/' {} \; 2>/dev/null || true
    find /etc/systemd/system -name "*piidetector*" -exec sed -i 's/datafog/piidetector/g' {} \; 2>/dev/null || true
    
    # Corrigir crontabs
    if crontab -l -u datafog 2>/dev/null; then
        crontab -l -u datafog | sed 's/datafog/piidetector/g' | crontab -u piidetector -
        crontab -r -u datafog 2>/dev/null || true
        echo "✅ Crontab migrado"
    fi
    
    # Corrigir PM2 se existir
    if [ -f "/home/piidetector/.pm2/dump.pm2" ]; then
        sed -i 's/datafog/piidetector/g' /home/piidetector/.pm2/dump.pm2
        echo "✅ PM2 atualizado"
    fi
    
    # Corrigir logs
    if [ -d "/var/log/pii-detector" ]; then
        chown -R piidetector:piidetector /var/log/pii-detector
        echo "✅ Logs atualizados"
    fi
    
    echo -e "${GREEN}✅ Referências corrigidas${NC}"
}

# Verificar e corrigir estrutura de diretórios
fix_directory_structure() {
    echo -e "${YELLOW}📁 Verificando estrutura de diretórios...${NC}"
    
    # Garantir que todos os diretórios existem com permissões corretas
    sudo -u piidetector bash << 'EOF'
cd /home/piidetector

# Criar estrutura se não existir
mkdir -p {config,logs,uploads,backups,scripts,sftp,temp}
mkdir -p uploads/{pending,processing,completed,quarantine,sftp}
mkdir -p logs/{app,security,performance,backup}
mkdir -p backups/{daily,weekly,monthly}
mkdir -p config/{nginx,ssl,monitoring}
mkdir -p pii-detector
mkdir -p scripts/{maintenance,monitoring,backup,deploy}

# Corrigir permissões
chmod 755 uploads uploads/* 2>/dev/null || true
chmod 750 config
chmod 755 logs logs/* 2>/dev/null || true
chmod 700 backups backups/* 2>/dev/null || true
chmod 755 scripts scripts/* 2>/dev/null || true

# Criar arquivo de configuração se não existir
if [ ! -f "config/directories.conf" ]; then
    cat > config/directories.conf << 'EOD'
# Configuração da estrutura de diretórios
BASE_DIR=/home/piidetector
APP_DIR=$BASE_DIR/pii-detector
UPLOAD_DIR=$BASE_DIR/uploads
LOG_DIR=$BASE_DIR/logs
BACKUP_DIR=$BASE_DIR/backups
CONFIG_DIR=$BASE_DIR/config
SCRIPTS_DIR=$BASE_DIR/scripts
SFTP_DIR=$BASE_DIR/uploads/sftp
TEMP_DIR=$BASE_DIR/temp

# Limites de armazenamento (em MB)
MAX_UPLOAD_SIZE=10240
MAX_LOG_SIZE=1024
MAX_BACKUP_SIZE=51200

# Retenção (em dias)
UPLOAD_RETENTION=90
LOG_RETENTION=30
BACKUP_RETENTION=90
EOD
fi
EOF
    
    echo -e "${GREEN}✅ Estrutura de diretórios verificada${NC}"
}

# Atualizar arquivo .env
update_env_file() {
    if [ -f "/home/piidetector/config/.env" ]; then
        echo -e "${YELLOW}🔧 Atualizando arquivo .env...${NC}"
        
        # Backup do arquivo original
        cp /home/piidetector/config/.env /home/piidetector/config/.env.backup
        
        # Corrigir todas as referências
        sed -i 's/datafog/piidetector/g' /home/piidetector/config/.env
        
        # Garantir que as variáveis principais estejam corretas
        sed -i 's|PGUSER=.*|PGUSER=piidetector|' /home/piidetector/config/.env
        sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://piidetector:SUA_SENHA_AQUI@localhost:5432/pii_detector|' /home/piidetector/config/.env
        
        chown piidetector:piidetector /home/piidetector/config/.env
        chmod 600 /home/piidetector/config/.env
        
        echo -e "${GREEN}✅ Arquivo .env atualizado${NC}"
    else
        echo -e "${YELLOW}⚠️  Arquivo .env não encontrado - será necessário criar${NC}"
    fi
}

# Executar correções
echo -e "${BLUE}🚀 Iniciando correções...${NC}"
echo ""

# 1. Criar usuário piidetector se necessário
create_piidetector_user

# 2. Migrar dados do datafog se existir
migrate_datafog_data

# 3. Corrigir referências em configurações
fix_config_references

# 4. Verificar estrutura de diretórios
fix_directory_structure

# 5. Atualizar arquivo .env
update_env_file

# Reiniciar serviços
echo -e "${YELLOW}🔄 Reiniciando serviços...${NC}"
systemctl daemon-reload
systemctl restart postgresql redis-server nginx 2>/dev/null || true

echo ""
echo -e "${GREEN}==================================================="
echo "✅ CORREÇÃO CONCLUÍDA COM SUCESSO!"
echo -e "===================================================${NC}"
echo ""
echo -e "${BLUE}📋 Resumo das alterações:${NC}"
echo "  • Usuário padronizado: piidetector"
echo "  • Diretório base: /home/piidetector"
echo "  • Configurações atualizadas"
echo "  • Banco de dados corrigido"
echo "  • Serviços reiniciados"
echo ""
echo -e "${YELLOW}🔧 Próximos passos:${NC}"
echo "  1. su - piidetector"
echo "  2. ./check-folders.sh"
echo "  3. Verificar arquivo config/.env"
echo "  4. Testar aplicação"
echo ""
echo -e "${GREEN}✅ Sistema pronto para uso!${NC}"