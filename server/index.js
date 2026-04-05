require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { DATASETS } = require('./data/datasets');
const { buildIndex, score } = require('./lib/search');
const openapiSpec = require('./lib/openapi');

const app = express();
const PORT = process.env.PORT || 3000;
const SEARCH_INDEX = buildIndex(DATASETS);

async function fetchJSON(url, opts = {}) {
  const { default: fetch } = await import('node-fetch');
  return fetch(url, opts);
}

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

const landingDir = path.join(__dirname, '..', 'landing-page');
app.use(express.static(landingDir));

// ─── In-memory ledger (proposals) ────────────────────────────────────────────
let PROPOSALS = [
  { id: 7, title: 'Fund artificial placenta vasculature study at MIT Media Lab', description: "Allocate community research credits to Dr. Chen's group for a twelve-month study of microvascular scaffolding.", status: 'active', votesFor: 1240, votesAgainst: 320, deadline: '2026-04-20', proposer: 'contributor-0472' },
  { id: 8, title: 'Index GSE109555 methylation dataset into the agent', description: 'Add whole-genome bisulfite sequencing from Zhu P et al. (2018) to the vector store.', status: 'active', votesFor: 890, votesAgainst: 110, deadline: '2026-04-25', proposer: 'contributor-0891' },
  { id: 1, title: 'Establish the public archive and review process', description: 'Genesis proposal. Formalize the ledger, reviewer eligibility, and citation standards.', status: 'passed', votesFor: 2210, votesAgainst: 90, deadline: '2026-03-15', proposer: 'contributor-0001' }
];
let nextProposalId = 9;

// ─── Datasets ────────────────────────────────────────────────────────────────
app.get('/api/datasets', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const organism = req.query.organism;
  let filtered = DATASETS;
  if (organism) filtered = filtered.filter(d => d.organism.toLowerCase() === organism.toLowerCase());
  res.json({ total: filtered.length, limit, offset, data: filtered.slice(offset, offset + limit) });
});

app.get('/api/datasets/featured', (req, res) => {
  res.json({ success: true, data: DATASETS.slice(0, 6) });
});

app.get('/api/datasets/:id', (req, res) => {
  const ds = DATASETS.find(d => d.id.toLowerCase() === req.params.id.toLowerCase());
  if (!ds) return res.status(404).json({ error: 'Not found' });
  res.json(ds);
});

// ─── Search ──────────────────────────────────────────────────────────────────
app.get('/api/search', (req, res) => {
  const q = req.query.q;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  if (!q) return res.status(400).json({ error: 'Missing q parameter' });
  const results = score(SEARCH_INDEX, q).slice(0, limit);
  res.json({ query: q, count: results.length, results: results.map(r => ({ score: +r.score.toFixed(4), dataset: r.dataset })) });
});

// ─── Chat (grounded, with citations) ─────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const { messages, model = 'openrouter/auto:free', agent_mode = false } = req.body || {};

  if (!messages || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Retrieve relevant datasets
  const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const hits = score(SEARCH_INDEX, lastUser).slice(0, 4);
  const context = hits.map(h => `[${h.dataset.id}] ${h.dataset.title} (${h.dataset.author}, ${h.dataset.year}, n=${h.dataset.samples}, ${h.dataset.type})`).join('\n');

  const systemPrompt = `You are WombDAO's grounded research agent for ectogenesis science. Answer using ONLY the provided GEO datasets below. Always cite accession IDs inline like [GSE36552]. If the datasets do not contain the answer, say so explicitly.\n\nAVAILABLE DATASETS:\n${context}`;

  if (!apiKey) {
    // Fallback: return retrieval-only response
    return res.json({
      success: true,
      reply: `Retrieval-only mode (no API key configured on server). Top matching datasets for your query:\n\n${hits.map((h,i) => `${i+1}. [${h.dataset.id}] ${h.dataset.title}`).join('\n')}`,
      citations: hits.map(h => ({ id: h.dataset.id, title: h.dataset.title, url: h.dataset.url, score: +h.score.toFixed(4) })),
      sources: hits.map(h => h.dataset),
      model: 'retrieval-only',
      agent_mode
    });
  }

  try {
    const response = await fetchJSON('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://womborg.up.railway.app', 'X-Title': 'WombDAO' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: 1024, temperature: 0.4 })
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('OpenRouter error:', response.status, text);
      return res.status(502).json({ error: 'OpenRouter error', details: text, hint: 'Check OPENROUTER_API_KEY env var and model availability' });
    }
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';
    const payload = {
      success: true,
      reply,
      citations: hits.map(h => ({ id: h.dataset.id, title: h.dataset.title, url: h.dataset.url, score: +h.score.toFixed(4) })),
      sources: hits.map(h => h.dataset),
      model,
      agent_mode
    };
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: 'Chat upstream failed', details: err.message });
  }
});

// ─── Proposals (ledger) ──────────────────────────────────────────────────────
app.get('/api/proposals', (req, res) => {
  res.json({ total: PROPOSALS.length, data: PROPOSALS });
});

app.post('/api/proposals', (req, res) => {
  const { title, description, proposer } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'title and description required' });
  const p = { id: nextProposalId++, title: title.slice(0, 200), description: description.slice(0, 2000), status: 'active', votesFor: 0, votesAgainst: 0, deadline: null, proposer: (proposer || 'anonymous').slice(0, 64), createdAt: new Date().toISOString() };
  PROPOSALS.unshift(p);
  res.status(201).json({ success: true, proposal: p });
});

app.post('/api/proposals/:id/vote', (req, res) => {
  const id = parseInt(req.params.id);
  const { vote } = req.body || {};
  const p = PROPOSALS.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (vote === 'yes') p.votesFor++;
  else if (vote === 'no') p.votesAgainst++;
  else return res.status(400).json({ error: 'vote must be "yes" or "no"' });
  res.json({ success: true, proposal: p });
});

// ─── Stats ───────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  res.json({
    agents_active: 40 + Math.floor(Math.random() * 20),
    datasets: DATASETS.length,
    proposals_open: PROPOSALS.filter(p => p.status === 'active').length,
    members: 2341,
    updated_at: new Date().toISOString()
  });
});

// ─── OpenAPI + Health ────────────────────────────────────────────────────────
app.get('/api/openapi.json', (req, res) => res.json(openapiSpec));
app.get('/health', (req, res) => res.json({ status: 'ok', version: '0.2.0', datasets: DATASETS.length }));

// ─── robots.txt + sitemap.xml ────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nAllow: /api/\n\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = ['/', '/agent', '/docs', '/connect', '/for-agents'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${base}${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}\n${DATASETS.slice(0,20).map(d => `  <url><loc>${base}/api/datasets/${d.id}</loc></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

// ─── Page routes ─────────────────────────────────────────────────────────────
const pages = ['agent', 'docs', 'connect', 'for-agents', 'terms', 'privacy', 'mint'];
pages.forEach(p => app.get('/' + p, (req, res) => res.sendFile(path.join(landingDir, p + '.html'))));

app.get('*', (req, res) => res.sendFile(path.join(landingDir, 'index.html')));

app.listen(PORT, () => {
  console.log(`WombDAO v0.2 running on :${PORT} | ${DATASETS.length} datasets indexed`);
});
