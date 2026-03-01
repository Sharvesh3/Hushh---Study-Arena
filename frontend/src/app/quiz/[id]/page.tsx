'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { quizApi, attemptApi } from '@/lib/api';
import styles from './quiz.module.css';

interface MCQ {
    question: string;
    options: string[];
    correct_answer: string;
}

interface ShortQuestion {
    question: string;
}

interface QuizData {
    id: string;
    title: string;
    summary: string;
    mcqs: MCQ[];
    shortQuestions: ShortQuestion[];
}

type Phase = 'summary' | 'mcq' | 'short' | 'submitting' | 'results';

export default function QuizPage() {
    const { user, token } = useAuth();
    const router = useRouter();
    const params = useParams();
    const quizId = params.id as string;

    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Quiz state
    const [phase, setPhase] = useState<Phase>('summary');
    const [currentMcq, setCurrentMcq] = useState(0);
    const [mcqAnswers, setMcqAnswers] = useState<string[]>(Array(20).fill(''));
    const [shortAnswers, setShortAnswers] = useState<string[]>(['', '']);
    const [results, setResults] = useState<any>(null);

    useEffect(() => {
        if (!token || !quizId) return;

        const fetchQuiz = async () => {
            try {
                const { quiz: data } = await quizApi.get(quizId, token);
                setQuiz(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load quiz');
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [quizId, token]);

    const handleMcqAnswer = (answer: string) => {
        const newAnswers = [...mcqAnswers];
        newAnswers[currentMcq] = answer;
        setMcqAnswers(newAnswers);
    };

    const handleSubmit = async () => {
        if (!token || !quiz) return;

        setPhase('submitting');

        try {
            const { attempt } = await attemptApi.submit(
                {
                    quizId: quiz.id,
                    mcqAnswers,
                    shortAnswers,
                },
                token
            );
            setResults(attempt);
            setPhase('results');
        } catch (err: any) {
            setError(err.message || 'Failed to submit quiz');
            setPhase('short');
        }
    };

    if (!user || !token) {
        return (
            <div className={styles.page}>
                <div className="container-narrow" style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <h1 className="heading-lg">Sign in to take quizzes</h1>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.page}>
                <div className="container-narrow" style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <div className="spinner spinner-lg" />
                    <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading quiz...</p>
                </div>
            </div>
        );
    }

    if (error || !quiz) {
        return (
            <div className={styles.page}>
                <div className="container-narrow" style={{ textAlign: 'center', paddingTop: '80px' }}>
                    <div className="alert alert-error">{error || 'Quiz not found'}</div>
                </div>
            </div>
        );
    }

    const answeredCount = mcqAnswers.filter(Boolean).length;

    return (
        <div className={styles.page}>
            <div className="container-narrow">
                {/* Summary Phase */}
                {phase === 'summary' && (
                    <div className={styles.phaseContainer}>
                        <div className={styles.phaseHeader}>
                            <span className="badge badge-primary">Summary</span>
                            <h1 className="heading-lg">{quiz.title}</h1>
                        </div>

                        <div className={styles.summaryCard}>
                            <p>{quiz.summary}</p>
                        </div>

                        <div className={styles.infoBox}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>MCQs</span>
                                <span className={styles.infoValue}>20 questions</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Short Answer</span>
                                <span className={styles.infoValue}>2 questions</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Scoring</span>
                                <span className={styles.infoValue}>Comprehension Index</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%' }}
                            onClick={() => setPhase('mcq')}
                        >
                            Start Quiz ⚡
                        </button>
                    </div>
                )}

                {/* MCQ Phase */}
                {phase === 'mcq' && (
                    <div className={styles.phaseContainer}>
                        <div className={styles.phaseHeader}>
                            <div className={styles.progressInfo}>
                                <span className="badge badge-primary">MCQ {currentMcq + 1} / 20</span>
                                <span className={styles.answeredCount}>{answeredCount}/20 answered</span>
                            </div>
                            <div className="progress-bar" style={{ marginTop: '12px' }}>
                                <div className="progress-fill" style={{ width: `${((currentMcq + 1) / 20) * 100}%` }} />
                            </div>
                        </div>

                        <div className={styles.questionCard}>
                            <h2 className={styles.questionText}>
                                {quiz.mcqs[currentMcq].question}
                            </h2>

                            <div className={styles.options}>
                                {quiz.mcqs[currentMcq].options.map((option, i) => {
                                    const letter = ['A', 'B', 'C', 'D'][i];
                                    const isSelected = mcqAnswers[currentMcq] === letter;
                                    return (
                                        <button
                                            key={i}
                                            className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                                            onClick={() => handleMcqAnswer(letter)}
                                        >
                                            <span className={styles.optionLetter}>{letter}</span>
                                            <span>{option}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={styles.navButtons}>
                            <button
                                className="btn btn-secondary"
                                disabled={currentMcq === 0}
                                onClick={() => setCurrentMcq((prev) => prev - 1)}
                            >
                                ← Previous
                            </button>

                            {currentMcq < 19 ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setCurrentMcq((prev) => prev + 1)}
                                >
                                    Next →
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setPhase('short')}
                                >
                                    Continue to Short Answers →
                                </button>
                            )}
                        </div>

                        {/* Question Navigator */}
                        <div className={styles.questionNav}>
                            {Array.from({ length: 20 }, (_, i) => (
                                <button
                                    key={i}
                                    className={`${styles.qNavBtn} ${i === currentMcq ? styles.qNavActive : ''
                                        } ${mcqAnswers[i] ? styles.qNavAnswered : ''}`}
                                    onClick={() => setCurrentMcq(i)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Short Answer Phase */}
                {phase === 'short' && (
                    <div className={styles.phaseContainer}>
                        <div className={styles.phaseHeader}>
                            <span className="badge badge-primary">Short Answer Questions</span>
                            <h2 className="heading-lg" style={{ marginTop: '8px' }}>
                                Write your answers
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
                                Your answers will be scored by AI with detailed feedback
                            </p>
                        </div>

                        {quiz.shortQuestions.map((sq, i) => (
                            <div key={i} className={styles.shortQuestion}>
                                <h3 className={styles.shortQuestionTitle}>
                                    Question {i + 1}
                                </h3>
                                <p className={styles.shortQuestionText}>{sq.question}</p>
                                <textarea
                                    className="textarea"
                                    placeholder="Write your answer here..."
                                    value={shortAnswers[i]}
                                    onChange={(e) => {
                                        const newAnswers = [...shortAnswers];
                                        newAnswers[i] = e.target.value;
                                        setShortAnswers(newAnswers);
                                    }}
                                    style={{ minHeight: '140px' }}
                                />
                            </div>
                        ))}

                        <div className={styles.navButtons}>
                            <button className="btn btn-secondary" onClick={() => setPhase('mcq')}>
                                ← Back to MCQs
                            </button>
                            <button className="btn btn-primary btn-lg" onClick={handleSubmit}>
                                Submit Quiz ✓
                            </button>
                        </div>
                    </div>
                )}

                {/* Submitting Phase */}
                {phase === 'submitting' && (
                    <div className={styles.phaseContainer} style={{ textAlign: 'center' }}>
                        <div className="spinner spinner-lg" />
                        <h2 className="heading-lg" style={{ marginTop: '24px' }}>Scoring Your Quiz</h2>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                            AI is evaluating your short answers...
                        </p>
                        <div className="progress-bar" style={{ marginTop: '20px' }}>
                            <div className="progress-fill" style={{ width: '60%', animation: 'shimmer 2s infinite' }} />
                        </div>
                    </div>
                )}

                {/* Results Phase */}
                {phase === 'results' && results && (
                    <div className={styles.phaseContainer}>
                        <div className={styles.resultsHeader}>
                            <h1 className="heading-lg">Quiz Complete!</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>{quiz.title}</p>
                        </div>

                        {/* Comprehension Index */}
                        <div className={styles.ciCard}>
                            <div className={styles.ciLabel}>Comprehension Index</div>
                            <div className={styles.ciValue}>
                                {results.comprehensionIndex.toFixed(1)}
                                <span className={styles.ciMax}>/100</span>
                            </div>
                            <div className="progress-bar" style={{ height: '12px', marginTop: '16px' }}>
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${results.comprehensionIndex}%`,
                                        background: results.comprehensionIndex >= 70
                                            ? 'var(--gradient-success)'
                                            : results.comprehensionIndex >= 40
                                                ? 'var(--gradient-accent)'
                                                : 'var(--danger-500)',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className={styles.breakdownGrid}>
                            <div className={styles.breakdownCard}>
                                <div className={styles.breakdownLabel}>MCQ Accuracy</div>
                                <div className={styles.breakdownValue}>
                                    {results.mcqScore}/{results.mcqTotal}
                                </div>
                                <div className={styles.breakdownSub}>
                                    {results.breakdown.accuracy.toFixed(1)}/60 points
                                </div>
                            </div>
                            <div className={styles.breakdownCard}>
                                <div className={styles.breakdownLabel}>Short Answer Avg</div>
                                <div className={styles.breakdownValue}>
                                    {results.shortAnswerAvg.toFixed(1)}/10
                                </div>
                                <div className={styles.breakdownSub}>
                                    {results.breakdown.shortComponent.toFixed(1)}/30 points
                                </div>
                            </div>
                            <div className={styles.breakdownCard}>
                                <div className={styles.breakdownLabel}>Improvement Bonus</div>
                                <div className={styles.breakdownValue}>
                                    +{results.breakdown.improvement.toFixed(1)}
                                </div>
                                <div className={styles.breakdownSub}>
                                    Max 10 points
                                </div>
                            </div>
                        </div>

                        {/* Strength & Weak Areas */}
                        {(results.strengthAreas?.length > 0 || results.weakAreas?.length > 0) && (
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                                {results.strengthAreas?.map((area: string, i: number) => (
                                    <span key={`s-${i}`} className="badge badge-success">💪 {area}</span>
                                ))}
                                {results.weakAreas?.map((area: string, i: number) => (
                                    <span key={`w-${i}`} className="badge badge-warning">📝 Needs work: {area}</span>
                                ))}
                            </div>
                        )}

                        {/* MCQ Results */}
                        <div className={styles.resultsSection}>
                            <h3 className="heading-md">MCQ Results</h3>
                            <div className={styles.mcqResults}>
                                {results.mcqResults.map((r: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`${styles.mcqResult} ${r.isCorrect ? styles.mcqCorrect : styles.mcqWrong}`}
                                    >
                                        <div className={styles.mcqResultHeader}>
                                            <span className={styles.mcqNum}>Q{i + 1}</span>
                                            <span className={r.isCorrect ? styles.mcqPassBadge : styles.mcqFailBadge}>
                                                {r.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                            </span>
                                        </div>
                                        <p className={styles.mcqResultQ}>{quiz.mcqs[i].question}</p>
                                        {!r.isCorrect && (
                                            <p className={styles.mcqCorrectAnswer}>
                                                Your answer: {r.userAnswer || 'Skipped'} · Correct: {r.correctAnswer}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Short Answer Results */}
                        <div className={styles.resultsSection}>
                            <h3 className="heading-md">Short Answer Scores</h3>
                            {results.shortScores.map((s: any, i: number) => (
                                <div key={i} className={styles.shortResult}>
                                    <div className={styles.shortResultHeader}>
                                        <span>Question {i + 1}</span>
                                        <span className="badge badge-primary">{s.score}/10</span>
                                    </div>
                                    <p className={styles.shortResultQ}>{quiz.shortQuestions[i].question}</p>
                                    <div className={styles.feedback}>
                                        <div className={styles.feedbackItem}>
                                            <span className={styles.feedbackLabel}>💪 Strength</span>
                                            <p>{s.strength}</p>
                                        </div>
                                        <div className={styles.feedbackItem}>
                                            <span className={styles.feedbackLabel}>📝 Improvement</span>
                                            <p>{s.weakness}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.navButtons}>
                            <button className="btn btn-secondary" onClick={() => router.push('/quizzes')}>
                                My Quizzes
                            </button>
                            <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
                                Dashboard →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
