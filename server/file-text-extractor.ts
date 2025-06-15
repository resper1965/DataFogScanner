import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExtractionResult {
  text: string;
  success: boolean;
  error?: string;
}

export class FileTextExtractor {
  
  async extractText(filePath: string, mimeType: string): Promise<ExtractionResult> {
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      switch (true) {
        case mimeType.includes('pdf'):
        case extension === '.pdf':
          return await this.extractFromPDF(filePath);
          
        case mimeType.includes('word') || extension === '.docx' || extension === '.doc':
          return await this.extractFromWord(filePath);
          
        case mimeType.includes('excel') || mimeType.includes('spreadsheet'):
        case extension === '.xlsx' || extension === '.xls':
          return await this.extractFromExcel(filePath);
          
        case mimeType.includes('text') || extension === '.txt':
          return await this.extractFromText(filePath);
          
        case extension === '.csv':
          return await this.extractFromCSV(filePath);
          
        case extension === '.xml':
          return await this.extractFromXML(filePath);
          
        default:
          // Tentar como texto plano
          return await this.extractFromText(filePath);
      }
    } catch (error) {
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private async extractFromPDF(filePath: string): Promise<ExtractionResult> {
    return new Promise((resolve) => {
      const scriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
try:
    import PyPDF2
    target_path = sys.argv[1]
    with open(target_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for page in reader.pages:
            text += page.extract_text() + '\n'
        print(text)
except Exception as e:
    print(f"Erro ao extrair PDF: {e}", file=sys.stderr)
    sys.exit(1)
`;

      const tempScript = path.join(process.cwd(), 'temp_pdf_extract.py');
      
      fs.writeFile(tempScript, scriptContent)
        .then(() => {
          const pythonProcess = spawn('python', [tempScript, filePath]);
          let output = '';
          let errorOutput = '';

          pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
          });

          pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          pythonProcess.on('close', (code) => {
            fs.unlink(tempScript).catch(() => {});
            
            if (code === 0 && output.trim()) {
              resolve({ text: output, success: true });
            } else {
              resolve({ 
                text: '', 
                success: false, 
                error: errorOutput || 'Falha na extração PDF' 
              });
            }
          });
        })
        .catch(error => {
          resolve({ text: '', success: false, error: error.message });
        });
    });
  }

  private async extractFromWord(filePath: string): Promise<ExtractionResult> {
    return new Promise((resolve) => {
      const scriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
try:
    from docx import Document
    target_path = sys.argv[1]
    doc = Document(target_path)
    text = ''
    for paragraph in doc.paragraphs:
        text += paragraph.text + '\n'
    print(text)
except Exception as e:
    print(f"Erro ao extrair Word: {e}", file=sys.stderr)
    sys.exit(1)
`;

      const tempScript = path.join(process.cwd(), 'temp_word_extract.py');
      
      fs.writeFile(tempScript, scriptContent)
        .then(() => {
          const pythonProcess = spawn('python', [tempScript, filePath]);
          let output = '';
          let errorOutput = '';

          pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
          });

          pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          pythonProcess.on('close', (code) => {
            fs.unlink(tempScript).catch(() => {});
            
            if (code === 0) {
              resolve({ text: output, success: true });
            } else {
              resolve({ 
                text: '', 
                success: false, 
                error: errorOutput || 'Falha na extração Word' 
              });
            }
          });
        })
        .catch(error => {
          resolve({ text: '', success: false, error: error.message });
        });
    });
  }

  private async extractFromExcel(filePath: string): Promise<ExtractionResult> {
    return new Promise((resolve) => {
      const scriptContent = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
try:
    import openpyxl
    target_path = sys.argv[1]
    workbook = openpyxl.load_workbook(target_path)
    text = ''
    for sheet_name in workbook.sheetnames:
        sheet = workbook[sheet_name]
        text += f"=== Planilha: {sheet_name} ===\\n"
        for row in sheet.iter_rows(values_only=True):
            row_text = '\\t'.join([str(cell) if cell is not None else '' for cell in row])
            if row_text.strip():
                text += row_text + '\\n'
        text += '\\n'
    print(text)
except Exception as e:
    print(f"Erro ao extrair Excel: {e}", file=sys.stderr)
    sys.exit(1)
`;

      const tempScript = path.join(process.cwd(), 'temp_excel_extract.py');
      
      fs.writeFile(tempScript, scriptContent)
        .then(() => {
          const pythonProcess = spawn('python', [tempScript, filePath]);
          let output = '';
          let errorOutput = '';

          pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
          });

          pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          pythonProcess.on('close', (code) => {
            fs.unlink(tempScript).catch(() => {});
            
            if (code === 0) {
              resolve({ text: output, success: true });
            } else {
              resolve({ 
                text: '', 
                success: false, 
                error: errorOutput || 'Falha na extração Excel' 
              });
            }
          });
        })
        .catch(error => {
          resolve({ text: '', success: false, error: error.message });
        });
    });
  }

  private async extractFromText(filePath: string): Promise<ExtractionResult> {
    try {
      const text = await fs.readFile(filePath, 'utf-8');
      return { text, success: true };
    } catch (error) {
      return { 
        text: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao ler arquivo texto' 
      };
    }
  }

  private async extractFromCSV(filePath: string): Promise<ExtractionResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // Converter CSV para texto legível
      const lines = content.split('\n');
      const text = lines.map(line => line.replace(/[,;]/g, ' | ')).join('\n');
      return { text, success: true };
    } catch (error) {
      return { 
        text: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao ler arquivo CSV' 
      };
    }
  }

  private async extractFromXML(filePath: string): Promise<ExtractionResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // Remover tags XML e extrair texto
      const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return { text, success: true };
    } catch (error) {
      return { 
        text: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao ler arquivo XML' 
      };
    }
  }
}

export const fileTextExtractor = new FileTextExtractor();