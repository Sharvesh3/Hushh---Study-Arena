import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma';
import { authRouter } from './routes/auth.routes';
import { quizRouter } from './routes/quiz.routes';
import { attemptRouter } from './routes/attempt.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { errorHandler } from './middleware/error.middleware';
import { globalRateLimiter } from './middleware/rateLimit.middleware';

const app = express();
const PORT = process.env.PORT || 4000;

// ----- Security: Validate critical env vars at startup -----
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`[FATAL] Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

// Warn if AI key missing (non-fatal, quiz generation will fail gracefully)
const aiProvider = (process.env.AI_PROVIDER || 'xai').toLowerCase();
const aiKeyVar = aiProvider === 'xai' || aiProvider === 'grok' ? 'XAI_API_KEY' : aiProvider === 'groq' ? 'GROQ_API_KEY' : 'OPENROUTER_API_KEY';
if (!process.env[aiKeyVar]) {
    console.warn(`[WARN] ${aiKeyVar} is not set. Quiz generation will be unavailable.`);
}

// ----- Middleware -----
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(globalRateLimiter);

// ----- Health Check (includes DB connectivity) -----
app.get('/api/health', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'ok',
            database: 'connected',
            provider: aiProvider,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(503).json({
            status: 'degraded',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
        });
    }
});

// ----- Routes -----
app.use('/api/auth', authRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/attempt', attemptRouter);
app.use('/api/dashboard', dashboardRouter);

// ----- Error Handler -----
app.use(errorHandler);

// ----- Start Server -----
app.listen(PORT, () => {
    console.log(`🚀 Kai Study Arena backend running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   AI Provider: ${aiProvider}`);
    // Never log DATABASE_URL or API keys
});

export default app;
