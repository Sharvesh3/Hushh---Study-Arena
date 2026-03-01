import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { quizRateLimiter } from '../middleware/rateLimit.middleware';
import { GenerateQuizSchema } from '../lib/schemas';
import { generateQuiz } from '../services/ai.service';

export const quizRouter = Router();

// All quiz routes require authentication
quizRouter.use(authMiddleware);

// ----- POST /api/quiz/generate -----
quizRouter.post('/generate', quizRateLimiter as any, async (req: Request, res: Response) => {
    try {
        const validation = GenerateQuizSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: validation.error.issues.map((i) => i.message),
            });
            return;
        }

        const { title, content } = validation.data;
        const userId = (req as AuthRequest).userId!;

        console.log(`[Quiz] Generating quiz for user ${userId}: "${title}"`);

        // Call AI service
        let quizData;
        try {
            quizData = await generateQuiz(content);
        } catch (err) {
            console.error('[Quiz] AI generation failed:', err);
            res.status(503).json({
                error: 'AI service temporarily unavailable. Please retry.',
            });
            return;
        }

        // Store quiz in database
        const quiz = await prisma.quiz.create({
            data: {
                userId,
                title,
                sourceContent: content,
                summary: quizData.summary,
                mcqs: quizData.mcqs as any,
                shortQuestions: quizData.short_questions as any,
            },
        });

        console.log(`[Quiz] Created quiz ${quiz.id} with 20 MCQs and 2 short questions`);

        res.status(201).json({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                summary: quiz.summary,
                mcqs: quiz.mcqs,
                shortQuestions: quiz.shortQuestions,
                createdAt: quiz.createdAt,
            },
        });
    } catch (err) {
        console.error('[Quiz] Generation error:', err);
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
});

// ----- GET /api/quiz/list -----
quizRouter.get('/list', async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).userId!;

        const quizzes = await prisma.quiz.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                createdAt: true,
                _count: { select: { attempts: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ quizzes });
    } catch (err) {
        console.error('[Quiz] List error:', err);
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

// ----- GET /api/quiz/:id -----
quizRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).userId!;
        const quizId = req.params.id;

        const quiz = await prisma.quiz.findFirst({
            where: { id: quizId, userId },
            select: {
                id: true,
                title: true,
                summary: true,
                mcqs: true,
                shortQuestions: true,
                createdAt: true,
            },
        });

        if (!quiz) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }

        res.json({ quiz });
    } catch (err) {
        console.error('[Quiz] Fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch quiz' });
    }
});
