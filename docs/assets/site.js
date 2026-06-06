(() => {
  const root = document.documentElement;
  const app = document.getElementById('app');
  const langToggle = document.getElementById('lang-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  const panel = document.getElementById('panel');
  const panelClose = document.getElementById('panel-close');
  const panelBack = document.getElementById('panel-back');
  const panelTitle = document.getElementById('panel-title');
  const panelSub = document.getElementById('panel-sub');
  const panelScroll = document.getElementById('panel-scroll');
  const scrim = document.getElementById('scrim');
  const textarea = document.getElementById('textarea');
  const sendBtn = document.getElementById('send-btn');
  const resetBtn = document.getElementById('reset-btn');
  const chatInner = document.getElementById('chat-inner');
  const translations = window.SITE_I18N || {};

  const sproutSvg = `<svg viewBox="0 0 32 32" aria-hidden="true">
    <g class="breathe">
      <path class="leaf" d="M16 13C9 12 5 7 5 4c7 0 11 4 11 9Z"/>
      <path class="leaf" d="M16 14c7-1 11-5 11-8-7 0-11 4-11 8Z"/>
    </g>
    <path class="stem" d="M16 29V13"/>
  </svg>`;
  document.querySelectorAll('[data-sprout]').forEach(el => { el.innerHTML = sproutSvg; });

  function currentTheme() {
    const theme = localStorage.getItem('theme');
    return theme === 'day' || theme === 'night' ? theme : 'night';
  }

  function currentLang() {
    return localStorage.getItem('lang') === 'en' ? 'en' : 'zh';
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggle?.setAttribute('aria-pressed', String(theme === 'day'));
    themeToggle?.setAttribute('aria-label', theme === 'day' ? '切换到夜晚' : '切换到白昼');
  }

  function setLanguage(lang) {
    const dict = translations[lang] || translations.zh || {};
    root.setAttribute('lang', lang === 'en' ? 'en' : 'zh');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = dict[el.dataset.i18n];
      if (value) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const value = dict[el.dataset.i18nHtml];
      if (value) el.innerHTML = value;
    });
    if (langToggle) {
      langToggle.textContent = lang === 'en' ? '中' : 'EN';
      langToggle.setAttribute('aria-label', lang === 'en' ? '切换到中文' : 'Switch to English');
    }
    localStorage.setItem('lang', lang);
  }

  setTheme(currentTheme());
  setLanguage(currentLang());

  langToggle?.addEventListener('click', () => setLanguage(currentLang() === 'en' ? 'zh' : 'en'));
  themeToggle?.addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'night' ? 'day' : 'night'));

  const panelCopy = {
    writing: ['最近写下的', 'Writing'],
    projects: ['动手造的', 'Making'],
    about: ['关于随想', 'About']
  };

  function templateHtml(id) {
    return document.getElementById(`${id}-template`)?.innerHTML.trim() || '';
  }

  function openPanel(kind) {
    if (!panel || !panelScroll) return;
    const copy = panelCopy[kind] || panelCopy.about;
    panelTitle.textContent = copy[0];
    panelSub.textContent = copy[1];
    panelScroll.innerHTML = templateHtml(kind);
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    scrim?.classList.add('open');
    app?.setAttribute('data-mode', 'chat');
    panelClose?.focus({ preventScroll: true });
  }

  function closePanel() {
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
    scrim?.classList.remove('open');
  }

  function pushChat(text) {
    if (!chatInner || !app) return;
    app.setAttribute('data-mode', 'chat');
    chatInner.innerHTML = `<div class="chat-bubble">${text}</div>`;
  }

  function routeQuery(value) {
    const text = value.trim();
    if (!text) return;
    const normalized = text.toLowerCase();
    textarea.value = '';
    textarea.style.height = '';
    sendBtn.disabled = true;

    if (/文章|写|writing|post|blog/.test(normalized)) {
      pushChat('我把最近的文章放在右侧了。它们不是归档列表，更像几条可以继续展开的想法。');
      openPanel('writing');
    } else if (/项目|造|做|making|project|tool/.test(normalized)) {
      pushChat('这些是正在长出来的东西：站点、笔记、工具和一些还不急着公开的实验。');
      openPanel('projects');
    } else {
      pushChat('这里不是一个严肃的搜索框，更像入口。你可以问“最近写了什么”“最近在做什么”，也可以直接从右侧面板读。');
      openPanel('about');
    }
  }

  document.querySelectorAll('[data-panel]').forEach(button => {
    button.addEventListener('click', () => {
      const kind = button.dataset.panel;
      if (kind === 'writing') pushChat('最近写下的东西在右侧。点击标题可以进入完整文章页。');
      if (kind === 'projects') pushChat('最近在做的东西也放在右侧。这里保留状态、说明和技术栈。');
      if (kind === 'about') pushChat('随想是一个对话式的数字花园：先把问题种下来，再慢慢修剪。');
      openPanel(kind);
    });
  });

  document.querySelectorAll('[data-query]').forEach(button => {
    button.addEventListener('click', () => routeQuery(button.dataset.query || button.textContent || ''));
  });

  textarea?.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    sendBtn.disabled = !textarea.value.trim();
  });
  textarea?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      routeQuery(textarea.value);
    }
  });
  sendBtn?.addEventListener('click', () => routeQuery(textarea?.value || ''));
  resetBtn?.addEventListener('click', () => {
    closePanel();
    app?.setAttribute('data-mode', 'idle');
    if (chatInner) chatInner.innerHTML = '';
  });
  panelClose?.addEventListener('click', closePanel);
  panelBack?.addEventListener('click', closePanel);
  scrim?.addEventListener('click', closePanel);

  const ffBox = document.getElementById('fireflies');
  if (ffBox && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const count = Number(ffBox.dataset.count || 14);
    for (let i = 0; i < count; i++) {
      const f = document.createElement('span');
      f.className = 'ff';
      f.style.left = `${Math.random() * 100}vw`;
      f.style.top = `${Math.random() * 100}vh`;
      f.style.setProperty('--dx', `${Math.random() * 180 - 90}px`);
      f.style.setProperty('--dy', `${Math.random() * -160 - 40}px`);
      f.style.animationDuration = `${9 + Math.random() * 12}s`;
      f.style.animationDelay = `${Math.random() * 8}s`;
      ffBox.appendChild(f);
    }
  }
})();
