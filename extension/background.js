// WombDAO Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('WombDAO Research Assistant installed');
});

// Handle sidebar opening from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_SIDEBAR') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
        sendResponse({ success: true });
      }
    });
    return true;
  }
  if (msg.type === 'GET_BADGE') {
    chrome.storage.local.get('chatHistory', (data) => {
      sendResponse({ count: data.chatHistory?.length || 0 });
    });
    return true;
  }
});

// Update badge with unread count (optional)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.chatHistory) {
    const count = changes.chatHistory.newValue?.length || 0;
    if (count > 0) {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});
