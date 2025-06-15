# n.PIIdetector

Sistema avançado de detecção de PII brasileiro com interface moderna e conformidade LGPD integrada.

## Instalação em VPS

Execute em sua VPS Ubuntu/Debian como root:

```bash
curl -fsSL https://raw.githubusercontent.com/resper1965/DataFogScanner/main/install-production.sh | bash
```

**Ou baixe e execute em etapas:**

```bash
wget https://raw.githubusercontent.com/resper1965/DataFogScanner/main/install-production.sh
chmod +x install-production.sh
sudo ./install-production.sh
```

> **Nota**: o Node.js instalado pelo script já inclui o `npm`. Não instale o `npm` separadamente com `apt` para evitar conflitos.

## Características Principais

- **Detecção Avançada**: CPF, CNPJ, RG, CEP, telefones, emails
- **Interface Moderna**: React com tema escuro/claro
- **LGPD Compliance**: Relatórios automáticos de conformidade
- **Processamento**: PDF, DOC/DOCX, XLS/XLSX, TXT, CSV, XML
- **Arquitetura**: Node.js + PostgreSQL + Redis + Nginx

O script automaticamente:
- Instala todas as dependências (Node.js, PostgreSQL, Redis, Nginx)
- Configura usuário `piidetector`
- Configura banco de dados e sessões Redis
- Faz build da aplicação
- Configura systemd e Nginx
- Inicia todos os serviços

## Acesso

- **URL**: http://monster.e-ness.com.br
- **Usuário**: piidetector
- **Diretório**: /home/piidetector/pii-detector
- **Configuração**: o arquivo `.env` é gerado em `/opt/n-piidetector/.env`

## Variáveis de Ambiente

Algumas configurações podem ser ajustadas no arquivo `.env` gerado durante a instalação.

- `PORT`: porta que o servidor Express utiliza (padrão `5000`)

## Comandos Úteis

```bash
# Status da aplicação
systemctl status n-piidetector

# Logs da aplicação
journalctl -u n-piidetector -f

# Reiniciar aplicação
systemctl restart n-piidetector

# Status dos serviços
systemctl status postgresql redis-server nginx
```

## Habilitar HTTPS

Para gerar um certificado TLS gratuito para o domínio configurado (`monster.e-ness.com.br`) utilizando o Nginx, instale o Certbot e execute a emissão:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d <your-domain>
```

## Estrutura do Projeto

```
├── client/          # Frontend React + TypeScript
├── server/          # Backend Node.js + Express
├── shared/          # Schemas e tipos compartilhados
├── attached_assets/ # Arquivos anexados
└── install-production.sh # Script de instalação para produção
```

## Tecnologias

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Banco**: PostgreSQL com Drizzle ORM
- **Cache**: Redis para sessões
- **Deploy**: systemd + Nginx
- **Processamento**: Python DataFog + OpenAI

## Recursos LGPD

- Detecção de dados pessoais, sensíveis e de menores
- Relatórios de conformidade detalhados
- Gestão de consentimentos e bases legais
- Alertas de retenção e violações
- Notificações funcionais com ações

## Segurança

- Autenticação baseada em sessões
- Validação de entrada com Zod
- Verificação de malware
- Headers de segurança
- Firewall UFW configurado
