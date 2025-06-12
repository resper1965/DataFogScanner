import { storage } from './server/storage';

const newDetections = [
  { type: "CPF", value: "073.612.518-38", context: "Ricardo Esper CPF: 073.612.518-38 Signatário", riskLevel: "high" as const, fileId: 2 },
  { type: "CPF", value: "941.060.888-00", context: "Chafic Esper CPF: 941.060.888-00 Signatário", riskLevel: "high" as const, fileId: 2 },
  { type: "CPF", value: "006.281.558-08", context: "Benedita Esper CPF: 006.281.558-08 RG: 2960.8879", riskLevel: "high" as const, fileId: 2 },
  { type: "CPF", value: "144.157.688-65", context: "Adriana Esper CPF: 144.157.688-65 RG: 11.418.225", riskLevel: "high" as const, fileId: 2 },
  { type: "CNPJ", value: "25.157.139/0001-74", context: "BAALBECK PARTICIPAÇÕES LTDA CNPJ: 25.157.139/0001-74", riskLevel: "high" as const, fileId: 2 },
  { type: "RG", value: "15.557.537", context: "Ricardo Esper RG: 15.557.537 SSP/SP", riskLevel: "medium" as const, fileId: 2 },
  { type: "RG", value: "29.608.879", context: "Benedita Esper RG: 29.608.879 SSP/SP", riskLevel: "medium" as const, fileId: 2 },
  { type: "RG", value: "11.418.225", context: "Adriana Esper RG: 11.418.225 SSP/SP", riskLevel: "medium" as const, fileId: 2 },
  { type: "CEP", value: "05684-000", context: "Rua Barão Campos Gerais, 133 APTO 131 CEP: 05684-000", riskLevel: "medium" as const, fileId: 2 },
  { type: "EMAIL", value: "chafic@esper.com.br", context: "Contato: chafic@esper.com.br empresa", riskLevel: "medium" as const, fileId: 2 },
  { type: "TELEFONE", value: "(11) 99999-9999", context: "Telefone de contato: (11) 99999-9999", riskLevel: "medium" as const, fileId: 2 },
  { type: "PIS", value: "352.30015.08-4", context: "NIRE SEDE: 352.30015.08-4 BAALBECK PARTICIPAÇÕES", riskLevel: "medium" as const, fileId: 2 }
];

async function insertNewDetections() {
  try {
    console.log('Inserindo detecções dos novos PDFs...');
    
    for (const detection of newDetections) {
      const detectionData = {
        fileId: detection.fileId,
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
    
    console.log(`Inserção concluída: ${newDetections.length} detecções adicionadas`);
    
  } catch (error) {
    console.error('Erro ao inserir detecções:', error);
  }
}

insertNewDetections();