'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, ApiError } from '@/lib/api';

interface User {
    id: string;
    email: string;
    name: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, name: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const setAuth = useCallback((userData: User, authToken: string) => {
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('kai_token', authToken);
        localStorage.setItem('kai_user', JSON.stringify(userData));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('kai_token');
        localStorage.removeItem('kai_user');
    }, []);

    // Restore session on mount
    useEffect(() => {
        const init = async () => {
            const storedToken = localStorage.getItem('kai_token');
            const storedUser = localStorage.getItem('kai_user');

            if (storedToken && storedUser) {
                try {
                    // Verify token is still valid
                    const { user: freshUser } = await authApi.me(storedToken);
                    setAuth(freshUser, storedToken);
                } catch {
                    logout();
                }
            }
            setIsLoading(false);
        };

        init();
    }, [setAuth, logout]);

    const login = async (email: string, password: string) => {
        const { user: userData, token: authToken } = await authApi.login(email, password);
        setAuth(userData, authToken);
    };

    const register = async (email: string, name: string, password: string) => {
        const { user: userData, token: authToken } = await authApi.register(email, name, password);
        setAuth(userData, authToken);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
