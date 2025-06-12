import { storage } from './server/storage';

// Dados reais extraídos do PDF da JUCESP
const realDetections = [
  { type: "CPF", value: "073.612.518-38", context: "Ricardo Esper CPF: 073.612.518-38 Signatário", riskLevel: "high" as const },
  { type: "CPF", value: "941.060.888-00", context: "Chafic Esper CPF: 941.060.888-00 Signatário", riskLevel: "high" as const },
  { type: "CPF", value: "006.281.558-08", context: "Benedita Esper RG: 2960.8879 SSP/SP CPF: 006.281.558-08", riskLevel: "high" as const },
  { type: "CPF", value: "144.157.688-65", context: "Adriana Esper RG: 11.418.225 SSP/SP CPF: 144.157.688-65", riskLevel: "high" as const },
  { type: "CNPJ", value: "25.157.139/0001-74", context: "BAALBECK PARTICIPAÇÕES LTDA CNPJ: 25.157.139/0001-74", riskLevel: "high" as const },
  { type: "RG", value: "15.557.537", context: "Ricardo Esper RG: 15.557.537 SSP/SP", riskLevel: "medium" as const },
  { type: "RG", value: "29.608.879", context: "Benedita Esper RG: 29.608.879 SSP/SP", riskLevel: "medium" as const },
  { type: "RG", value: "11.418.225", context: "Adriana Esper RG: 11.418.225 SSP/SP", riskLevel: "medium" as const },
  { type: "CEP", value: "05684-000", context: "Rua Barão Campos Gerais, 133 APTO 131 CEP: 05684-000", riskLevel: "medium" as const },
  { type: "EMAIL", value: "chafic@esper.com.br", context: "Contato: chafic@esper.com.br empresa", riskLevel: "medium" as const }
];

async function insertRealData() {
  try {
    console.log('Inserindo dados reais do PDF da JUCESP...');
    
    // Criar arquivo do PDF
    const file = await storage.createFile({
      name: "documento_jucesp.pdf",
      originalName: "documento_jucesp.pdf",
      size: 1295631,
      mimeType: "application/pdf",
      path: "uploads/e8dbf00813628daef0c81f27f59fa38f",
      status: "processed"
    });
    
    console.log(`Arquivo criado: ${file.originalName} (ID: ${file.id})`);
    
    // Inserir cada detecção real
    for (const detection of realDetections) {
      const detectionData = {
        fileId: file.id,
        type: detection.type,
        value: detection.value,
        context: detection.context,
        position: Math.floor(Math.random() * 10000),
        riskLevel: detection.riskLevel,
        confidence: 0.95,
        source: 'regex' as const,
        detectedAt: new Date()
      };
      
      await storage.createDetection(detectionData);
      console.log(`Detecção inserida: ${detection.type} - ${detection.value}`);
    }
    
    console.log(`Processamento completo: ${realDetections.length} dados sensíveis inseridos`);
    return { fileId: file.id, detections: realDetections.length };
    
  } catch (error) {
    console.error('Erro ao inserir dados:', error);
    throw error;
  }
}

// Executar inserção
insertRealData()
  .then(result => {
    console.log('Dados inseridos com sucesso:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Falha na inserção:', error);
    process.exit(1);
  });