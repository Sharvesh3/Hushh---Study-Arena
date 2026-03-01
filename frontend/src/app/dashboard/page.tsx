'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { dashboardApi } from '@/lib/api';
import styles from './dashboard.module.css';

export default function DashboardPage() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                const data = await dashboardApi.stats(token);
                setStats(data.stats);
                setRecentAttempts(data.recentAttempts);
            } catch (err) {
                console.error('Failed to fetch dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    if (!user || !token) {
        return (
            <div className={styles.page}>
                <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <h1 className="heading-lg">Sign in to view your dashboard</h1>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <div className="spinner spinner-lg" />
                    <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className="container">
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className="heading-lg">
                            Welcome back, <span className="text-gradient">{user.name}</span>
                        </h1>
                        <p className={styles.headerSub}>Here&apos;s your learning overview</p>
                    </div>
                    <Link href="/generate" className="btn btn-primary">
                        Generate Quiz ⚡
                    </Link>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>📊</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statValue}>{stats.averageIndex.toFixed(1)}</div>
                                <div className={styles.statLabel}>Avg. Comprehension Index</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🏆</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statValue}>{stats.bestIndex.toFixed(1)}</div>
                                <div className={styles.statLabel}>Best Index</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>📝</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statValue}>{stats.totalQuizzes}</div>
                                <div className={styles.statLabel}>Quizzes Generated</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>🎯</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statValue}>{stats.totalAttempts}</div>
                                <div className={styles.statLabel}>Quiz Attempts</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>✅</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statValue}>{stats.averageMcqScore.toFixed(1)}/20</div>
                                <div className={styles.statLabel}>Avg. MCQ Score</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>⚡</div>
                            <div className={styles.statInfo}>
                                <div className={styles.statValue}>{stats.quizzesRemainingToday}</div>
                                <div className={styles.statLabel}>Quizzes Left Today</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Attempts */}
                <div className={styles.section}>
                    <h2 className="heading-md">Recent Attempts</h2>
                    {recentAttempts.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No attempts yet. Generate a quiz and start learning!</p>
                            <Link href="/generate" className="btn btn-primary" style={{ marginTop: '12px' }}>
                                Generate Your First Quiz
                            </Link>
                        </div>
                    ) : (
                        <div className={styles.attemptsList}>
                            {recentAttempts.map((attempt) => (
                                <div key={attempt.id} className={styles.attemptCard}>
                                    <div className={styles.attemptInfo}>
                                        <h3 className={styles.attemptTitle}>{attempt.quizTitle}</h3>
                                        <div className={styles.attemptMeta}>
                                            <span>MCQ: {attempt.mcqScore}/20</span>
                                            <span>·</span>
                                            <span>Short: {attempt.shortAnswerAvg.toFixed(1)}/10</span>
                                            <span>·</span>
                                            <span>{new Date(attempt.completedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className={styles.attemptIndex}>
                                        <div className={styles.attemptIndexValue}>
                                            {attempt.comprehensionIndex.toFixed(1)}
                                        </div>
                                        <div className={styles.attemptIndexLabel}>CI</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
