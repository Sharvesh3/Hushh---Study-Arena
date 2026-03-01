import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { SubmitAttemptSchema } from '../lib/schemas';
import { scoreShortAnswer, computeComprehensionIndex } from '../services/ai.service';

export const attemptRouter = Router();

attemptRouter.use(authMiddleware);

// ----- POST /api/attempt/submit -----
attemptRouter.post('/submit', async (req: Request, res: Response) => {
    try {
        const validation = SubmitAttemptSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: validation.error.issues.map((i) => i.message),
            });
            return;
        }

        const { quizId, mcqAnswers, shortAnswers } = validation.data;
        const userId = (req as AuthRequest).userId!;

        // Fetch quiz
        const quiz = await prisma.quiz.findFirst({
            where: { id: quizId, userId },
        });

        if (!quiz) {
            res.status(404).json({ error: 'Quiz not found' });
            return;
        }

        // Score MCQs
        const mcqs = quiz.mcqs as Array<{ question: string; options: string[]; correct_answer: string }>;
        let correctMcq = 0;
        const mcqResults = mcqs.map((mcq, i) => {
            const userAnswer = mcqAnswers[i];
            const isCorrect = userAnswer === mcq.correct_answer;
            if (isCorrect) correctMcq++;
            return {
                questionIndex: i,
                userAnswer,
                correctAnswer: mcq.correct_answer,
                isCorrect,
            };
        });

        // Score Short Answers via AI
        const shortQuestions = quiz.shortQuestions as Array<{ question: string }>;
        const shortScores: Array<{
            questionIndex: number;
            answer: string;
            score: number;
            strength: string;
            weakness: string;
        }> = [];

        for (let i = 0; i < shortQuestions.length; i++) {
            const question = shortQuestions[i].question;
            const answer = shortAnswers[i] || '';

            if (!answer.trim()) {
                shortScores.push({
                    questionIndex: i,
                    answer,
                    score: 0,
                    strength: 'N/A',
                    weakness: 'No answer provided',
                });
                continue;
            }

            try {
                const aiScore = await scoreShortAnswer(question, answer);
                shortScores.push({
                    questionIndex: i,
                    answer,
                    score: aiScore.score,
                    strength: aiScore.strength,
                    weakness: aiScore.weakness,
                });
            } catch (err) {
                console.error(`[Attempt] Failed to score short answer ${i}:`, err);
                // Fallback: Give neutral score if AI fails
                shortScores.push({
                    questionIndex: i,
                    answer,
                    score: 5,
                    strength: 'Answer provided',
                    weakness: 'AI scoring temporarily unavailable - neutral score assigned',
                });
            }
        }

        const shortAnswerAvg =
            shortScores.length > 0
                ? shortScores.reduce((sum, s) => sum + s.score, 0) / shortScores.length
                : 0;

        // Get previous attempt for improvement delta
        const previousAttempt = await prisma.quizAttempt.findFirst({
            where: { userId, quizId },
            orderBy: { completedAt: 'desc' },
        });

        // Compute Comprehension Index
        const ciResult = computeComprehensionIndex(
            correctMcq,
            shortAnswerAvg,
            previousAttempt?.comprehensionIndex ?? null
        );

        // Save attempt
        const attempt = await prisma.quizAttempt.create({
            data: {
                userId,
                quizId,
                mcqAnswers: mcqResults as any,
                mcqScore: correctMcq,
                shortAnswerAvg,
                comprehensionIndex: ciResult.index,
                shortAnswers: {
                    create: shortScores.map((s) => ({
                        questionIndex: s.questionIndex,
                        answer: s.answer,
                        score: s.score,
                        strength: s.strength,
                        weakness: s.weakness,
                    })),
                },
            },
            include: {
                shortAnswers: true,
            },
        });

        console.log(`[Attempt] Created attempt ${attempt.id} - CI: ${ciResult.index}`);

        res.status(201).json({
            attempt: {
                id: attempt.id,
                mcqScore: correctMcq,
                mcqTotal: 20,
                mcqResults,
                shortScores,
                shortAnswerAvg: Math.round(shortAnswerAvg * 100) / 100,
                comprehensionIndex: ciResult.index,
                breakdown: {
                    accuracy: ciResult.accuracy,
                    shortComponent: ciResult.shortComponent,
                    improvement: ciResult.improvement,
                },
                strengthAreas: ciResult.strengthAreas,
                weakAreas: ciResult.weakAreas,
                completedAt: attempt.completedAt,
            },
        });
    } catch (err) {
        console.error('[Attempt] Submit error:', err);
        res.status(500).json({ error: 'Failed to submit attempt' });
    }
});

// ----- GET /api/attempt/:id -----
attemptRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).userId!;
        const attemptId = req.params.id;

        const attempt = await prisma.quizAttempt.findFirst({
            where: { id: attemptId, userId },
            include: {
                shortAnswers: true,
                quiz: {
                    select: { id: true, title: true, mcqs: true, shortQuestions: true },
                },
            },
        });

        if (!attempt) {
            res.status(404).json({ error: 'Attempt not found' });
            return;
        }

        res.json({ attempt });
    } catch (err) {
        console.error('[Attempt] Fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch attempt' });
    }
});
