import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

// ----- GET /api/dashboard/stats -----
dashboardRouter.get('/stats', async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).userId!;

        // Get total quizzes
        const totalQuizzes = await prisma.quiz.count({ where: { userId } });

        // Get total attempts
        const totalAttempts = await prisma.quizAttempt.count({ where: { userId } });

        // Get average comprehension index
        const avgResult = await prisma.quizAttempt.aggregate({
            where: { userId },
            _avg: { comprehensionIndex: true, mcqScore: true, shortAnswerAvg: true },
            _max: { comprehensionIndex: true },
        });

        // Get recent attempts
        const recentAttempts = await prisma.quizAttempt.findMany({
            where: { userId },
            include: {
                quiz: { select: { id: true, title: true } },
            },
            orderBy: { completedAt: 'desc' },
            take: 10,
        });

        // Quiz generation remaining today
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const quizzesToday = await prisma.quiz.count({
            where: { userId, createdAt: { gte: today } },
        });
        const maxPerDay = parseInt(process.env.QUIZ_RATE_LIMIT_PER_DAY || '10', 10);

        res.json({
            stats: {
                totalQuizzes,
                totalAttempts,
                averageIndex: Math.round((avgResult._avg.comprehensionIndex || 0) * 100) / 100,
                bestIndex: Math.round((avgResult._max.comprehensionIndex || 0) * 100) / 100,
                averageMcqScore: Math.round((avgResult._avg.mcqScore || 0) * 100) / 100,
                averageShortScore: Math.round((avgResult._avg.shortAnswerAvg || 0) * 100) / 100,
                quizzesRemainingToday: Math.max(0, maxPerDay - quizzesToday),
            },
            recentAttempts: recentAttempts.map((a) => ({
                id: a.id,
                quizId: a.quizId,
                quizTitle: a.quiz.title,
                mcqScore: a.mcqScore,
                shortAnswerAvg: a.shortAnswerAvg,
                comprehensionIndex: a.comprehensionIndex,
                completedAt: a.completedAt,
            })),
        });
    } catch (err) {
        console.error('[Dashboard] Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// ----- GET /api/dashboard/history -----
dashboardRouter.get('/history', async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).userId!;

        const attempts = await prisma.quizAttempt.findMany({
            where: { userId },
            include: {
                quiz: { select: { id: true, title: true } },
                shortAnswers: true,
            },
            orderBy: { completedAt: 'desc' },
        });

        res.json({
            history: attempts.map((a) => ({
                id: a.id,
                quizId: a.quizId,
                quizTitle: a.quiz.title,
                mcqScore: a.mcqScore,
                mcqTotal: 20,
                shortAnswerAvg: a.shortAnswerAvg,
                comprehensionIndex: a.comprehensionIndex,
                shortAnswers: a.shortAnswers,
                completedAt: a.completedAt,
            })),
        });
    } catch (err) {
        console.error('[Dashboard] History error:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});
