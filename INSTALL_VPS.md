# Instalação Rápida em VPS

## Comando único
```bash
wget https://raw.githubusercontent.com/resper1965/DataFogScanner/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

## O que acontece automaticamente
- Instalação completa do sistema (PostgreSQL, Redis, Node.js, Python, Nginx)
- Download do código do repositório
- Configuração de segurança (UFW, Fail2Ban)
- Criação do usuário `piidetector`
- Estrutura de pastas organizada
- Inicialização automática da aplicação

## Acesso
Após a instalação, acesse: `http://SEU_IP_SERVIDOR`

## Configuração OpenAI (opcional)
```bash
nano /home/piidetector/config/.env
# Adicionar: OPENAI_API_KEY=sk-sua-chave
# Alterar: ENABLE_SEMANTIC_ANALYSIS=true
pm2 restart pii-detector
```

## Comandos úteis
```bash
# Verificar status
su - piidetector && ./check-system.sh

# Ver logs
tail -f /home/piidetector/logs/app.log

# Backup
su - piidetector && ./backup.sh
```

Instalação completa em ~10 minutos!