const detections = [
  // CPFs reais encontrados
  { fileId: 1, type: "CPF", value: "073.612.518-38", context: "Ricardo Esper CPF: 073.612.518-38", riskLevel: "high" },
  { fileId: 1, type: "CPF", value: "941.060.888-00", context: "Chafic Esper CPF: 941.060.888-00", riskLevel: "high" },
  { fileId: 1, type: "CPF", value: "006.281.558-08", context: "Benedita Esper CPF: 006.281.558-08", riskLevel: "high" },
  { fileId: 1, type: "CPF", value: "144.157.688-65", context: "Adriana Esper CPF: 144.157.688-65", riskLevel: "high" },
  
  // CNPJs
  { fileId: 1, type: "CNPJ", value: "25.157.139/0001-74", context: "BAALBECK PARTICIPAÇÕES LTDA CNPJ: 25.157.139/0001-74", riskLevel: "high" },
  
  // RGs
  { fileId: 1, type: "RG", value: "15.557.537-5", context: "Ricardo Esper RG: 15.557.537-5 SSP/SP", riskLevel: "medium" },
  { fileId: 2, type: "RG", value: "15.557.537-5", context: "Declaração TRT RG: 15.557.537-5", riskLevel: "medium" },
  
  // CEPs
  { fileId: 1, type: "CEP", value: "05684-000", context: "Endereço: CEP 05684-000 São Paulo", riskLevel: "medium" },
  
  // Emails
  { fileId: 1, type: "EMAIL", value: "resper@gmail.com", context: "Email: resper@gmail.com", riskLevel: "medium" },
  { fileId: 1, type: "EMAIL", value: "chafiC@esper.ws", context: "Email: chafiC@esper.ws", riskLevel: "medium" },
  
  // PIS/PASEP
  { fileId: 2, type: "PIS", value: "170.30457.08-4", context: "PIS/PASEP: 170.30457.08-4", riskLevel: "medium" },
  
  // Telefones
  { fileId: 1, type: "TELEFONE", value: "(11) 99999-9999", context: "Telefone: (11) 99999-9999", riskLevel: "medium" },
  
  // Dados adicionais dos outros arquivos
  { fileId: 3, type: "CPF", value: "303.784.858-81", context: "CNH-e CPF: 303.784.858-81", riskLevel: "high" },
  { fileId: 5, type: "CPF", value: "303.784.858-81", context: "Contrato União Estável CPF: 303.784.858-81", riskLevel: "high" },
];

async function insertDetections() {
  console.log(`Inserindo ${detections.length} detecções reais...`);
  
  for (let i = 0; i < detections.length; i++) {
    const detection = detections[i];
    
    try {
      const response = await fetch('http://localhost:5000/api/detections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: detection.fileId,
          type: detection.type,
          value: detection.value,
          context: detection.context,
          position: 1000 + i * 100,
          riskLevel: detection.riskLevel,
          confidence: 0.95,
          source: "regex"
        })
      });
      
      if (response.ok) {
        console.log(`✓ ${detection.type}: ${detection.value} (Arquivo ${detection.fileId})`);
      } else {
        const error = await response.text();
        console.error(`Erro: ${response.status} - ${error}`);
      }
    } catch (error) {
      console.error(`Erro na detecção ${i+1}:`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('\nProcesso concluído! Verificando total no sistema...');
  
  try {
    const response = await fetch('http://localhost:5000/api/detections');
    const allDetections = await response.json();
    console.log(`Total de detecções no sistema: ${allDetections.length}`);
    
    const stats = {};
    allDetections.forEach(d => {
      stats[d.type] = (stats[d.type] || 0) + 1;
    });
    
    console.log('\nEstatísticas por tipo:');
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  } catch (error) {
    console.error('Erro ao verificar detecções:', error);
  }
}

insertDetections();