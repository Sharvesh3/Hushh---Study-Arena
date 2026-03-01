import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { RegisterSchema, LoginSchema } from '../lib/schemas';

export const authRouter = Router();

// ----- POST /api/auth/register -----
authRouter.post('/register', async (req: Request, res: Response) => {
    try {
        const validation = RegisterSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: validation.error.issues.map((i) => i.message),
            });
            return;
        }

        const { email, name, password } = validation.data;

        // Check existing user
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ error: 'An account with this email already exists' });
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: { email, name, passwordHash },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.status(201).json({ user, token });
    } catch (err) {
        console.error('[Auth] Register error:', err);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// ----- POST /api/auth/login -----
authRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const validation = LoginSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: validation.error.issues.map((i) => i.message),
            });
            return;
        }

        const { email, password } = validation.data;

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        // Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        res.json({
            user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
            token,
        });
    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// ----- GET /api/auth/me -----
authRouter.get('/me', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, createdAt: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({ user });
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});
