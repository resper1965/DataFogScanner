import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { storage } from './storage';
import { getBrazilianPatterns } from '@shared/brazilian-patterns';
import { fileTextExtractor } from './file-text-extractor';

interface DetectionResult {
  type: string;
  value: string;
  context: string;
  position: number;
  riskLevel: 'high' | 'medium' | 'low';
  confidence?: number;
  source?: 'regex' | 'semantic' | 'hybrid';
  ownerName?: string;
  documentType?: string;
}

export async function processFiles(jobIds: number[]): Promise<void> {
  for (const jobId of jobIds) {
    await processFileWithDataFog(jobId);
  }
}

async function processFileWithDataFog(jobId: number): Promise<void> {
  try {
    const job = await storage.getProcessingJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} não encontrado`);
    }

    // Inicialização - 5%
    await storage.updateProcessingJobStatus(jobId, 'processing', 5);
    await new Promise(resolve => setTimeout(resolve, 300));

    const file = await storage.getFile(job.fileId);
    if (!file) {
      throw new Error(`Arquivo ${job.fileId} não encontrado`);
    }

    const filePath = file.path;
    console.log(`Processando arquivo: ${file.originalName} (${file.mimeType})`);

    // Preparação para extração - 15%
    await storage.updateProcessingJobStatus(jobId, 'processing', 15);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Extrair texto usando o novo extrator multiformat
    console.log(`Iniciando extração de texto...`);
    await storage.updateProcessingJobStatus(jobId, 'processing', 25);
    
    const extractionResult = await fileTextExtractor.extractText(filePath, file.mimeType);
    
    if (!extractionResult.success) {
      throw new Error(`Falha na extração de texto: ${extractionResult.error}`);
    }

    console.log(`Texto extraído: ${extractionResult.text.length} caracteres`);
    
    // Extração concluída - 40%
    await storage.updateProcessingJobStatus(jobId, 'processing', 40);
    await new Promise(resolve => setTimeout(resolve, 400));

    // Executar detecção de dados brasileiros no texto extraído
    const allDetections: DetectionResult[] = [];
    
    // Preparando análise de dados - 50%
    console.log(`Iniciando análise de dados sensíveis...`);
    await storage.updateProcessingJobStatus(jobId, 'processing', 50);
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Análise de dados - 60%
    await storage.updateProcessingJobStatus(jobId, 'processing', 60);
    
    const detections = await runBrazilianDataDetection(extractionResult.text, job.fileId);
    allDetections.push(...detections);

    console.log(`Detecções encontradas: ${allDetections.length}`);
    
    // Detecção concluída - 75%
    await storage.updateProcessingJobStatus(jobId, 'processing', 75);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Salvar detecções no storage
    const totalDetections = allDetections.length;
    for (let i = 0; i < allDetections.length; i++) {
      const detection = allDetections[i];
      console.log(`Salvando detecção ${i + 1}/${totalDetections}: ${detection.type} - ${detection.value}`);
      
      await storage.createDetection({
        fileId: file.id,
        type: detection.type,
        value: detection.value,
        context: detection.context,
        riskLevel: detection.riskLevel,
        position: detection.position,
        ownerName: detection.ownerName,
        documentType: detection.documentType
      });

      // Atualizar progresso durante salvamento (75% a 90%)
      const saveProgress = 75 + Math.floor((i / totalDetections) * 15);
      await storage.updateProcessingJobStatus(jobId, 'processing', saveProgress);
    }

    // Finalizando processamento - 95%
    await storage.updateProcessingJobStatus(jobId, 'processing', 95);
    await storage.completeProcessingJob(jobId);
    await storage.updateFileStatus(file.id, 'completed');

  } catch (error) {
    console.error(`Erro no processamento do job ${jobId}:`, error);
    await storage.updateProcessingJobStatus(
      jobId, 
      'failed', 
      undefined, 
      error instanceof Error ? error.message : 'Erro desconhecido'
    );
    
    const job = await storage.getProcessingJob(jobId);
    if (job) {
      await storage.updateFileStatus(job.fileId, 'error');
    }
  }
}

// Função para extrair nomes brasileiros do texto
function extractBrazilianNames(text: string): string[] {
  // Padrões comuns para identificar nomes em documentos brasileiros
  const namePatterns = [
    /(?:Nome[:\s]+)([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+(?:\s+[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+)+)/gi,
    /(?:Titular[:\s]+)([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+(?:\s+[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+)+)/gi,
    /(?:Portador[:\s]+)([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+(?:\s+[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+)+)/gi,
    /(?:Funcionário[:\s]+)([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+(?:\s+[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+)+)/gi,
    // Padrão geral para nomes próprios (2-4 palavras)
    /\b([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+\s+(?:[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][a-zàáâãéêíóôõúç]+\s*){1,3})\b/g
  ];

  const names = new Set<string>();
  
  for (const pattern of namePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      
      // Filtrar nomes válidos (pelo menos 2 palavras, não muito longos)
      const words = name.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && name.length <= 50) {
        // Verificar se não são palavras comuns de documentos
        const commonWords = ['DATA', 'DOCUMENTO', 'REGISTRO', 'NUMERO', 'CODIGO', 'ENDERECO', 'TELEFONE'];
        if (!commonWords.some(word => name.toUpperCase().includes(word))) {
          names.add(name);
        }
      }
    }
  }

  return Array.from(names);
}

// Função para encontrar o nome mais próximo de uma detecção
function findClosestName(text: string, position: number, names: string[]): string | null {
  if (names.length === 0) return null;

  let closestName = null;
  let closestDistance = Infinity;

  for (const name of names) {
    const nameIndex = text.indexOf(name);
    if (nameIndex !== -1) {
      const distance = Math.abs(nameIndex - position);
      if (distance < closestDistance && distance < 200) { // Máximo 200 caracteres de distância
        closestDistance = distance;
        closestName = name;
      }
    }
  }

  return closestName;
}

async function runBrazilianDataDetection(text: string, fileId: number): Promise<DetectionResult[]> {
  const patterns = {
    'CPF': /(?:CPF[:\s]*)?(\d{3}\.?\d{3}\.?\d{3}[-\.]?\d{2})/gi,
    'CNPJ': /(?:CNPJ[:\s]*)?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[-\.]?\d{2})/gi,
    'RG': /(?:RG[:\s]*)?(\d{1,2}\.?\d{3}\.?\d{3}[-\.]?\d{1,2})/gi,
    'CEP': /(\d{5}[-\.]?\d{3})/g,
    'EMAIL': /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    'TELEFONE': /(\(\d{2}\)\s?\d{4,5}[-\.]?\d{4})/g,
    'PIS': /(?:PIS[:\s]*)?(\d{3}\.?\d{5}\.?\d{2}[-\.]?\d{1})/gi,
    'NIRE': /(?:NIRE[:\s]*)?(\d{3}\.?\d{8}[-\.]?\d)/gi
  };

  // Extrair nomes do documento
  const extractedNames = extractBrazilianNames(text);
  console.log(`Nomes extraídos do documento: ${extractedNames.join(', ')}`);

  const detections: DetectionResult[] = [];
  const seen = new Set<string>();

  for (const [type, pattern] of Object.entries(patterns)) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1] || match[0];
      
      // Validação básica
      if (type === 'CPF') {
        const cpf = value.replace(/[^0-9]/g, '');
        if (cpf.length !== 11 || cpf === '00000000000' || /^(\d)\1+$/.test(cpf)) {
          continue;
        }
      }
      
      if (type === 'CNPJ') {
        const cnpj = value.replace(/[^0-9]/g, '');
        if (cnpj.length !== 14) {
          continue;
        }
      }

      // Evitar duplicatas
      const key = `${type}-${value}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      // Extrair contexto
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 50);
      const context = text.substring(start, end).replace(/\s+/g, ' ').trim();

      // Encontrar nome do titular mais próximo
      const ownerName = findClosestName(text, match.index, extractedNames);

      detections.push({
        type,
        value,
        context,
        position: match.index,
        riskLevel: ['CPF', 'CNPJ'].includes(type) ? 'high' : 'medium',
        confidence: 0.95,
        source: 'regex',
        ownerName: ownerName || undefined,
        documentType: type
      });
    }
  }

  return detections;
}

async function runDataFogDetection(
  filePath: string,
  patterns: string[],
  customRegex?: string
): Promise<DetectionResult[]> {
  return new Promise((resolve) => {
    try {
      const scriptContent = createDataFogScript(filePath, patterns, customRegex);
      const tempScriptPath = path.join(process.cwd(), 'temp_datafog_script.py');
      
      fs.writeFile(tempScriptPath, scriptContent)
        .then(() => {
          const pythonProcess = spawn('python', [tempScriptPath], {
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let output = '';
          let errorOutput = '';

          pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
          });

          pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          const timeout = setTimeout(() => {
            pythonProcess.kill();
            resolve([]);
          }, 20000);

          pythonProcess.on('close', (code) => {
            clearTimeout(timeout);
            
            // Limpar arquivo temporário
            fs.unlink(tempScriptPath).catch(() => {});
            
            if (code !== 0) {
              console.error('Erro no script Python:', errorOutput);
              resolve([]);
              return;
            }

            try {
              console.log('Output do Python:', output);
              console.log('Error output:', errorOutput);
              const results = parseDataFogOutput(output);
              console.log('Resultados parseados:', results);
              resolve(results);
            } catch (parseError) {
              console.error('Erro ao parsear saída:', parseError);
              console.log('Output bruto:', output);
              resolve([]);
            }
          });

          pythonProcess.on('error', (error) => {
            clearTimeout(timeout);
            console.error('Erro ao executar Python:', error);
            resolve([]);
          });
        })
        .catch(error => {
          console.error('Erro ao criar script temporário:', error);
          resolve([]);
        });

    } catch (error) {
      console.error('Erro na configuração do script:', error);
      resolve([]);
    }
  });
}

function createDataFogScript(
  filePath: string,
  patterns: string[],
  customRegex?: string
): string {
  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import json
import re
from pathlib import Path

try:
    from datafog import DataFog
    import PyPDF2
    from docx import Document
    import openpyxl
except ImportError as e:
    print(f"Biblioteca não encontrada: {e}", file=sys.stderr)
    # Continuar com regex manual se DataFog não estiver disponível

def extract_text_from_file(file_path):
    """Extrai texto de diferentes tipos de arquivo"""
    try:
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension == '.pdf':
            return extract_text_from_pdf(file_path)
        elif file_extension in ['.docx', '.doc']:
            return extract_text_from_docx(file_path)
        elif file_extension in ['.xlsx', '.xls']:
            return extract_text_from_excel(file_path)
        else:
            # Arquivo de texto simples
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
    except Exception as e:
        print(f"Erro ao extrair texto: {e}", file=sys.stderr)
        return ""

def extract_text_from_pdf(file_path):
    """Extrai texto de arquivo PDF"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ''
            for page in pdf_reader.pages:
                text += page.extract_text() + '\\\\n'
            return text
    except Exception as e:
        print(f"Erro ao ler PDF: {e}", file=sys.stderr)
        return ""

def extract_text_from_docx(file_path):
    """Extrai texto de arquivo DOCX"""
    try:
        doc = Document(file_path)
        text = ''
        for paragraph in doc.paragraphs:
            text += paragraph.text + '\\\\n'
        return text
    except Exception as e:
        print(f"Erro ao ler DOCX: {e}", file=sys.stderr)
        return ""

def extract_text_from_excel(file_path):
    """Extrai texto de arquivo Excel"""
    try:
        workbook = openpyxl.load_workbook(file_path)
        text = ''
        for sheet in workbook.worksheets:
            for row in sheet.iter_rows():
                for cell in row:
                    if cell.value:
                        text += str(cell.value) + ' '
            text += '\\\\n'
        return text
    except Exception as e:
        print(f"Erro ao ler Excel: {e}", file=sys.stderr)
        return ""

def scan_with_regex(content, enabled_patterns):
    """Escaneamento com regex brasileiro"""
    results = []
    
    brazilian_patterns = {
        'cpf': r'\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b',
        'cnpj': r'\\b\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}\\b',
        'email': r'\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        'telefone': r'\\b\\(?\\d{2}\\)?\\s?\\d{4,5}-?\\d{4}\\b',
        'cep': r'\\b\\d{5}-?\\d{3}\\b',
        'rg': r'\\b\\d{1,2}\\.\\d{3}\\.\\d{3}-\\d{1}\\b'
    }
    
    for pattern_name in enabled_patterns:
        if pattern_name in brazilian_patterns:
            matches = re.finditer(brazilian_patterns[pattern_name], content, re.IGNORECASE)
            for match in matches:
                context_start = max(0, match.start() - 30)
                context_end = min(len(content), match.end() + 30)
                context = content[context_start:context_end].strip()
                
                results.append({
                    'type': pattern_name.upper(),
                    'value': match.group(),
                    'context': context,
                    'position': match.start(),
                    'riskLevel': 'high'
                })
    
    return results

def main():
    try:
        file_path = "${filePath}"
        enabled_patterns = ${JSON.stringify(patterns)}
        
        # Extrair texto do arquivo
        content = extract_text_from_file(file_path)
        
        if not content.strip():
            print("[]")
            return
            
        # Tentar usar DataFog primeiro
        try:
            datafog = DataFog()
            scan_results = datafog.scan(content)
            
            results = []
            if hasattr(scan_results, 'matches') and scan_results.matches:
                for match in scan_results.matches:
                    results.append({
                        'type': getattr(match, 'entity_type', 'UNKNOWN').upper(),
                        'value': getattr(match, 'text', ''),
                        'context': content[max(0, getattr(match, 'start', 0)-30):getattr(match, 'end', 0)+30],
                        'position': getattr(match, 'start', 0),
                        'riskLevel': 'high'
                    })
            
            # Se DataFog não encontrou nada, usar regex
            if not results:
                results = scan_with_regex(content, enabled_patterns)
                
        except Exception as e:
            print(f"DataFog não disponível, usando regex: {e}", file=sys.stderr)
            results = scan_with_regex(content, enabled_patterns)
        
        # Imprimir resultados
        print(json.dumps(results, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"Erro: {e}", file=sys.stderr)
        print("[]")

if __name__ == "__main__":
    main()
`;
}

function parseDataFogOutput(output: string): DetectionResult[] {
  try {
    // Remove linhas de erro e pegar apenas o JSON
    const lines = output.trim().split('\n');
    let jsonContent = '';
    
    // Procurar pelo início do array JSON
    let jsonStarted = false;
    for (const line of lines) {
      if (line.trim().startsWith('[')) {
        jsonStarted = true;
      }
      if (jsonStarted) {
        jsonContent += line;
      }
    }
    
    const results = JSON.parse(jsonContent);

    interface RawResult {
      type: string;
      value: string;
      context: string;
      position: number;
      riskLevel: string;
    }

    return results.map((result: RawResult) => ({
      type: result.type,
      value: result.value,
      context: result.context,
      position: result.position,
      riskLevel: result.riskLevel,
      source: 'regex'
    }));
  } catch (error) {
    console.error('Erro ao parsear JSON:', error);
    console.log('Output bruto para debug:', output);
    return [];
  }
}