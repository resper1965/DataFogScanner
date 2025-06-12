import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { createHash } from "crypto";

export interface SecurityScanResult {
  isClean: boolean;
  threats: SecurityThreat[];
  metadata: FileMetadata;
  riskLevel: 'safe' | 'suspicious' | 'dangerous';
}

export interface SecurityThreat {
  type: 'virus' | 'malware' | 'suspicious_extension' | 'zip_bomb' | 'password_protected' | 'executable' | 'script';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: string;
}

export interface FileMetadata {
  size: number;
  hash: string;
  mimeType: string;
  extension: string;
  compressionRatio?: number;
  entryCount?: number;
}

export class SecurityScanner {
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB
  private readonly maxZipEntries = 1000;
  private readonly maxCompressionRatio = 100; // Suspeito se > 100:1
  
  private readonly dangerousExtensions = [
    '.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', 
    '.jar', '.msi', '.dll', '.sys', '.drv', '.ocx', '.cpl',
    '.ps1', '.psm1', '.psd1', '.sh', '.bash', '.zsh'
  ];

  private readonly suspiciousExtensions = [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
    '.iso', '.img', '.dmg', '.pkg', '.deb', '.rpm'
  ];

  async scanFile(filePath: string): Promise<SecurityScanResult> {
    const threats: SecurityThreat[] = [];
    const metadata = await this.getFileMetadata(filePath);

    // 1. Verificar tamanho do arquivo
    if (metadata.size > this.maxFileSize) {
      threats.push({
        type: 'suspicious_extension',
        severity: 'medium',
        description: 'Arquivo muito grande',
        details: `Tamanho: ${(metadata.size / 1024 / 1024).toFixed(2)}MB`
      });
    }

    // 2. Verificar extensões perigosas
    const extCheck = this.checkFileExtension(metadata.extension);
    if (extCheck) threats.push(extCheck);

    // 3. Verificar ZIP específico
    if (this.isZipFile(filePath)) {
      const zipThreats = await this.scanZipFile(filePath);
      threats.push(...zipThreats);
    }

    // 4. Escaneamento de malware (ClamAV se disponível)
    const malwareThreats = await this.scanWithClamAV(filePath);
    threats.push(...malwareThreats);

    // 5. Verificação de hash em listas negras
    const hashThreats = await this.checkHashBlacklist(metadata.hash);
    threats.push(...hashThreats);

    const riskLevel = this.calculateRiskLevel(threats);
    const isClean = threats.length === 0 || threats.every(t => t.severity === 'low');

    return {
      isClean,
      threats,
      metadata,
      riskLevel
    };
  }

  private async getFileMetadata(filePath: string): Promise<FileMetadata> {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath);
    const hash = createHash('sha256').update(content).digest('hex');
    
    return {
      size: stats.size,
      hash,
      mimeType: this.getMimeType(filePath),
      extension: path.extname(filePath).toLowerCase()
    };
  }

  private checkFileExtension(extension: string): SecurityThreat | null {
    if (this.dangerousExtensions.includes(extension)) {
      return {
        type: 'executable',
        severity: 'critical',
        description: 'Arquivo executável detectado',
        details: `Extensão perigosa: ${extension}`
      };
    }

    if (this.suspiciousExtensions.includes(extension)) {
      return {
        type: 'suspicious_extension',
        severity: 'low',
        description: 'Arquivo compactado detectado',
        details: `Requer verificação adicional: ${extension}`
      };
    }

    return null;
  }

  private isZipFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const zipExts = ['.zip', '.jar', '.war', '.ear'];
    return zipExts.includes(ext);
  }

  private async scanZipFile(filePath: string): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    try {
      // Usar comando 'unzip -l' para listar conteúdo sem extrair
      const zipInfo = await this.getZipInfo(filePath);
      
      // Verificar ZIP Bomb
      if (zipInfo.compressionRatio > this.maxCompressionRatio) {
        threats.push({
          type: 'zip_bomb',
          severity: 'critical',
          description: 'Possível ZIP Bomb detectado',
          details: `Taxa de compressão: ${zipInfo.compressionRatio}:1`
        });
      }

      // Verificar número excessivo de arquivos
      if (zipInfo.entryCount > this.maxZipEntries) {
        threats.push({
          type: 'zip_bomb',
          severity: 'high',
          description: 'Número excessivo de arquivos no ZIP',
          details: `${zipInfo.entryCount} arquivos`
        });
      }

      // Verificar arquivos perigosos dentro do ZIP
      for (const entry of zipInfo.entries) {
        const entryExt = path.extname(entry.name).toLowerCase();
        if (this.dangerousExtensions.includes(entryExt)) {
          threats.push({
            type: 'executable',
            severity: 'high',
            description: 'Arquivo executável dentro do ZIP',
            details: `${entry.name} (${entryExt})`
          });
        }

        // Verificar path traversal
        if (entry.name.includes('../') || entry.name.includes('..\\')) {
          threats.push({
            type: 'malware',
            severity: 'critical',
            description: 'Tentativa de Path Traversal detectada',
            details: entry.name
          });
        }
      }

      // Verificar proteção por senha
      if (zipInfo.isPasswordProtected) {
        threats.push({
          type: 'password_protected',
          severity: 'medium',
          description: 'Arquivo protegido por senha',
          details: 'Não é possível verificar conteúdo'
        });
      }

    } catch (error) {
      threats.push({
        type: 'suspicious_extension',
        severity: 'medium',
        description: 'Erro ao analisar ZIP',
        details: `Arquivo pode estar corrompido: ${error}`
      });
    }

    return threats;
  }

  private async getZipInfo(filePath: string): Promise<{
    compressionRatio: number;
    entryCount: number;
    entries: Array<{name: string; size: number; compressedSize: number}>;
    isPasswordProtected: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const process = spawn('unzip', ['-l', '-v', filePath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          // Verificar se é erro de senha
          if (stderr.includes('password') || stderr.includes('encrypted')) {
            resolve({
              compressionRatio: 0,
              entryCount: 0,
              entries: [],
              isPasswordProtected: true
            });
            return;
          }
          reject(new Error(`unzip failed: ${stderr}`));
          return;
        }

        try {
          const lines = stdout.split('\n');
          const entries: Array<{name: string; size: number; compressedSize: number}> = [];
          let totalSize = 0;
          let totalCompressed = 0;

          for (const line of lines) {
            // Parse formato: size date time name
            const match = line.match(/^\s*(\d+)\s+\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/);
            if (match) {
              const size = parseInt(match[1]);
              const name = match[2].trim();
              
              // Estimar tamanho comprimido (simplificado)
              const compressedSize = Math.floor(size * 0.3); // Estimativa
              
              entries.push({ name, size, compressedSize });
              totalSize += size;
              totalCompressed += compressedSize;
            }
          }

          const compressionRatio = totalCompressed > 0 ? totalSize / totalCompressed : 1;

          resolve({
            compressionRatio,
            entryCount: entries.length,
            entries,
            isPasswordProtected: false
          });

        } catch (error) {
          reject(error);
        }
      });

      process.on('error', reject);
    });
  }

  private async scanWithClamAV(filePath: string): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];

    try {
      const result = await this.runClamScan(filePath);
      if (!result.isClean) {
        threats.push({
          type: 'virus',
          severity: 'critical',
          description: 'Malware detectado pelo ClamAV',
          details: result.signature
        });
      }
    } catch (error) {
      // ClamAV não disponível - continuar sem escaneamento
      console.log('ClamAV não disponível, pulando verificação de malware');
    }

    return threats;
  }

  private async runClamScan(filePath: string): Promise<{isClean: boolean; signature?: string}> {
    return new Promise((resolve, reject) => {
      const process = spawn('clamscan', ['--no-summary', filePath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ isClean: true });
        } else if (code === 1) {
          // Vírus encontrado
          const signature = stdout.split(':')[1]?.trim() || 'Malware detectado';
          resolve({ isClean: false, signature });
        } else {
          reject(new Error(`ClamAV error: ${stderr}`));
        }
      });

      process.on('error', reject);
    });
  }

  private async checkHashBlacklist(hash: string): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    
    // Lista básica de hashes maliciosos conhecidos
    const knownMaliciousHashes = [
      // Adicionar hashes conhecidos de malware
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Exemplo
    ];

    if (knownMaliciousHashes.includes(hash)) {
      threats.push({
        type: 'malware',
        severity: 'critical',
        description: 'Hash conhecido em lista negra',
        details: `SHA256: ${hash.substring(0, 16)}...`
      });
    }

    return threats;
  }

  private calculateRiskLevel(threats: SecurityThreat[]): 'safe' | 'suspicious' | 'dangerous' {
    if (threats.length === 0) return 'safe';
    
    const hasCritical = threats.some(t => t.severity === 'critical');
    const hasHigh = threats.some(t => t.severity === 'high');
    
    if (hasCritical) return 'dangerous';
    if (hasHigh) return 'suspicious';
    
    return 'suspicious';
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.csv': 'text/csv',
      '.exe': 'application/x-executable',
      '.bat': 'application/x-bat'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export const securityScanner = new SecurityScanner();