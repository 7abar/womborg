// WombDAO Sidebar - Main Interface v0.1.0
'use strict';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const NCBI_SEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const NCBI_SUMMARY = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

const SYSTEM_PROMPT = `You are WombDAO's AI Research Agent, specialized in ectogenesis, artificial womb technology, embryo development, and synthetic biology. You help researchers understand RNA sequencing data, propose improvements to artificial womb designs, and facilitate DAO governance decisions. Always cite scientific principles and be precise with biological terminology.`;

const FEATURED_DATASETS = [
  { accession: 'GSE36552', title: 'Single-cell RNA-seq of human preimplantation embryos', organism: 'Homo sapiens', type: 'Expression profiling by high throughput sequencing', year: 2013 },
  { accession: 'GSE44183', title: 'Human preimplantation embryo transcriptome', organism: 'Homo sapiens', type: 'Expression profiling by array', year: 2013 },
  { accession: 'GSE101571', title: 'Single-cell RNA sequencing of early human embryos', organism: 'Homo sapiens', type: 'Expression profiling by high throughput sequencing', year: 2017 }
];

const MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free'
];

let chatHistory = [];
let currentModel = MODELS[0];
let apiKey = '';
let walletAddress = '';

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadFromStorage();
  initTabs();
  initResearch();
  initChat();
  initDAO();
  initSettings();
  detectWallet();
});

async function loadFromStorage() {
  const data = await chrome.storage.local.get(['openrouterKey', 'preferredModel', 'walletAddress', 'chatHistory']);
  apiKey = data.openrouterKey || '';
  currentModel = data.preferredModel || MODELS[0];
  walletAddress = data.walletAddress || '';
  chatHistory = data.chatHistory || [];
}

function detectWallet() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_WALLET' }, (res) => {
      if (res?.address) {
        walletAddress = res.address;
        chrome.storage.local.set({ walletAddress });
        updateWalletUI();
      }
    });
  });
}

function updateWalletUI() {
  const display = document.getElementById('walletDisplay');
  const settingsDisplay = document.getElementById('walletDisplaySettings');
  const truncated = walletAddress
    ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)
    : 'Not connected';
  if (display) display.textContent = truncated;
  if (settingsDisplay) settingsDisplay.textContent = walletAddress || 'Not connected';
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pane = document.getElementById('tab-' + btn.dataset.tab);
      if (pane) pane.classList.add('active');
    });
  });
}

// ─── RESEARCH ────────────────────────────────────────────────────────────────
function initResearch() {
  renderFeatured();
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('ncbiSearch');
  const refreshBtn = document.getElementById('refreshNCBI');
  if (searchBtn) searchBtn.addEventListener('click', () => doSearch(searchInput?.value || ''));
  if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(searchInput.value); });
  if (refreshBtn) refreshBtn.addEventListener('click', () => doSearch(searchInput?.value || 'embryo development RNA sequencing'));
  // Auto-load default
  doNCBILive('embryo development RNA sequencing');
}

function renderFeatured() {
  const el = document.getElementById('featuredDatasets');
  if (!el) return;
  el.innerHTML = FEATURED_DATASETS.map(ds => makeDatasetCard(ds)).join('');
}

function makeDatasetCard(ds) {
  const safeTitle = ds.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  return `<div class="dataset-card">
    <div class="dataset-header">
      <span class="accession">${ds.accession || ''}</span>
      <span class="dataset-year">${ds.year || ''}</span>
    </div>
    <div class="dataset-title">${ds.title}</div>
    <div class="dataset-meta">
      <span>🧬 ${ds.organism || ''}</span>
      <span>${(ds.type || '').substring(0, 40)}</span>
    </div>
    <button class="analyze-btn" onclick="analyzeDataset('${ds.accession}', '${safeTitle}')">⚡ Analyze with AI</button>
  </div>`;
}

async function doSearch(query) {
  if (!query.trim()) return;
  const resultsEl = document.getElementById('searchResults');
  const listEl = document.getElementById('searchResultsList');
  const countEl = document.getElementById('resultCount');
  if (!resultsEl || !listEl) return;
  resultsEl.classList.remove('hidden');
  listEl.innerHTML = '<div class="loading-text">🔬 Searching NCBI GEO...</div>';
  try {
    const res = await fetch(`${NCBI_SEARCH}?db=gds&term=${encodeURIComponent(query)}&retmode=json&retmax=5`);
    const data = await res.json();
    const ids = data.esearchresult?.idlist || [];
    if (!ids.length) { listEl.innerHTML = '<div class="empty-state">No datasets found</div>'; return; }
    if (countEl) countEl.textContent = `${ids.length} datasets`;
    const sumRes = await fetch(`${NCBI_SUMMARY}?db=gds&id=${ids.join(',')}&retmode=json`);
    const sumData = await sumRes.json();
    const datasets = ids.map(id => {
      const d = sumData.result?.[id];
      if (!d) return null;
      return { accession: d.accession || id, title: d.title || 'Untitled', organism: d.taxon || 'Unknown', type: d.gdstype || 'Dataset', year: d.pdat?.split('/')?.[0] || '' };
    }).filter(Boolean);
    listEl.innerHTML = datasets.map(makeDatasetCard).join('');
  } catch (e) {
    listEl.innerHTML = `<div class="error-state">❌ ${e.message}</div>`;
  }
}

async function doNCBILive(query) {
  const loadEl = document.getElementById('ncbiLoading');
  const resultsEl = document.getElementById('ncbiResults');
  if (loadEl) loadEl.style.display = 'flex';
  if (resultsEl) resultsEl.innerHTML = '';
  try {
    const cacheKey = 'ncbi_live_' + query.replace(/\s/g, '_');
    const cached = await chrome.storage.local.get(cacheKey);
    if (cached[cacheKey] && Date.now() - cached[cacheKey].ts < 3600000) {
      if (loadEl) loadEl.style.display = 'none';
      if (resultsEl) resultsEl.innerHTML = cached[cacheKey].html;
      return;
    }
    const res = await fetch(`${NCBI_SEARCH}?db=gds&term=${encodeURIComponent(query)}&retmode=json&retmax=3`);
    const data = await res.json();
    const ids = data.esearchresult?.idlist || [];
    if (!ids.length) { if (loadEl) loadEl.style.display = 'none'; return; }
    const sumRes = await fetch(`${NCBI_SUMMARY}?db=gds&id=${ids.join(',')}&retmode=json`);
    const sumData = await sumRes.json();
    const html = ids.map(id => {
      const d = sumData.result?.[id];
      if (!d) return '';
      return makeDatasetCard({ accession: d.accession || id, title: d.title || 'Untitled', organism: d.taxon || 'Unknown', type: d.gdstype || 'Dataset', year: d.pdat?.split('/')?.[0] || '' });
    }).join('');
    if (resultsEl) resultsEl.innerHTML = html;
    await chrome.storage.local.set({ [cacheKey]: { html, ts: Date.now() } });
  } catch (e) {
    if (resultsEl) resultsEl.innerHTML = `<div class="error-state">NCBI API unavailable</div>`;
  } finally {
    if (loadEl) loadEl.style.display = 'none';
  }
}

window.analyzeDataset = function(accession, title) {
  document.querySelector('[data-tab="chat"]')?.click();
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = `Analyze dataset ${accession}: "${title}". What insights does this provide for ectogenesis research? What key developmental markers should we focus on?`;
    input.focus();
  }
};

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
function initChat() {
  const sendBtn = document.getElementById('sendBtn');
  const input = document.getElementById('chatInput');
  const modelSel = document.getElementById('modelSelect');
  const clearBtn = document.getElementById('clearChatBtn');
  const noKeyWarn = document.getElementById('noKeyWarning');

  if (!apiKey && noKeyWarn) noKeyWarn.style.display = 'block';
  if (modelSel) {
    modelSel.value = currentModel;
    modelSel.addEventListener('change', () => {
      currentModel = modelSel.value;
      chrome.storage.local.set({ preferredModel: currentModel });
    });
  }
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
  if (clearBtn) clearBtn.addEventListener('click', clearChat);

  // Quick prompts
  document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (input) { input.value = btn.dataset.prompt; sendMessage(); }
    });
  });

  renderMessages();
}

function renderMessages() {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  if (!chatHistory.length) {
    container.innerHTML = `<div class="welcome-msg"><div class="welcome-icon">🧬</div><p>Ask about ectogenesis, RNA-seq data, embryo development, or DAO proposals.</p></div>`;
    return;
  }
  container.innerHTML = chatHistory.map(m => `
    <div class="msg-bubble ${m.role}">
      <div class="msg-role">${m.role === 'user' ? '👤 You' : '🧬 WombDAO AI'}</div>
      <div class="msg-text">${m.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const noKeyWarn = document.getElementById('noKeyWarning');
  if (!apiKey) {
    if (noKeyWarn) noKeyWarn.style.display = 'block';
    document.querySelector('[data-tab="settings"]')?.click();
    return;
  }
  const input = document.getElementById('chatInput');
  const msg = input?.value?.trim();
  if (!msg) return;
  input.value = '';

  chatHistory.push({ role: 'user', content: msg });
  renderMessages();

  const typing = document.getElementById('typingIndicator');
  if (typing) typing.style.display = 'flex';

  try {
    const res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://womborg.dao',
        'X-Title': 'WombDAO Research Assistant'
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...chatHistory.slice(-10)]
      })
    });
    const data = await res.json();
    if (typing) typing.style.display = 'none';
    if (data.error) throw new Error(data.error.message);
    const reply = data.choices?.[0]?.message?.content || 'No response';
    chatHistory.push({ role: 'assistant', content: reply });
    await chrome.storage.local.set({ chatHistory });
    renderMessages();
  } catch (e) {
    if (typing) typing.style.display = 'none';
    chatHistory.push({ role: 'assistant', content: `❌ Error: ${e.message}` });
    await chrome.storage.local.set({ chatHistory });
    renderMessages();
  }
}

async function clearChat() {
  chatHistory = [];
  await chrome.storage.local.remove('chatHistory');
  renderMessages();
}

// ─── DAO ──────────────────────────────────────────────────────────────────────
function initDAO() {
  // Vote buttons already in HTML, just wire up
  document.querySelectorAll('.vote-yes-btn, .vote-no-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!walletAddress) {
        toast('🔗 Connect your wallet to vote');
        return;
      }
      toast('✅ Vote recorded! (On-chain voting in v0.2)');
    });
  });
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function initSettings() {
  const saveKey = document.getElementById('saveApiKey');
  const keyInput = document.getElementById('apiKeyInput');
  const toggleKey = document.getElementById('toggleApiKey');
  const saveModel = document.getElementById('saveModel');
  const modelSel = document.getElementById('defaultModel');
  const clearHistory = document.getElementById('clearChatHistory');
  const exportBtn = document.getElementById('exportData');

  if (apiKey && keyInput) keyInput.placeholder = '••••••• (key saved)';

  if (toggleKey && keyInput) {
    toggleKey.addEventListener('click', () => {
      keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    });
  }
  if (saveKey) {
    saveKey.addEventListener('click', async () => {
      const val = keyInput?.value?.trim();
      if (!val) { toast('Enter a valid API key'); return; }
      apiKey = val;
      await chrome.storage.local.set({ openrouterKey: val });
      if (keyInput) { keyInput.value = ''; keyInput.placeholder = '••••••• (key saved)'; }
      const noKeyWarn = document.getElementById('noKeyWarning');
      if (noKeyWarn) noKeyWarn.style.display = 'none';
      toast('✅ API key saved!');
    });
  }
  if (modelSel) {
    modelSel.value = currentModel;
    if (saveModel) {
      saveModel.addEventListener('click', async () => {
        currentModel = modelSel.value;
        await chrome.storage.local.set({ preferredModel: currentModel });
        const mainSel = document.getElementById('modelSelect');
        if (mainSel) mainSel.value = currentModel;
        toast('✅ Model preference saved!');
      });
    }
  }
  if (clearHistory) {
    clearHistory.addEventListener('click', async () => {
      chatHistory = [];
      await chrome.storage.local.remove('chatHistory');
      renderMessages();
      toast('✅ Chat history cleared');
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'womborg-chat.json'; a.click();
      URL.revokeObjectURL(url);
    });
  }
  updateWalletUI();
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#0d1f0d;border:1px solid #00ff88;color:#00ff88;padding:8px 16px;border-radius:6px;font-size:11px;z-index:9999;max-width:90%;text-align:center;box-shadow:0 0 12px rgba(0,255,136,0.3);';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}
