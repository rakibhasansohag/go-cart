import { PrismaClient } from '@prisma/client';
import { assertSafeE2ERuntime } from './runtime-safety';

assertSafeE2ERuntime();

declare global {
	var prisma: PrismaClient | undefined;
}

// Global Prisma Client instance
export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db;
