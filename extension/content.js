// WombDAO Content Script
// Detect biotech/scientific pages and inject helper

const BIOTECH_DOMAINS = ['ncbi.nlm.nih.gov', 'pubmed.ncbi', 'biorxiv.org', 'nature.com', 'science.org', 'cell.com', 'gse', 'geo.ncbi'];

function isBiotechPage() {
  return BIOTECH_DOMAINS.some(d => window.location.href.includes(d));
}

// Inject floating button on biotech pages
function injectFloatingBtn() {
  if (document.getElementById('womborg-float')) return;
  const btn = document.createElement('div');
  btn.id = 'womborg-float';
  btn.innerHTML = `
    <div style="
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 48px;
      height: 48px;
      background: #0d1f0d;
      border: 2px solid #00ff88;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 0 12px rgba(0,255,136,0.4);
      font-size: 20px;
      transition: all 0.2s;
    " title="Open WombDAO Research Assistant">
      🧬
    </div>
  `;
  btn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
  });
  btn.addEventListener('mouseover', () => {
    btn.firstElementChild.style.transform = 'scale(1.1)';
    btn.firstElementChild.style.boxShadow = '0 0 20px rgba(0,255,136,0.7)';
  });
  btn.addEventListener('mouseout', () => {
    btn.firstElementChild.style.transform = 'scale(1)';
    btn.firstElementChild.style.boxShadow = '0 0 12px rgba(0,255,136,0.4)';
  });
  document.body.appendChild(btn);
}

// Message listener for wallet operations
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_WALLET') {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        sendResponse({ address: accounts[0] || null });
      }).catch(() => sendResponse({ address: null }));
    } else {
      sendResponse({ address: null });
    }
    return true;
  }

  if (msg.type === 'CONNECT_WALLET') {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_requestAccounts' }).then(accounts => {
        sendResponse({ address: accounts[0] || null });
      }).catch(() => sendResponse({ address: null }));
    } else {
      sendResponse({ address: null });
    }
    return true;
  }
});

// Inject on biotech pages
if (isBiotechPage()) {
  injectFloatingBtn();
}
