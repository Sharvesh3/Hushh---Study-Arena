# Kai Study Arena
## Comprehension Intelligence Layer

A production-grade AI-powered study platform that generates quizzes from any study material, scores answers with AI, and tracks comprehension over time.

### Tech Stack
- **Backend:** Express.js + TypeScript + Prisma ORM
- **Database:** PostgreSQL
- **Frontend:** Next.js 15 (App Router)
- **AI:** Groq / OpenRouter (free-tier LLM)

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- Groq API key (free at https://console.groq.com)

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and GROQ_API_KEY
npm install
npx prisma migrate dev --name init
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
# .env.local is already configured for localhost
npm install
npm run dev
```

### 3. Open http://localhost:3000

---

## Environment Variables

### Backend (.env)
| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key` |
| **AI:** Fine-tuned Transformer (t5-small, local inference) |
| `FRONTEND_URL` | CORS origin | `http://localhost:3000` |

### Frontend (.env.local)
| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:4000/api` |

---

## Project Structure

```
kai-studyarena/
├── backend/
│   ├── prisma/schema.prisma      # Database schema
│   ├── src/
│   │   ├── server.ts             # Express entry point
│   │   ├── lib/
│   │   │   ├── prisma.ts         # DB client
│   │   │   └── schemas.ts        # Zod validation
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── rateLimit.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── quiz.routes.ts
│   │   │   ├── attempt.routes.ts
│   │   │   └── dashboard.routes.ts
│   │   └── services/
│   │       └── ai.service.ts     # AI integration + retry
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   ├── components/           # Shared components
│   │   └── lib/                  # API client + auth context
│   └── package.json
├── schema.sql                    # Raw SQL (alternative)
└── DEPLOYMENT.md                 # Deployment guide
```
