const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface RequestOptions {
    method?: string;
    body?: unknown;
    token?: string;
}

class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, token } = options;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new ApiError(
            data?.error || `Request failed with status ${res.status}`,
            res.status,
            data
        );
    }

    return data as T;
}

// ----- Auth -----
export const authApi = {
    register: (email: string, name: string, password: string) =>
        request<{ user: any; token: string }>('/auth/register', {
            method: 'POST',
            body: { email, name, password },
        }),

    login: (email: string, password: string) =>
        request<{ user: any; token: string }>('/auth/login', {
            method: 'POST',
            body: { email, password },
        }),

    me: (token: string) =>
        request<{ user: any }>('/auth/me', { token }),
};

// ----- Quiz -----
export const quizApi = {
    generate: (title: string, content: string, token: string) =>
        request<{ quiz: any }>('/quiz/generate', {
            method: 'POST',
            body: { title, content },
            token,
        }),

    list: (token: string) =>
        request<{ quizzes: any[] }>('/quiz/list', { token }),

    get: (id: string, token: string) =>
        request<{ quiz: any }>(`/quiz/${id}`, { token }),
};

// ----- Attempt -----
export const attemptApi = {
    submit: (data: { quizId: string; mcqAnswers: string[]; shortAnswers: string[] }, token: string) =>
        request<{ attempt: any }>('/attempt/submit', {
            method: 'POST',
            body: data,
            token,
        }),

    get: (id: string, token: string) =>
        request<{ attempt: any }>(`/attempt/${id}`, { token }),
};

// ----- Dashboard -----
export const dashboardApi = {
    stats: (token: string) =>
        request<{ stats: any; recentAttempts: any[] }>('/dashboard/stats', { token }),

    history: (token: string) =>
        request<{ history: any[] }>('/dashboard/history', { token }),
};

export { ApiError };
