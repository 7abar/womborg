// WombDAO Web Agent — chat client
const history = [];
let agentMode = false;

const log = document.getElementById('chatLog');
const form = document.getElementById('chatForm');
const input = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const agentModeBtn = document.getElementById('agentMode');
const sessionInfo = document.getElementById('sessionInfo');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function linkAccessions(text) {
  return escapeHtml(text).replace(/\[(GSE\d+)\]/g, (_, id) =>
    `<a href="https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=${id}" target="_blank" rel="noopener" style="color:var(--stain);font-weight:600">[${id}]</a>`);
}

function renderMessage(role, text, citations, raw) {
  const empty = log.querySelector('.empty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = `msg ${role}`;
  const who = role === 'user' ? 'You' : 'WombDAO Agent';

  if (agentMode && role === 'agent' && raw) {
    el.innerHTML = `<div class="who">${who} · json</div><div class="json-view">${escapeHtml(JSON.stringify(raw, null, 2))}</div>`;
  } else {
    let citationsHtml = '';
    if (citations && citations.length) {
      citationsHtml = `<div class="citations">${citations.map(c =>
        `<a href="${escapeHtml(c.url)}" target="_blank" rel="noopener" title="${escapeHtml(c.title)}">${escapeHtml(c.id)}</a>`
      ).join('')}</div>`;
    }
    el.innerHTML = `<div class="who">${who}</div><div class="text">${linkAccessions(text)}</div>${citationsHtml}`;
  }

  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function renderTyping() {
  const el = document.createElement('div');
  el.className = 'msg agent';
  el.id = 'typing';
  el.innerHTML = `<div class="who">WombDAO Agent</div><div class="typing"><span></span><span></span><span></span></div>`;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function updateSession() {
  sessionInfo.textContent = history.length ? `${history.length} message${history.length>1?'s':''} in session.` : 'No messages yet.';
}

async function send(message) {
  if (!message.trim()) return;
  history.push({ role: 'user', content: message });
  renderMessage('user', message);
  input.value = '';
  sendBtn.disabled = true;
  renderTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, agent_mode: agentMode })
    });
    const data = await res.json();
    document.getElementById('typing')?.remove();

    if (!data.success) {
      renderMessage('agent', `Error: ${data.error || 'unknown'}${data.details ? '\n\n' + data.details : ''}`);
      return;
    }
    history.push({ role: 'assistant', content: data.reply, citations: data.citations });
    renderMessage('agent', data.reply, data.citations, data);
    updateSession();
  } catch (err) {
    document.getElementById('typing')?.remove();
    renderMessage('agent', `Network error: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });

document.querySelectorAll('.suggestion').forEach(s => {
  s.addEventListener('click', () => send(s.dataset.q));
});

agentModeBtn.addEventListener('click', () => {
  agentMode = !agentMode;
  agentModeBtn.classList.toggle('on', agentMode);
  agentModeBtn.textContent = `Agent Mode: ${agentMode ? 'On' : 'Off'}`;
});

document.getElementById('clearBtn').addEventListener('click', () => {
  history.length = 0;
  log.innerHTML = `<div class="empty"><h3>Session cleared.</h3><p>Ask the archive anything.</p></div>`;
  updateSession();
});

document.getElementById('exportMd').addEventListener('click', () => {
  const md = history.map(m => {
    if (m.role === 'user') return `**You:** ${m.content}`;
    const cites = m.citations?.length ? `\n\n_Citations: ${m.citations.map(c => `[${c.id}](${c.url})`).join(', ')}_` : '';
    return `**Agent:** ${m.content}${cites}`;
  }).join('\n\n---\n\n');
  downloadFile('wombdao-session.md', md, 'text/markdown');
});

document.getElementById('exportJson').addEventListener('click', () => {
  downloadFile('wombdao-session.json', JSON.stringify(history, null, 2), 'application/json');
});

document.getElementById('proposeBtn').addEventListener('click', async () => {
  const title = prompt('Proposal title:');
  if (!title) return;
  const description = prompt('Description:');
  if (!description) return;
  const proposer = prompt('Your handle (optional):') || 'anonymous';
  try {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, proposer })
    });
    const data = await res.json();
    alert(data.success ? `Submitted as #${data.proposal.id}` : `Error: ${data.error}`);
  } catch (err) { alert('Submission failed: ' + err.message); }
});

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

input.focus();
