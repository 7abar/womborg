require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

async function fetchJSON(url, opts = {}) {
  const { default: fetch } = await import('node-fetch');
  return fetch(url, opts);
}

app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.some(o => origin.startsWith(o)) ||
      origin.startsWith('chrome-extension://') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed'));
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

app.use(express.json({ limit: '1mb' }));

const landingDir = path.join(__dirname, '..', 'landing-page');
app.use(express.static(landingDir));

const PROPOSALS = [
  {
    id: 1,
    title: 'Fund Artificial Placenta Research at MIT',
    description: "Allocate community research credits to Dr. Chen's artificial placenta vasculature study. This research will advance nutrient delivery systems for ectogenesis devices.",
    status: 'active',
    votesFor: 1240,
    votesAgainst: 320,
    totalVotes: 1560,
    deadline: '2026-04-20',
    proposer: 'contributor-0472',
  },
  {
    id: 2,
    title: 'Integrate GSE101571 Dataset into WombDAO Agent',
    description: 'Add the human blastocyst single-cell RNA-seq dataset (GSE101571) to the AI agent knowledge base for improved embryo development analysis.',
    status: 'active',
    votesFor: 890,
    votesAgainst: 110,
    totalVotes: 1000,
    deadline: '2026-04-25',
    proposer: 'contributor-0891',
  },
  {
    id: 3,
    title: 'Establish Public Archive and Review Process',
    description: 'Formalize the public ledger, reviewer eligibility, and citation standards. Every dataset, finding, and decision is filed in public.',
    status: 'passed',
    votesFor: 2210,
    votesAgainst: 90,
    totalVotes: 2300,
    deadline: '2026-03-15',
    proposer: 'contributor-0001',
  },
];

const FEATURED_DATASETS = [
  {
    id: 'GSE36552',
    title: 'Single-cell RNA-seq of human preimplantation embryos',
    organism: 'Homo sapiens',
    samples: 124,
    type: 'RNA-seq',
    relevance: 'preimplantation development',
    url: 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE36552',
    tags: ['embryo', 'single-cell', 'RNA-seq', 'preimplantation'],
  },
  {
    id: 'GSE44183',
    title: 'Transcriptome of human preimplantation embryo development',
    organism: 'Homo sapiens',
    samples: 67,
    type: 'RNA-seq',
    relevance: 'embryo transcriptomics',
    url: 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE44183',
    tags: ['embryo', 'transcriptome', 'development', 'IVF'],
  },
  {
    id: 'GSE101571',
    title: 'Single-cell RNA sequencing of human blastocysts',
    organism: 'Homo sapiens',
    samples: 88,
    type: 'scRNA-seq',
    relevance: 'blastocyst cell lineage',
    url: 'https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE101571',
    tags: ['blastocyst', 'single-cell', 'cell-lineage', 'trophoblast'],
  },
];

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.get('/api/proposals', (req, res) => {
  res.json({ success: true, data: PROPOSALS });
});

app.get('/api/datasets/featured', (req, res) => {
  res.json({ success: true, data: FEATURED_DATASETS });
});

app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      agents: 42,
      datasets: 156,
      proposals: PROPOSALS.length,
      members: 2341,
    },
  });
});

app.get('/api/ncbi/search', async (req, res) => {
  const { q, db = 'gds', retmax = 10 } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter: q' });

  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=${encodeURIComponent(db)}&term=${encodeURIComponent(q)}&retmax=${retmax}&retmode=json`;
    const response = await fetchJSON(url, {
      headers: { 'User-Agent': 'WombDAO/0.1.0 (research tool)' },
    });
    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    console.error('NCBI proxy error:', err.message);
    res.status(502).json({ error: 'Failed to reach NCBI API', details: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Server-side AI not configured. Use client-side key.',
    });
  }

  const { messages, model = 'meta-llama/llama-3.1-8b-instruct:free' } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

  try {
    const response = await fetchJSON('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://womborg.up.railway.app',
        'X-Title': 'WombDAO Research Agent',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'OpenRouter error', details: errText });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Chat proxy error:', err.message);
    res.status(502).json({ error: 'Failed to reach OpenRouter API', details: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(landingDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\u{1F9EC} WombDAO server running on port ${PORT}`);
  console.log(`   Landing page: ${landingDir}`);
});
