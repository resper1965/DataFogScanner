import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFileSchema, insertProcessingJobSchema, insertDetectionSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { processFiles } from "./datafog-processor";
import { extractZipFiles } from "./file-handler";
import { securityScanner } from "./security-scanner";

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload files endpoint
  app.post("/api/files/upload", upload.array('files', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      const uploadedFiles = [];
      
      for (const file of req.files) {
        // Verificação de segurança antes do processamento
        console.log(`Escaneando arquivo: ${file.originalname}`);
        const scanResult = await securityScanner.scanFile(file.path);
        
        if (!scanResult.isClean && scanResult.riskLevel === 'dangerous') {
          console.error(`Arquivo perigoso detectado: ${file.originalname}`, scanResult.threats);
          return res.status(400).json({ 
            message: `Arquivo "${file.originalname}" foi rejeitado por conter ameaças de segurança`,
            threats: scanResult.threats.map(t => `${t.type}: ${t.description}`)
          });
        }

        const fileData = {
          name: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          path: file.path,
          status: scanResult.riskLevel === 'suspicious' ? "quarantine" : "uploaded"
        };

        const validatedFile = insertFileSchema.parse(fileData);
        const savedFile = await storage.createFile(validatedFile);
        
        // Log das informações de segurança (removido campo direto no objeto)
        console.log(`Arquivo ${file.originalname} - Segurança: ${scanResult.riskLevel}, Ameaças: ${scanResult.threats.length}`);
        
        uploadedFiles.push(savedFile);
      }

      res.json({ 
        message: "Arquivos enviados com sucesso",
        files: uploadedFiles 
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Start processing endpoint
  app.post("/api/processing/start", async (req, res) => {
    try {
      const { fileIds, patterns, customRegex } = req.body;
      
      if (!fileIds || !Array.isArray(fileIds)) {
        return res.status(400).json({ message: "IDs de arquivos são obrigatórios" });
      }

      const jobs = [];
      
      for (const fileId of fileIds) {
        const jobData = {
          fileId: parseInt(fileId),
          status: "queued",
          progress: 0,
          patterns,
          customRegex
        };

        const validatedJob = insertProcessingJobSchema.parse(jobData);
        const job = await storage.createProcessingJob(validatedJob);
        jobs.push(job);

        // Start processing asynchronously
        processFiles([job.id]).catch(console.error);
      }

      res.json({ 
        message: "Processamento iniciado",
        jobs 
      });
    } catch (error) {
      console.error("Erro ao iniciar processamento:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get files endpoint
  app.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getFiles();
      res.json(files);
    } catch (error) {
      console.error("Erro ao buscar arquivos:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get processing jobs endpoint
  app.get("/api/processing/jobs", async (req, res) => {
    try {
      const jobs = await storage.getProcessingJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Erro ao buscar jobs:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get detections endpoint
  app.get("/api/detections", async (req, res) => {
    try {
      const { fileId } = req.query;
      
      let detections;
      if (fileId) {
        detections = await storage.getDetectionsByFileId(parseInt(fileId as string));
      } else {
        detections = await storage.getAllDetections();
      }
      
      res.json(detections);
    } catch (error) {
      console.error("Erro ao buscar detecções:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Security scan endpoint
  app.post("/api/files/:id/security-scan", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      const scanResult = await securityScanner.scanFile(file.path);
      
      res.json({
        fileId,
        fileName: file.originalName,
        scanResult: {
          isClean: scanResult.isClean,
          riskLevel: scanResult.riskLevel,
          threats: scanResult.threats,
          metadata: scanResult.metadata,
          scannedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Erro no escaneamento de segurança:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get processing statistics endpoint
  app.get("/api/processing/stats", async (req, res) => {
    try {
      const jobs = await storage.getProcessingJobs();
      const files = await storage.getFiles();
      const detections = await storage.getAllDetections();

      const stats = {
        totalFiles: files.length,
        queuedFiles: jobs.filter(j => j.status === 'queued').length,
        processingFiles: jobs.filter(j => j.status === 'processing').length,
        completedFiles: jobs.filter(j => j.status === 'completed').length,
        errorFiles: jobs.filter(j => j.status === 'failed').length,
        totalDetections: detections.length,
        highRiskDetections: detections.filter(d => d.riskLevel === 'high').length,
        mediumRiskDetections: detections.filter(d => d.riskLevel === 'medium').length,
        lowRiskDetections: detections.filter(d => d.riskLevel === 'low').length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Export report endpoint (JSON)
  app.get("/api/reports/export", async (req, res) => {
    try {
      const detections = await storage.getAllDetections();
      const files = await storage.getFiles();
      
      const report = {
        generatedAt: new Date().toISOString(),
        summary: {
          totalFiles: files.length,
          totalDetections: detections.length,
          highRisk: detections.filter(d => d.riskLevel === 'high').length,
          mediumRisk: detections.filter(d => d.riskLevel === 'medium').length,
          lowRisk: detections.filter(d => d.riskLevel === 'low').length,
        },
        detections: detections.map(d => {
          const file = files.find(f => f.id === d.fileId);
          return {
            ...d,
            fileName: file?.originalName || 'Desconhecido'
          };
        })
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-datafog.json');
      res.json(report);
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Export report endpoint (CSV)
  app.get("/api/reports/export/csv", async (req, res) => {
    try {
      const detections = await storage.getAllDetections();
      const files = await storage.getFiles();
      
      // CSV header
      let csvContent = "ID,Tipo,Valor,Arquivo,Nível de Risco,Contexto,Posição,Data de Criação\n";
      
      // CSV data
      detections.forEach(d => {
        const file = files.find(f => f.id === d.fileId);
        const csvRow = [
          d.id,
          d.type,
          `"${d.value}"`,
          `"${file?.originalName || 'Desconhecido'}"`,
          d.riskLevel,
          `"${d.context || ''}"`,
          d.position || '',
          d.createdAt ? new Date(d.createdAt).toISOString() : ''
        ].join(',');
        csvContent += csvRow + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-datafog.csv');
      res.send('\ufeff' + csvContent); // BOM for Excel UTF-8 support
    } catch (error) {
      console.error("Erro ao exportar relatório CSV:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
