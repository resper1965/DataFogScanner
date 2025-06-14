#!/bin/bash

# Script de diagnóstico completo para VPS 62.72.8.164
# Execute como root: sudo ./diagnose-vps.sh

echo "🔍 DIAGNÓSTICO COMPLETO - VPS 62.72.8.164"
echo "========================================="
echo "Data: $(date)"
echo ""

# 1. Verificar serviços do sistema
echo "1. SERVIÇOS DO SISTEMA"
echo "----------------------"
for service in postgresql redis-server nginx; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: ATIVO"
    else
        echo "❌ $service: INATIVO"
        echo "   Tentando iniciar..."
        systemctl start $service 2>/dev/null && echo "   ✅ Iniciado" || echo "   ❌ Falha ao iniciar"
    fi
done
echo ""

# 2. Verificar estrutura de arquivos
echo "2. ESTRUTURA DE ARQUIVOS"
echo "------------------------"
echo "Usuário piidetector:"
if id piidetector &>/dev/null; then
    echo "✅ Usuário existe"
else
    echo "❌ Usuário não existe - criando..."
    useradd -m -s /bin/bash piidetector
fi

echo ""
echo "Diretórios principais:"
for dir in /home/piidetector /home/piidetector/pii-detector /home/piidetector/config /home/piidetector/logs; do
    if [ -d "$dir" ]; then
        echo "✅ $dir"
    else
        echo "❌ $dir - criando..."
        sudo -u piidetector mkdir -p "$dir"
    fi
done

echo ""
echo "Arquivos críticos:"
[ -f "/home/piidetector/pii-detector/package.json" ] && echo "✅ package.json" || echo "❌ package.json ausente"
[ -f "/home/piidetector/config/.env" ] && echo "✅ .env" || echo "❌ .env ausente"
[ -f "/home/piidetector/pii-detector/ecosystem.config.js" ] && echo "✅ ecosystem.config.js" || echo "❌ ecosystem.config.js ausente"
echo ""

# 3. Verificar Node.js e ferramentas
echo "3. NODE.JS E FERRAMENTAS"
echo "------------------------"
node_version=$(node --version 2>/dev/null || echo "não instalado")
npm_version=$(npm --version 2>/dev/null || echo "não instalado")
echo "Node.js: $node_version"
echo "npm: $npm_version"

echo ""
echo "Ferramentas globais:"
which pm2 &>/dev/null && echo "✅ PM2: $(pm2 --version)" || echo "❌ PM2 não instalado"
which tsx &>/dev/null && echo "✅ tsx disponível" || echo "❌ tsx não instalado"
which tsc &>/dev/null && echo "✅ TypeScript disponível" || echo "❌ TypeScript não instalado"
echo ""

# 4. Verificar Python
echo "4. PYTHON E AMBIENTE VIRTUAL"
echo "-----------------------------"
python_version=$(python3 --version 2>/dev/null || echo "não instalado")
echo "Python: $python_version"

if [ -d "/home/piidetector/venv" ]; then
    echo "✅ Ambiente virtual existe"
    echo "Pacotes instalados:"
    /home/piidetector/venv/bin/pip list | grep -E "(datafog|openpyxl|pypdf2)" || echo "❌ Pacotes Python ausentes"
else
    echo "❌ Ambiente virtual ausente"
fi
echo ""

# 5. Verificar banco de dados
echo "5. BANCO DE DADOS"
echo "-----------------"
if systemctl is-active --quiet postgresql; then
    echo "PostgreSQL ativo"
    
    # Verificar usuário e database
    sudo -u postgres psql -c "\du" | grep piidetector &>/dev/null && echo "✅ Usuário piidetector existe" || echo "❌ Usuário piidetector ausente"
    sudo -u postgres psql -l | grep pii_detector &>/dev/null && echo "✅ Database pii_detector existe" || echo "❌ Database pii_detector ausente"
    
    # Teste de conexão
    if [ -f "/home/piidetector/config/.env" ]; then
        source /home/piidetector/config/.env
        pg_isready -h localhost -p 5432 -U piidetector &>/dev/null && echo "✅ Conexão OK" || echo "❌ Falha na conexão"
    fi
else
    echo "❌ PostgreSQL inativo"
fi
echo ""

# 6. Verificar aplicação
echo "6. APLICAÇÃO"
echo "------------"
if [ -d "/home/piidetector/pii-detector" ]; then
    cd /home/piidetector/pii-detector
    
    # Verificar se código existe
    if [ -f "package.json" ]; then
        echo "✅ Código da aplicação presente"
        
        # Verificar dependências
        if [ -d "node_modules" ]; then
            echo "✅ Dependências instaladas"
        else
            echo "❌ Dependências ausentes - instalando..."
            sudo -u piidetector npm install
        fi
    else
        echo "❌ Código da aplicação ausente - baixando..."
        sudo -u piidetector git clone https://github.com/resper1965/DataFogScanner.git . 2>/dev/null || {
            sudo -u piidetector git init
            sudo -u piidetector git remote add origin https://github.com/resper1965/DataFogScanner.git
            sudo -u piidetector git pull origin main
        }
    fi
fi

# Verificar PM2
echo ""
echo "Status PM2:"
if sudo -u piidetector pm2 list | grep -q pii-detector; then
    echo "✅ Aplicação rodando"
    sudo -u piidetector pm2 list | grep pii-detector
else
    echo "❌ Aplicação não está rodando"
fi
echo ""

# 7. Testes de conectividade
echo "7. TESTES DE CONECTIVIDADE"
echo "--------------------------"
echo "Teste local (porta 5000):"
if curl -s http://localhost:5000/api/health &>/dev/null; then
    echo "✅ Backend respondendo"
    health_data=$(curl -s http://localhost:5000/api/health)
    echo "   Status: $(echo $health_data | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
else
    echo "❌ Backend não responde"
fi

echo ""
echo "Teste Nginx (porta 80):"
if curl -s http://localhost/ &>/dev/null; then
    echo "✅ Nginx respondendo"
else
    echo "❌ Nginx não responde"
fi

echo ""
echo "Teste externo:"
external_status=$(curl -s -o /dev/null -w "%{http_code}" http://62.72.8.164/ 2>/dev/null)
if [ "$external_status" = "200" ]; then
    echo "✅ Site acessível externamente"
elif [ "$external_status" = "502" ]; then
    echo "⚠️ Site retorna 502 Bad Gateway (backend offline)"
else
    echo "❌ Site inacessível (status: $external_status)"
fi
echo ""

# 8. Logs recentes
echo "8. LOGS RECENTES"
echo "----------------"
if [ -f "/home/piidetector/logs/error.log" ]; then
    echo "Últimos erros:"
    tail -5 /home/piidetector/logs/error.log 2>/dev/null || echo "Nenhum erro recente"
else
    echo "Arquivo de log não encontrado"
fi
echo ""

# 9. Recomendações
echo "9. RECOMENDAÇÕES"
echo "----------------"
recommendations=()

# Verificar problemas e gerar recomendações
! systemctl is-active --quiet nginx && recommendations+=("Iniciar Nginx: systemctl start nginx")
! systemctl is-active --quiet postgresql && recommendations+=("Iniciar PostgreSQL: systemctl start postgresql")
! which tsx &>/dev/null && recommendations+=("Instalar tsx: npm install -g tsx typescript")
! [ -f "/home/piidetector/pii-detector/package.json" ] && recommendations+=("Baixar código: execute fix-vps.sh")
! sudo -u piidetector pm2 list | grep -q pii-detector && recommendations+=("Iniciar aplicação: execute fix-permissions.sh")

if [ ${#recommendations[@]} -eq 0 ]; then
    echo "✅ Sistema parece estar funcionando corretamente"
    echo ""
    echo "URLs de acesso:"
    echo "• Frontend: http://62.72.8.164/"
    echo "• API Health: http://62.72.8.164/api/health"
else
    echo "Problemas encontrados:"
    printf '%s\n' "${recommendations[@]}"
    echo ""
    echo "Scripts disponíveis para correção:"
    echo "• ./fix-permissions.sh - Corrige problemas de TypeScript/PM2"
    echo "• ./fix-vps.sh - Instalação completa do sistema"
    echo "• ./quick-fix.sh - Correção rápida de problemas comuns"
fi

echo ""
echo "========================================="
echo "Diagnóstico concluído em $(date)"