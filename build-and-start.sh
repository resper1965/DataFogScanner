#!/bin/bash

# Script para buildar frontend e iniciar aplicação na VPS
# Execute na VPS: sudo ./build-and-start.sh

set -e

echo "Buildando frontend e iniciando aplicação..."

# Ir para diretório da aplicação
cd /home/piidetector/pii-detector

# Parar aplicação atual
sudo -u piidetector pm2 delete pii-detector 2>/dev/null || true

# Buildar o frontend
echo "Buildando frontend..."
sudo -u piidetector npm run build

# Copiar build para local correto (vite gera em dist/public, servidor espera em server/public)
if [ -d "dist/public" ]; then
    echo "Copiando build para server/public..."
    sudo -u piidetector cp -r dist/public server/
elif [ ! -d "server/public" ]; then
    echo "❌ Erro: Build não foi criado corretamente"
    exit 1
fi

echo "✅ Frontend buildado com sucesso"

# Criar configuração PM2 para produção
sudo -u piidetector cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'pii-detector',
    script: 'server/index.ts',
    interpreter: 'tsx',
    cwd: '/home/piidetector/pii-detector',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: '/home/piidetector/logs/app.log',
    error_file: '/home/piidetector/logs/error.log',
    out_file: '/home/piidetector/logs/out.log',
    env_file: '/home/piidetector/config/.env',
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
EOF

# Iniciar aplicação
echo "Iniciando aplicação..."
sudo -u piidetector pm2 start ecosystem.config.cjs
sudo -u piidetector pm2 save

# Aguardar inicialização
sleep 10

# Verificar status
echo ""
echo "=== STATUS FINAL ==="
echo ""

echo "PM2 Status:"
sudo -u piidetector pm2 list

echo ""
echo "Conectividade:"
if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
    echo "✅ Backend funcionando na porta 5000"
else
    echo "❌ Backend offline"
    echo "Últimos logs:"
    sudo -u piidetector pm2 logs pii-detector --lines 10
    exit 1
fi

echo ""
echo "Teste externo:"
status=$(curl -s -o /dev/null -w "%{http_code}" http://62.72.8.164/ 2>/dev/null || echo "000")
case $status in
    200) echo "✅ Site funcionando: http://62.72.8.164/" ;;
    502) echo "❌ Erro 502 - verificar logs" ;;
    *) echo "⚠️  Status HTTP: $status" ;;
esac

echo ""
echo "=== Aplicação pronta para uso ==="