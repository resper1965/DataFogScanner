import { spawn } from "child_process";
import { storage } from "./storage";
import { extractZipFiles } from "./file-handler";
import { getBrazilianPatterns } from "../client/src/lib/brazilian-patterns";
import path from "path";
import fs from "fs/promises";

interface DetectionResult {
  type: string;
  value: string;
  context: string;
  position: number;
  riskLevel: 'high' | 'medium' | 'low';
  confidence?: number;
  source?: 'regex' | 'semantic' | 'hybrid';
}

// Batch processing configuration
const BATCH_SIZE = 3; // Process 3 jobs at a time
const MAX_CONTENT_LENGTH = 50000; // 50KB chunks for large files
const PROCESSING_TIMEOUT = 30000; // 30 second timeout per job
const MAX_FILES_PER_ZIP = 50; // Limit files per ZIP to prevent overload

export async function processFiles(jobIds: number[]): Promise<void> {
  // Process in batches to avoid memory issues and timeouts
  for (let i = 0; i < jobIds.length; i += BATCH_SIZE) {
    const batch = jobIds.slice(i, i + BATCH_SIZE);
    console.log(`Processando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(jobIds.length/BATCH_SIZE)} (${batch.length} arquivos)`);
    
    // Process batch in parallel with timeout protection
    await Promise.allSettled(
      batch.map(jobId => 
        Promise.race([
          processFileWithDataFog(jobId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout no processamento')), PROCESSING_TIMEOUT)
          )
        ]).catch(error => {
          console.error(`Erro no processamento do job ${jobId}:`, error);
          return storage.updateProcessingJobStatus(jobId, 'failed', 0, error.message);
        })
      )
    );
    
    // Small delay between batches to prevent resource exhaustion
    if (i + BATCH_SIZE < jobIds.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function processFileWithDataFog(jobId: number): Promise<void> {
  try {
    const job = await storage.getProcessingJob(jobId);
    if (!job) return;

    const file = await storage.getFile(job.fileId);
    if (!file) return;

    await storage.updateProcessingJobStatus(jobId, 'processing', 0);
    await storage.updateFileStatus(file.id, 'processing');

    let filesToProcess = [file.path];
    
    // Extract ZIP files if needed
    if (file.mimeType === 'application/zip' || file.originalName.toLowerCase().endsWith('.zip')) {
      await storage.updateProcessingJobStatus(jobId, 'processing', 10);
      const extractedFiles = await extractZipFiles(file.path);
      
      // Limit number of files to prevent overload
      if (extractedFiles.length > MAX_FILES_PER_ZIP) {
        console.warn(`ZIP contém ${extractedFiles.length} arquivos, limitando a ${MAX_FILES_PER_ZIP}`);
        filesToProcess = extractedFiles.slice(0, MAX_FILES_PER_ZIP);
      } else {
        filesToProcess = extractedFiles;
      }
    }

    await storage.updateProcessingJobStatus(jobId, 'processing', 30);

    // Process each file
    const allDetections: DetectionResult[] = [];
    const totalFiles = filesToProcess.length;
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const filePath = filesToProcess[i];
      const progress = 30 + Math.floor((i / totalFiles) * 60);
      await storage.updateProcessingJobStatus(jobId, 'processing', progress);

      const detections = await runRegexDetection(filePath, job.patterns, job.customRegex || undefined);
      allDetections.push(...detections);
    }

    // Save detections to storage
    for (const detection of allDetections) {
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

async function runRegexDetection(
  filePath: string, 
  patterns: any, 
  customRegex?: string
): Promise<DetectionResult[]> {
  try {
    // Read file content for processing
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Limit content size for processing
    const contentToProcess = fileContent.length > MAX_CONTENT_LENGTH 
      ? fileContent.substring(0, MAX_CONTENT_LENGTH) 
      : fileContent;
    
    // Run Python DataFog script for pattern detection
    const results = await runPythonDataFogScript(contentToProcess, patterns, customRegex);
    return results;

  } catch (error) {
    console.error('Erro no processamento de arquivo:', error);
    return [];
  }
}

async function runPythonDataFogScript(
  content: string,
  patterns: any,
  customRegex?: string
): Promise<DetectionResult[]> {
  return new Promise((resolve, reject) => {
    try {
      const brazilianPatterns = getBrazilianPatterns();
      const scriptContent = createDataFogScript('temp_content', patterns, customRegex, brazilianPatterns, content);
      
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
            reject(new Error('Timeout no processamento Python'));
          }, 20000);

          pythonProcess.on('close', (code) => {
            clearTimeout(timeout);
            
            // Clean up temp file
            fs.unlink(tempScriptPath).catch(() => {});
            
            if (code !== 0) {
              console.error('Erro no script Python:', errorOutput);
              resolve([]);
              return;
            }

            try {
              const results = parseDataFogOutput(output);
              resolve(results);
            } catch (parseError) {
              console.error('Erro ao parsear saída:', parseError);
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
  customRegex: string | undefined,
  brazilianPatterns: any[],
  content?: string
): string {
  return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import json
from pathlib import Path

try:
    from datafog import DataFog
    import PyPDF2
    from docx import Document
    import openpyxl
except ImportError as e:
    print(f"Erro ao importar bibliotecas: {e}", file=sys.stderr)
    sys.exit(1)

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
        print(f"Erro ao extrair texto de {file_path}: {e}", file=sys.stderr)
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

def scan_file_with_datafog(file_path, enabled_patterns):
    """Usa o DataFog oficial para escanear o arquivo"""
    results = []
    
    try:
        # Extrair texto do arquivo
        if file_path == 'temp_content':
            content = """${content ? content.replace(/"/g, '\\"').replace(/\n/g, '\\n') : ''}"""
        else:
            content = extract_text_from_file(file_path)
        
        if not content.strip():
            print("Nenhum conteúdo extraído do arquivo", file=sys.stderr)
            return results
        
        # Usar DataFog para escanear
        datafog = DataFog()
        
        # Executar escaneamento
        scan_results = datafog.scan(content)
        
        # Converter resultados para nosso formato
        if hasattr(scan_results, 'matches') and scan_results.matches:
            for match in scan_results.matches:
                results.append({
                    'type': getattr(match, 'entity_type', 'UNKNOWN').upper(),
                    'value': getattr(match, 'text', ''),
                    'context': getattr(match, 'context', content[max(0, getattr(match, 'start', 0)-20):getattr(match, 'end', 0)+20]),
                    'position': getattr(match, 'start', 0),
                    'riskLevel': 'high'
                })
        
        # Se DataFog não encontrou nada, usar regex manual para padrões brasileiros
        if not results:
            import re
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
                        
    except Exception as e:
        print(f"Erro ao processar arquivo {file_path}: {e}", file=sys.stderr)
        
    return results

# Executar escaneamento
def main():
    try:
        file_path = "${filePath}"
        enabled_patterns = ${JSON.stringify(patterns)}
        
        results = scan_file_with_datafog(file_path, enabled_patterns)
        
        # Imprimir resultados em JSON
        print(json.dumps(results, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"Erro no main: {e}", file=sys.stderr)
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