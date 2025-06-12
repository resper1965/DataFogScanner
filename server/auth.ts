import bcrypt from 'bcrypt';
import { storage } from './storage';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
});

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(email: string, password: string) {
  const user = await storage.getUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function registerUser(userData: z.infer<typeof registerSchema>) {
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(userData.email);
  if (existingUser) {
    throw new Error('Usuário já existe com este email');
  }

  // Hash password
  const hashedPassword = await hashPassword(userData.password);

  // Create user
  const newUser = await storage.createUser({
    ...userData,
    password: hashedPassword,
  });

  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}