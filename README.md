# PII Detector - Sistema de Detecção de Dados Pessoais Brasileiro

Sistema completo de detecção de PII (Personally Identifiable Information) brasileiro com interface moderna e recursos avançados de conformidade LGPD.

## Características

- **Detecção Avançada**: CPF, CNPJ, RG, CEP, telefones, emails
- **Interface Moderna**: Design responsivo com Montserrat e componentes Radix UI
- **LGPD Compliance**: Relatórios detalhados e gestão de conformidade
- **Processamento Híbrido**: Regex + validação semântica via OpenAI
- **Arquitetura Escalável**: React + Node.js + PostgreSQL + Redis

## Instalação VPS

Execute um único comando para instalação completa:

```bash
# Clone o repositório
git clone <repository-url> pii-detector
cd pii-detector

# Execute a instalação (como root)
sudo ./install.sh
```

O script automaticamente:
- Instala todas as dependências (Node.js, PostgreSQL, Redis, Nginx)
- Configura usuário `piidetector`
- Configura banco de dados e sessões Redis
- Faz build da aplicação
- Configura PM2 e Nginx
- Inicia todos os serviços

## Acesso

- **URL**: http://monster.e-ness.com.br
- **Usuário**: piidetector
- **Diretório**: /home/piidetector/pii-detector

## Comandos Úteis

```bash
# Status da aplicação
sudo -u piidetector pm2 list

# Logs da aplicação
sudo -u piidetector pm2 logs pii-detector

# Reiniciar aplicação
sudo -u piidetector pm2 restart pii-detector

# Status dos serviços
systemctl status postgresql redis-server nginx
```

## Estrutura do Projeto

```
├── client/          # Frontend React + TypeScript
├── server/          # Backend Node.js + Express
├── shared/          # Schemas e tipos compartilhados
├── uploads/         # Arquivos carregados
├── install.sh       # Script de instalação completa
└── ecosystem.config.cjs # Configuração PM2
```

## Tecnologias

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript
- **Banco**: PostgreSQL com Drizzle ORM
- **Cache**: Redis para sessões
- **Deploy**: PM2 + Nginx
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