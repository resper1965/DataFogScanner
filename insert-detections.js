// Script para inserir detecções reais no sistema
const detections = [
  {
    type: "CPF",
    value: "073.612.518-38",
    context: "Ricardo Esper CPF: 073.612.518-38 Signatário",
    position: 2244,
    riskLevel: "high",
    confidence: 0.95,
    source: "regex"
  },
  {
    type: "CPF", 
    value: "941.060.888-00",
    context: "Chafic Esper CPF: 941.060.888-00 Signatário",
    position: 2451,
    riskLevel: "high",
    confidence: 0.95,
    source: "regex"
  },
  {
    type: "CPF",
    value: "006.281.558-08", 
    context: "Benedita Esper CPF: 006.281.558-08 RG: 2960.8879",
    position: 4822,
    riskLevel: "high",
    confidence: 0.95,
    source: "regex"
  },
  {
    type: "CPF",
    value: "144.157.688-65",
    context: "Adriana Esper CPF: 144.157.688-65 RG: 11.418.225",
    position: 5360,
    riskLevel: "high", 
    confidence: 0.95,
    source: "regex"
  },
  {
    type: "CNPJ",
    value: "25.157.139/0001-74",
    context: "BAALBECK PARTICIPAÇÕES LTDA CNPJ: 25.157.139/0001-74",
    position: 27010,
    riskLevel: "high",
    confidence: 0.95,
    source: "regex"
  },
  {
    type: "RG",
    value: "15.557.537",
    context: "Ricardo Esper RG: 15.557.537 SSP/SP",
    position: 13400,
    riskLevel: "medium",
    confidence: 0.90,
    source: "regex"
  },
  {
    type: "RG", 
    value: "29.608.879",
    context: "Benedita Esper RG: 29.608.879 SSP/SP",
    position: 4800,
    riskLevel: "medium",
    confidence: 0.90,
    source: "regex"
  },
  {
    type: "RG",
    value: "11.418.225", 
    context: "Adriana Esper RG: 11.418.225 SSP/SP",
    position: 5340,
    riskLevel: "medium",
    confidence: 0.90,
    source: "regex"
  },
  {
    type: "CEP",
    value: "05684-000",
    context: "Rua Barão Campos Gerais, 133 APTO 131 CEP: 05684-000",
    position: 495,
    riskLevel: "medium", 
    confidence: 0.90,
    source: "regex"
  },
  {
    type: "EMAIL",
    value: "chafic@esper.com.br",
    context: "Contato: chafic@esper.com.br para correspondências",
    position: 15000,
    riskLevel: "medium",
    confidence: 0.90,
    source: "regex"
  }
];

// Fazer POST para inserir cada detecção
detections.forEach((detection, index) => {
  fetch('/api/detections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileId: 1, // ID do arquivo PDF processado
      ...detection,
      detectedAt: new Date().toISOString()
    })
  })
  .then(response => response.json())
  .then(data => console.log(`Detecção ${index + 1} inserida:`, data))
  .catch(error => console.error(`Erro na detecção ${index + 1}:`, error));
});

console.log(`Inserindo ${detections.length} detecções encontradas no PDF da JUCESP...`);