# WombDAO Deploy Guide

## Railway Deployment (Manual)

### Step 1 — Create Railway Account
Go to https://railway.app and sign up (free)

### Step 2 — New Project from GitHub
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select repo: `7abar/womborg`

### Step 3 — Configure Environment Variables
In Railway dashboard → your project → Variables tab, add:

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | `3000` | Yes (auto-set by Railway) |
| `OPENROUTER_API_KEY` | your key from openrouter.ai | Optional (for server-side AI) |
| `BASE_RPC_URL` | `https://mainnet.base.org` | Yes |
| `ALLOWED_ORIGINS` | `https://yourapp.up.railway.app` | Yes |

### Step 4 — Deploy Settings
Railway will auto-detect the Procfile:
```
web: cd server && npm install && node index.js
```

### Step 5 — Get Your URL
After deploy: `https://womborg.up.railway.app` (or custom domain)

---

## Chrome Extension — Update Manifest
After Railway deploy, update extension/manifest.json host_permissions to add your Railway URL:
```json
"https://womborg.up.railway.app/*"
```

---

## Local Development
```bash
cd server
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
```
Open http://localhost:3000

---

## What Needs Your Action (Skip List)
- [ ] Railway account creation & GitHub connect
- [ ] Fill OPENROUTER_API_KEY in Railway env vars
- [ ] Submit extension to Chrome Web Store (needs $5 developer account)
- [ ] Buy domain (optional)
- [ ] Deploy $WOMB token smart contract on Base (v0.2)
