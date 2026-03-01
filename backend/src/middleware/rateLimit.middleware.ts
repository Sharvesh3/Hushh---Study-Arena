import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from './auth.middleware';

// Global rate limiter: 100 requests per 15 minutes per IP
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});

/**
 * Quiz generation rate limiter: 10 per user per day.
 * Uses database-backed counting for accuracy across server restarts.
 */
export async function quizRateLimiter(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = (req as AuthRequest).userId;
        if (!userId) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const maxPerDay = parseInt(process.env.QUIZ_RATE_LIMIT_PER_DAY || '10', 10);

        // Get start of current day (UTC)
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Count quizzes generated today
        const todayCount = await prisma.quiz.count({
            where: {
                userId,
                createdAt: { gte: today },
            },
        });

        if (todayCount >= maxPerDay) {
            res.status(429).json({
                error: `Quiz generation limit reached. Maximum ${maxPerDay} quizzes per day.`,
                remaining: 0,
                resetsAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            });
            return;
        }

        // Attach remaining count to response header
        res.setHeader('X-Quiz-Remaining', String(maxPerDay - todayCount - 1));
        next();
    } catch (err) {
        console.error('[RateLimit] Error:', err);
        next(err);
    }
}
