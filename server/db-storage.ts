import { db } from './db';
import { files, detections, cases, processingJobs, users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import type { IStorage } from './storage';
import type { User, InsertUser, File, InsertFile, Detection, InsertDetection, Case, InsertCase, ProcessingJob, InsertProcessingJob } from '../shared/schema';

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Files
  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(insertFile).returning();
    return file;
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async getFiles(): Promise<File[]> {
    return await db.select().from(files);
  }

  async updateFileStatus(id: number, status: string, processedAt?: Date): Promise<void> {
    await db.update(files)
      .set({ status, processedAt })
      .where(eq(files.id, id));
  }

  async deleteFile(id: number): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async deleteAllFiles(): Promise<void> {
    await db.delete(files);
  }

  // Detections
  async createDetection(insertDetection: InsertDetection): Promise<Detection> {
    const [detection] = await db.insert(detections).values(insertDetection).returning();
    return detection;
  }

  async getDetectionsByFileId(fileId: number): Promise<Detection[]> {
    return await db.select().from(detections).where(eq(detections.fileId, fileId));
  }

  async getAllDetections(): Promise<Detection[]> {
    return await db.select().from(detections);
  }

  async deleteDetectionsByFileId(fileId: number): Promise<void> {
    await db.delete(detections).where(eq(detections.fileId, fileId));
  }

  async deleteAllDetections(): Promise<void> {
    await db.delete(detections);
  }

  // Cases
  async createCase(insertCase: InsertCase): Promise<Case> {
    const [case_] = await db.insert(cases).values(insertCase).returning();
    return case_;
  }

  async getCase(id: number): Promise<Case | undefined> {
    const [case_] = await db.select().from(cases).where(eq(cases.id, id));
    return case_ || undefined;
  }

  async getCases(): Promise<Case[]> {
    return await db.select().from(cases);
  }

  async updateCase(id: number, updates: Partial<InsertCase>): Promise<void> {
    await db.update(cases).set(updates).where(eq(cases.id, id));
  }

  // Processing Jobs
  async createProcessingJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const [job] = await db.insert(processingJobs).values(insertJob).returning();
    return job;
  }

  async getProcessingJob(id: number): Promise<ProcessingJob | undefined> {
    const [job] = await db.select().from(processingJobs).where(eq(processingJobs.id, id));
    return job || undefined;
  }

  async getProcessingJobs(): Promise<ProcessingJob[]> {
    return await db.select().from(processingJobs);
  }

  async updateProcessingJobStatus(id: number, status: string, progress?: number, errorMessage?: string): Promise<void> {
    await db.update(processingJobs)
      .set({
        status,
        progress: progress ?? undefined,
        errorMessage: errorMessage ?? undefined,
      })
      .where(eq(processingJobs.id, id));
  }

  async completeProcessingJob(id: number): Promise<void> {
    await db.update(processingJobs)
      .set({
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
      })
      .where(eq(processingJobs.id, id));
  }
}