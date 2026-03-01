'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { user, logout, isLoading } = useAuth();
    const pathname = usePathname();

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>⚡</span>
                    <span className={styles.logoText}>Kai</span>
                    <span className={styles.logoSub}>Study Arena</span>
                </Link>

                <div className={styles.links}>
                    {!isLoading && user ? (
                        <>
                            <Link
                                href="/dashboard"
                                className={`${styles.navLink} ${pathname === '/dashboard' ? styles.active : ''}`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/generate"
                                className={`${styles.navLink} ${pathname === '/generate' ? styles.active : ''}`}
                            >
                                Generate Quiz
                            </Link>
                            <Link
                                href="/quizzes"
                                className={`${styles.navLink} ${pathname === '/quizzes' ? styles.active : ''}`}
                            >
                                My Quizzes
                            </Link>
                            <div className={styles.userSection}>
                                <span className={styles.userName}>{user.name}</span>
                                <button onClick={logout} className={styles.logoutBtn}>
                                    Sign Out
                                </button>
                            </div>
                        </>
                    ) : !isLoading ? (
                        <>
                            <Link href="/login" className={`btn btn-ghost ${styles.navLink}`}>
                                Sign In
                            </Link>
                            <Link href="/register" className="btn btn-primary btn-sm">
                                Get Started
                            </Link>
                        </>
                    ) : null}
                </div>
            </div>
        </nav>
    );
}
