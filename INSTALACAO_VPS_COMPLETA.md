# Guia de Instalação VPS - PII Detector

## 🚀 Instalação Automatizada Completa

### Pré-requisitos da VPS
- **Sistema**: Ubuntu 20.04+ ou Debian 11+
- **RAM**: 4GB mínimo (8GB recomendado)
- **Disco**: 50GB mínimo
- **CPU**: 2 cores mínimo
- **Acesso**: SSH como root

### Passo 1: Conectar na VPS
```bash
# Conectar via SSH
ssh root@SEU_IP_VPS

# Atualizar sistema base
apt update && apt upgrade -y
apt install -y wget curl git
```

### Passo 2: Download e Execução do Instalador
```bash
# Baixar script de instalação completa
wget https://raw.githubusercontent.com/resper1965/pii-detector-install/main/install-complete.sh
chmod +x install-complete.sh

# Executar instalação (automatiza tudo)
./install-complete.sh
```

**O script automaticamente:**
- Cria usuário `piidetector` com senha `PiiDetector2024!`
- Instala PostgreSQL, Redis, Nginx, Node.js, Python
- Configura estrutura de pastas em `/home/piidetector/`
- Gera senhas seguras automaticamente
- Configura firewall e fail2ban
- Prepara ambiente para deploy

### Passo 3: Configurar OpenAI API (Opcional)
```bash
# Editar configuração
nano /home/piidetector/config/.env

# Adicionar sua chave OpenAI
OPENAI_API_KEY=sk-sua-chave-aqui
```

### Passo 4: Deploy da Aplicação
```bash
# Mudar para usuário piidetector
su - piidetector

# Ir para diretório da aplicação
cd /home/piidetector/pii-detector

# Clonar seu repositório
git clone https://github.com/seu-usuario/pii-detector.git .

# Executar deploy
./deploy.sh
```

### Passo 5: Verificar Instalação
```bash
# Verificar serviços
systemctl status postgresql redis-server nginx
pm2 status

# Testar aplicação
curl http://localhost:5000/health
curl http://SEU_IP_VPS/health
```

### Acesso à Aplicação
- **URL**: `http://SEU_IP_VPS`
- **Usuário sistema**: `piidetector`
- **Senha sistema**: `PiiDetector2024!`

## 📂 Estrutura de Diretórios Criada

```
/home/piidetector/
├── pii-detector/          # Aplicação principal
├── config/                # Configurações (.env)
├── uploads/               # Arquivos enviados
│   ├── temp/              # Temporários
│   ├── processed/         # Processados
│   ├── quarantine/        # Quarentena
│   └── sftp/              # SFTP (incoming/processed)
├── backups/               # Backups automáticos
├── ssl/                   # Certificados SSL
├── cache/                 # Cache da aplicação
└── temp/                  # Arquivos temporários

/var/log/pii-detector/     # Logs da aplicação
```

## ⚙️ Configuração Avançada

### SSL/HTTPS (Opcional)
```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado (substitua seu domínio)
certbot --nginx -d seudominio.com
```

### SFTP para Upload Automático
```bash
# O usuário piidetector já está configurado para SFTP
# Teste de conexão:
sftp piidetector@SEU_IP_VPS

# Upload de arquivos vai para:
# /home/piidetector/uploads/sftp/incoming/
```

### Monitoramento
```bash
# Ver logs da aplicação
pm2 logs pii-detector

# Ver logs do sistema
tail -f /var/log/pii-detector/app.log

# Status completo
pm2 monit
```

## 🔧 Manutenção

### Backup
```bash
# Como usuário piidetector
su - piidetector
./backup.sh

# Verificar backups
ls -la /home/piidetector/backups/
```

### Atualização da Aplicação
```bash
# Deploy de nova versão
cd /home/piidetector/pii-detector
git pull origin main
./deploy.sh
```

### Limpeza de Espaço
```bash
# Limpeza automática
./cleanup-folders.sh

# Verificar espaço
df -h
du -sh /home/piidetector/*
```

## 🚨 Solução de Problemas

### Aplicação não inicia
```bash
pm2 logs pii-detector
systemctl status postgresql redis-server
```

### Erro 502 no navegador
```bash
curl http://localhost:5000/health
systemctl restart nginx
pm2 restart pii-detector
```

### Problema no banco de dados
```bash
sudo -u postgres psql -c "\l"
sudo -u piidetector psql pii_detector -c "SELECT version();"
```

### Sem espaço em disco
```bash
./cleanup-folders.sh
find /var/log -name "*.log" -mtime +7 -delete
```

## 📊 Configurações de Segurança

### Firewall (já configurado)
```bash
ufw status
# Portas abertas: 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

### Fail2Ban (já configurado)
```bash
fail2ban-client status sshd
```

### Senhas Geradas Automaticamente
- **PostgreSQL**: Gerada automaticamente no `.env`
- **Session Secret**: Gerada automaticamente
- **JWT Secret**: Gerada automaticamente

## ✅ Checklist de Verificação

- [ ] VPS acessível via SSH
- [ ] Script `install-complete.sh` executado
- [ ] Usuário `piidetector` criado
- [ ] Todos os serviços rodando (PostgreSQL, Redis, Nginx)
- [ ] Aplicação respondendo em `http://SEU_IP_VPS`
- [ ] OpenAI API configurada (se necessário)
- [ ] SSL configurado (se aplicável)
- [ ] Backup funcionando
- [ ] Monitoramento ativo

## 🎯 Próximos Passos

1. **Criar primeira conta** na aplicação
2. **Fazer upload teste** de documento
3. **Configurar SFTP** se necessário
4. **Configurar domínio** próprio
5. **Configurar SSL** para HTTPS
6. **Configurar alertas** por email

---

**Tempo total de instalação**: 15-30 minutos
**Dificuldade**: Iniciante
**Suporte completo** incluído