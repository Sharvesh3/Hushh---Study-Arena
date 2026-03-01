import { PrismaClient } from '@prisma/client';

// ----- Supabase-safe Prisma Singleton -----
// Prevents connection leaks with PgBouncer (connection_limit=1)
// Reuses client instance across hot reloads in development

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// ----- Graceful Connection Error Handling -----
prisma.$connect()
    .then(() => {
        console.log('[DB] Connected to Supabase PostgreSQL');
    })
    .catch((err) => {
        console.error('[DB] Failed to connect to database:', err.message);
        // Do NOT log the full DATABASE_URL (security)
        console.error('[DB] Check DATABASE_URL environment variable');
    });

// ----- Graceful Shutdown -----
const shutdown = async () => {
    console.log('[DB] Disconnecting Prisma...');
    await prisma.$disconnect();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default prisma;
