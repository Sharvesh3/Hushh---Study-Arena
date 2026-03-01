import { z } from 'zod';

// ----- MCQ Schema -----
export const MCQSchema = z.object({
    question: z.string().min(1, 'Question cannot be empty'),
    options: z.array(z.string()).length(4, 'Must have exactly 4 options'),
    correct_answer: z.enum(['A', 'B', 'C', 'D']),
});

// ----- Short Question Schema -----
export const ShortQuestionSchema = z.object({
    question: z.string().min(1, 'Question cannot be empty'),
});

// ----- Full Quiz Response Schema -----
export const QuizResponseSchema = z.object({
    summary: z.string().min(10, 'Summary must be at least 10 characters'),
    mcqs: z.array(MCQSchema).length(20, 'Must have exactly 20 MCQs'),
    short_questions: z.array(ShortQuestionSchema).length(2, 'Must have exactly 2 short questions'),
});

// ----- Short Answer Score Schema -----
export const ShortAnswerScoreSchema = z.object({
    score: z.number().min(0).max(10),
    strength: z.string().min(1),
    weakness: z.string().min(1),
});

// ----- Auth Schemas -----
export const RegisterSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// ----- Quiz Generation Request -----
export const GenerateQuizSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(50, 'Content must be at least 50 characters').max(15000),
});

// ----- Submit Attempt Schema -----
export const SubmitAttemptSchema = z.object({
    quizId: z.string().min(1),
    mcqAnswers: z.array(z.enum(['A', 'B', 'C', 'D', ''])).length(20),
    shortAnswers: z.array(z.string()).length(2),
});

// ----- Types -----
export type QuizResponse = z.infer<typeof QuizResponseSchema>;
export type ShortAnswerScore = z.infer<typeof ShortAnswerScoreSchema>;
export type MCQ = z.infer<typeof MCQSchema>;
export type ShortQuestion = z.infer<typeof ShortQuestionSchema>;
