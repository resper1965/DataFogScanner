import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

export async function extractZipFiles(zipPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const extractDir = path.join(path.dirname(zipPath), 'extracted', path.basename(zipPath, '.zip'));
    
    // Create extraction directory
    fs.mkdir(extractDir, { recursive: true }).then(() => {
      // Use unzip command to extract files
      const unzipProcess = spawn('unzip', ['-o', zipPath, '-d', extractDir], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      unzipProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      unzipProcess.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`Falha na extração do ZIP: ${stderr}`));
          return;
        }

        try {
          const extractedFiles = await getAllFiles(extractDir);
          resolve(extractedFiles);
        } catch (error) {
          reject(error);
        }
      });

      unzipProcess.on('error', (error) => {
        reject(new Error(`Erro ao executar unzip: ${error.message}`));
      });
    }).catch(reject);
  });
}

async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scanDirectory(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else {
        // Only include text-based files that can be processed
        const ext = path.extname(entry.name).toLowerCase();
        const supportedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.csv', '.json', '.xml'];
        
        if (supportedExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await scanDirectory(dir);
  return files;
}

export function getFileIcon(mimeType: string, fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  
  if (mimeType.includes('pdf') || ext === '.pdf') {
    return 'fa-file-pdf';
  } else if (mimeType.includes('word') || ext === '.doc' || ext === '.docx') {
    return 'fa-file-word';
  } else if (mimeType.includes('zip') || ext === '.zip') {
    return 'fa-file-archive';
  } else if (mimeType.includes('text') || ext === '.txt') {
    return 'fa-file-alt';
  } else if (ext === '.csv') {
    return 'fa-file-csv';
  } else {
    return 'fa-file';
  }
}
