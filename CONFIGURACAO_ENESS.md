# Configuração PII Detector - e-ness

## Instalação no ambiente e-ness

### 1. Executar instalação
```bash
# No servidor monster
wget https://raw.githubusercontent.com/resper1965/DataFogScanner/main/install-simple.sh
chmod +x install-simple.sh
sudo ./install-simple.sh
```

### 2. Configurar SSL para monster.e-ness.com.br
```bash
# Após instalação concluída
su - piidetector
./setup-ssl.sh monster.e-ness.com.br admin@e-ness.com.br
```

### 3. Verificar configuração
```bash
# Verificar status do sistema
./check-system.sh

# Testar aplicação
curl https://monster.e-ness.com.br/health
```

## Acessos

- **HTTP**: http://monster.e-ness.com.br
- **HTTPS**: https://monster.e-ness.com.br (após configurar SSL)
- **Configuração**: /home/piidetector/config/.env
- **Logs**: /home/piidetector/logs/

## Configurações específicas e-ness

### Variáveis de ambiente importantes
```bash
nano /home/piidetector/config/.env
```

Configurar:
```env
# Para processamento otimizado
MAX_CONCURRENT_JOBS=6
PROCESSING_TIMEOUT=600000

# Para uploads maiores se necessário
MAX_FILE_SIZE=209715200  # 200MB

# Para habilitar IA semântica (opcional)
OPENAI_API_KEY=sk-sua-chave-aqui
ENABLE_SEMANTIC_ANALYSIS=true
```

### Monitoramento
```bash
# Ver status geral
pm2 monit

# Logs em tempo real
pm2 logs pii-detector

# Verificar recursos
htop
```

### Backup automático
```bash
# Backup manual
su - piidetector
./backup.sh

# Verificar backups
ls -la /home/piidetector/backups/daily/
```

## Comandos úteis para administração

### Reiniciar serviços
```bash
# Aplicação apenas
pm2 restart pii-detector

# Todos os serviços
sudo systemctl restart postgresql redis-server nginx
```

### Ver logs de erro
```bash
# Logs da aplicação
tail -f /home/piidetector/logs/error.log

# Logs do sistema
sudo journalctl -f -u nginx
sudo journalctl -f -u postgresql
```

### Verificar espaço em disco
```bash
df -h
du -sh /home/piidetector/*
```

### Limpeza de manutenção
```bash
# Limpeza de uploads antigos (>30 dias)
find /home/piidetector/uploads/completed -mtime +30 -delete

# Limpeza de logs antigos (>7 dias)
find /home/piidetector/logs -name "*.log.*" -mtime +7 -delete
```

## Contato e suporte

Para questões técnicas relacionadas ao PII Detector no ambiente e-ness, verificar:
1. Status do sistema com `./check-system.sh`
2. Logs da aplicação
3. Conectividade de rede e DNS para monster.e-ness.com.br