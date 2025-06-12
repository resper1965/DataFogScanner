import { spawn } from "child_process";
import { storage } from "./storage";
import { extractZipFiles } from "./file-handler";
import { getBrazilianPatterns } from "../client/src/lib/brazilian-patterns";
import { semanticClassifier, type RegexCandidate } from "./semantic-classifier";
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

export async function processFiles(jobIds: number[]): Promise<void> {
  for (const jobId of jobIds) {
    try {
      const job = await storage.getProcessingJob(jobId);
      if (!job) continue;

      const file = await storage.getFile(job.fileId);
      if (!file) continue;

      await storage.updateProcessingJobStatus(jobId, 'processing', 0);
      await storage.updateFileStatus(file.id, 'processing');

      let filesToProcess = [file.path];
      
      // Extract ZIP files if needed
      if (file.mimeType === 'application/zip' || file.originalName.toLowerCase().endsWith('.zip')) {
        await storage.updateProcessingJobStatus(jobId, 'processing', 10);
        const extractedFiles = await extractZipFiles(file.path);
        filesToProcess = extractedFiles;
      }

      await storage.updateProcessingJobStatus(jobId, 'processing', 30);

      // Process each file
      const allDetections: DetectionResult[] = [];
      const totalFiles = filesToProcess.length;
      
      for (let i = 0; i < filesToProcess.length; i++) {
        const filePath = filesToProcess[i];
        const progress = 30 + Math.floor((i / totalFiles) * 60);
        await storage.updateProcessingJobStatus(jobId, 'processing', progress);

        const detections = await processFileWithDataFog(filePath, job.patterns, job.customRegex || undefined);
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
}

async function processFileWithDataFog(
  filePath: string, 
  patterns: any, 
  customRegex?: string
): Promise<DetectionResult[]> {
  try {
    // Read file content for processing
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // First, run regex-based detection
    const regexResults = await runRegexDetection(fileContent, patterns, customRegex);
    
    // Convert regex results to RegexCandidate format
    const regexCandidates: RegexCandidate[] = regexResults.map(result => ({
      type: result.type,
      value: result.value,
      context: result.context,
      position: result.position,
      riskLevel: result.riskLevel
    }));

    // Apply semantic classification to improve accuracy
    const semanticResults = await semanticClassifier.classifyText(fileContent, regexCandidates);
    
    // Convert semantic results back to DetectionResult format
    return semanticResults.map(result => ({
      type: result.type,
      value: result.value,
      context: result.context,
      position: result.position,
      riskLevel: result.riskLevel,
      confidence: result.confidence,
      source: result.source
    }));

  } catch (error) {
    console.error('Erro no processamento híbrido:', error);
    // Fallback to regex-only processing
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return await runRegexDetection(fileContent, patterns, customRegex);
  }
}

async function runRegexDetection(
  content: string,
  patterns: any,
  customRegex?: string
): Promise<DetectionResult[]> {
  return new Promise((resolve, reject) => {
    try {
      const brazilianPatterns = getBrazilianPatterns();
      const scriptContent = createDataFogScript('temp_content', patterns, customRegex, brazilianPatterns, content);
      
      const tempScriptPath = path.join(process.cwd(), 'temp_datafog_script.py');
      
      fs.writeFile(tempScriptPath, scriptContent).then(() => {
        const pythonProcess = spawn('python3', [tempScriptPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', async (code) => {
          try {
            await fs.unlink(tempScriptPath);
          } catch (e) {
            console.warn('Erro ao remover script temporário:', e);
          }

          if (code !== 0) {
            reject(new Error(`DataFog process failed: ${stderr}`));
            return;
          }

          try {
            const results = parseDataFogOutput(stdout);
            resolve(results);
          } catch (error) {
            reject(new Error(`Erro ao processar saída do DataFog: ${error}`));
          }
        });

        pythonProcess.on('error', (error) => {
          reject(new Error(`Erro ao executar Python: ${error.message}`));
        });
      }).catch(reject);

    } catch (error) {
      reject(error);
    }
  });
}

function createDataFogScript(
  filePath: string, 
  patterns: any, 
  customRegex?: string,
  brazilianPatterns?: any,
  content?: string
): string {
  return `
import json
import re
import sys
import os

# Mock DataFog functionality since the actual library might not be available
class MockDataFog:
    def __init__(self):
        self.patterns = {
            'cpf': r'\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b',
            'cnpj': r'\\b\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}\\b',
            'cep': r'\\b\\d{5}-\\d{3}\\b',
            'rg': r'\\b\\d{1,2}\\.\\d{3}\\.\\d{3}-\\d{1}\\b',
            'telefone': r'\\b\\(?\\d{2}\\)?\\s?\\d{4,5}-?\\d{4}\\b',
            'email': r'\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b'
        }
        
    def scan_file(self, file_path, enabled_patterns, custom_regex=None):
        results = []
        
        try:
            if file_path == 'temp_content':
                content = """${content ? content.replace(/"/g, '\\"').replace(/\n/g, '\\n') : ''}"""
            else:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
            # Search for enabled patterns
            for pattern_name in enabled_patterns:
                if pattern_name in self.patterns:
                    matches = re.finditer(self.patterns[pattern_name], content, re.IGNORECASE)
                    for match in matches:
                        context_start = max(0, match.start() - 20)
                        context_end = min(len(content), match.end() + 20)
                        context = content[context_start:context_end].strip()
                        
                        risk_level = self.get_risk_level(pattern_name)
                        
                        results.append({
                            'type': pattern_name.upper(),
                            'value': match.group(),
                            'context': context,
                            'position': match.start(),
                            'riskLevel': risk_level
                        })
            
            # Search custom regex if provided
            if custom_regex:
                try:
                    matches = re.finditer(custom_regex, content, re.IGNORECASE)
                    for match in matches:
                        context_start = max(0, match.start() - 20)
                        context_end = min(len(content), match.end() + 20)
                        context = content[context_start:context_end].strip()
                        
                        results.append({
                            'type': 'CUSTOM',
                            'value': match.group(),
                            'context': context,
                            'position': match.start(),
                            'riskLevel': 'medium'
                        })
                except re.error as e:
                    print(f"Erro no regex personalizado: {e}", file=sys.stderr)
                    
        except Exception as e:
            print(f"Erro ao processar arquivo {file_path}: {e}", file=sys.stderr)
            
        return results
    
    def get_risk_level(self, pattern_type):
        high_risk = ['cpf', 'cnpj', 'rg']
        medium_risk = ['telefone', 'cep']
        
        if pattern_type in high_risk:
            return 'high'
        elif pattern_type in medium_risk:
            return 'medium'
        else:
            return 'low'

# Main execution
def main():
    file_path = "${filePath}"
    patterns = ${JSON.stringify(patterns || ['cpf', 'cnpj', 'email'])}
    custom_regex = ${customRegex ? `"${customRegex.replace(/"/g, '\\"')}"` : 'None'}
    
    datafog = MockDataFog()
    results = datafog.scan_file(file_path, patterns, custom_regex)
    
    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
`;
}

function parseDataFogOutput(output: string): DetectionResult[] {
  try {
    const results = JSON.parse(output);
    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error('Erro ao fazer parse da saída:', error);
    return [];
  }
}
