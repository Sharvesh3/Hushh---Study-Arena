-- ============================================================
-- Kai Study Arena - PostgreSQL Schema (Supabase Compatible)
-- This is the raw SQL equivalent of the Prisma schema.
-- You do NOT need to run this manually — Prisma handles migrations.
-- Provided for reference only.
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id"            TEXT PRIMARY KEY,
    "email"         TEXT UNIQUE NOT NULL,
    "name"          TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users"("created_at");

-- Quizzes table
CREATE TABLE IF NOT EXISTS "quizzes" (
    "id"              TEXT PRIMARY KEY,
    "user_id"         TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "source_content"  TEXT NOT NULL,
    "summary"         TEXT NOT NULL,
    "mcqs"            JSONB NOT NULL,
    "short_questions" JSONB NOT NULL,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "quizzes_user_id_idx" ON "quizzes"("user_id");
CREATE INDEX IF NOT EXISTS "quizzes_created_at_idx" ON "quizzes"("created_at");

-- Quiz Attempts table
CREATE TABLE IF NOT EXISTS "quiz_attempts" (
    "id"                   TEXT PRIMARY KEY,
    "user_id"              TEXT NOT NULL,
    "quiz_id"              TEXT NOT NULL,
    "mcq_answers"          JSONB NOT NULL,
    "mcq_score"            INTEGER NOT NULL,
    "short_answer_avg"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comprehension_index"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quiz_attempts_quiz_id_fkey"
        FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "quiz_attempts_user_id_idx" ON "quiz_attempts"("user_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_quiz_id_idx" ON "quiz_attempts"("quiz_id");
CREATE INDEX IF NOT EXISTS "quiz_attempts_completed_at_idx" ON "quiz_attempts"("completed_at");

-- Short Answers table
CREATE TABLE IF NOT EXISTS "short_answers" (
    "id"              TEXT PRIMARY KEY,
    "attempt_id"      TEXT NOT NULL,
    "question_index"  INTEGER NOT NULL,
    "answer"          TEXT NOT NULL,
    "score"           DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strength"        TEXT NOT NULL DEFAULT '',
    "weakness"        TEXT NOT NULL DEFAULT '',
    "scored_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_answers_attempt_id_fkey"
        FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "short_answers_attempt_id_idx" ON "short_answers"("attempt_id");

-- Rate Limits table
CREATE TABLE IF NOT EXISTS "rate_limits" (
    "id"           TEXT PRIMARY KEY,
    "user_id"      TEXT NOT NULL,
    "action"       TEXT NOT NULL,
    "count"        INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_user_id_action_window_start_key"
        UNIQUE ("user_id", "action", "window_start")
);

CREATE INDEX IF NOT EXISTS "rate_limits_user_id_action_idx" ON "rate_limits"("user_id", "action");
