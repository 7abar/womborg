# WombDAO 🧬

> Decentralized Research & Funding Platform for Ectogenesis Science

**Twitter:** [@womb_dao](https://twitter.com/womb_dao)  
**Chain:** Base (chainId 8453)  
**Token:** $WOMB  
**GitHub:** [7abar/womborg](https://github.com/7abar/womborg)

## Overview

WombDAO is a DAO for funding and advancing ectogenesis research. Our AI agent manages simulation pipelines, analyzes real RNA sequencing data from NCBI GEO, and proposes improvements voted on by $WOMB token holders on Base chain.

## Structure

```
womborg/
├── extension/          Chrome Extension (AI assistant + Base wallet)
├── landing-page/       Marketing site (index.html, served by Express)
├── server/             Express API server
├── contracts/          Solidity smart contracts (Base)
├── railway.json        Railway deployment config
├── Procfile            Process config
└── .nixpacks.toml      Nixpacks build config
```

## Quick Start

```bash
# Clone the repo
git clone https://github.com/7abar/womborg.git
cd womborg

# Install server dependencies
cd server && npm install

# Copy env and configure
cp server/.env.example server/.env
# Edit server/.env with your values

# Start the server
npm start
# → http://localhost:3000
```

## Chrome Extension Install

1. Clone this repo or download the `extension/` folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer Mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `extension/` folder
6. The WombDAO extension icon will appear in your toolbar 🧬

> Once published, install directly from the Chrome Web Store.

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/7abar/womborg)

### Manual Deploy

1. Fork this repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select `7abar/womborg`
4. Railway will auto-detect the config from `railway.json`
5. Add environment variables (see table below)
6. Deploy!

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | No | Server port (Railway sets this automatically) | `3000` |
| `OPENROUTER_API_KEY` | Optional | Server-side AI key (users can also use their own) | `sk-or-...` |
| `BASE_RPC_URL` | Optional | Base chain RPC endpoint | `https://mainnet.base.org` |
| `PINATA_API_KEY` | Optional | Pinata IPFS API key for dataset storage | `abc123` |
| `PINATA_SECRET_KEY` | Optional | Pinata IPFS secret key | `secret...` |
| `ALLOWED_ORIGINS` | Optional | CORS origins (comma-separated) | `https://womborg.up.railway.app,chrome-extension://` |

Copy `.env.example` to `.env` and fill in your values. **Never commit `.env` to git.**

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/stats` | Platform statistics |
| GET | `/api/proposals` | DAO proposals |
| GET | `/api/datasets/featured` | Featured research datasets |
| GET | `/api/ncbi/search?q=query` | NCBI GEO search proxy |
| POST | `/api/chat` | OpenRouter AI proxy |

## Tech Stack

- **Chrome Extension** — Manifest V3, vanilla JS
- **Backend** — Node.js + Express
- **AI** — OpenRouter API (free models: Llama, Qwen, etc.)
- **Chain** — Base (EVM-compatible, cheap gas)
- **Data** — NCBI GEO real RNA-seq datasets
- **Storage** — IPFS/Pinata for research artifacts
- **Deployment** — Railway (auto-deploy from GitHub)

## Setup

1. Copy `.env.example` to `.env` and fill in your values
2. Never commit `.env` to git
3. The server serves the landing page from `landing-page/index.html`

## License

MIT © 2026 WombDAO
