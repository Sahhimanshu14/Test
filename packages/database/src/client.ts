import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var globalPrisma: PrismaClient | undefined;
}

function sanitizeDatabaseUrl(urlStr?: string): string | undefined {
  if (!urlStr) return urlStr;
  let fixed = urlStr.trim();

  // Fix unescaped @ in password (e.g. password@@host -> password%40@host)
  if (fixed.includes('@@')) {
    fixed = fixed.replace('@@', '%40@');
  }

  // If user left raw bracket placeholders, return undefined to avoid engine crash
  if (fixed.includes('[REF]') || fixed.includes('[PASSWORD]')) {
    return undefined;
  }

  return fixed;
}

function createPrismaClient(): PrismaClient {
  const dbUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  if (dbUrl) {
    process.env.DATABASE_URL = dbUrl;
  }
  const directUrl = sanitizeDatabaseUrl(process.env.DIRECT_URL);
  if (directUrl) {
    process.env.DIRECT_URL = directUrl;
  }

  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (err: any) {
    console.warn(`[PrismaClient] Initialization failed: ${err.message}. Defaulting to resilient proxy.`);
    return new Proxy({} as any, {
      get(target, prop) {
        if (prop === '$connect') return async () => { throw err; };
        if (prop === '$disconnect') return async () => {};
        return () => ({});
      },
    });
  }
}

export const prisma = globalThis.globalPrisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.globalPrisma = prisma;
}

export * from '@prisma/client';
