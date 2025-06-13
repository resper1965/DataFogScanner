# 🚀 Instalação PII Detector - Guia Único

## Instalação Automática em VPS

### Requisitos
- Ubuntu 20.04+ ou Debian 11+
- 4GB RAM mínimo (8GB recomendado)
- 50GB espaço em disco
- Acesso root via SSH

### Comando de Instalação
```bash
# Fazer download e executar script
wget https://raw.githubusercontent.com/resper1965/DataFogScanner/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

### O que é instalado automaticamente
- PostgreSQL 15 (banco de dados)
- Redis (cache e sessões)
- Node.js 20 LTS + PM2
- Python 3.11 + DataFog
- Nginx (proxy reverso)
- UFW + Fail2Ban (segurança)
- Estrutura completa de pastas
- Configurações otimizadas

## Pós-instalação

O script faz automaticamente:
- Download do código do repositório
- Instalação das dependências
- Configuração do banco de dados
- Inicialização da aplicação

### Configurar SSL/HTTPS (recomendado)
```bash
# Configurar domínio e certificado SSL gratuito
su - piidetector
./scripts/setup-ssl.sh seudominio.com admin@empresa.com
```

### Configurar OpenAI (opcional)
```bash
nano /home/piidetector/config/.env
# Adicionar: OPENAI_API_KEY=sk-sua-chave-aqui
# Alterar: ENABLE_SEMANTIC_ANALYSIS=true

# Reiniciar aplicação
pm2 restart pii-detector
```

## Verificação

### Status do sistema
```bash
su - piidetector
./check-system.sh
```

### Testar aplicação
```bash
curl http://localhost:5000/health
```

### Acesso web
```
http://SEU_IP_SERVIDOR
```

## Comandos úteis

### Logs
```bash
# Logs da aplicação
tail -f /home/piidetector/logs/app.log

# Logs do PM2
pm2 logs pii-detector

# Logs do sistema
journalctl -f
```

### Backup
```bash
su - piidetector
./backup.sh
```

### Reiniciar serviços
```bash
# Aplicação
pm2 restart pii-detector

# Banco de dados
sudo systemctl restart postgresql

# Web server
sudo systemctl restart nginx
```

## Solução de problemas

### Aplicação não inicia
1. Verificar logs: `pm2 logs pii-detector`
2. Verificar configuração: `cat /home/piidetector/config/.env`
3. Testar banco: `pg_isready -h localhost -U piidetector`

### Erro 502 no navegador
1. Verificar se aplicação está rodando: `pm2 list`
2. Testar localmente: `curl http://localhost:5000`
3. Verificar nginx: `sudo nginx -t`

### Sem espaço em disco
```bash
# Limpeza automática
su - piidetector
find uploads/completed -mtime +30 -delete
find logs -name "*.log.*" -mtime +7 -delete
```

## Arquivos importantes

- **Configuração**: `/home/piidetector/config/.env`
- **Logs**: `/home/piidetector/logs/`
- **Uploads**: `/home/piidetector/uploads/`
- **Backups**: `/home/piidetector/backups/`
- **Aplicação**: `/home/piidetector/pii-detector/`

## Contatos

Para suporte, execute os scripts de diagnóstico e envie os logs:
```bash
su - piidetector
./check-system.sh > diagnostico.txt
```