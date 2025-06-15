import { watch } from "fs";
import { readdir, stat, rename } from "fs/promises";
import path from "path";
import { storage } from "./storage";
import { processFiles } from "./datafog-processor";
import { securityScanner } from "./security-scanner";
import pLimit from "p-limit";

const SFTP_INCOMING_DIR = "./uploads/sftp/incoming";
const SFTP_PROCESSING_DIR = "./uploads/sftp/processing";
const SFTP_PROCESSED_DIR = "./uploads/sftp/processed";

class SFTPMonitor {
  private isMonitoring = false;
  private processingLimit = pLimit(3);

  async start() {
    if (this.isMonitoring) return;

    console.log("Iniciando monitoramento SFTP...");
    this.isMonitoring = true;

    // Ensure directories exist
    await this.ensureDirectoriesExist();

    // Monitor directory for new files
    this.watchDirectory();
    
    // Process existing files on startup
    await this.processExistingFiles();
  }

  private async ensureDirectoriesExist() {
    const { mkdir } = await import("fs/promises");
    
    try {
      await mkdir(SFTP_INCOMING_DIR, { recursive: true });
      await mkdir(SFTP_PROCESSING_DIR, { recursive: true });
      await mkdir(SFTP_PROCESSED_DIR, { recursive: true });
      console.log("Diretórios SFTP criados/verificados");
    } catch (error) {
      console.error("Erro ao criar diretórios SFTP:", error);
    }
  }

  private watchDirectory() {
    try {
      watch(SFTP_INCOMING_DIR, { recursive: true }, (eventType, filename) => {
        if (eventType === 'rename' && filename) {
          // New file detected
          setTimeout(() => {
            this.queueProcessing(path.join(SFTP_INCOMING_DIR, filename));
          }, 1000); // Wait 1 second to ensure file is fully written
        }
      });
    } catch (error) {
      console.warn(`Diretório SFTP não encontrado: ${SFTP_INCOMING_DIR}`);
      console.log("Execute o setup SFTP conforme documentação em SFTP_SETUP.md");
    }
  }

  private queueProcessing(filePath: string): Promise<void> {
    return this.processingLimit(() => this.processNewFile(filePath)).catch((error) => {
      console.error(`Erro na fila de processamento: ${error}`);
    });
  }

  private async processExistingFiles() {
    try {
      const files = await readdir(SFTP_INCOMING_DIR);

      await Promise.all(files.map(file =>
        this.queueProcessing(path.join(SFTP_INCOMING_DIR, file))
      ));
    } catch (error) {
      console.warn("Erro ao processar arquivos existentes:", error);
    }
  }

  private async processNewFile(filePath: string) {
    try {
      const stats = await stat(filePath);
      
      // Only process files (not directories)
      if (!stats.isFile()) return;

      const fileName = path.basename(filePath);
      console.log(`Novo arquivo SFTP detectado: ${fileName}`);

      // Security scan before processing
      console.log(`Escaneando arquivo SFTP: ${fileName}`);
      const scanResult = await securityScanner.scanFile(filePath);
      
      if (!scanResult.isClean && scanResult.riskLevel === 'dangerous') {
        console.error(`Arquivo SFTP perigoso detectado: ${fileName}`, scanResult.threats);
        // Move to quarantine instead of processing
        const quarantinePath = path.join(SFTP_PROCESSED_DIR, `QUARANTINE_${fileName}`);
        await rename(filePath, quarantinePath);
        return;
      }

      // Move file to processing directory
      const processingPath = path.join(SFTP_PROCESSING_DIR, fileName);
      await rename(filePath, processingPath);

      // Create file record in storage
      const fileRecord = await storage.createFile({
        name: fileName,
        originalName: fileName,
        size: stats.size,
        mimeType: this.getMimeType(fileName),
        path: processingPath,
        status: scanResult.riskLevel === 'suspicious' ? "quarantine" : "uploaded"
      });

      // Create processing job with default Brazilian patterns
      const job = await storage.createProcessingJob({
        fileId: fileRecord.id,
        status: "queued",
        progress: 0,
        patterns: ['cpf', 'cnpj', 'rg', 'telefone', 'email'],
        customRegex: null
      });

      // Start processing
      console.log(`Iniciando processamento automático do arquivo: ${fileName}`);
      processFiles([job.id]).then(async () => {
        // Move to processed directory after completion
        const processedPath = path.join(SFTP_PROCESSED_DIR, fileName);
        try {
          await rename(processingPath, processedPath);
          console.log(`Arquivo processado e movido: ${fileName}`);
        } catch (error) {
          console.error(`Erro ao mover arquivo processado: ${error}`);
        }
      }).catch(error => {
        console.error(`Erro no processamento automático: ${error}`);
      });

    } catch (error) {
      console.error(`Erro ao processar arquivo SFTP: ${error}`);
    }
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.doc':
        return 'application/msword';
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.txt':
        return 'text/plain';
      case '.zip':
        return 'application/zip';
      case '.csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }

  stop() {
    this.isMonitoring = false;
    console.log("Monitoramento SFTP interrompido");
  }
}

export const sftpMonitor = new SFTPMonitor();
