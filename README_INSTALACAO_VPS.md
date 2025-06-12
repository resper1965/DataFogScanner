# Instalação VPS - PII Detector DataFog

Guia completo para instalação do sistema de detecção de dados sensíveis brasileiros em VPS de produção.

## 🚀 Instalação Rápida

```bash
# 1. Baixar o script de instalação
wget https://raw.githubusercontent.com/seu-repo/pii-detector/main/install-vps.sh

# 2. Dar permissão de execução
chmod +x install-vps.sh

# 3. Executar como root
sudo ./install-vps.sh
```

## 📋 O que o Script Instala

### Dependências do Sistema
- **Node.js 20** - Runtime da aplicação
- **PostgreSQL** - Database principal
- **Redis** - Cache e sessões
- **Nginx** - Proxy reverso e servidor web
- **PM2** - Gerenciador de processos
- **Python 3** + bibliotecas DataFog
- **Fail2Ban** - Proteção contra ataques
- **UFW** - Firewall

### Estrutura de Diretórios
```
/home/datafog/
├── pii-detector/          # Código da aplicação
├── uploads/               # Arquivos enviados
│   ├── sftp/
│   │   ├── incoming/      # SFTP entrada
│   │   ├── processed/     # Processados
│   │   └── quarantine/    # Quarentena
├── backups/               # Backups automáticos
├── ssl/                   # Certificados SSL
├── config/
│   └── .env              # Configurações
├── deploy.sh             # Script de deploy
├── backup.sh             # Script de backup
├── monitor.sh            # Monitoramento
└── setup-ssl.sh          # Configuração SSL
```

### Usuários e Permissões
- **Usuário**: `datafog`
- **Grupo**: `www-data`
- **Database**: `pii_detector`
- **SFTP**: Acesso restrito ao diretório `/home/datafog`

## ⚙️ Configuração Pós-Instalação

### 1. Configurar PostgreSQL
```bash
# Definir senha do usuário
sudo -u postgres psql
ALTER USER datafog PASSWORD 'SUA_SENHA_SEGURA';
\q
```

### 2. Editar Configurações
```bash
nano /home/datafog/config/.env
```

Configurar as variáveis:
```env
# Database
DATABASE_URL=postgresql://datafog:SUA_SENHA@localhost/pii_detector
PGPASSWORD=SUA_SENHA

# Segurança
SESSION_SECRET=gerar_secret_256_bits_aqui
JWT_SECRET=gerar_jwt_secret_aqui

# OpenAI (opcional)
OPENAI_API_KEY=sk-seu-key-aqui
```

### 3. Deploy da Aplicação
```bash
# Mudar para usuário datafog
su - datafog

# Clonar repositório
cd /home/datafog/pii-detector
git clone https://github.com/seu-repo/pii-detector.git .

# Executar deploy
./deploy.sh
```

### 4. Configurar SSL (Opcional)
```bash
# Editar domínio no script
nano /home/datafog/setup-ssl.sh

# Executar configuração SSL
sudo ./setup-ssl.sh
```

## 🔧 Gerenciamento da Aplicação

### Comandos PM2
```bash
# Status da aplicação
pm2 status

# Logs em tempo real
pm2 logs pii-detector

# Reiniciar aplicação
pm2 restart pii-detector

# Parar aplicação
pm2 stop pii-detector

# Remover aplicação
pm2 delete pii-detector
```

### Comandos Nginx
```bash
# Status do Nginx
systemctl status nginx

# Testar configuração
nginx -t

# Recarregar configuração
systemctl reload nginx

# Reiniciar Nginx
systemctl restart nginx
```

### Comandos PostgreSQL
```bash
# Status do PostgreSQL
systemctl status postgresql

# Conectar ao database
sudo -u datafog psql pii_detector

# Backup manual do database
pg_dump pii_detector | gzip > backup_$(date +%Y%m%d).sql.gz

# Restaurar backup
gunzip -c backup_20241212.sql.gz | psql pii_detector
```

## 📊 Monitoramento

### Logs da Aplicação
```bash
# Logs da aplicação
tail -f /var/log/pii-detector/app.log

# Logs de erro
tail -f /var/log/pii-detector/error.log

# Logs do Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Status do Sistema
```bash
# Uso de disco
df -h

# Uso de memória
free -h

# Processos ativos
htop

# Status dos serviços
systemctl status nginx postgresql redis-server
```

### Monitoramento Automático
O sistema inclui monitoramento automático que verifica:
- Status da aplicação PM2
- Uso de disco e memória
- Conectividade do PostgreSQL
- Status do Nginx

Logs em: `/var/log/pii-detector/monitor.log`

## 🔒 Segurança

### Firewall (UFW)
```bash
# Status do firewall
ufw status

# Permitir nova porta
ufw allow 8080/tcp

# Bloquear IP
ufw deny from 192.168.1.100
```

### Fail2Ban
```bash
# Status do Fail2Ban
fail2ban-client status

# Verificar jail SSH
fail2ban-client status sshd

# Desbanir IP
fail2ban-client set sshd unbanip 192.168.1.100
```

### Certificados SSL
```bash
# Status dos certificados
certbot certificates

# Renovar manualmente
certbot renew

# Testar renovação
certbot renew --dry-run
```

## 💾 Backup e Restauração

### Backup Automático
- **Frequência**: Diário às 02:00
- **Retenção**: 30 dias
- **Localização**: `/home/datafog/backups/`

### Backup Manual
```bash
# Executar backup completo
/home/datafog/backup.sh

# Backup apenas do código
tar -czf code_backup.tar.gz -C /home/datafog/pii-detector --exclude=node_modules .

# Backup apenas do database
pg_dump pii_detector | gzip > db_backup.sql.gz
```

### Restauração
```bash
# Restaurar código
tar -xzf code_backup.tar.gz -C /home/datafog/pii-detector

# Restaurar database
gunzip -c db_backup.sql.gz | psql pii_detector

# Reinstalar dependências
cd /home/datafog/pii-detector
npm install
npm run build
pm2 restart pii-detector
```

## 🔄 Atualizações

### Deploy de Nova Versão
```bash
su - datafog
cd /home/datafog/pii-detector
./deploy.sh
```

### Atualização Manual
```bash
# Backup antes da atualização
./backup.sh

# Atualizar código
git pull origin main

# Instalar dependências
npm install

# Build
npm run build

# Migrar database
npm run db:push

# Reiniciar
pm2 restart pii-detector
```

## 🚨 Solução de Problemas

### Aplicação Não Inicia
```bash
# Verificar logs
pm2 logs pii-detector

# Verificar configuração
cat /home/datafog/config/.env

# Testar conexão database
sudo -u datafog psql pii_detector
```

### Erro 502 Bad Gateway
```bash
# Verificar se aplicação está rodando
pm2 status

# Verificar logs do Nginx
tail -f /var/log/nginx/error.log

# Testar configuração Nginx
nginx -t
```

### Problema de Permissões
```bash
# Corrigir permissões
chown -R datafog:datafog /home/datafog
chmod 755 /home/datafog/uploads
chmod 700 /home/datafog/uploads/sftp/incoming
```

### Espaço em Disco
```bash
# Verificar uso
du -sh /home/datafog/*

# Limpar logs antigos
find /var/log -name "*.log" -mtime +7 -delete

# Limpar uploads antigos
find /home/datafog/uploads -name "*" -mtime +30 -delete
```

## 📞 Suporte

Para problemas específicos:

1. **Verificar logs** primeiro
2. **Executar monitoramento**: `/home/datafog/monitor.sh`
3. **Criar backup** antes de mudanças
4. **Testar em ambiente staging** quando possível

### Comandos de Diagnóstico
```bash
# Status completo do sistema
systemctl status nginx postgresql redis-server
pm2 status
ufw status
fail2ban-client status

# Logs consolidados
tail -f /var/log/pii-detector/*.log /var/log/nginx/*.log
```