(() => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const langToggle = document.getElementById('lang-toggle');

  function normalizeTheme(value) {
    if (value === 'dark' || value === 'night') return 'dark';
    return 'light';
  }

  function currentTheme() {
    return normalizeTheme(localStorage.getItem('theme') || root.getAttribute('data-theme'));
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggle?.setAttribute('aria-label', theme === 'dark' ? '切换到浅色' : '切换到暗色');
  }

  setTheme(currentTheme());

  themeToggle?.addEventListener('click', () => {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  langToggle?.addEventListener('click', () => {
    const next = root.getAttribute('lang') === 'en' ? 'zh' : 'en';
    root.setAttribute('lang', next);
    langToggle.textContent = next === 'en' ? '中文' : 'English';
  });
})();
