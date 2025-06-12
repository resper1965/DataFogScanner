import { 
  users, files, detections, cases, processingJobs,
  type User, type InsertUser, 
  type File, type InsertFile,
  type Detection, type InsertDetection,
  type Case, type InsertCase,
  type ProcessingJob, type InsertProcessingJob
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Files
  createFile(file: InsertFile): Promise<File>;
  getFile(id: number): Promise<File | undefined>;
  getFiles(): Promise<File[]>;
  updateFileStatus(id: number, status: string, processedAt?: Date): Promise<void>;
  
  // Detections
  createDetection(detection: InsertDetection): Promise<Detection>;
  getDetectionsByFileId(fileId: number): Promise<Detection[]>;
  getAllDetections(): Promise<Detection[]>;
  
  // Cases
  createCase(caseData: InsertCase): Promise<Case>;
  getCase(id: number): Promise<Case | undefined>;
  getCases(): Promise<Case[]>;
  updateCase(id: number, updates: Partial<InsertCase>): Promise<void>;
  
  // Processing Jobs
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJob(id: number): Promise<ProcessingJob | undefined>;
  getProcessingJobs(): Promise<ProcessingJob[]>;
  updateProcessingJobStatus(id: number, status: string, progress?: number, errorMessage?: string): Promise<void>;
  completeProcessingJob(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private detections: Map<number, Detection>;
  private cases: Map<number, Case>;
  private processingJobs: Map<number, ProcessingJob>;
  private currentUserId: number;
  private currentFileId: number;
  private currentDetectionId: number;
  private currentCaseId: number;
  private currentJobId: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.detections = new Map();
    this.cases = new Map();
    this.processingJobs = new Map();
    this.currentUserId = 1;
    this.currentFileId = 1;
    this.currentDetectionId = 1;
    this.currentCaseId = 1;
    this.currentJobId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentFileId++;
    const file: File = { 
      ...insertFile,
      status: insertFile.status || "uploaded",
      id,
      uploadedAt: new Date(),
      processedAt: null
    };
    this.files.set(id, file);
    return file;
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFiles(): Promise<File[]> {
    return Array.from(this.files.values());
  }

  async updateFileStatus(id: number, status: string, processedAt?: Date): Promise<void> {
    const file = this.files.get(id);
    if (file) {
      this.files.set(id, { 
        ...file, 
        status, 
        processedAt: processedAt || (status === 'completed' ? new Date() : file.processedAt)
      });
    }
  }

  async createDetection(insertDetection: InsertDetection): Promise<Detection> {
    const id = this.currentDetectionId++;
    const detection: Detection = { 
      ...insertDetection,
      context: insertDetection.context || null,
      position: insertDetection.position || null,
      id,
      createdAt: new Date()
    };
    this.detections.set(id, detection);
    return detection;
  }

  async getDetectionsByFileId(fileId: number): Promise<Detection[]> {
    return Array.from(this.detections.values()).filter(d => d.fileId === fileId);
  }

  async getAllDetections(): Promise<Detection[]> {
    return Array.from(this.detections.values());
  }

  async createCase(insertCase: InsertCase): Promise<Case> {
    const id = this.currentCaseId++;
    const case_: Case = { 
      ...insertCase,
      description: insertCase.description || null,
      observations: insertCase.observations || null,
      id,
      createdAt: new Date(),
      updatedAt: null
    };
    this.cases.set(id, case_);
    return case_;
  }

  async getCase(id: number): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async getCases(): Promise<Case[]> {
    return Array.from(this.cases.values());
  }

  async updateCase(id: number, updates: Partial<InsertCase>): Promise<void> {
    const existing = this.cases.get(id);
    if (existing) {
      const updated: Case = { 
        ...existing, 
        ...updates, 
        updatedAt: new Date() 
      };
      this.cases.set(id, updated);
    }
  }

  async createProcessingJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const id = this.currentJobId++;
    const job: ProcessingJob = { 
      ...insertJob,
      caseId: insertJob.caseId || null,
      status: insertJob.status || "queued",
      progress: insertJob.progress || 0,
      patterns: insertJob.patterns || [],
      customRegex: insertJob.customRegex || null,
      id,
      startedAt: null,
      completedAt: null,
      errorMessage: null
    };
    this.processingJobs.set(id, job);
    return job;
  }

  async getProcessingJob(id: number): Promise<ProcessingJob | undefined> {
    return this.processingJobs.get(id);
  }

  async getProcessingJobs(): Promise<ProcessingJob[]> {
    return Array.from(this.processingJobs.values());
  }

  async updateProcessingJobStatus(id: number, status: string, progress?: number, errorMessage?: string): Promise<void> {
    const job = this.processingJobs.get(id);
    if (job) {
      this.processingJobs.set(id, { 
        ...job, 
        status, 
        progress: progress ?? job.progress,
        errorMessage: errorMessage ?? job.errorMessage,
        startedAt: status === 'processing' && !job.startedAt ? new Date() : job.startedAt
      });
    }
  }

  async completeProcessingJob(id: number): Promise<void> {
    const job = this.processingJobs.get(id);
    if (job) {
      this.processingJobs.set(id, { 
        ...job, 
        status: 'completed',
        progress: 100,
        completedAt: new Date()
      });
    }
  }
}

export const storage = new MemStorage();
