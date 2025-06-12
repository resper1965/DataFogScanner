# Troubleshooting VPS - PII Detector DataFog

Guia completo para solução de problemas na instalação e operação em VPS.

## 🔧 Diagnóstico Rápido

Execute o script de verificação antes de qualquer troubleshooting:

```bash
./check-system.sh
```

## ⚠️ Problemas Comuns

### 1. Aplicação Não Inicia

**Sintomas:**
- PM2 mostra status "errored" ou "stopped"
- Erro 502 Bad Gateway no navegador
- Logs mostram erros de conexão

**Diagnóstico:**
```bash
# Verificar logs da aplicação
pm2 logs pii-detector

# Verificar status dos serviços
systemctl status postgresql redis-server nginx

# Testar conexões
pg_isready -h localhost -p 5432
redis-cli ping
```

**Soluções:**

1. **Erro de Database:**
   ```bash
   # Verificar se database existe
   sudo -u postgres psql -l | grep pii_detector
   
   # Criar database se não existir
   sudo -u postgres createdb -O datafog pii_detector
   
   # Verificar conexão
   sudo -u datafog psql pii_detector
   ```

2. **Erro de Permissões:**
   ```bash
   # Corrigir permissões
   chown -R datafog:datafog /home/datafog
   chmod 755 /home/datafog/uploads
   chmod 700 /home/datafog/uploads/sftp/incoming
   ```

3. **Variáveis de Ambiente:**
   ```bash
   # Verificar arquivo .env
   cat /home/datafog/config/.env
   
   # Recriar se necessário
   cp .env.production /home/datafog/config/.env
   # Editar valores necessários
   ```

### 2. Erro 502 Bad Gateway

**Sintomas:**
- Nginx retorna erro 502
- Aplicação parece estar rodando

**Diagnóstico:**
```bash
# Verificar logs do Nginx
tail -f /var/log/nginx/error.log

# Verificar se aplicação responde localmente
curl http://localhost:5000

# Verificar configuração do Nginx
nginx -t
```

**Soluções:**

1. **Aplicação não responde:**
   ```bash
   pm2 restart pii-detector
   ```

2. **Configuração Nginx incorreta:**
   ```bash
   # Verificar configuração
   cat /etc/nginx/sites-available/pii-detector
   
   # Reiniciar Nginx
   systemctl restart nginx
   ```

### 3. Upload de Arquivos Falha

**Sintomas:**
- Erro ao fazer upload
- Arquivos não aparecem no dashboard
- Erro de tamanho de arquivo

**Diagnóstico:**
```bash
# Verificar espaço em disco
df -h /home/datafog

# Verificar permissões do diretório
ls -la /home/datafog/uploads

# Verificar logs da aplicação
tail -f /var/log/pii-detector/app.log
```

**Soluções:**

1. **Permissões incorretas:**
   ```bash
   chown -R datafog:www-data /home/datafog/uploads
   chmod 755 /home/datafog/uploads
   ```

2. **Limite de tamanho:**
   ```bash
   # Verificar configuração Nginx
   grep client_max_body_size /etc/nginx/sites-available/pii-detector
   
   # Ajustar se necessário (100M recomendado)
   ```

3. **Espaço insuficiente:**
   ```bash
   # Limpar arquivos antigos
   find /home/datafog/uploads -name "*" -mtime +30 -delete
   
   # Limpar logs antigos
   find /var/log -name "*.log" -mtime +7 -delete
   ```

### 4. Processamento de Arquivos Falha

**Sintomas:**
- Arquivos ficam em "processing"
- Detecções não aparecem
- Erro nos logs do Python

**Diagnóstico:**
```bash
# Verificar dependências Python
pip3 list | grep -E "(datafog|pypdf2|openpyxl|python-docx)"

# Testar processamento manual
python3 test-multiformat.py

# Verificar logs de processamento
grep "processamento" /var/log/pii-detector/app.log
```

**Soluções:**

1. **Dependências Python ausentes:**
   ```bash
   pip3 install datafog pypdf2 python-docx openpyxl
   ```

2. **Arquivo corrompido:**
   ```bash
   # Verificar integridade dos arquivos
   file /home/datafog/uploads/*
   ```

3. **Timeout de processamento:**
   ```bash
   # Aumentar timeout no .env
   echo "PROCESSING_TIMEOUT_MS=600000" >> /home/datafog/config/.env
   pm2 restart pii-detector
   ```

### 5. SFTP Não Funciona

**Sintomas:**
- Não consegue conectar via SFTP
- Erro de autenticação
- Diretório não encontrado

**Diagnóstico:**
```bash
# Verificar configuração SSH
cat /etc/ssh/sshd_config.d/sftp-datafog.conf

# Testar login local
sudo -u datafog sftp localhost

# Verificar logs SSH
tail -f /var/log/auth.log
```

**Soluções:**

1. **Configuração SSH incorreta:**
   ```bash
   # Recriar configuração SFTP
   cat > /etc/ssh/sshd_config.d/sftp-datafog.conf << EOF
   Match User datafog
       ChrootDirectory /home/datafog
       ForceCommand internal-sftp
       AllowTcpForwarding no
       X11Forwarding no
       PasswordAuthentication yes
   EOF
   
   systemctl restart sshd
   ```

2. **Permissões do diretório:**
   ```bash
   # Corrigir permissões SFTP
   chown root:root /home/datafog
   chmod 755 /home/datafog
   chown datafog:datafog /home/datafog/uploads
   ```

3. **Senha do usuário:**
   ```bash
   # Redefinir senha
   passwd datafog
   ```

### 6. Database Connection Error

**Sintomas:**
- Erro "database connection failed"
- Aplicação não consegue conectar ao PostgreSQL

**Diagnóstico:**
```bash
# Verificar status PostgreSQL
systemctl status postgresql

# Testar conexão
sudo -u datafog psql pii_detector

# Verificar configuração
grep DATABASE_URL /home/datafog/config/.env
```

**Soluções:**

1. **PostgreSQL parado:**
   ```bash
   systemctl start postgresql
   systemctl enable postgresql
   ```

2. **Usuário/senha incorretos:**
   ```bash
   # Redefinir senha do usuário
   sudo -u postgres psql
   ALTER USER datafog PASSWORD 'nova_senha_segura';
   \q
   
   # Atualizar .env
   sed -i 's/PGPASSWORD=.*/PGPASSWORD=nova_senha_segura/' /home/datafog/config/.env
   ```

3. **Database não existe:**
   ```bash
   sudo -u postgres createdb -O datafog pii_detector
   ```

### 7. Alto Uso de Recursos

**Sintomas:**
- Sistema lento
- Aplicação para de responder
- Erro de memória

**Diagnóstico:**
```bash
# Verificar recursos
htop
free -h
df -h

# Verificar processos da aplicação
pm2 monit
```

**Soluções:**

1. **Alto uso de memória:**
   ```bash
   # Reiniciar aplicação
   pm2 restart pii-detector
   
   # Ajustar limite de memória
   pm2 delete pii-detector
   pm2 start ecosystem.config.js --max-memory-restart 512M
   ```

2. **Espaço em disco esgotado:**
   ```bash
   # Limpar logs
   find /var/log -name "*.log" -mtime +7 -delete
   
   # Limpar uploads antigos
   find /home/datafog/uploads -mtime +30 -delete
   
   # Limpar cache npm
   npm cache clean --force
   ```

## 🔥 Soluções de Emergência

### Reset Completo da Aplicação

```bash
# Parar aplicação
pm2 stop pii-detector

# Backup da configuração
cp /home/datafog/config/.env /home/datafog/backups/

# Limpar dados temporários
rm -rf /home/datafog/pii-detector/node_modules
rm -rf /home/datafog/uploads/temp/*

# Reinstalar dependências
cd /home/datafog/pii-detector
npm install

# Reiniciar serviços
systemctl restart postgresql redis-server nginx

# Restart aplicação
pm2 start ecosystem.config.js
```

### Restaurar Backup

```bash
# Parar aplicação
pm2 stop pii-detector

# Restaurar database
gunzip -c /home/datafog/backups/db_YYYYMMDD_HHMMSS.sql.gz | sudo -u datafog psql pii_detector

# Restaurar configuração
cp /home/datafog/backups/env_backup_YYYYMMDD_HHMMSS /home/datafog/config/.env

# Reiniciar
pm2 start ecosystem.config.js
```

### Reinstalação de Emergência

```bash
# Backup dos dados importantes
cp /home/datafog/config/.env /tmp/
tar -czf /tmp/uploads_backup.tar.gz /home/datafog/uploads

# Executar reinstalação
./install-vps.sh

# Restaurar configuração
cp /tmp/.env /home/datafog/config/
tar -xzf /tmp/uploads_backup.tar.gz -C /
```

## 📊 Monitoramento Contínuo

### Scripts Automáticos

1. **Monitoramento de saúde:**
   ```bash
   # Adicionar ao cron (a cada 5 minutos)
   */5 * * * * /home/datafog/monitor.sh
   ```

2. **Backup automático:**
   ```bash
   # Backup diário às 2h
   0 2 * * * /home/datafog/backup.sh
   ```

3. **Limpeza automática:**
   ```bash
   # Limpeza semanal
   0 3 * * 0 find /home/datafog/uploads -mtime +30 -delete
   ```

### Alertas por Email

```bash
# Configurar postfix para alertas
apt install postfix mailutils

# Script de alerta
cat > /home/datafog/alert.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "Aplicação PII Detector fora do ar" | mail -s "ALERTA VPS" admin@seudominio.com
fi
EOF

chmod +x /home/datafog/alert.sh
echo "*/10 * * * * /home/datafog/alert.sh" | crontab -
```

## 📞 Suporte Avançado

### Coleta de Logs para Suporte

```bash
# Script para coletar informações do sistema
cat > /home/datafog/collect-logs.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
LOG_DIR="/tmp/pii-detector-logs-$DATE"

mkdir -p "$LOG_DIR"

# Informações do sistema
uname -a > "$LOG_DIR/system.txt"
free -h > "$LOG_DIR/memory.txt"
df -h > "$LOG_DIR/disk.txt"
ps aux > "$LOG_DIR/processes.txt"

# Logs da aplicação
cp /var/log/pii-detector/*.log "$LOG_DIR/" 2>/dev/null || true
cp /var/log/nginx/*.log "$LOG_DIR/" 2>/dev/null || true

# Configurações (sem senhas)
grep -v PASSWORD /home/datafog/config/.env > "$LOG_DIR/env.txt" 2>/dev/null || true

# Status dos serviços
systemctl status postgresql redis-server nginx > "$LOG_DIR/services.txt"
pm2 list > "$LOG_DIR/pm2.txt"

# Criar arquivo compactado
tar -czf "/tmp/pii-detector-logs-$DATE.tar.gz" -C "/tmp" "pii-detector-logs-$DATE"
rm -rf "$LOG_DIR"

echo "Logs coletados em: /tmp/pii-detector-logs-$DATE.tar.gz"
EOF

chmod +x /home/datafog/collect-logs.sh
```

### Teste de Conectividade Completo

```bash
#!/bin/bash
echo "=== Teste de Conectividade ==="

# Testes locais
echo "1. Teste local da aplicação:"
curl -s http://localhost:5000/health && echo "✓ OK" || echo "✗ FALHA"

echo "2. Teste PostgreSQL:"
pg_isready -h localhost -p 5432 && echo "✓ OK" || echo "✗ FALHA"

echo "3. Teste Redis:"
redis-cli ping && echo "✓ OK" || echo "✗ FALHA"

echo "4. Teste Nginx:"
curl -s http://localhost && echo "✓ OK" || echo "✗ FALHA"

echo "5. Teste SFTP:"
echo "exit" | sftp -o PasswordAuthentication=no localhost 2>/dev/null && echo "✓ OK" || echo "✗ FALHA"

echo "=== Fim dos Testes ==="
```

Para problemas não cobertos neste guia, execute `./collect-logs.sh` e analise os logs gerados ou entre em contato com o suporte técnico com os arquivos de log.