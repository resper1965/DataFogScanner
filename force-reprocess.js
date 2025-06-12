const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simular storage (será substituído pela importação real)
const storage = {
  async getFile(id) {
    // Mapear IDs para arquivos conhecidos
    const files = {
      1: { id: 1, name: '07ddbc84e4be06a40f13184333c0251f', originalName: 'dados_clientes.txt', path: 'uploads/07ddbc84e4be06a40f13184333c0251f' },
      2: { id: 2, name: 'e8dbf00813628daef0c81f27f59fa38f', originalName: 'outro_arquivo.txt', path: 'uploads/e8dbf00813628daef0c81f27f59fa38f' }
    };
    return files[id];
  },
  
  async createDetection(detection) {
    console.log('Criando detecção:', detection);
    return { id: Math.random(), ...detection };
  },
  
  async deleteDetectionsByFileId(fileId) {
    console.log('Removendo detecções antigas do arquivo:', fileId);
  }
};

async function processFile(fileId) {
  try {
    const file = await storage.getFile(fileId);
    if (!file) {
      console.log(`Arquivo ${fileId} não encontrado`);
      return;
    }

    console.log(`Processando: ${file.originalName}`);

    // Executar script Python
    const pythonProcess = spawn('python', ['test_script.py', file.path]);
    
    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          
          // Limpar detecções antigas
          await storage.deleteDetectionsByFileId(fileId);
          
          console.log(`Encontradas ${result.total_detections} detecções`);
          
          // Inserir novas detecções
          for (const detection of result.detections) {
            await storage.createDetection({
              fileId: fileId,
              type: detection.type,
              value: detection.value,
              context: detection.context,
              position: detection.position,
              riskLevel: detection.riskLevel,
              confidence: detection.confidence,
              source: detection.source,
              detectedAt: new Date()
            });
          }
          
          console.log(`✅ Arquivo ${file.originalName} processado com sucesso!`);
          
        } catch (parseError) {
          console.error('Erro ao parsear resultado:', parseError);
        }
      } else {
        console.error('Erro no processamento Python');
      }
    });

  } catch (error) {
    console.error('Erro:', error);
  }
}

// Processar arquivos conhecidos
async function main() {
  console.log('Reprocessando arquivos com dados sensíveis...');
  await processFile(1); // Arquivo com dados detectados
  await processFile(2); // Segundo arquivo
}

main();