// WombDAO Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize tabs
  initTabs();
  
  // Load wallet state
  await loadWalletState();
  
  // Load activity feed
  await loadActivityFeed();
  
  // Load treasury (mock)
  loadTreasury();
  
  // Event listeners
  document.getElementById('openSidebarBtn').addEventListener('click', openSidebar);
  document.getElementById('connectBtn').addEventListener('click', connectWallet);
  document.getElementById('openSettingsPage').addEventListener('click', openSettings);
  document.getElementById('ncbiLink').addEventListener('click', openNCBI);
  document.getElementById('pubmedLink').addEventListener('click', openPubMed);
});

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pane = document.getElementById(`tab-${targetTab}`);
      if (pane) pane.classList.add('active');
    });
  });
}

async function loadWalletState() {
  const data = await chrome.storage.local.get(['walletAddress', 'wombBalance']);
  const walletInfo = document.getElementById('walletInfo');
  const connectBtn = document.getElementById('connectBtn');
  
  if (data.walletAddress) {
    walletInfo.style.display = 'flex';
    connectBtn.style.display = 'none';
    const addr = data.walletAddress;
    document.getElementById('walletAddress').textContent = 
      addr.slice(0, 6) + '...' + addr.slice(-4);
    document.getElementById('wombBalance').textContent = data.wombBalance || '0';
  } else {
    walletInfo.style.display = 'none';
    connectBtn.style.display = 'flex';
  }
}

async function loadActivityFeed() {
  const data = await chrome.storage.local.get(['activityLog']);
  const feed = document.getElementById('activityFeed');
  
  const activities = data.activityLog || [];
  
  if (activities.length === 0) {
    feed.innerHTML = `
      <div class="activity-item">
        <span class="activity-icon">🧬</span>
        <span class="activity-text">No recent activity</span>
        <span class="activity-time">--</span>
      </div>`;
    return;
  }
  
  const recent = activities.slice(-3).reverse();
  feed.innerHTML = recent.map(item => `
    <div class="activity-item">
      <span class="activity-icon">${item.icon || '📊'}</span>
      <span class="activity-text">${escapeHtml(item.text)}</span>
      <span class="activity-time">${formatTime(item.timestamp)}</span>
    </div>`).join('');
}

function loadTreasury() {
  const treasuryEl = document.getElementById('treasuryMini');
  if (!treasuryEl) return;
  
  // Mock treasury - would call Base RPC in production
  setTimeout(() => {
    treasuryEl.textContent = '1,250,000';
  }, 800);
}

async function openSidebar() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.sidePanel.open({ windowId: tab.windowId });
  window.close();
}

async function connectWallet() {
  // Signal to content script to request wallet connection
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'connectWallet' });
    
    // Listen for response
    chrome.runtime.onMessage.addListener(function listener(msg) {
      if (msg.action === 'walletConnected') {
        chrome.storage.local.set({
          walletAddress: msg.address,
          wombBalance: msg.balance || '0'
        });
        loadWalletState();
        chrome.runtime.onMessage.removeListener(listener);
      }
    });
  } catch (e) {
    // Content script may not be injected on this page
    showToast('Please navigate to a web page to connect wallet');
  }
}

function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/settings.html') });
  window.close();
}

function openNCBI() {
  chrome.tabs.create({ url: 'https://www.ncbi.nlm.nih.gov/geo/browse/?view=series&search=ectogenesis+embryo' });
  window.close();
}

function openPubMed() {
  chrome.tabs.create({ url: 'https://pubmed.ncbi.nlm.nih.gov/?term=ectogenesis+artificial+womb' });
  window.close();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '--';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%);
    background: #0d1f0d; border: 1px solid #00ff88; color: #00ff88;
    padding: 8px 16px; border-radius: 6px; font-size: 11px; z-index: 9999;
    white-space: nowrap;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
