'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { quizApi } from '@/lib/api';
import styles from './generate.module.css';

export default function GeneratePage() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState('');

    if (!user || !token) {
        return (
            <div className={styles.page}>
                <div className="container-narrow" style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <h1 className="heading-lg">Sign in to generate quizzes</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
                        You need to be signed in to generate quizzes.
                    </p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setProgress('Analyzing your content with AI...');

        try {
            const { quiz } = await quizApi.generate(title, content, token);
            setProgress('Quiz generated! Redirecting...');

            setTimeout(() => {
                router.push(`/quiz/${quiz.id}`);
            }, 500);
        } catch (err: any) {
            setError(err.message || 'Failed to generate quiz. Please try again.');
            setLoading(false);
            setProgress('');
        }
    };

    const charCount = content.length;
    const charValid = charCount >= 50;

    return (
        <div className={styles.page}>
            <div className="container-narrow">
                <div className={styles.header}>
                    <h1 className="heading-lg">
                        Generate a <span className="text-gradient">Quiz</span>
                    </h1>
                    <p className={styles.headerSub}>
                        Paste your study material below. Kai will generate 20 MCQs + 2 short-answer questions with a comprehensive summary.
                    </p>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className="input-group">
                        <label htmlFor="quiz-title">Quiz Title</label>
                        <input
                            id="quiz-title"
                            type="text"
                            className="input"
                            placeholder="e.g., Chapter 5 - Cell Biology"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            maxLength={200}
                            disabled={loading}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="quiz-content">
                            Study Content
                            <span className={styles.charCount} style={{ color: charValid ? 'var(--success-400)' : 'var(--text-tertiary)' }}>
                                {charCount.toLocaleString()} / 15,000 chars {charValid ? '✓' : `(min 50)`}
                            </span>
                        </label>
                        <textarea
                            id="quiz-content"
                            className="textarea"
                            placeholder="Paste your notes, textbook content, lecture slides, or any study material here..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                            maxLength={15000}
                            disabled={loading}
                            style={{ minHeight: '300px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading || !charValid}
                        style={{ width: '100%' }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" />
                                {progress}
                            </>
                        ) : (
                            'Generate Quiz ⚡'
                        )}
                    </button>

                    {loading && (
                        <div className={styles.loadingMessage}>
                            <div className="progress-bar" style={{ marginBottom: '12px' }}>
                                <div className="progress-fill" style={{ width: '70%', animation: 'shimmer 2s infinite' }} />
                            </div>
                            <p>This may take up to 15 seconds. Our AI is crafting 20 high-quality questions...</p>
                        </div>
                    )}
                </form>

                <div className={styles.tips}>
                    <h3>💡 Tips for better quizzes</h3>
                    <ul>
                        <li>Paste structured content with clear topics and subtopics</li>
                        <li>More content = more diverse and challenging questions</li>
                        <li>Textbook excerpts, lecture notes, and study guides work best</li>
                        <li>You can generate up to 10 quizzes per day</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
