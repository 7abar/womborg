// Shared footer — loads config from /api/config and updates footer links
(function() {
  fetch('/api/config').then(r => r.json()).then(cfg => {
    if (!cfg.footer) return;
    const map = {
      'API Docs': null, // internal link, keep as-is
      'X / Twitter': cfg.footer.x,
      'GitHub': cfg.footer.github,
      'Bankr.bot': cfg.footer.bankr,
      'Dexscreener': cfg.footer.dexscreener
    };
    document.querySelectorAll('.footer-icons a[title]').forEach(a => {
      const url = map[a.getAttribute('title')];
      if (url) a.href = url;
    });
  }).catch(() => {});
})();
