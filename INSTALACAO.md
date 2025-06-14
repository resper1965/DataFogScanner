# n.PIIdetector - Instalação em VPS

## Instalação em Comando Único

Execute este comando na sua VPS Ubuntu/Debian como **root**:

```bash
curl -fsSL https://raw.githubusercontent.com/resper1965/DataFogScanner/main/install-production.sh | bash
```

**Ou baixe e execute em etapas:**

```bash
# 1. Baixar o script
wget https://raw.githubusercontent.com/resper1965/DataFogScanner/main/install-production.sh

# 2. Dar permissão de execução  
chmod +x install-production.sh

# 3. Executar como root
sudo ./install-production.sh
```

## O Que Será Instalado

- **Sistema de Detecção PII** com algoritmos brasileiros (CPF, CNPJ, RG, etc.)
- **Interface Moderna** com tema claro/escuro
- **PostgreSQL** para armazenamento de dados
- **Redis** para sessões de produção
- **Nginx** como proxy reverso
- **Systemd** para gerenciamento de processos
- **Firewall UFW** configurado
- **LGPD** compliance integrado

## Após a Instalação

O sistema estará disponível em:
- **URL**: http://monster.e-ness.com.br
- **Usuário**: piidetector
- **Diretório**: /opt/n-piidetector

## Comandos de Gerenciamento

```bash
# Status da aplicação
systemctl status n-piidetector

# Reiniciar aplicação
systemctl restart n-piidetector

# Ver logs em tempo real
journalctl -u n-piidetector -f

# Status de todos os serviços
systemctl status nginx postgresql redis-server
```

## Recursos Inclusos

- ✅ Detecção automática de PII brasileiro
- ✅ Interface com tema escuro/claro
- ✅ Upload de múltiplos formatos (PDF, DOC, XLS, etc.)
- ✅ Relatórios LGPD automatizados
- ✅ Dashboard em tempo real
- ✅ Segurança de produção configurada
- ✅ Backup automático de configurações

## Suporte

- **Logs**: `journalctl -u n-piidetector -f`
- **Configuração**: `/opt/n-piidetector/.env`
- **Documentação**: Consulte o repositório GitHub

---

**n.PIIdetector** - Sistema de Detecção de PII para LGPD  
*powered by ness.*