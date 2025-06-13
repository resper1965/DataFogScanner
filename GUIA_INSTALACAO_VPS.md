# Guia Completo de Instalação VPS - PII Detector DataFog

## 🚀 Preparação da VPS

### 1. Requisitos Mínimos
- **OS**: Ubuntu 20.04+ ou Debian 11+
- **RAM**: 2GB mínimo (4GB recomendado)
- **Disco**: 20GB mínimo (50GB recomendado)
- **CPU**: 2 cores mínimo
- **Acesso**: SSH com privilégios root

### 2. Acesso Inicial à VPS
```bash
# Conectar via SSH
ssh root@SEU_IP_VPS

# Ou se usar chave
ssh -i sua_chave.pem root@SEU_IP_VPS
```

## 📋 Processo de Instalação

### Opção 1: Instalação Tradicional (Recomendada)

#### Passo 1: Baixar os Scripts
```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar wget se necessário
apt install -y wget curl git

# Baixar scripts de instalação
wget https://raw.githubusercontent.com/seu-repo/pii-detector/main/install-vps.sh
wget https://raw.githubusercontent.com/seu-repo/pii-detector/main/create-folders-vps.sh

# Dar permissões
chmod +x *.sh
```

#### Passo 2: Criar Estrutura de Pastas
```bash
# Executar criação de pastas primeiro
./create-folders-vps.sh
```

#### Passo 3: Instalação Completa
```bash
# Executar instalação principal
./install-vps.sh
```

#### Passo 4: Configurar Senhas
```bash
# Definir senha do PostgreSQL
sudo -u postgres psql
ALTER USER piidetector PASSWORD 'SUA_SENHA_MUITO_SEGURA';
\q

# Gerar secrets seguros
openssl rand -base64 32  # Para SESSION_SECRET
openssl rand -base64 32  # Para JWT_SECRET
```

#### Passo 5: Configurar Variáveis
```bash
# Editar configuração
nano /home/piidetector/config/.env
```

Configurar:
```env
DATABASE_URL=postgresql://piidetector:SUA_SENHA@localhost/pii_detector
PGPASSWORD=SUA_SENHA
SESSION_SECRET=SEU_SECRET_GERADO
JWT_SECRET=SEU_JWT_SECRET_GERADO
OPENAI_API_KEY=sk-seu-key-aqui  # Opcional
```

#### Passo 6: Deploy da Aplicação
```bash
# Mudar para usuário piidetector
su - piidetector

# Ir para diretório
cd /home/piidetector/pii-detector

# Clonar repositório
git clone https://github.com/seu-usuario/pii-detector.git .

# Executar deploy
./deploy.sh
```

### Opção 2: Instalação via Docker

#### Passo 1: Instalação Docker
```bash
# Baixar script Docker
wget https://raw.githubusercontent.com/seu-repo/pii-detector/main/docker-install.sh
chmod +x docker-install.sh

# Executar instalação Docker
./docker-install.sh
```

#### Passo 2: Deploy Docker
```bash
# Mudar para usuário piidetector
su - piidetector
cd /home/piidetector/pii-detector

# Clonar repositório
git clone https://github.com/seu-usuario/pii-detector.git .

# Executar deploy Docker
./deploy.sh
```

## ⚙️ Configuração Pós-Instalação

### 1. Verificar Sistema
```bash
# Como usuário piidetector
./check-folders.sh
./check-system.sh
```

### 2. Configurar Domínio (Opcional)
```bash
# Editar configuração Nginx para seu domínio
nano /etc/nginx/sites-available/pii-detector

# Substituir server_name _ por:
server_name seudominio.com www.seudominio.com;

# Reiniciar Nginx
systemctl reload nginx
```

### 3. Configurar SSL
```bash
# Editar script SSL
nano /home/piidetector/setup-ssl.sh

# Alterar DOMAIN="SEU_DOMINIO.com"
# Executar
sudo ./setup-ssl.sh
```

### 4. Configurar SFTP (Opcional)
```bash
# Definir senha para usuário SFTP
passwd piidetector

# Testar conexão SFTP
sftp piidetector@localhost
```

## 🔧 Verificação da Instalação

### 1. Verificar Serviços
```bash
# Status dos serviços
systemctl status postgresql redis-server nginx

# Status da aplicação
pm2 status
pm2 logs pii-detector
```

### 2. Testar Aplicação
```bash
# Teste local
curl http://localhost:5000/health

# Teste externo (substitua IP)
curl http://SEU_IP_VPS:5000/health
```

### 3. Verificar Logs
```bash
# Logs da aplicação
tail -f /var/log/pii-detector/app.log

# Logs do Nginx
tail -f /var/log/nginx/access.log
```

## 🌐 Acessar a Aplicação

### Opções de Acesso:
1. **IP direto**: `http://SEU_IP_VPS:5000`
2. **Com Nginx**: `http://SEU_IP_VPS`
3. **Com domínio**: `http://seudominio.com`
4. **Com SSL**: `https://seudominio.com`

## 🔒 Configuração de Segurança

### 1. Firewall
```bash
# Verificar status
ufw status

# Ajustar regras se necessário
ufw allow from SEU_IP_OFFICE to any port 22
ufw deny 22
```

### 2. Fail2Ban
```bash
# Verificar status
fail2ban-client status sshd

# Ver IPs banidos
fail2ban-client status
```

### 3. Monitoramento
```bash
# Ver script de monitoramento
cat /home/datafog/monitor.sh

# Ver logs de monitoramento
tail -f /var/log/pii-detector/monitor.log
```

## 💾 Backup e Manutenção

### 1. Backup Manual
```bash
# Como usuário piidetector
./backup.sh

# Verificar backups
ls -la /home/piidetector/backups/
```

### 2. Atualização da Aplicação
```bash
# Deploy de nova versão
cd /home/piidetector/pii-detector
git pull origin main
./deploy.sh
```

### 3. Limpeza do Sistema
```bash
# Limpeza manual
./cleanup-folders.sh

# Verificar espaço
df -h
du -sh /home/piidetector/*
```

## 🚨 Troubleshooting Rápido

### Problemas Comuns:

**Aplicação não inicia:**
```bash
pm2 logs pii-detector
systemctl status postgresql redis-server
```

**Erro 502:**
```bash
curl http://localhost:5000/health
systemctl restart nginx
```

**Sem espaço em disco:**
```bash
./cleanup-folders.sh
find /var/log -name "*.log" -mtime +7 -delete
```

**Database error:**
```bash
sudo -u postgres psql -c "\l"
sudo -u piidetector psql pii_detector -c "SELECT version();"
```

## 📞 Suporte

Para problemas específicos:

1. **Executar diagnóstico completo:**
   ```bash
   ./check-system.sh > diagnostico.txt
   ```

2. **Coletar logs:**
   ```bash
   ./collect-logs.sh
   ```

3. **Verificar documentação de troubleshooting:**
   - `TROUBLESHOOTING_VPS.md`

## ✅ Checklist Final

- [ ] VPS conectada via SSH
- [ ] Scripts baixados e executados
- [ ] Estrutura de pastas criada
- [ ] Serviços instalados e rodando
- [ ] Database configurado com senha
- [ ] Arquivo .env configurado
- [ ] Aplicação clonada do repositório
- [ ] Deploy executado com sucesso
- [ ] Aplicação respondendo no navegador
- [ ] Firewall configurado
- [ ] SSL configurado (se aplicável)
- [ ] Backup funcionando
- [ ] Monitoramento ativo

## 🎯 Próximos Passos

Após instalação bem-sucedida:

1. **Configurar usuários da aplicação**
2. **Importar dados existentes**
3. **Configurar integração SFTP**
4. **Ajustar configurações de processamento**
5. **Configurar alertas por email**
6. **Realizar backup inicial completo**

---

**Tempo estimado de instalação**: 30-60 minutos
**Dificuldade**: Iniciante a Intermediário
**Suporte**: Documentação completa incluída