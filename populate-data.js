const detections = [
  { type: "CPF", value: "073.612.518-38", context: "Ricardo Esper CPF: 073.612.518-38 Signatário", riskLevel: "high" },
  { type: "CPF", value: "941.060.888-00", context: "Chafic Esper CPF: 941.060.888-00 Signatário", riskLevel: "high" },
  { type: "CPF", value: "006.281.558-08", context: "Benedita Esper RG: 2960.8879 SSP/SP CPF: 006.281.558-08", riskLevel: "high" },
  { type: "CPF", value: "144.157.688-65", context: "Adriana Esper RG: 11.418.225 SSP/SP CPF: 144.157.688-65", riskLevel: "high" },
  { type: "CNPJ", value: "25.157.139/0001-74", context: "BAALBECK PARTICIPAÇÕES LTDA CNPJ: 25.157.139/0001-74", riskLevel: "high" },
  { type: "RG", value: "15.557.537", context: "Ricardo Esper RG: 15.557.537 SSP/SP", riskLevel: "medium" },
  { type: "RG", value: "29.608.879", context: "Benedita Esper RG: 29.608.879 SSP/SP", riskLevel: "medium" },
  { type: "RG", value: "11.418.225", context: "Adriana Esper RG: 11.418.225 SSP/SP", riskLevel: "medium" },
  { type: "CEP", value: "05684-000", context: "Rua Barão Campos Gerais, 133 APTO 131 CEP: 05684-000", riskLevel: "medium" },
  { type: "EMAIL", value: "chafic@esper.com.br", context: "Contato: chafic@esper.com.br empresa", riskLevel: "medium" },
  { type: "EMAIL", value: "admin@ness.com.br", context: "Email corporativo: admin@ness.com.br", riskLevel: "medium" },
  { type: "EMAIL", value: "contato@ness.com.br", context: "Email de contato: contato@ness.com.br", riskLevel: "medium" },
  { type: "TELEFONE", value: "(11) 99999-9999", context: "Telefone de contato: (11) 99999-9999", riskLevel: "medium" },
  { type: "PIS", value: "352.30015.08-4", context: "NIRE SEDE: 352.30015.08-4 BAALBECK PARTICIPAÇÕES", riskLevel: "medium" }
];

async function insertDetections() {
  for (let i = 0; i < detections.length; i++) {
    const detection = detections[i];
    
    try {
      const response = await fetch('http://localhost:5000/api/detections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: 1,
          type: detection.type,
          value: detection.value,
          context: detection.context,
          position: 1000 + i * 100,
          riskLevel: detection.riskLevel,
          confidence: 0.95,
          source: "regex",
          detectedAt: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log(`Detecção ${i+1} inserida: ${detection.type} - ${detection.value}`);
      } else {
        console.error(`Erro na detecção ${i+1}:`, response.status);
      }
    } catch (error) {
      console.error(`Erro ao inserir detecção ${i+1}:`, error);
    }
    
    // Delay pequeno entre inserções
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Processo concluído: ${detections.length} detecções inseridas`);
}

insertDetections();