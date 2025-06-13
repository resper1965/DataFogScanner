# PII Detector - DataFog Scanner

Sistema brasileiro para detecção de dados pessoais (PII) em documentos com interface em português e processamento inteligente.

## Instalação Rápida

### VPS Ubuntu/Debian
```bash
wget https://raw.githubusercontent.com/resper1965/DataFogScanner/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

### Desenvolvimento Local
```bash
git clone https://github.com/resper1965/DataFogScanner.git
cd DataFogScanner
npm install
npm run dev
```

## Funcionalidades

- Detecção de CPF, CNPJ, RG, CEP, telefones e emails
- Processamento híbrido: Regex + IA semântica
- Suporte a PDF, DOCX, XLSX, TXT, ZIP
- Interface em português brasileiro
- Dashboard em tempo real
- Sistema de casos e auditoria

## Tecnologias

- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Banco: PostgreSQL + Drizzle ORM
- Cache: Redis
- IA: OpenAI (opcional)
- Detecção: DataFog + Regex

## Configuração OpenAI (Opcional)

Para melhor precisão na detecção:
```bash
nano /home/piidetector/config/.env
# Adicionar: OPENAI_API_KEY=sk-sua-chave
# Alterar: ENABLE_SEMANTIC_ANALYSIS=true
pm2 restart pii-detector
```

## Comandos Úteis

```bash
# Verificar status
./check-system.sh

# Ver logs
tail -f /home/piidetector/logs/app.log

# Backup
./backup.sh

# Reiniciar
pm2 restart pii-detector
```

## Acesso

Após instalação: `http://SEU_IP_SERVIDOR`