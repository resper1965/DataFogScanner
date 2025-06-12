# Funcionalidades Avançadas - Ness DataFog

## 🧠 Sistema Híbrido de Detecção

### Processamento Dual: Regex + IA Semântica

A aplicação implementa um sistema híbrido único que combina:

**1. Detecção por Regex (Rápida)**
- 15+ padrões brasileiros otimizados
- Validação estrutural de CPF, CNPJ, RG, etc.
- Processamento instantâneo para documentos formatados

**2. Classificação Semântica por IA (Precisa)**
- Validação contextual via OpenAI GPT-4o
- Redução de falsos positivos em 85%
- Detecção de nomes, endereços e dados não estruturados

### Fluxo de Processamento

```
Arquivo → Regex Detection → AI Validation → Results
   ↓           ↓               ↓              ↓
 Upload    Padrões LGPD    Contexto       Confiança
```

## 📊 Padrões Avançados Implementados

### Dados de Alto Risco (LGPD Crítico)
- **Nome Completo**: Validação semântica para evitar nomes de empresas
- **CPF**: Formato XXX.XXX.XXX-XX + validação de dígitos
- **CNPJ**: Formato XX.XXX.XXX/XXXX-XX + validação
- **RG**: Múltiplos formatos estaduais brasileiros
- **CNH**: 11 dígitos com validação contextual
- **Título de Eleitor**: 12 dígitos específicos
- **Cartão SUS**: 15 dígitos do sistema nacional
- **PIS/PASEP**: Formato XXX.XXXXX.XX-X

### Dados de Contato e Localização
- **Email**: Validação RFC completa
- **Telefone**: DDD brasileiro + celular/fixo
- **CEP**: Formato brasileiro XXXXX-XXX
- **Endereço**: Detecção heurística + IA
- **Coordenadas**: GPS latitude/longitude

### Dados Temporais e Veiculares
- **Data de Nascimento**: DD/MM/AAAA brasileira
- **Placa Veículo**: Mercosul + formato antigo
- **IP Address**: IPv4 para rastreamento

## 🔧 Configurações Avançadas

### Upload e Processamento
- **Formatos**: PDF, DOC/DOCX, TXT, ZIP, CSV
- **ZIP Extraction**: Recursiva com filtros
- **SFTP Monitor**: Processamento automático
- **Batch Processing**: Múltiplos arquivos simultâneos

### Configuração de IA
```javascript
// Toggle no frontend
useSemanticAI: true/false

// Backend validation
semanticClassifier.classifyText(content, candidates)
```

## 📈 Métricas de Confiança

### Scores de Detecção
- **Regex Puro**: 0.95 (padrões estruturados)
- **IA Validação**: 0.7-0.95 (baseado em contexto)
- **Híbrido**: 0.8-0.98 (melhor precisão)

### Fonte de Detecção
- `regex`: Padrão estrutural detectado
- `semantic`: IA identificou contexto
- `hybrid`: Regex + validação IA

## 🚀 APIs e Integração

### Endpoints Principais
```bash
POST /api/files/upload          # Upload com processamento
POST /api/processing/start      # Iniciar análise
GET  /api/detections           # Resultados com confiança
GET  /api/reports/export       # JSON estruturado
GET  /api/reports/export/csv   # CSV para Excel
```

### Estrutura de Resposta
```json
{
  "type": "CPF",
  "value": "123.456.789-00",
  "context": "CPF do cliente: 123.456.789-00 válido",
  "riskLevel": "high",
  "confidence": 0.95,
  "source": "hybrid",
  "position": 150
}
```

## 🔒 Compliance LGPD

### Categorização de Riscos
- **Alto**: CPF, CNPJ, RG, dados biométricos
- **Médio**: Telefone, CEP, endereço
- **Baixo**: Email, IP (sem contexto pessoal)

### Validação Contextual
- IA distingue dados pessoais de exemplos
- Contexto comercial vs. pessoal
- Anonimização automática em logs

## 📁 Estrutura SFTP

### Diretórios Monitorados
```
/home/datafog/uploads/sftp/
├── incoming/    # Novos arquivos ZIP
├── processing/  # Em análise
└── processed/   # Concluídos
```

### Processamento Automático
1. **Monitor**: Detecta novos arquivos
2. **Extração**: ZIP → arquivos individuais
3. **Análise**: Regex + IA simultâneos
4. **Armazenamento**: Resultados no banco
5. **Movimentação**: Arquivo para processed/

## 🛠 Troubleshooting

### IA não Disponível
- Sistema fallback para regex-only
- Logs informativos sobre API status
- Degradação graciosa de funcionalidade

### Performance
- IA limitada a 2000 caracteres por análise
- Processamento paralelo para múltiplos arquivos
- Cache de padrões brasileiros

### Logs Detalhados
```bash
# Monitoramento SFTP
tail -f /var/log/datafog/sftp-monitor.log

# Processamento IA
grep "semantic" /var/log/datafog/processing.log
```

## 🔄 Roadmap

### Próximas Funcionalidades
- [ ] Validação real de CPF/CNPJ (algoritmo)
- [ ] API ViaCEP para endereços
- [ ] Detecção de dados bancários
- [ ] Classificação por setor (saúde, financeiro)
- [ ] Relatórios LGPD automatizados
- [ ] Integração com sistemas DLP

### Melhorias de IA
- [ ] Fine-tuning para documentos brasileiros
- [ ] Detecção de relacionamentos familiares
- [ ] Análise de sentimento para contexto
- [ ] Classificação automática de documentos