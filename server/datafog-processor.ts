import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { storage } from './storage';
import { getBrazilianPatterns } from '../client/src/lib/brazilian-patterns';

interface DetectionResult {
  type: string;
  value: string;
  context: string;
  position: number;
  riskLevel: 'high' | 'medium' | 'low';
  confidence?: number;
  source?: 'regex' | 'semantic' | 'hybrid';
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

    await storage.updateProcessingJobStatus(jobId, 'processing', 10);

    const file = await storage.getFile(job.fileId);
    if (!file) {
      throw new Error(`Arquivo ${job.fileId} não encontrado`);
    }

    const filePath = file.path;
    console.log(`Processando arquivo: ${file.originalName}`);

    await storage.updateProcessingJobStatus(jobId, 'processing', 30);

    // Executar detecção usando DataFog + regex brasileiro
    const allDetections: DetectionResult[] = [];
    
    // Usar DataFog e regex personalizado
    const detections = await runDataFogDetection(filePath, job.patterns, job.customRegex || undefined);
    allDetections.push(...detections);

    console.log(`Detecções encontradas: ${allDetections.length}`);
    
    // Salvar detecções no storage
    for (const detection of allDetections) {
      console.log(`Salvando detecção: ${detection.type} - ${detection.value}`);
      await storage.createDetection({
        fileId: file.id,
        type: detection.type,
        value: detection.value,
        context: detection.context,
        riskLevel: detection.riskLevel,
        position: detection.position
      });
    }

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

async function runDataFogDetection(
  filePath: string, 
  patterns: any, 
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
                text += page.extract_text() + '\\n'
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
            text += paragraph.text + '\\n'
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
            text += '\\n'
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
    const lines = output.trim().split('\n');
    const jsonLine = lines[lines.length - 1];
    const results = JSON.parse(jsonLine);
    
    return results.map((result: any) => ({
      type: result.type,
      value: result.value,
      context: result.context,
      position: result.position,
      riskLevel: result.riskLevel,
      source: 'regex'
    }));
  } catch (error) {
    console.error('Erro ao parsear JSON:', error);
    return [];
  }
}