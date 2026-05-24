(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('toggle');
  const langToggle = document.getElementById('lang-toggle');
  const knobIc = document.getElementById('knob-ic');
  const fontButtons = document.querySelectorAll('[data-font-choice]');
  const translations = window.SITE_I18N || {};
  const sunPath = '<circle cx="12" cy="12" r="5" fill="#4a3f2f"/><g stroke="#4a3f2f" stroke-width="2" stroke-linecap="round"><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></g>';
  const moonPath = '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" fill="#3a3a2a"/>';

  function currentTheme() {
    const theme = localStorage.getItem('theme');
    return theme === 'day' || theme === 'night' ? theme : 'day';
  }

  function currentLang() {
    const lang = localStorage.getItem('lang');
    return lang === 'en' ? 'en' : 'zh';
  }

  function currentFontPreset() {
    const preset = localStorage.getItem('fontPreset');
    return preset === 'maple' || preset === 'sarasa' || preset === 'wenkai' ? preset : 'default';
  }

  function setFontPreset(preset) {
    if (preset === 'default') root.removeAttribute('data-font');
    else root.setAttribute('data-font', preset);
    fontButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.fontChoice === preset));
    });
    localStorage.setItem('fontPreset', preset);
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
      localStorage.setItem('lang', lang);
    }
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(theme === 'night'));
      toggle.setAttribute('aria-label', theme === 'night' ? '切换到白昼' : '切换到夜晚');
    }
    if (knobIc) knobIc.innerHTML = theme === 'day' ? sunPath : moonPath;
  }

  setLanguage(currentLang());
  setTheme(currentTheme());
  setFontPreset(currentFontPreset());

  fontButtons.forEach(button => {
    button.addEventListener('click', () => setFontPreset(button.dataset.fontChoice));
  });

  langToggle?.addEventListener('click', () => {
    setLanguage(currentLang() === 'en' ? 'zh' : 'en');
  });

  toggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'day' ? 'night' : 'day';
    setTheme(next);
    localStorage.setItem('theme', next);
  });

  const ffBox = document.getElementById('fireflies');
  if (ffBox) {
    const count = Number(ffBox.dataset.count || 22);
    for (let i = 0; i < count; i++) {
      const f = document.createElement('div');
      f.className = 'ff';
      f.style.left = `${Math.random() * 100}vw`;
      f.style.top = `${Math.random() * 100}vh`;
      f.style.setProperty('--dx', `${Math.random() * 200 - 100}px`);
      f.style.setProperty('--dy', `${Math.random() * -180 - 40}px`);
      f.style.animationDuration = `${8 + Math.random() * 10}s`;
      f.style.animationDelay = `${Math.random() * 8}s`;
      f.style.width = f.style.height = `${3 + Math.random() * 4}px`;
      ffBox.appendChild(f);
    }
  }

  document.querySelectorAll('.proj-head').forEach(h => {
    h.addEventListener('click', () => {
      const p = h.parentElement;
      const body = p.querySelector('.proj-body');
      const open = p.classList.contains('open');
      document.querySelectorAll('.proj.open').forEach(o => {
        if (o !== p) {
          o.classList.remove('open');
          o.querySelector('.proj-head').setAttribute('aria-expanded', 'false');
          o.querySelector('.proj-body').style.maxHeight = '0';
        }
      });
      if (open) {
        p.classList.remove('open');
        h.setAttribute('aria-expanded', 'false');
        body.style.maxHeight = '0';
      } else {
        p.classList.add('open');
        h.setAttribute('aria-expanded', 'true');
        body.style.maxHeight = `${body.scrollHeight}px`;
      }
    });
  });

  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.transition = 'opacity 1s cubic-bezier(.4,0,.2,1), transform 1s cubic-bezier(.4,0,.2,1)';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: .12 }) : null;

  document.querySelectorAll('.post,.proj').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transitionDelay = `${i * 0.06}s`;
    if (io) io.observe(el);
    else {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }
  });
})();
