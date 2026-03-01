import axios, { AxiosError } from 'axios';
import { z } from 'zod';
import { QuizResponseSchema, ShortAnswerScoreSchema } from '../lib/schemas';
import type { QuizResponse, ShortAnswerScore } from '../lib/schemas';

// ============================================================
// CONFIGURATION
// ============================================================
const AI_TIMEOUT_MS = 8000;   // 8-second hard timeout
const MAX_RETRIES = 1;        // Retry once on failure
const RETRY_BACKOFF_MS = 1000; // 1-second backoff

interface AIConfig {
    apiUrl: string;
    apiKey: string;
    model: string;
    provider: string;
}

/**
 * Resolve AI provider config from environment.
 * Supports: xai (Grok), groq, openrouter
 */
function getAIConfig(): AIConfig {
    const provider = (process.env.AI_PROVIDER || 'xai').toLowerCase();

    switch (provider) {
        case 'xai':
        case 'grok':
            return {
                provider: 'xai',
                apiUrl: 'https://api.x.ai/v1/chat/completions',
                apiKey: process.env.XAI_API_KEY || '',
                model: process.env.XAI_MODEL || 'grok-3-mini-fast',
            };

        case 'groq':
            return {
                provider: 'groq',
                apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
                apiKey: process.env.GROQ_API_KEY || '',
                model: process.env.GROQ_MODEL || 'llama3-70b-8192',
            };

        case 'openrouter':
            return {
                provider: 'openrouter',
                apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
                apiKey: process.env.OPENROUTER_API_KEY || '',
                model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
            };

        default:
            throw new Error(`Unknown AI_PROVIDER: ${provider}. Use 'xai', 'groq', or 'openrouter'.`);
    }
}

// ============================================================
// JSON SANITIZATION
// ============================================================

/**
 * Sanitize raw LLM output into parseable JSON.
 * - Strips markdown code fences (```json ... ```)
 * - Extracts the first JSON object { ... }
 * - Removes trailing commas before } and ]
 * - Removes single-line // comments
 */
function sanitizeJsonString(raw: string): string {
    // Strip markdown fences
    let cleaned = raw.replace(/```(?:json)?\s*/gi, '');

    // Remove single-line comments (// ...)
    cleaned = cleaned.replace(/\/\/[^\n]*/g, '');

    // Trim whitespace
    cleaned = cleaned.trim();

    // Extract JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('No JSON object found in AI response');
    }

    cleaned = cleaned.slice(firstBrace, lastBrace + 1);

    // Remove trailing commas before } and ]
    cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

    return cleaned;
}

// ============================================================
// JSON PARSE + ZOD VALIDATION
// ============================================================

/**
 * Parse raw string into validated typed data:
 * 1. Sanitize the raw string
 * 2. JSON.parse()
 * 3. Zod schema validation
 * Throws descriptive errors at each step.
 */
function parseAndValidateJson<T>(raw: string, schema: z.ZodType<T>): T {
    const sanitized = sanitizeJsonString(raw);

    let parsed: unknown;
    try {
        parsed = JSON.parse(sanitized);
    } catch (err) {
        // Log first 300 chars for debugging (no sensitive data)
        console.error('[AI] JSON.parse failed. First 300 chars:', sanitized.substring(0, 300));
        throw new Error('AI returned invalid JSON that could not be parsed');
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
        const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        console.error('[AI] Zod validation failed:', issues);
        throw new Error(`AI response failed schema validation: ${issues}`);
    }

    return result.data;
}

// ============================================================
// LLM API CALL
// ============================================================

/**
 * Call the LLM API (OpenAI-compatible endpoint).
 * - 8-second Axios timeout
 * - Detects 5xx for retry eligibility
 * - Never logs the API key
 */
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const config = getAIConfig();

    if (!config.apiKey) {
        throw new Error(
            `AI API key not configured. Set ${config.provider === 'xai' ? 'XAI_API_KEY' : config.provider === 'groq' ? 'GROQ_API_KEY' : 'OPENROUTER_API_KEY'} in environment.`
        );
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
    };

    // OpenRouter needs extra headers
    if (config.provider === 'openrouter') {
        headers['HTTP-Referer'] = process.env.FRONTEND_URL || 'https://kai-studyarena.vercel.app';
        headers['X-Title'] = 'Kai Study Arena';
    }

    console.log(`[AI] Calling ${config.provider} (${config.model})...`);

    try {
        const response = await axios.post(
            config.apiUrl,
            {
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.3,
                max_tokens: 4096,
            },
            {
                timeout: AI_TIMEOUT_MS,
                headers,
            }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
            throw new Error('AI returned empty or non-string response');
        }

        console.log(`[AI] Received response (${content.length} chars)`);
        return content;

    } catch (err) {
        if (axios.isAxiosError(err)) {
            const axErr = err as AxiosError;

            if (axErr.code === 'ECONNABORTED' || axErr.code === 'ETIMEDOUT') {
                throw new Error(`AI request timed out after ${AI_TIMEOUT_MS}ms`);
            }

            const status = axErr.response?.status;
            if (status && status >= 500) {
                throw new Error(`AI service returned ${status} server error`);
            }

            if (status === 429) {
                throw new Error('AI rate limit exceeded. Try again later.');
            }

            if (status === 401 || status === 403) {
                throw new Error('AI API key is invalid or expired. Check your configuration.');
            }

            throw new Error(`AI request failed: ${axErr.message}`);
        }

        throw err;
    }
}

// ============================================================
// RETRY WRAPPER
// ============================================================

/**
 * Retry wrapper: calls fn(), retries once on failure with 1s backoff.
 * Retries on: invalid JSON, timeout, 5xx responses.
 */
async function callWithRetry<T>(
    fn: () => Promise<T>,
    context: string
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error(`[AI] ${context} — Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, lastError.message);

            if (attempt < MAX_RETRIES) {
                console.log(`[AI] Retrying ${context} in ${RETRY_BACKOFF_MS}ms...`);
                await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
            }
        }
    }

    // Both attempts exhausted
    console.error(`[AI] ${context} — All ${MAX_RETRIES + 1} attempts failed.`);
    throw lastError || new Error(`${context} failed after ${MAX_RETRIES + 1} attempts`);
}

// ============================================================
// PUBLIC API: QUIZ GENERATION
// ============================================================

/**
 * Generate quiz content (summary, 20 MCQs, 2 short questions) from user content.
 * Returns Zod-validated QuizResponse.
 */
export async function generateQuiz(content: string): Promise<QuizResponse> {
    const sanitizedContent = content
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
        .trim();

    const systemPrompt = `You are an expert educational quiz generator.
You must respond ONLY with valid JSON.
Do not include explanations.
Do not include markdown.
Do not include comments.
Do not include trailing commas.

Return this exact structure:
{
  "summary": "A comprehensive 1-page structured summary of the content covering all key concepts, definitions, and important details",
  "mcqs": [
    {
      "question": "Clear question text",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correct_answer": "A"
    }
  ],
  "short_questions": [
    {
      "question": "A thought-provoking open-ended question requiring a detailed answer"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Generate EXACTLY 20 mcqs (no more, no less)
- Generate EXACTLY 2 short_questions (no more, no less)
- Each MCQ must have EXACTLY 4 options
- correct_answer must be one of: "A", "B", "C", "D"
- No trailing commas
- Proper JSON syntax only
- summary should be detailed and cover all key concepts
- Questions should range from basic recall to application-level thinking
- If the content is insufficient for 20 questions, create questions about related concepts`;

    const userPrompt = `Generate a comprehensive quiz from the following study content:\n\n${sanitizedContent}`;

    return callWithRetry(async () => {
        const raw = await callLLM(systemPrompt, userPrompt);
        return parseAndValidateJson(raw, QuizResponseSchema);
    }, 'generateQuiz');
}

// ============================================================
// PUBLIC API: SHORT ANSWER SCORING
// ============================================================

/**
 * Score a short answer using AI.
 * Returns Zod-validated ShortAnswerScore.
 */
export async function scoreShortAnswer(
    question: string,
    answer: string
): Promise<ShortAnswerScore> {
    const systemPrompt = `You are an expert educational assessor.
You must return ONLY valid JSON:
{
  "score": number_between_0_and_10,
  "strength": "what the student did well",
  "weakness": "what could be improved"
}

No explanation.
No markdown.
No comments.
No trailing commas.
Only valid JSON.

Scoring guide:
0-2: No understanding or completely wrong
3-4: Minimal understanding, major gaps
5-6: Partial understanding, some key points
7-8: Good understanding, minor gaps
9-10: Excellent, comprehensive answer`;

    const userPrompt = `Question: ${question}\n\nStudent's Answer: ${answer}\n\nScore this answer on a scale of 0-10. Identify the strength (what they got right) and weakness (what they missed or got wrong).`;

    return callWithRetry(async () => {
        const raw = await callLLM(systemPrompt, userPrompt);
        return parseAndValidateJson(raw, ShortAnswerScoreSchema);
    }, 'scoreShortAnswer');
}

// ============================================================
// COMPREHENSION INDEX CALCULATOR
// ============================================================

export interface ComprehensionResult {
    index: number;
    accuracy: number;
    shortComponent: number;
    improvement: number;
    strengthAreas: string[];
    weakAreas: string[];
}

/**
 * Compute Comprehension Index:
 *
 * MCQ Accuracy   = (correct_mcq / 20) × 60    → max 60 pts
 * Short Avg      = (avg_score / 10)   × 30    → max 30 pts
 * Improvement    = min(improvement_delta, 10)  → max 10 pts
 *
 * Final Index    = min(100, Accuracy + ShortAvg + Improvement)
 */
export function computeComprehensionIndex(
    correctMcq: number,
    shortAnswerAvg: number,
    previousIndex?: number | null
): ComprehensionResult {
    const accuracy = (correctMcq / 20) * 60;
    const shortComponent = (shortAnswerAvg / 10) * 30;

    let improvement = 0;
    if (previousIndex !== null && previousIndex !== undefined) {
        const rawIndex = accuracy + shortComponent;
        const delta = rawIndex - previousIndex;
        improvement = Math.min(Math.max(delta, 0), 10);
    }

    const index = Math.min(100, accuracy + shortComponent + improvement);

    // Determine strength/weak areas
    const strengthAreas: string[] = [];
    const weakAreas: string[] = [];

    const mcqPercent = (correctMcq / 20) * 100;
    if (mcqPercent >= 80) strengthAreas.push('Multiple Choice Questions');
    else if (mcqPercent < 50) weakAreas.push('Multiple Choice Questions');

    if (shortAnswerAvg >= 7) strengthAreas.push('Short Answer Questions');
    else if (shortAnswerAvg < 4) weakAreas.push('Short Answer Questions');

    if (improvement > 0) strengthAreas.push('Consistent Improvement');

    return {
        index: Math.round(index * 100) / 100,
        accuracy: Math.round(accuracy * 100) / 100,
        shortComponent: Math.round(shortComponent * 100) / 100,
        improvement: Math.round(improvement * 100) / 100,
        strengthAreas,
        weakAreas,
    };
}
