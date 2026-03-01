'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { quizApi } from '@/lib/api';
import styles from './quizzes.module.css';

export default function QuizzesPage() {
    const { user, token } = useAuth();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        const fetchQuizzes = async () => {
            try {
                const { quizzes: data } = await quizApi.list(token);
                setQuizzes(data);
            } catch (err) {
                console.error('Failed to fetch quizzes:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, [token]);

    if (!user || !token) {
        return (
            <div className={styles.page}>
                <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <h1 className="heading-lg">Sign in to view your quizzes</h1>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container">
                <div className={styles.header}>
                    <div>
                        <h1 className="heading-lg">My Quizzes</h1>
                        <p className={styles.headerSub}>{quizzes.length} quizzes generated</p>
                    </div>
                    <Link href="/generate" className="btn btn-primary">
                        Generate New ⚡
                    </Link>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <div className="spinner spinner-lg" />
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📚</div>
                        <h2>No Quizzes Yet</h2>
                        <p>Paste your study material and generate your first quiz!</p>
                        <Link href="/generate" className="btn btn-primary" style={{ marginTop: '16px' }}>
                            Generate Your First Quiz
                        </Link>
                    </div>
                ) : (
                    <div className={styles.quizGrid}>
                        {quizzes.map((quiz) => (
                            <Link key={quiz.id} href={`/quiz/${quiz.id}`} className={styles.quizCard}>
                                <div className={styles.quizCardHeader}>
                                    <h3 className={styles.quizTitle}>{quiz.title}</h3>
                                    <span className="badge badge-primary">
                                        {quiz._count.attempts} attempt{quiz._count.attempts !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className={styles.quizMeta}>
                                    <span>20 MCQs · 2 Short</span>
                                    <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className={styles.quizCta}>
                                    Take Quiz →
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
