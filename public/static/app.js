// ========================================
// PORTAL — Frontend Interactions + SPA Router
// Smooth sliding page transitions
// ========================================

(() => {
  'use strict';

  // === SPA Route definitions ===
  const SPA_ROUTES = ['/', '/projects', '/github', '/downloads', '/trending'];
  const ROUTE_ORDER = { '/': 0, '/projects': 1, '/github': 2, '/downloads': 3, '/trending': 4 };

  // === State ===
  let lang = document.body.getAttribute('data-lang') || 'zh';
  let isTransitioning = false;
  let clockInterval = null;
  let prefetchCache = {};

  // ==============================================
  //  THEME
  // ==============================================
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function getTheme() {
    return localStorage.getItem('portal-theme') || (prefersDark.matches ? 'dark' : 'light');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal-theme', theme);
    document.querySelectorAll('.theme-toggle i').forEach(icon => {
      icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    });
  }

  applyTheme(getTheme());

  // ==============================================
  //  HEADER SCROLL
  // ==============================================
  function initHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ==============================================
  //  MOBILE MENU
  // ==============================================
  function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('headerNav');
    if (!btn || !nav) return;

    btn.onclick = () => {
      btn.classList.toggle('open');
      nav.classList.toggle('mobile-open');
    };

    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        btn.classList.remove('open');
        nav.classList.remove('mobile-open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !btn.contains(e.target)) {
        btn.classList.remove('open');
        nav.classList.remove('mobile-open');
      }
    });
  }

  // ==============================================
  //  NAV INDICATOR
  // ==============================================
  function moveIndicator(el) {
    const ind = document.getElementById('navIndicator');
    if (!ind || !el) return;
    const nav = el.parentElement;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    ind.style.width = elRect.width + 'px';
    ind.style.left = (elRect.left - navRect.left) + 'px';
    ind.classList.add('visible');
  }

  function clearIndicator() {
    const ind = document.getElementById('navIndicator');
    if (!ind) return;
    const active = document.querySelector('.nav-link.active');
    if (active) moveIndicator(active);
    else ind.classList.remove('visible');
  }

  function initNavIndicator() {
    document.querySelectorAll('.header-nav .nav-link').forEach(link => {
      link.addEventListener('mouseenter', () => moveIndicator(link));
    });
    const navContainer = document.querySelector('.header-nav');
    if (navContainer) navContainer.addEventListener('mouseleave', clearIndicator);

    const active = document.querySelector('.nav-link.active');
    if (active) requestAnimationFrame(() => moveIndicator(active));
  }

  function updateNavActive(path) {
    document.querySelectorAll('.header-nav .nav-link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === path);
    });
    requestAnimationFrame(() => {
      const active = document.querySelector('.nav-link.active');
      if (active) moveIndicator(active);
    });
  }

  // ==============================================
  //  LIVE CLOCK
  // ==============================================
  function initClock() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }

    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const hourEl = document.querySelector('.time-hour');
      const minEl = document.querySelector('.time-min');
      const dateEl = document.getElementById('dateDisplay');
      if (hourEl) hourEl.textContent = h;
      if (minEl) minEl.textContent = m;
      if (dateEl) {
        if (lang === 'zh') {
          const wd = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
          dateEl.textContent = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${wd[now.getDay()]}`;
        } else {
          dateEl.textContent = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
        }
      }
    }

    if (document.querySelector('.time-hour')) {
      tick();
      clockInterval = setInterval(tick, 1000);
    }
  }

  // ==============================================
  //  CARD EFFECTS
  // ==============================================
  function initCardEffects() {
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2, cy = rect.height / 2;
        const rx = ((y - cy) / cy) * -2;
        const ry = ((x - cx) / cx) * 2;
        card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  // ==============================================
  //  STAT COUNT UP
  // ==============================================
  function initStatCountUp() {
    const statsCard = document.querySelector('.card-stats');
    if (!statsCard) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.stat-num').forEach(n => {
            const target = parseInt(n.textContent, 10);
            if (!isNaN(target) && !n.dataset.animated) {
              n.dataset.animated = 'true';
              let cur = 0;
              const step = Math.max(1, Math.ceil(target / 40));
              const iv = setInterval(() => {
                cur += step;
                if (cur >= target) { cur = target; clearInterval(iv); }
                n.textContent = cur;
              }, 30);
            }
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(statsCard);
  }

  // ==============================================
  //  DOWNLOAD BUTTON FEEDBACK
  // ==============================================
  function initDownloadButtons() {
    const prepTxt = lang === 'zh' ? '准备中...' : 'Preparing...';
    const readyTxt = lang === 'zh' ? '完成!' : 'Ready!';

    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const icon = btn.querySelector('i');
        const text = btn.querySelector('span');
        if (icon && text) {
          const oi = icon.className, ot = text.textContent;
          icon.className = 'fa-solid fa-spinner fa-spin';
          text.textContent = prepTxt;
          setTimeout(() => {
            icon.className = 'fa-solid fa-check';
            text.textContent = readyTxt;
            setTimeout(() => { icon.className = oi; text.textContent = ot; }, 1500);
          }, 1000);
        }
      });
    });
  }

  // ==============================================
  //  CARD ENTRANCE ANIMATION
  // ==============================================
  function initAOS() {
    const cards = document.querySelectorAll('[data-aos]');
    if (!cards.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
    cards.forEach(c => obs.observe(c));
  }

  // ==============================================
  //  RE-INIT ALL PAGE-SPECIFIC BEHAVIORS
  // ==============================================
  function initPageBehaviors() {
    initClock();
    initCardEffects();
    initStatCountUp();
    initDownloadButtons();
    initAOS();
  }

  // ==============================================
  //  SPA ROUTER — Sliding Page Transitions
  // ==============================================

  function isSPARoute(href) {
    if (!href) return false;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return false;
      return SPA_ROUTES.includes(url.pathname);
    } catch { return false; }
  }

  function getDirection(fromPath, toPath) {
    const from = ROUTE_ORDER[fromPath] ?? -1;
    const to = ROUTE_ORDER[toPath] ?? -1;
    return to > from ? 'left' : 'right'; // 'left' = slide out left, new comes from right
  }

  // Prefetch on hover for instant transitions
  function prefetchPage(href) {
    if (prefetchCache[href]) return;
    prefetchCache[href] = fetch(href, { credentials: 'same-origin' })
      .then(r => r.ok ? r.text() : null)
      .catch(() => null);
  }

  async function navigateTo(href, pushState = true) {
    if (isTransitioning) return;

    const url = new URL(href, window.location.origin);
    const toPath = url.pathname;
    const fromPath = window.location.pathname;

    if (toPath === fromPath && !url.search) return;

    isTransitioning = true;

    const container = document.getElementById('pageContent');
    if (!container) {
      // Fallback to full page nav
      window.location.href = href;
      return;
    }

    // Determine slide direction
    const dir = getDirection(fromPath, toPath);

    // Fetch new page (use prefetch cache if available)
    let html;
    try {
      if (prefetchCache[href]) {
        html = await prefetchCache[href];
        delete prefetchCache[href];
      } else {
        const resp = await fetch(href, { credentials: 'same-origin' });
        if (!resp.ok) { window.location.href = href; return; }
        html = await resp.text();
      }
    } catch {
      window.location.href = href;
      return;
    }

    if (!html) { window.location.href = href; return; }

    // Parse new page HTML to extract #pageContent innerHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newContent = doc.getElementById('pageContent');

    if (!newContent) {
      window.location.href = href;
      return;
    }

    // Update page title
    const newTitle = doc.querySelector('title');
    if (newTitle) document.title = newTitle.textContent;

    // === ANIMATE OUT ===
    container.classList.add('slide-out-' + dir);

    await new Promise(r => {
      container.addEventListener('animationend', r, { once: true });
      // Safety timeout
      setTimeout(r, 400);
    });

    // === SWAP CONTENT ===
    container.innerHTML = newContent.innerHTML;
    container.setAttribute('data-page', newContent.getAttribute('data-page') || '');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Remove out class, add in class
    container.classList.remove('slide-out-' + dir);
    container.classList.add('slide-in-' + dir);

    await new Promise(r => {
      container.addEventListener('animationend', r, { once: true });
      setTimeout(r, 400);
    });

    container.classList.remove('slide-in-' + dir);

    // === POST-TRANSITION UPDATES ===
    if (pushState) {
      history.pushState({ path: href }, '', href);
    }

    updateNavActive(toPath);
    initPageBehaviors();
    attachSPALinks();

    isTransitioning = false;
  }

  // Attach SPA click handlers to all qualifying links
  function attachSPALinks() {
    document.querySelectorAll('a[href]').forEach(link => {
      if (link.dataset.spaAttached) return;
      const href = link.getAttribute('href');

      // Skip external links, admin, api, download links
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
      if (link.getAttribute('target') === '_blank') return;
      if (href.startsWith('/admin') || href.startsWith('/api/')) return;

      // Check if this is a SPA route
      let fullHref;
      try {
        fullHref = new URL(href, window.location.origin).pathname;
      } catch { return; }

      // Match exact SPA routes (also /trending?tab=... etc.)
      const pathOnly = fullHref.split('?')[0];
      if (!SPA_ROUTES.includes(pathOnly)) return;

      link.dataset.spaAttached = 'true';

      // Prefetch on hover
      link.addEventListener('mouseenter', () => {
        prefetchPage(href);
      }, { passive: true });

      link.addEventListener('click', (e) => {
        // Let modifier keys work normally (open in new tab etc)
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigateTo(href);
      });
    });
  }

  // Handle browser back/forward
  window.addEventListener('popstate', (e) => {
    const path = window.location.pathname + window.location.search;
    if (isSPARoute(path)) {
      navigateTo(path, false);
    }
  });

  // ==============================================
  //  GLOBAL EVENT DELEGATION (survives DOM swaps)
  // ==============================================
  document.addEventListener('click', (e) => {
    // Theme toggle (delegated)
    const themeBtn = e.target.closest('.theme-toggle');
    if (themeBtn) {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(cur === 'dark' ? 'light' : 'dark');
      return;
    }

    // Language toggle (delegated)
    const langBtn = e.target.closest('.lang-toggle');
    if (langBtn) {
      e.preventDefault();
      const newLang = lang === 'zh' ? 'en' : 'zh';
      document.cookie = `portal_lang=${newLang}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`;
      window.location.reload();
      return;
    }
  });

  // ==============================================
  //  INIT ON LOAD
  // ==============================================
  initHeaderScroll();
  initMobileMenu();
  initNavIndicator();
  initPageBehaviors();
  attachSPALinks();

  // Store initial history state
  history.replaceState({ path: window.location.pathname + window.location.search }, '');

})();
