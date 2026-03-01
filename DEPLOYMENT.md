# Deployment Guide – Kai Study Arena

## Backend → Render

### 1. Create a PostgreSQL Database on Render
1. Go to https://dashboard.render.com
2. Click **New** → **PostgreSQL**
3. Name: `kai-studyarena-db`
4. Choose the free tier
5. Copy the **Internal Database URL**

### 2. Deploy Backend as Web Service
1. Push your code to GitHub
2. Go to Render Dashboard → **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `kai-studyarena-api`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command:** `npm run start`
   - **Environment:** Node

5. Add Environment Variables:
   ```
   DATABASE_URL=<Internal Database URL from step 1>
   JWT_SECRET=<generate a secure random string>
   AI_PROVIDER=groq
   GROQ_API_KEY=<your Groq API key>
   GROQ_MODEL=llama-3.3-70b-versatile
   FRONTEND_URL=https://your-frontend.vercel.app
   NODE_ENV=production
   QUIZ_RATE_LIMIT_PER_DAY=10
   ```

6. Click **Create Web Service**

### 3. Verify
- Visit `https://your-service.onrender.com/api/health`
- Should return `{ "status": "ok" }`

---

## Frontend → Vercel

### 1. Deploy to Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`

4. Add Environment Variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
   ```

5. Click **Deploy**

### 2. Update Backend CORS
After deploying the frontend, update the `FRONTEND_URL` env var on Render to your Vercel URL:
```
FRONTEND_URL=https://kai-studyarena.vercel.app
```

---

## Getting a Free Groq API Key

1. Go to https://console.groq.com
2. Sign up (free)
3. Navigate to **API Keys**
4. Click **Create API Key**
5. Copy the key (starts with `gsk_`)
6. Add to your backend environment variables

### Alternative: OpenRouter (Free Tier)
1. Go to https://openrouter.ai
2. Sign up and get an API key
3. Set these environment variables instead:
   ```
   AI_PROVIDER=openrouter
   OPENROUTER_API_KEY=<your key>
   OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
   ```

---

## Production Checklist

- [ ] PostgreSQL database created on Render
- [ ] Backend deployed with all env vars
- [ ] Health check returns OK
- [ ] Frontend deployed to Vercel
- [ ] CORS configured (FRONTEND_URL matches Vercel domain)
- [ ] Groq/OpenRouter API key configured
- [ ] JWT_SECRET is a secure random string
- [ ] Test user registration and login
- [ ] Test quiz generation
- [ ] Test quiz submission and scoring

---

## Scaling Notes

- **Render Free Tier:** Spins down after 15 min of inactivity. First request may take 30-50s.
- **Groq Free Tier:** 30 requests/min, 14,400 requests/day. More than enough for MVP.
- **PostgreSQL Free Tier on Render:** 1GB storage, 90-day expiry. Upgrade when needed.

## Troubleshooting

### Backend not connecting to DB
- Ensure `DATABASE_URL` uses the **Internal Database URL** on Render
- Run `npx prisma migrate deploy` manually if needed

### AI returning invalid JSON
- The system automatically retries once
- If persistent, try a different model (e.g., `llama-3.1-8b-instant`)
- Check Groq dashboard for rate limit status

### CORS errors
- Ensure `FRONTEND_URL` exactly matches your Vercel domain (with https://)
- Do not include trailing slash
