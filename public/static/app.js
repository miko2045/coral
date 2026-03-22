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
  let allPagesCache = {}; // Persistent cache for all SPA pages

  // === Top progress bar for navigation feedback ===
  const progressBar = (() => {
    const bar = document.createElement('div');
    bar.id = 'spaProgressBar';
    Object.assign(bar.style, {
      position: 'fixed', top: '0', left: '0', height: '2.5px',
      background: 'var(--accent)', zIndex: '99999',
      width: '0%', opacity: '0',
      transition: 'none', pointerEvents: 'none',
      borderRadius: '0 2px 2px 0',
      boxShadow: '0 0 8px var(--accent)'
    });
    document.body.appendChild(bar);

    let raf = null;
    let progress = 0;

    return {
      start() {
        progress = 0;
        bar.style.transition = 'none';
        bar.style.width = '0%';
        bar.style.opacity = '1';
        // Quickly jump to 30% then crawl
        requestAnimationFrame(() => {
          bar.style.transition = 'width 0.15s ease-out';
          bar.style.width = '30%';
          progress = 30;
          // Then slowly crawl to 80% over time
          const crawl = () => {
            if (progress < 80) {
              progress += (80 - progress) * 0.03;
              bar.style.width = progress + '%';
              raf = requestAnimationFrame(crawl);
            }
          };
          raf = requestAnimationFrame(crawl);
        });
      },
      finish(instant) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        if (instant) {
          bar.style.transition = 'none';
          bar.style.width = '0%';
          bar.style.opacity = '0';
          return;
        }
        bar.style.transition = 'width 0.12s ease-out';
        bar.style.width = '100%';
        setTimeout(() => {
          bar.style.transition = 'opacity 0.2s ease';
          bar.style.opacity = '0';
          setTimeout(() => { bar.style.width = '0%'; }, 200);
        }, 80);
      },
      cancel() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        bar.style.transition = 'none';
        bar.style.width = '0%';
        bar.style.opacity = '0';
      }
    };
  })();

  // ==============================================
  //  THEME
  // ==============================================
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function getTheme() {
    const stored = localStorage.getItem('portal-theme');
    if (stored === 'auto' || !stored) return prefersDark.matches ? 'dark' : 'light';
    return stored;
  }

  function getThemeMode() {
    return localStorage.getItem('portal-theme') || 'auto';
  }

  let themeAnimating = false;

  function applyTheme(mode, clickEvent) {
    localStorage.setItem('portal-theme', mode);
    const actual = mode === 'auto' ? (prefersDark.matches ? 'dark' : 'light') : mode;
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const iconClass = mode === 'auto' ? 'fa-solid fa-circle-half-stroke' : actual === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';

    // No visual change — just update icon
    if (actual === currentTheme) {
      document.querySelectorAll('.theme-toggle i').forEach(i => i.className = iconClass);
      return;
    }

    // No animation on initial load (clickEvent === null)
    if (!clickEvent) {
      document.documentElement.setAttribute('data-theme', actual);
      document.documentElement.style.colorScheme = actual === 'dark' ? 'dark only' : 'light only';
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', actual === 'dark' ? 'dark only' : 'light only');
      document.querySelectorAll('.theme-toggle i').forEach(i => i.className = iconClass);
      return;
    }

    if (themeAnimating) return;
    themeAnimating = true;

    // Spin icon
    document.querySelectorAll('.theme-toggle i').forEach(i => {
      i.className = iconClass + ' theme-icon-spin';
    });

    // Lightweight fade overlay — single element, GPU opacity only
    const overlay = document.createElement('div');
    overlay.className = 'theme-fade-overlay';
    overlay.style.background = actual === 'dark' ? '#0F0F0F' : '#FBF8F3';
    document.body.appendChild(overlay);

    // Phase 1: fade in overlay (280ms)
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // Phase 2: switch theme while overlay covers screen
    setTimeout(() => {
      document.documentElement.setAttribute('data-theme', actual);
      document.documentElement.style.colorScheme = actual === 'dark' ? 'dark only' : 'light only';
      document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', actual === 'dark' ? 'dark only' : 'light only');
    }, 200);

    // Phase 3: fade out overlay
    setTimeout(() => {
      overlay.classList.remove('active');
    }, 320);

    // Cleanup
    setTimeout(() => {
      overlay.remove();
      themeAnimating = false;
      document.querySelectorAll('.theme-toggle i').forEach(i => {
        i.classList.remove('theme-icon-spin');
      });
    }, 600);
  }

  // Listen for system theme changes (for auto mode)
  prefersDark.addEventListener('change', () => {
    if (getThemeMode() === 'auto') applyTheme('auto', null);
  });

  applyTheme(getThemeMode(), null);

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
  //  MOBILE MENU — instant touch response
  // ==============================================
  function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const nav = document.getElementById('headerNav');
    if (!btn || !nav) return;

    function closeMenu() {
      btn.classList.remove('open');
      nav.classList.remove('mobile-open');
    }

    // Use both touchstart (instant on mobile) and click (fallback for desktop)
    let touchHandled = false;
    const toggleMenu = (e) => {
      if (e.type === 'touchstart') {
        touchHandled = true;
        e.preventDefault();
      } else if (touchHandled) {
        touchHandled = false;
        return; // Skip click if touch already handled
      }
      e.stopPropagation();
      btn.classList.toggle('open');
      nav.classList.toggle('mobile-open');
    };
    btn.addEventListener('touchstart', toggleMenu, { passive: false });
    btn.addEventListener('click', toggleMenu);

    // Nav links: close menu instantly on touchstart for zero delay
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('touchstart', () => {
        closeMenu();
      }, { passive: true });
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !btn.contains(e.target)) {
        closeMenu();
      }
    });

    // Close menu on touchstart outside (instant on mobile)
    document.addEventListener('touchstart', (e) => {
      if (nav.classList.contains('mobile-open') && !nav.contains(e.target) && !btn.contains(e.target)) {
        closeMenu();
      }
    }, { passive: true });
  }

  // ==============================================
  //  NAV INDICATOR
  // ==============================================
  let indicatorTimer = null;
  let indicatorLocked = false; // true after click-nav, keeps indicator on active

  function moveIndicator(el) {
    const ind = document.getElementById('navIndicator');
    if (!ind || !el) return;
    if (indicatorTimer) { clearTimeout(indicatorTimer); indicatorTimer = null; }
    const nav = el.parentElement;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    ind.style.width = elRect.width + 'px';
    ind.style.left = (elRect.left - navRect.left) + 'px';
    ind.classList.add('visible');
  }

  function clearIndicator() {
    // Just stay where we are — no snap-back at all.
    // The indicator will move naturally when the user hovers another link
    // or when the page changes (updateNavActive).
  }

  function initNavIndicator() {
    document.querySelectorAll('.header-nav .nav-link').forEach(link => {
      link.addEventListener('mouseenter', () => {
        indicatorLocked = false;
        moveIndicator(link);
      });
    });
    const navContainer = document.querySelector('.header-nav');
    if (navContainer) navContainer.addEventListener('mouseleave', () => {
      // Smoothly return to active after mouse leaves nav area
      indicatorTimer = setTimeout(() => {
        indicatorTimer = null;
        const active = document.querySelector('.nav-link.active');
        if (active) moveIndicator(active);
        indicatorLocked = true;
      }, 300);
    });

    const active = document.querySelector('.nav-link.active');
    if (active) requestAnimationFrame(() => { moveIndicator(active); indicatorLocked = true; });
  }

  function updateNavActive(path) {
    document.querySelectorAll('.header-nav .nav-link').forEach(link => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === path);
    });
    requestAnimationFrame(() => {
      const active = document.querySelector('.nav-link.active');
      if (active) moveIndicator(active);
      indicatorLocked = true;
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

      // New hero compact clock
      const hh = document.querySelector('.hero-time-h');
      const mm = document.querySelector('.hero-time-m');
      const dd = document.getElementById('heroDate');
      if (hh) hh.textContent = h;
      if (mm) mm.textContent = m;
      if (dd) {
        if (lang === 'zh') {
          const wd = ['日','一','二','三','四','五','六'];
          dd.textContent = `${now.getMonth()+1}/${now.getDate()} 周${wd[now.getDay()]}`;
        } else {
          dd.textContent = now.toLocaleDateString('en-US', { month:'short', day:'numeric', weekday:'short' });
        }
      }

      // Legacy support (old time-hour/time-min)
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

    if (document.querySelector('.hero-time-h') || document.querySelector('.time-hour')) {
      tick();
      clockInterval = setInterval(tick, 1000);
    }
  }

  // ==============================================
  //  CARD EFFECTS
  // ==============================================
  function initCardEffects() {
    document.querySelectorAll('.card, .nav-card').forEach(card => {
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
    const statsRow = document.querySelector('.stats-row') || document.querySelector('.card-stats');
    if (!statsRow) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.stat-pill-num, .stat-num').forEach(n => {
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
    obs.observe(statsRow);
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
  //  DOWNLOAD SEARCH — Relevance-based fuzzy search
  // ==============================================
  function initDownloadSearch() {
    const input = document.getElementById('dlSearch');
    const clearBtn = document.getElementById('dlSearchClear');
    const list = document.getElementById('dlList');
    const hint = document.getElementById('dlSearchHint');
    const noResults = document.getElementById('dlNoResults');
    const countBadge = document.getElementById('dlCount');

    if (!input || !list) return;

    const cards = Array.from(list.querySelectorAll('.download-card'));
    const totalCount = cards.length;

    // Build search index
    const index = cards.map(card => {
      const raw = (card.getAttribute('data-search') || '').toLowerCase();
      const name = (card.querySelector('.download-name')?.textContent || '').toLowerCase();
      return { el: card, raw, name };
    });

    // Relevance scoring: higher = better match
    function score(entry, terms) {
      let s = 0;
      const { raw, name } = entry;
      for (const t of terms) {
        if (!t) continue;
        // Exact name match → highest
        if (name === t) { s += 100; continue; }
        // Name starts with term
        if (name.startsWith(t)) { s += 60; continue; }
        // Name contains term
        if (name.includes(t)) { s += 40; continue; }
        // Raw data (type/ext/tags) contains term
        if (raw.includes(t)) { s += 20; continue; }
        // Fuzzy: check if all chars of term appear in order
        let fi = 0;
        for (let ci = 0; ci < raw.length && fi < t.length; ci++) {
          if (raw[ci] === t[fi]) fi++;
        }
        if (fi === t.length) { s += 5; continue; }
        // No match at all for this term → penalize heavily
        s -= 50;
      }
      return s;
    }

    function doSearch() {
      const query = input.value.trim().toLowerCase();
      clearBtn.style.display = query ? 'flex' : 'none';

      if (!query) {
        // Show all
        cards.forEach(c => { c.style.display = ''; c.style.order = ''; });
        if (hint) hint.textContent = '';
        if (noResults) noResults.style.display = 'none';
        list.style.display = '';
        if (countBadge) countBadge.textContent = countBadge.getAttribute('data-original') || countBadge.textContent;
        return;
      }

      // Save original count text
      if (countBadge && !countBadge.getAttribute('data-original')) {
        countBadge.setAttribute('data-original', countBadge.textContent);
      }

      const terms = query.split(/\s+/).filter(Boolean);
      const scored = index.map((entry, i) => ({ i, s: score(entry, terms) }));
      scored.sort((a, b) => b.s - a.s);

      let visibleCount = 0;
      scored.forEach(({ i, s }, order) => {
        const card = cards[i];
        if (s > 0) {
          card.style.display = '';
          card.style.order = String(order);
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.style.order = '';
        }
      });

      if (noResults) noResults.style.display = visibleCount === 0 ? '' : 'none';
      list.style.display = visibleCount === 0 ? 'none' : '';

      if (hint) {
        hint.textContent = visibleCount > 0
          ? (lang === 'zh' ? `找到 ${visibleCount} 个匹配文件` : `${visibleCount} file${visibleCount !== 1 ? 's' : ''} found`)
          : '';
      }

      if (countBadge) {
        countBadge.textContent = lang === 'zh'
          ? `${visibleCount} / ${totalCount} 个文件`
          : `${visibleCount} / ${totalCount} files`;
      }
    }

    // Debounced input
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(doSearch, 150);
    });

    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        doSearch();
        input.focus();
      });
      clearBtn.style.display = 'none';
    }

    // Enter key → no form submit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; doSearch(); }
    });
  }

  // ==============================================
  //  TRENDING TABS — Local tab switching with animation
  // ==============================================
  function initTrendingTabs() {
    const tabsWrap = document.getElementById('trendingTabs');
    if (!tabsWrap) return;

    const buttons = tabsWrap.querySelectorAll('.trending-tab[data-tab]');
    const hotList = document.getElementById('trendingList-hot');
    const risingList = document.getElementById('trendingList-rising');
    if (!hotList || !risingList) return;

    const lists = { hot: hotList, rising: risingList };

    function animateListSwitch(curTab, toTab) {
      const dir = toTab === 'rising' ? 'left' : 'right';
      const hideList = lists[curTab];
      const showList = lists[toTab];

      hideList.classList.add('tab-fade-out-' + dir);
      const onOutDone = () => {
        hideList.classList.remove('tab-fade-out-' + dir);
        hideList.style.display = 'none';
        showList.style.display = '';
        showList.classList.add('tab-fade-in-' + dir);
        const onInDone = () => { showList.classList.remove('tab-fade-in-' + dir); };
        showList.addEventListener('animationend', onInDone, { once: true });
        setTimeout(onInDone, 240);
      };
      hideList.addEventListener('animationend', onOutDone, { once: true });
      setTimeout(onOutDone, 240);
    }

    function updateURL() {
      const tab = tabsWrap.getAttribute('data-current-tab');
      const filtersWrap = document.getElementById('trendingFilters');
      const langVal = filtersWrap ? filtersWrap.getAttribute('data-current-lang') : '';
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      if (langVal) url.searchParams.set('lang_filter', langVal);
      else url.searchParams.delete('lang_filter');
      history.replaceState({ path: url.pathname + url.search }, '', url.toString());

      // Update refresh button href
      const refreshBtn = document.querySelector('.trending-refresh-btn');
      if (refreshBtn) {
        const u = new URL(url.toString());
        u.searchParams.set('refresh', '1');
        refreshBtn.setAttribute('href', u.pathname + u.search);
      }
    }

    buttons.forEach(btn => {
      if (btn.dataset.trendTabBound) return;
      btn.dataset.trendTabBound = 'true';

      btn.addEventListener('click', () => {
        const toTab = btn.getAttribute('data-tab');
        const curTab = tabsWrap.getAttribute('data-current-tab');
        if (toTab === curTab) return;

        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabsWrap.setAttribute('data-current-tab', toTab);

        animateListSwitch(curTab, toTab);
        updateURL();
      });
    });
  }

  // ==============================================
  //  TRENDING LANGUAGE FILTER — Direct navigation
  // ==============================================
  function initTrendingLangFilter() {
    const filtersWrap = document.getElementById('trendingFilters');
    if (!filtersWrap) return;

    const filterBtns = filtersWrap.querySelectorAll('.filter-tag[data-lang]');
    const tabsWrap = document.getElementById('trendingTabs');

    filterBtns.forEach(btn => {
      if (btn.dataset.langBound) return;
      btn.dataset.langBound = 'true';

      btn.addEventListener('click', () => {
        const newLang = btn.getAttribute('data-lang');
        const curLang = filtersWrap.getAttribute('data-current-lang');
        if (newLang === curLang) return;

        // Visual feedback
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Direct navigation — server renders correct filtered result
        const tab = tabsWrap ? tabsWrap.getAttribute('data-current-tab') || 'hot' : 'hot';
        let href = `/trending?tab=${tab}`;
        if (newLang) href += `&lang_filter=${encodeURIComponent(newLang)}`;
        window.location.href = href;
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
  //  FILE SHARING MODAL
  // ==============================================
  function initShareModal() {
    const modal = document.getElementById('shareModal');
    if (!modal) return;

    let currentFileKey = '';
    const closeModal = () => { modal.style.display = 'none'; };

    // Close button
    document.getElementById('shareModalClose')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Share buttons (delegated)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.share-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      currentFileKey = btn.getAttribute('data-filekey');
      const filename = btn.getAttribute('data-filename');
      document.getElementById('shareFileName').textContent = filename;
      document.getElementById('sharePassword').value = '';
      document.getElementById('shareExpires').value = '0';
      document.getElementById('shareMaxDownloads').value = '0';
      document.getElementById('shareResult').style.display = 'none';
      modal.style.display = 'flex';
    });

    // Create share link
    document.getElementById('shareCreateBtn')?.addEventListener('click', async () => {
      const password = document.getElementById('sharePassword').value.trim();
      const expiresIn = parseInt(document.getElementById('shareExpires').value) || 0;
      const maxDownloads = parseInt(document.getElementById('shareMaxDownloads').value) || 0;

      const btn = document.getElementById('shareCreateBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        // Get CSRF token from admin data if available
        const csrfToken = (window.__DATA__ && window.__DATA__.csrfToken) || '';
        const resp = await fetch('/admin/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          credentials: 'same-origin',
          body: JSON.stringify({ fileKey: currentFileKey, password, expiresIn, maxDownloads }),
        });
        const data = await resp.json();
        if (data.ok) {
          const fullUrl = window.location.origin + data.shareUrl;
          document.getElementById('shareUrl').value = fullUrl;
          document.getElementById('shareResult').style.display = 'block';
        } else {
          alert(data.error || 'Failed to create share link');
        }
      } catch (err) {
        alert('Network error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-link"></i> ' + (lang === 'zh' ? '生成分享链接' : 'Generate Share Link');
      }
    });

    // Copy button
    document.getElementById('shareCopyBtn')?.addEventListener('click', () => {
      const url = document.getElementById('shareUrl');
      url.select();
      navigator.clipboard.writeText(url.value).then(() => {
        const btn = document.getElementById('shareCopyBtn');
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 1500);
      });
    });
  }

  // ==============================================
  //  RE-INIT ALL PAGE-SPECIFIC BEHAVIORS
  // ==============================================
  function initPageBehaviors() {
    initClock();
    initCardEffects();
    initStatCountUp();
    initDownloadButtons();
    initDownloadSearch();
    initTrendingTabs();
    initTrendingLangFilter();
    initShareModal();
    initAOS();
    filterDismissedAnnouncements();
  }

  // Hide previously dismissed announcements
  function filterDismissedAnnouncements() {
    const dismissed = JSON.parse(localStorage.getItem('dismissed-announcements') || '[]');
    if (dismissed.length === 0) return;
    document.querySelectorAll('.announcement-close').forEach(btn => {
      const id = btn.getAttribute('data-ann-id');
      if (id && dismissed.includes(id)) {
        const item = btn.closest('.announcement-item');
        if (item) item.style.display = 'none';
      }
    });
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
    if (allPagesCache[href] || prefetchCache[href]) return;
    prefetchCache[href] = fetch(href, { credentials: 'same-origin' })
      .then(r => r.ok ? r.text() : null)
      .then(html => { if (html) allPagesCache[href] = html; return html; })
      .catch(() => null);
  }

  // Eagerly prefetch all SPA routes at load for instant navigation
  function prefetchAllRoutes() {
    const current = window.location.pathname;
    SPA_ROUTES.forEach(route => {
      if (route !== current && !allPagesCache[route]) {
        fetch(route, { credentials: 'same-origin' })
          .then(r => r.ok ? r.text() : null)
          .then(html => { if (html) allPagesCache[route] = html; })
          .catch(() => {});
      }
    });
  }

  async function navigateTo(href, pushState = true) {
    if (isTransitioning) return;

    const url = new URL(href, window.location.origin);
    const toPath = url.pathname;
    const fromPath = window.location.pathname;

    if (toPath === fromPath && !url.search) return;

    isTransitioning = true;

    // Check persistent cache first — if cached, skip progress bar entirely
    const isCached = !!(allPagesCache[href] || allPagesCache[toPath]);
    if (!isCached) progressBar.start();

    // Immediately update nav active state for instant visual feedback
    updateNavActive(toPath);

    const container = document.getElementById('pageContent');
    if (!container) {
      progressBar.cancel();
      window.location.href = href;
      return;
    }

    const dir = getDirection(fromPath, toPath);
    const isMobile = window.innerWidth <= 768;
    const animOut = isMobile ? 100 : 180;
    const animIn = isMobile ? 120 : 200;

    // Check persistent cache first for instant navigation
    let html = allPagesCache[href] || allPagesCache[toPath] || null;

    // If not in persistent cache, try prefetch cache or fetch
    const fetchPromise = html ? Promise.resolve(html) : (async () => {
      try {
        if (prefetchCache[href]) {
          const cached = await prefetchCache[href];
          delete prefetchCache[href];
          return cached;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), isMobile ? 4000 : 6000);
        const resp = await fetch(href, { credentials: 'same-origin', signal: controller.signal });
        clearTimeout(timeout);
        const text = resp.ok ? await resp.text() : null;
        if (text) allPagesCache[href] = text; // Cache for future
        return text;
      } catch { return null; }
    })();

    // Animate out in parallel with fetch
    container.style.animation = `slideOut${dir === 'left' ? 'Left' : 'Right'} ${animOut}ms cubic-bezier(0.4,0,0.6,1) forwards`;
    container.style.pointerEvents = 'none';

    // If we already have cached HTML, just wait for slideOut then swap immediately
    if (html) {
      await new Promise(r => setTimeout(r, animOut));
    } else {
      // Wait for animation, then race fetch
      await new Promise(r => setTimeout(r, animOut));
      const raceResult = await Promise.race([
        fetchPromise.then(h => ({ html: h, done: true })),
        new Promise(r => setTimeout(r, 30)).then(() => ({ done: false }))
      ]);
      if (raceResult.done) {
        html = raceResult.html;
      } else {
        container.innerHTML = '<div class="spa-loading"><div class="spa-loading-spinner"></div></div>';
        container.style.animation = '';
        container.style.opacity = '1';
        html = await fetchPromise;
      }
    }

    if (!html) {
      container.style.animation = '';
      container.style.pointerEvents = '';
      isTransitioning = false;
      progressBar.cancel();
      window.location.href = href;
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newContent = doc.getElementById('pageContent');

    if (!newContent) {
      container.style.animation = '';
      container.style.pointerEvents = '';
      isTransitioning = false;
      progressBar.cancel();
      window.location.href = href;
      return;
    }

    const newTitle = doc.querySelector('title');
    if (newTitle) document.title = newTitle.textContent;

    // === SWAP CONTENT ===
    container.innerHTML = newContent.innerHTML;
    container.setAttribute('data-page', newContent.getAttribute('data-page') || '');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // === ANIMATE IN ===
    container.style.animation = `slideIn${dir === 'left' ? 'Right' : 'Left'} ${animIn}ms cubic-bezier(0,0,0.2,1) forwards`;

    progressBar.finish(isCached);

    // Don't await slideIn — let it play while we re-init behaviors
    setTimeout(() => {
      container.style.animation = '';
      container.style.pointerEvents = '';
    }, animIn);

    // === POST-TRANSITION UPDATES ===
    if (pushState) {
      history.pushState({ path: href }, '', href);
    }

    initPageBehaviors();
    attachSPALinks();

    isTransitioning = false;

    // Re-cache this page's HTML for future back-nav
    allPagesCache[toPath] = html;
    // Refresh cache for the page we left (data may have changed)
    delete allPagesCache[fromPath];
    fetch(fromPath, { credentials: 'same-origin' })
      .then(r => r.ok ? r.text() : null)
      .then(h => { if (h) allPagesCache[fromPath] = h; })
      .catch(() => {});
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

      // Prefetch on hover (desktop) and touchstart (mobile)
      link.addEventListener('mouseenter', () => {
        prefetchPage(href);
      }, { passive: true });

      // Track touch position to distinguish taps from scrolls
      let touchStartX = 0, touchStartY = 0, touchMoved = false;
      link.addEventListener('touchstart', (e) => {
        prefetchPage(href);
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchMoved = false;
      }, { passive: true });

      link.addEventListener('touchmove', (e) => {
        if (touchMoved) return;
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - touchStartX);
        const dy = Math.abs(t.clientY - touchStartY);
        // If finger moved more than 10px, it's a scroll not a tap
        if (dx > 10 || dy > 10) touchMoved = true;
      }, { passive: true });

      // Use touchend for instant mobile navigation — only if not scrolling
      let touchNavHandled = false;
      link.addEventListener('touchend', (e) => {
        if (touchMoved) { touchMoved = false; return; }
        if (e.cancelable) e.preventDefault();
        touchNavHandled = true;
        navigateTo(href);
      });

      link.addEventListener('click', (e) => {
        if (touchNavHandled) { touchNavHandled = false; e.preventDefault(); return; }
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
    // Theme toggle (delegated) — circular reveal animation
    const themeBtn = e.target.closest('.theme-toggle');
    if (themeBtn) {
      const mode = getThemeMode();
      // Cycle: light → dark → auto → light
      const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
      applyTheme(next, e);
      return;
    }

    // Language toggle (delegated) — smooth crossfade then reload
    const langBtn = e.target.closest('.lang-toggle');

    // Announcement close button
    const annClose = e.target.closest('.announcement-close');
    if (annClose) {
      const item = annClose.closest('.announcement-item');
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'translateY(-10px)';
        item.style.transition = 'all 0.3s ease';
        setTimeout(() => item.remove(), 300);
        // Remember dismissed announcements
        const id = annClose.getAttribute('data-ann-id');
        if (id) {
          const dismissed = JSON.parse(localStorage.getItem('dismissed-announcements') || '[]');
          dismissed.push(id);
          localStorage.setItem('dismissed-announcements', JSON.stringify(dismissed));
        }
      }
      return;
    }

    if (langBtn) {
      e.preventDefault();
      const newLang = lang === 'zh' ? 'en' : 'zh';
      document.cookie = `portal_lang=${newLang}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`;

      // Smooth blur-dissolve transition
      const portal = document.querySelector('.portal') || document.body;
      portal.classList.add('lang-switch-out');

      // Start fetching new page content during animation
      const fetchNew = fetch(window.location.href, { credentials: 'same-origin' })
        .then(r => r.ok ? r.text() : null).catch(() => null);

      // After fade-out, swap content and fade-in
      setTimeout(async () => {
        const html = await fetchNew;
        if (html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          // Swap head elements that change (title)
          const newTitle = doc.querySelector('title');
          if (newTitle) document.title = newTitle.textContent;
          // Swap body content
          document.body.innerHTML = doc.body.innerHTML;
          document.body.setAttribute('data-lang', newLang);
          document.documentElement.setAttribute('lang', newLang === 'zh' ? 'zh-CN' : 'en');
          // Restore theme
          const actual = getTheme();
          document.documentElement.setAttribute('data-theme', actual);
          // Fade in
          const newPortal = document.querySelector('.portal') || document.body;
          newPortal.classList.add('lang-switch-in');
          setTimeout(() => newPortal.classList.remove('lang-switch-in'), 400);
          // Re-init all behaviors
          lang = newLang;
          initHeaderScroll();
          initMobileMenu();
          initNavIndicator();
          initPageBehaviors();
          attachSPALinks();
          initSidebarWidgets();
          // Update all pages cache
          Object.keys(allPagesCache).forEach(k => delete allPagesCache[k]);
          prefetchAllRoutes();
        } else {
          window.location.reload();
        }
      }, 320);
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

  // Eagerly prefetch all SPA routes after a short delay
  // This ensures instant navigation on mobile
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => prefetchAllRoutes());
  } else {
    setTimeout(prefetchAllRoutes, 1500);
  }

  // ==============================================
  //  SIDEBAR WIDGETS
  // ==============================================
  function initSidebarWidgets() {
    const sidebar = document.getElementById('sidebarWidgets');
    if (!sidebar) return;

    let activePanel = null;

    // --- Panel toggle ---
    sidebar.addEventListener('click', (e) => {
      const btn = e.target.closest('.sw-btn');
      const closeBtn = e.target.closest('.sw-panel-close');

      if (closeBtn) {
        closePanel();
        return;
      }

      if (btn) {
        const widget = btn.dataset.widget;
        if (activePanel === widget) {
          closePanel();
        } else {
          openPanel(widget);
        }
      }
    });

    // Close on outside click (use a named handler to avoid duplicates)
    if (!window._swOutsideClickBound) {
      window._swOutsideClickBound = true;
      document.addEventListener('click', (e) => {
        if (window._swClosePanel && !e.target.closest('.sidebar-widgets')) {
          window._swClosePanel();
        }
      });
    }

    function openPanel(name) {
      closePanel(true);
      const panel = document.getElementById('swPanel-' + name);
      const btn = sidebar.querySelector(`.sw-btn[data-widget="${name}"]`);
      if (!panel || !btn) return;

      btn.classList.add('active');
      panel.classList.add('visible');

      // Position panel vertically centered on the button
      const btnRect = btn.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      const panelH = panel.offsetHeight || 280;
      let top = btnRect.top - sidebarRect.top - panelH / 2 + 19;
      top = Math.max(-sidebarRect.top + 80, Math.min(top, window.innerHeight - sidebarRect.top - panelH - 20));
      if (window.innerWidth <= 768) {
        panel.style.top = 'auto';
      } else {
        panel.style.top = top + 'px';
      }

      activePanel = name;

      // Load data on first open
      if (name === 'visitors') loadVisitors();
      if (name === 'guestbook') loadGuestbook();
      if (name === 'quote') loadQuote();
      if (name === 'pet') initPet();
    }

    function closePanel(skipAnim) {
      if (!activePanel && !skipAnim) return;
      sidebar.querySelectorAll('.sw-btn.active').forEach(b => b.classList.remove('active'));
      sidebar.querySelectorAll('.sw-panel.visible').forEach(p => p.classList.remove('visible'));
      activePanel = null;
    }
    // Expose closePanel for outside-click handler
    window._swClosePanel = () => { if (activePanel) closePanel(); };

    // ========== MUSIC PLAYER ==========
    const TRACKS = [
      { title: 'Chill Vibes', freq: [220, 330, 440] },
      { title: 'Ocean Waves', freq: [196, 262, 392] },
      { title: 'Night Drive', freq: [247, 370, 494] },
      { title: 'Sunset Glow', freq: [262, 349, 523] },
      { title: 'Morning Dew', freq: [294, 392, 587] },
    ];
    let musicIdx = 0, audioCtx = null, isPlaying = false, oscNodes = [], gainNode = null;

    function initAudioCtx() {
      if (audioCtx) return;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.06;
      gainNode.connect(audioCtx.destination);
    }

    function playTrack() {
      initAudioCtx();
      stopTrack(true);
      const track = TRACKS[musicIdx];
      oscNodes = track.freq.map((f, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = ['sine', 'triangle', 'sine'][i] || 'sine';
        osc.frequency.value = f;
        const g = audioCtx.createGain();
        g.gain.value = [0.08, 0.05, 0.03][i] || 0.04;
        osc.connect(g).connect(gainNode);
        osc.start();
        return { osc, gain: g };
      });
      isPlaying = true;
      updateMusicUI();
    }

    function stopTrack(keepState) {
      oscNodes.forEach(n => { try { n.osc.stop(); } catch {} });
      oscNodes = [];
      if (!keepState) { isPlaying = false; updateMusicUI(); }
    }

    function updateMusicUI() {
      const title = document.getElementById('swMusicTitle');
      const bars = document.getElementById('swMusicBars');
      const cover = document.getElementById('swMusicCover');
      const playBtn = document.getElementById('swMusicPlay');
      if (title) title.textContent = TRACKS[musicIdx].title;
      if (bars) bars.classList.toggle('playing', isPlaying);
      if (cover) cover.classList.toggle('spinning', isPlaying);
      if (playBtn) playBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
    }

    sidebar.querySelector('#swMusicPlay')?.addEventListener('click', () => {
      if (isPlaying) stopTrack(); else playTrack();
    });
    sidebar.querySelector('#swMusicPrev')?.addEventListener('click', () => {
      musicIdx = (musicIdx - 1 + TRACKS.length) % TRACKS.length;
      if (isPlaying) playTrack(); else updateMusicUI();
    });
    sidebar.querySelector('#swMusicNext')?.addEventListener('click', () => {
      musicIdx = (musicIdx + 1) % TRACKS.length;
      if (isPlaying) playTrack(); else updateMusicUI();
    });
    updateMusicUI();

    // ========== PIXEL PET ==========
    let petInited = false;
    function initPet() {
      if (petInited) return;
      petInited = true;

      const canvas = document.getElementById('swPetCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;

      let mood = 'idle'; // idle, happy, sleep, play
      let frame = 0, eyeBlink = 0;
      let px = W / 2 - 16, py = H / 2;

      const COLORS = { body: '#FFB347', eye: '#333', nose: '#FF6B6B', mouth: '#333', ear: '#FF9500', blush: 'rgba(255,107,107,0.3)' };

      function drawCat() {
        ctx.clearRect(0, 0, W, H);
        const bounce = mood === 'play' ? Math.sin(frame * 0.3) * 3 : (mood === 'happy' ? Math.sin(frame * 0.15) * 1.5 : 0);
        const cy = py + bounce;

        // Body
        ctx.fillStyle = COLORS.body;
        ctx.beginPath();
        ctx.ellipse(px, cy + 8, 20, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.ellipse(px, cy - 10, 16, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = COLORS.ear;
        ctx.beginPath();
        ctx.moveTo(px - 12, cy - 20);
        ctx.lineTo(px - 6, cy - 32);
        ctx.lineTo(px - 2, cy - 18);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + 12, cy - 20);
        ctx.lineTo(px + 6, cy - 32);
        ctx.lineTo(px + 2, cy - 18);
        ctx.fill();

        // Inner ears
        ctx.fillStyle = '#FFD1A4';
        ctx.beginPath();
        ctx.moveTo(px - 10, cy - 21);
        ctx.lineTo(px - 7, cy - 29);
        ctx.lineTo(px - 4, cy - 19);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + 10, cy - 21);
        ctx.lineTo(px + 7, cy - 29);
        ctx.lineTo(px + 4, cy - 19);
        ctx.fill();

        // Eyes
        ctx.fillStyle = COLORS.eye;
        if (mood === 'sleep') {
          // Closed eyes
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = COLORS.eye;
          ctx.beginPath();
          ctx.arc(px - 6, cy - 10, 3, 0, Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px + 6, cy - 10, 3, 0, Math.PI);
          ctx.stroke();
          // Zzz
          ctx.font = '10px sans-serif';
          ctx.fillStyle = 'var(--text-tertiary, #aaa)';
          ctx.fillText('z', px + 18, cy - 20 + Math.sin(frame * 0.1) * 3);
          ctx.font = '7px sans-serif';
          ctx.fillText('z', px + 24, cy - 27 + Math.sin(frame * 0.1 + 1) * 2);
        } else if (eyeBlink > 0) {
          ctx.fillRect(px - 8, cy - 11, 4, 1.5);
          ctx.fillRect(px + 4, cy - 11, 4, 1.5);
          eyeBlink--;
        } else {
          const eyeSize = mood === 'happy' ? 3.5 : 3;
          ctx.beginPath();
          ctx.arc(px - 6, cy - 10, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + 6, cy - 10, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          // Eye shine
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(px - 5, cy - 11.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + 7, cy - 11.5, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Nose
        ctx.fillStyle = COLORS.nose;
        ctx.beginPath();
        ctx.ellipse(px, cy - 5, 2, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = COLORS.mouth;
        ctx.lineWidth = 1;
        if (mood === 'happy' || mood === 'play') {
          ctx.beginPath();
          ctx.arc(px, cy - 2, 4, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(px - 3, cy - 3);
          ctx.lineTo(px, cy - 2);
          ctx.lineTo(px + 3, cy - 3);
          ctx.stroke();
        }

        // Blush
        if (mood === 'happy') {
          ctx.fillStyle = COLORS.blush;
          ctx.beginPath();
          ctx.ellipse(px - 12, cy - 6, 4, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(px + 12, cy - 6, 4, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tail
        ctx.strokeStyle = COLORS.body;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        const tailWag = Math.sin(frame * 0.15) * 8;
        ctx.beginPath();
        ctx.moveTo(px + 18, cy + 12);
        ctx.quadraticCurveTo(px + 30 + tailWag, cy + 5, px + 28 + tailWag, cy - 5);
        ctx.stroke();

        // Paws
        ctx.fillStyle = '#FFD1A4';
        ctx.beginPath();
        ctx.ellipse(px - 10, cy + 22, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px + 10, cy + 22, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        frame++;
        if (frame % 80 === 0 && mood !== 'sleep') eyeBlink = 4;
      }

      let animId;
      function animate() {
        drawCat();
        animId = requestAnimationFrame(animate);
      }
      animate();

      const statusEl = document.getElementById('swPetStatus');
      const zhLang = document.body.getAttribute('data-lang') === 'zh';

      canvas.addEventListener('click', () => {
        const moods = ['happy', 'play', 'sleep', 'idle'];
        const labels = zhLang
          ? ['开心！喵~', '玩耍中...', '困了...zzZ', '发呆中...']
          : ['Happy! Meow~', 'Playing...', 'Sleepy...zzZ', 'Idle...'];
        const idx = moods.indexOf(mood);
        const next = (idx + 1) % moods.length;
        mood = moods[next];
        if (statusEl) statusEl.textContent = labels[next];
      });
    }

    // ========== VISITORS (China Province Map) ==========
    let visitorsLoaded = false;
    async function loadVisitors() {
      if (visitorsLoaded) return;
      visitorsLoaded = true;
      try {
        const res = await fetch('/api/sidebar/visitors');
        const data = await res.json();
        const totalEl = document.getElementById('swVisitorTotal');
        const listEl = document.getElementById('swVisitorList');
        const mapEl = document.getElementById('swVisitorMap');
        if (totalEl) totalEl.textContent = data.total || 0;

        const provinces = data.provinces || {};

        // Simplified China province SVG paths (viewBox 0 0 560 400, from GeoJSON)
        const provPaths = {
          '北京': 'M342.1,108.3L343.3,107.9L341.6,107.7L338.9,107.1L337.4,105.7L336.6,105.0L335.3,105.5L335.2,106.5L333.8,106.7L332.7,108.0L330.6,108.3L330.2,109.4L330.9,111.3L330.1,111.6L327.7,112.8L328.2,113.6L328.0,114.3L328.0,115.4L329.1,115.8L329.6,116.0L329.8,116.1L329.8,116.2L329.9,116.2L330.6,116.2L331.2,115.8L332.7,116.0L334.2,116.6L335.3,116.7L335.5,116.1L336.9,115.7L337.4,115.8L338.8,115.2L339.1,114.4L337.8,113.1L338.9,112.3L340.6,112.3L341.4,111.9L342.3,111.4L342.1,111.0L341.2,109.9L341.5,108.5Z',
          '天津': 'M345.3,117.3L346.4,116.4L345.2,115.9L344.4,116.0L344.0,114.7L343.3,113.5L343.4,113.1L344.6,112.9L345.5,112.8L345.2,112.4L344.5,111.9L344.1,111.5L343.6,111.0L342.3,111.4L341.6,111.9L341.1,112.1L341.2,113.9L341.0,114.5L340.3,115.6L339.1,115.2L338.8,115.1L338.1,116.3L338.3,117.4L338.6,118.6L338.8,119.5L337.8,119.9L337.3,120.8L337.9,122.2L339.1,122.7L339.9,123.0L341.1,123.0L342.3,123.6L345.0,122.7L345.2,121.5L345.8,119.9L347.6,118.6L346.9,118.1L346.8,117.9L346.0,117.8L345.4,117.5L343.4,117.6L344.8,117.2Z',
          '河北': 'M343.0,107.8L344.1,111.5L344.7,112.9L344.7,115.9L346.2,117.8L349.9,120.5L357.0,117.0L360.5,112.1L355.9,107.5L355.9,103.5L349.5,101.3L347.9,97.3L342.4,93.7L339.3,94.4L336.1,98.1L330.5,98.3L323.3,99.0L318.4,99.4L316.2,103.9L319.6,110.0L317.1,113.4L319.9,118.5L315.5,121.9L316.0,128.0L315.2,135.6L314.6,139.8L319.9,141.5L325.9,141.5L327.1,138.3L333.6,131.8L339.7,129.2L345.4,125.1L339.1,122.7L338.8,119.5L337.4,115.8L333.7,116.0L329.8,116.2L328.0,115.4L330.2,111.4L333.5,107.1L337.4,105.7Z',
          '山西': 'M289.3,153.6L293.4,152.7L297.8,151.9L301.1,150.0L303.3,148.7L307.8,148.7L310.6,147.5L313.3,145.6L314.1,143.1L314.4,141.4L313.6,138.9L313.7,137.3L315.2,135.0L317.0,131.7L316.5,128.6L314.1,126.1L313.8,123.0L315.1,120.4L317.6,119.9L320.1,118.3L319.9,115.4L318.4,113.4L317.4,112.2L319.8,110.9L318.8,109.1L317.3,107.6L314.4,109.3L307.3,111.5L303.0,112.1L300.7,115.7L297.2,116.2L295.4,117.8L294.0,120.3L293.4,123.5L290.8,125.6L292.0,129.6L292.1,132.1L290.5,134.6L289.5,136.8L290.3,139.3L290.2,143.1L290.8,146.5L288.3,152.2Z',
          '内蒙古': 'M189.3,91.6L206.6,113.5L224.6,119.6L243.5,132.1L256.9,119.7L265.2,126.7L279.2,127.7L288.4,117.2L301.1,115.6L317.5,106.9L320.3,97.4L331.3,98.0L339.6,94.1L349.4,98.0L357.8,100.9L362.1,98.4L372.7,94.0L384.5,91.9L388.5,83.5L378.1,76.5L378.0,68.0L387.7,62.2L382.5,59.0L396.4,50.9L401.8,40.9L403.6,34.7L407.3,28.6L395.9,26.7L383.6,24.6L376.6,19.7L374.1,12.1L366.8,17.4L362.1,25.8L356.1,34.4L345.9,40.4L350.4,52.2L355.2,62.2L336.0,65.5L307.0,75.8L291.7,89.9L245.0,98.5Z',
          '辽宁': 'M389.0,114.3L394.1,113.6L398.0,110.3L402.9,107.8L404.5,106.0L405.0,103.2L402.7,100.1L403.2,96.8L401.4,95.3L400.0,92.5L397.7,89.6L395.3,89.1L391.4,86.5L388.2,89.8L383.3,91.9L379.3,92.3L375.1,94.3L370.3,95.7L365.6,97.2L362.5,99.8L359.8,95.8L356.8,96.4L357.2,100.5L356.1,103.7L353.9,106.9L357.9,108.6L360.5,112.1L364.3,111.8L368.6,107.9L371.1,106.1L376.5,106.7L378.8,109.5L376.7,112.2L372.3,115.8L373.1,117.8L374.4,119.1L371.2,120.6L374.1,121.3L376.5,120.1L379.7,117.7L385.1,115.4Z',
          '吉林': 'M434.9,94.4L437.0,90.2L439.9,92.2L442.3,93.4L445.2,90.9L447.9,87.0L442.7,85.3L439.9,82.8L435.3,83.4L430.1,85.9L426.2,80.9L423.3,80.1L419.7,80.7L415.6,78.0L412.5,73.2L405.9,72.7L400.6,71.8L395.3,71.4L393.0,68.5L391.9,65.3L385.8,66.3L380.2,68.4L375.6,68.6L378.5,72.6L378.1,77.3L386.0,78.8L388.6,84.4L389.1,86.9L394.6,88.2L398.0,89.5L400.7,93.1L402.4,96.5L402.6,99.3L405.0,103.2L406.0,105.9L410.5,103.0L414.4,99.2L417.5,101.5L422.8,101.8L423.5,97.4L431.6,96.2L434.2,94.5Z',
          '黑龙江': 'M389.3,65.6L392.9,69.2L399.8,71.1L408.0,73.6L415.6,77.5L422.1,82.0L426.8,81.6L432.7,83.9L440.7,82.5L447.8,86.2L447.1,75.5L460.1,74.6L464.5,68.9L467.4,63.3L474.1,53.9L469.1,49.6L457.8,53.4L445.2,53.4L441.5,45.3L431.8,41.6L420.2,38.7L414.7,27.6L411.5,22.4L407.4,17.1L403.5,13.5L390.6,10.5L380.0,10.4L374.3,15.6L378.1,18.6L382.9,22.0L388.4,27.2L399.1,26.5L404.8,26.5L406.4,31.3L403.0,35.5L401.3,39.5L397.9,45.2L395.6,50.5L380.7,57.4L388.0,60.4L385.0,63.3Z',
          '上海': 'M377.2,176.2L375.2,175.8L374.3,175.6L373.1,175.1L372.2,174.3L371.3,174.6L370.7,175.2L372.0,176.2L372.8,176.5L373.9,176.9L375.0,177.2L376.5,177.7L377.2,177.4L377.3,177.2Z',
          '江苏': 'M341.8,153.9L340.0,153.3L338.1,151.1L334.7,152.5L337.4,154.6L339.8,157.0L343.6,157.9L345.2,160.4L348.0,161.3L347.0,164.4L349.3,166.2L350.7,167.9L353.5,166.4L356.2,168.0L354.0,169.1L352.5,168.7L352.3,170.3L349.8,173.9L352.3,175.5L353.5,177.9L355.4,179.1L357.6,179.6L360.9,179.6L365.0,181.3L367.4,181.8L368.7,180.2L371.1,177.5L371.8,174.4L376.3,173.7L372.5,169.7L369.6,167.6L368.0,163.4L364.6,156.3L358.1,152.5L356.2,151.4L356.3,149.8L352.7,152.2L350.7,153.5L348.4,155.3L346.3,153.3L342.5,153.9Z',
          '浙江': 'M350.3,201.5L352.5,201.3L352.6,203.4L353.6,207.1L355.6,207.9L358.2,207.2L359.6,207.1L360.5,208.9L363.2,208.0L365.7,210.1L367.0,207.0L369.3,204.4L370.9,205.1L372.3,202.6L374.9,201.1L374.0,198.8L375.2,196.2L375.7,195.2L377.1,194.6L377.3,192.6L376.9,190.4L376.8,189.1L372.8,185.9L371.6,183.6L370.2,182.1L369.0,180.8L367.4,181.8L365.4,181.6L362.1,180.5L359.8,179.6L359.0,182.2L357.1,183.7L357.7,185.7L355.1,186.2L353.8,187.4L352.4,190.7L349.6,192.3L347.7,193.9L347.9,196.0L350.1,198.3L350.3,200.6Z',
          '安徽': 'M336.5,158.1L333.1,160.4L330.5,157.7L328.9,160.3L326.7,162.9L324.1,164.6L325.5,166.8L328.1,169.6L330.2,169.5L331.2,173.8L328.1,175.8L328.4,179.2L332.0,180.8L330.8,183.9L332.5,188.0L336.6,187.9L337.2,190.7L339.5,190.9L341.7,189.8L344.6,191.6L348.9,192.8L352.7,189.9L354.3,185.8L357.2,184.6L358.8,182.2L357.6,179.6L353.7,179.1L353.6,176.2L350.7,175.0L352.4,170.8L352.6,168.9L355.7,169.6L353.8,166.1L350.7,167.9L348.9,165.8L347.3,162.9L345.9,160.2L343.4,157.7L339.4,155.6L335.2,153.3L333.9,155.3L335.9,157.3Z',
          '福建': 'M354.7,226.6L354.2,224.7L356.4,224.9L356.1,223.1L358.1,223.0L359.7,223.5L360.8,222.5L359.4,219.8L360.7,216.5L359.0,214.1L362.7,213.0L362.7,214.0L363.2,211.8L365.3,209.3L361.9,208.4L359.8,206.9L356.8,207.7L353.6,207.1L353.2,202.5L350.4,201.7L347.8,203.6L344.1,204.7L341.3,205.8L339.9,207.1L339.2,210.7L336.2,213.9L335.2,216.5L333.9,219.5L332.2,222.5L331.4,226.0L333.8,227.9L335.8,229.2L338.3,230.6L339.3,234.5L342.4,237.3L345.6,234.3L347.4,230.8L352.2,229.5L353.2,227.3Z',
          '江西': 'M348.5,193.1L344.6,191.6L342.1,189.6L340.3,190.7L336.9,190.8L337.0,187.9L332.3,190.3L326.6,191.2L324.3,191.7L323.3,193.0L319.1,193.3L316.8,196.7L317.9,199.8L316.9,202.3L314.7,204.6L314.0,208.1L315.3,210.5L317.6,214.5L316.5,217.6L317.0,218.9L317.1,223.6L320.0,223.8L321.8,225.6L318.9,228.5L321.5,229.6L324.5,228.9L328.5,228.8L330.1,228.3L331.0,226.2L332.0,222.6L333.6,219.5L335.0,216.5L336.1,214.4L339.0,211.1L340.1,206.9L341.0,205.8L343.7,203.9L347.8,203.9L350.3,201.5L349.8,197.5L347.4,194.9Z',
          '山东': 'M334.7,153.3L338.4,151.2L341.4,154.8L343.0,154.5L347.7,153.9L350.4,153.4L353.2,151.6L357.7,149.6L360.6,146.0L363.2,143.7L364.0,142.6L365.0,141.6L367.4,141.2L369.3,139.6L372.0,137.7L374.6,137.0L378.7,136.3L381.4,136.2L381.7,133.2L379.5,132.1L374.1,132.0L370.9,130.5L365.7,129.7L361.7,132.5L357.1,134.6L354.6,130.8L353.9,126.8L348.4,126.5L343.7,127.5L337.6,129.5L334.5,131.1L332.6,132.6L328.0,137.3L327.8,140.9L328.0,143.9L332.4,142.8L328.0,145.2L323.3,149.2L326.0,150.9L330.3,153.8Z',
          '河南': 'M307.0,170.6L311.0,170.3L314.9,171.2L316.0,174.5L320.8,175.3L324.1,177.2L326.9,177.9L330.5,175.1L330.7,169.5L328.2,169.8L325.8,166.9L324.1,164.6L326.8,162.7L328.7,159.8L331.0,158.2L334.9,159.8L336.0,157.0L333.5,155.1L330.3,153.8L326.0,150.9L323.3,149.2L328.0,145.2L332.4,142.8L327.4,144.5L326.6,142.1L324.3,142.5L319.9,141.5L317.2,140.5L314.5,141.7L313.8,144.6L311.0,147.2L307.1,149.1L302.0,149.9L298.2,151.7L292.7,153.5L290.1,155.2L291.5,158.7L294.1,161.7L295.7,165.4L298.9,168.7L304.3,170.6Z',
          '湖北': 'M294.4,164.5L290.6,163.8L284.1,163.8L285.3,166.6L286.6,169.2L283.1,171.6L284.1,175.5L287.8,179.6L285.7,181.7L281.3,183.9L277.4,184.8L274.8,185.8L274.5,189.9L277.3,190.8L278.9,193.3L281.6,193.9L284.3,191.4L289.3,191.3L291.4,187.9L298.0,189.0L302.2,190.4L305.7,191.5L309.0,190.5L313.5,189.9L314.2,193.5L316.0,195.8L321.5,193.2L323.9,192.3L326.6,191.2L332.9,189.3L331.0,184.1L332.0,180.6L327.7,178.3L325.2,176.9L321.1,175.9L316.4,174.5L314.9,171.3L310.4,170.2L306.5,170.5L301.7,169.9L296.3,166.8Z',
          '湖南': 'M301.8,228.3L304.0,225.0L308.5,227.0L308.6,224.1L312.3,223.3L316.3,223.0L317.6,218.0L317.0,215.9L316.2,211.6L313.9,208.6L314.7,204.6L317.6,202.3L317.7,198.9L316.0,195.8L314.0,193.7L313.4,190.6L308.5,191.4L306.5,191.5L302.5,191.1L299.4,189.3L293.5,187.6L291.0,189.7L285.8,190.3L282.4,192.2L280.7,195.4L280.7,198.9L281.5,202.2L282.5,206.1L279.3,209.0L280.1,210.7L282.3,212.3L281.6,213.5L281.4,216.6L283.7,218.4L285.7,218.1L290.1,217.4L293.6,216.3L295.9,218.2L297.1,220.7L293.8,226.5L297.3,226.5L299.1,228.2Z',
          '广东': 'M313.4,247.5L314.6,244.2L318.0,245.0L321.1,244.8L323.3,244.6L326.9,243.2L330.4,243.5L336.0,241.5L338.5,238.1L339.6,235.4L338.7,231.3L335.8,229.2L333.6,227.7L330.1,227.9L328.5,228.8L323.9,229.0L319.8,230.2L320.2,226.5L321.6,223.9L317.1,224.5L313.8,223.9L310.2,223.2L308.9,225.3L306.4,225.3L302.5,226.6L301.5,230.4L300.9,234.4L298.2,236.7L297.1,241.0L293.7,244.3L292.4,246.9L288.9,247.9L288.1,249.9L284.5,252.0L284.3,258.4L287.1,262.3L289.6,259.2L289.4,255.7L296.2,253.0L299.6,252.0L303.4,251.2L309.5,249.4L313.5,248.5Z',
          '广西': 'M282.5,218.6L279.3,220.4L278.5,222.1L276.1,223.8L272.5,223.9L268.5,224.0L265.5,221.8L262.0,225.0L257.7,227.5L252.1,227.3L247.8,228.2L246.4,231.5L249.8,231.8L253.5,233.7L256.9,233.8L255.7,237.7L252.9,241.0L258.2,242.2L262.1,242.9L260.8,244.5L261.8,249.0L265.8,251.2L270.5,252.1L276.3,251.8L279.6,253.5L284.8,251.6L288.6,249.9L290.3,248.0L292.1,245.3L296.9,242.0L297.1,238.0L300.4,234.7L301.5,230.4L299.1,228.2L297.6,226.2L294.9,224.7L296.9,219.5L295.6,216.7L291.1,216.3L286.7,217.5L283.8,218.7Z',
          '海南': 'M287.3,264.0L285.1,264.3L282.7,265.2L280.6,265.3L278.8,267.4L276.2,269.2L275.8,270.7L276.3,273.8L276.5,276.0L278.5,277.0L281.6,277.8L284.4,278.0L286.6,276.7L288.1,275.0L290.2,274.4L290.9,272.7L291.6,269.6L292.9,268.4L294.5,267.2L293.8,264.1L291.9,263.1L289.4,263.4L287.6,263.7Z',
          '重庆': 'M259.0,199.7L260.6,198.4L261.7,199.7L263.4,197.8L266.3,197.2L267.4,194.7L270.8,195.8L274.2,197.6L275.9,200.6L277.1,200.7L279.7,202.1L280.4,198.8L280.6,195.2L278.3,192.8L276.5,190.8L274.5,189.9L275.3,186.1L276.5,184.0L279.7,184.1L282.2,184.0L286.6,182.2L287.6,178.8L284.4,175.6L280.3,174.4L274.3,171.9L274.0,173.6L274.9,176.1L272.0,178.9L271.0,181.8L267.0,182.9L264.3,187.8L262.4,188.3L260.8,186.7L258.2,186.9L254.3,185.6L252.9,187.5L254.2,189.3L251.1,192.6L252.8,194.0L254.6,196.5L258.0,197.4Z',
          '四川': 'M219.6,209.7L222.3,215.2L229.2,216.5L232.6,211.2L237.0,202.7L243.4,199.0L244.4,204.2L251.0,205.1L258.5,204.1L254.2,199.0L257.7,196.8L252.1,193.9L254.1,188.7L255.7,185.7L260.8,186.7L264.5,187.8L270.9,181.5L275.2,175.7L274.9,171.3L266.1,169.6L258.2,168.2L251.7,166.4L244.9,167.6L241.4,160.6L234.4,157.7L228.3,158.2L227.4,164.1L224.1,162.3L219.3,165.8L213.9,167.8L208.4,167.5L200.5,161.6L194.0,156.7L193.7,162.7L194.5,169.6L202.0,177.7L202.6,184.5L204.0,197.8L207.8,197.7L212.2,204.1L217.9,208.0Z',
          '贵州': 'M281.0,199.9L277.2,202.0L275.9,201.2L274.2,197.8L270.6,196.0L266.8,195.0L265.3,197.4L262.7,198.9L261.0,198.9L260.0,199.5L255.9,197.9L253.8,201.5L258.2,203.1L255.6,205.6L250.5,206.8L246.7,208.6L241.1,208.0L238.0,210.7L239.2,214.4L244.2,213.4L245.2,217.1L244.3,222.0L247.3,224.6L245.1,228.2L249.8,226.7L254.9,228.6L258.7,226.4L263.6,224.6L266.1,223.3L269.0,224.9L272.5,223.0L275.9,222.6L279.1,222.5L279.3,220.4L282.5,218.7L281.3,215.6L282.4,212.5L280.1,210.7L279.2,208.7L281.7,205.7L281.4,201.4Z',
          '云南': 'M250.9,205.9L246.6,204.4L243.2,201.0L239.7,200.2L235.7,206.4L233.8,214.6L226.7,218.3L221.3,214.3L219.6,209.7L213.4,205.5L210.6,199.6L206.3,201.4L202.8,194.8L200.3,199.8L196.8,202.1L200.9,207.0L201.2,215.5L198.6,221.9L194.0,227.5L192.8,233.6L198.2,233.2L201.9,236.3L206.8,240.9L204.8,248.2L211.6,252.4L219.1,251.0L224.6,255.1L222.8,247.9L229.3,243.3L236.7,243.8L243.1,243.5L251.1,238.6L256.8,237.5L254.4,233.4L248.9,230.6L246.4,226.4L244.3,222.4L245.5,214.8L239.3,213.4L240.3,208.3L248.7,208.3Z',
          '西藏': 'M132.8,142.3L120.5,139.7L108.1,141.4L94.9,145.9L82.5,147.1L73.8,148.6L63.3,147.5L56.0,154.7L50.0,160.2L52.7,169.8L48.1,172.5L53.2,180.9L64.0,185.0L71.1,185.2L79.6,190.3L89.4,193.6L97.1,199.0L105.6,204.2L112.9,204.3L123.6,203.3L128.1,207.6L139.3,203.3L147.0,207.1L163.4,211.1L179.7,201.5L190.9,204.5L194.6,200.9L200.7,200.0L203.7,193.7L201.1,180.5L197.5,171.8L190.0,172.3L185.7,175.4L177.6,175.0L173.4,170.5L164.2,169.8L154.9,167.9L144.5,164.7L133.7,159.2L133.4,151.2L133.5,144.2Z',
          '陕西': 'M289.3,153.6L291.1,145.8L290.2,139.8L289.4,135.4L292.2,131.9L290.3,126.4L293.4,122.6L295.4,117.8L293.1,116.6L287.5,117.3L284.1,120.6L278.6,125.9L277.3,128.9L271.5,130.5L266.7,130.2L265.9,134.5L269.6,137.0L273.2,138.7L276.3,143.1L275.0,148.5L269.2,149.3L266.5,151.2L260.3,150.0L258.7,153.9L260.2,156.3L260.3,161.9L254.9,162.7L255.1,166.2L254.4,167.5L258.1,168.1L263.1,168.0L267.2,170.2L272.7,171.7L279.8,174.1L283.6,173.9L283.7,168.8L286.4,166.6L283.6,163.7L290.6,163.8L294.2,162.2L291.5,158.4L289.3,154.1Z',
          '甘肃': 'M260.0,145.0L256.7,147.1L251.5,144.6L251.0,137.4L244.4,132.2L240.7,116.9L220.8,122.0L209.4,113.8L201.6,108.1L180.7,94.9L165.3,104.3L158.6,119.0L172.6,124.6L182.4,126.8L187.5,121.0L197.7,120.1L206.9,123.3L213.7,125.7L222.5,129.1L230.3,134.7L233.6,141.3L230.2,146.5L225.3,151.9L223.7,157.6L217.7,158.4L225.2,161.7L229.3,162.3L230.8,156.9L235.6,159.9L243.5,164.1L250.3,168.3L255.9,164.2L259.8,160.4L258.7,154.3L264.6,151.0L270.3,148.7L276.5,142.6L270.7,137.6L262.4,134.4L259.9,137.8L263.2,142.0Z',
          '青海': 'M232.1,140.3L229.9,133.8L222.5,129.1L214.3,125.7L210.4,125.5L200.9,120.0L191.8,119.7L187.1,123.5L179.9,125.9L171.4,125.0L158.8,119.1L145.9,121.7L137.1,126.1L144.8,134.8L142.8,139.7L135.2,141.1L133.1,145.6L132.5,151.5L133.1,157.2L138.0,163.8L148.2,166.0L155.8,167.7L163.2,169.0L170.9,168.9L175.2,172.2L181.4,175.6L186.3,175.8L189.7,172.5L193.3,169.3L192.7,162.3L194.0,156.7L200.3,161.1L207.4,167.0L212.5,168.4L219.2,168.4L222.5,164.5L219.6,160.8L219.6,155.8L226.0,156.5L227.2,150.4L231.4,146.6L233.6,141.3Z',
          '宁夏': 'M265.8,134.7L265.8,133.3L266.5,130.8L268.3,129.5L266.9,128.3L264.3,126.8L260.9,126.1L262.5,121.5L262.2,118.7L260.7,117.5L258.1,119.3L256.3,120.7L255.2,123.4L255.2,125.6L254.7,128.9L251.0,130.1L244.3,131.6L244.4,132.2L245.7,133.2L247.9,134.7L250.0,135.9L250.7,137.3L250.5,138.8L252.0,140.6L251.7,142.5L251.8,144.4L254.2,145.3L254.8,146.3L256.7,147.1L257.1,147.6L259.3,148.5L259.6,146.2L260.9,145.0L262.7,145.0L263.0,143.5L262.8,141.7L261.4,141.0L259.9,139.8L259.2,138.7L260.1,137.7L260.9,136.3L261.0,135.7L261.7,134.5L263.7,134.7Z',
          '新疆': 'M183.3,92.1L167.0,77.5L146.8,74.3L142.2,65.5L138.0,55.6L126.9,51.3L120.0,46.5L115.6,44.0L106.4,48.9L97.9,60.0L84.7,58.4L78.9,72.2L66.5,73.6L60.6,76.2L64.8,89.0L61.0,96.0L49.7,101.0L40.1,105.0L31.4,109.8L23.4,109.1L13.6,112.7L12.6,120.6L20.1,125.2L20.0,133.8L23.2,135.7L29.8,143.2L41.0,147.1L45.8,152.3L54.1,154.8L61.7,147.7L70.7,148.8L81.7,145.6L93.1,146.7L106.1,142.0L118.6,140.1L129.9,141.2L143.2,141.8L144.7,134.7L137.4,124.1L152.9,119.9L175.8,99.9Z',
          '台湾': 'M365.6,245.7L367.2,247.9L368.1,249.7L369.1,248.1L370.0,244.2L371.6,242.8L372.6,240.9L373.1,239.5L373.7,237.4L374.6,233.4L375.9,231.4L376.5,229.3L376.9,226.8L376.7,225.3L375.1,224.9L374.2,224.0L372.6,225.2L370.6,225.8L369.1,227.4L367.4,229.4L366.2,231.6L364.6,234.1L363.0,236.2L362.8,239.3L363.3,242.3L364.3,244.8Z',
          '香港': 'M317.0,245.3L316.1,245.9L316.4,246.4L317.0,246.5L316.0,246.7L315.6,247.3L316.3,247.5L316.7,247.5L317.0,247.1L317.3,246.6L317.9,246.8L318.0,247.4L318.8,247.6L318.7,246.9L319.2,247.1L319.2,246.8L318.9,246.2L319.2,246.2L319.5,246.5L319.8,246.3L319.8,245.8L319.2,245.5L318.4,245.8L318.5,245.6L319.3,245.3L318.8,245.0L318.5,245.1L318.0,244.9L317.4,245.2Z',
          '澳门': 'M313.4,248.3L313.8,248.1L313.6,247.6L313.3,247.5L313.2,247.8L313.4,248.0Z',
        };

        // Province center coordinates (from GeoJSON centroids)
        const provCenter = {
          '北京':[335.0,113.5],'天津':[340.9,119.4],'河北':[337.0,118.0],'山西':[305.8,129.0],
          '内蒙古':[330.0,60.0],'辽宁':[383.0,104.0],'吉林':[415.0,83.0],'黑龙江':[420.0,45.0],
          '上海':[374.0,176.5],'江苏':[356.0,167.0],'浙江':[362.0,193.0],'安徽':[340.0,175.0],
          '福建':[348.0,218.0],'江西':[330.0,210.0],'山东':[355.0,138.0],'河南':[312.0,158.0],
          '湖北':[300.0,184.0],'湖南':[298.0,210.0],'广东':[310.0,244.0],'广西':[270.0,237.0],
          '海南':[284.0,271.0],'重庆':[270.0,191.0],'四川':[232.0,178.0],'贵州':[264.0,214.0],
          '云南':[225.0,230.0],'西藏':[120.0,175.0],'陕西':[278.0,148.0],'甘肃':[222.0,130.0],
          '青海':[183.0,148.0],'宁夏':[256.0,133.0],'新疆':[95.0,100.0],'台湾':[370.0,236.0],
          '香港':[318.0,246.5],'澳门':[313.3,248.0],
        };

        if (mapEl) {
          const maxCount = Math.max(...Object.values(provinces).filter((_, i, a) => true).map(Number), 1);
          const accentVar = 'var(--accent)';
          let pathsHtml = '';
          let labelsHtml = '';
          const knownProvs = Object.keys(provPaths);

          // Draw province regions
          for (const name of knownProvs) {
            const d = provPaths[name];
            const count = Number(provinces[name] || 0);
            let fill, strokeW, fOpacity;
            if (count > 0) {
              const intensity = 0.15 + Math.min((count / maxCount) * 0.7, 0.7);
              fill = accentVar;
              fOpacity = intensity;
              strokeW = '0.8';
            } else {
              fill = 'var(--text-tertiary)';
              fOpacity = 0.08;
              strokeW = '0.4';
            }
            pathsHtml += `<path d="${d}" fill="${fill}" fill-opacity="${fOpacity}" `
              + `stroke="var(--border)" stroke-width="${strokeW}" `
              + `data-prov="${name}" class="china-prov">`
              + (count > 0 ? `<animate attributeName="fill-opacity" values="${fOpacity};${Math.min(fOpacity+0.12,0.95)};${fOpacity}" dur="3s" repeatCount="indefinite"/>` : '')
              + `</path>`;
          }

          // Province labels for those with visitors
          const sortedProvs = Object.entries(provinces)
            .filter(([k]) => k !== '未知' && provCenter[k])
            .sort((a, b) => Number(b[1]) - Number(a[1]));

          // Only show labels for top provinces (to avoid clutter)
          const topN = sortedProvs.slice(0, 8);
          for (const [name, count] of topN) {
            const c = provCenter[name];
            if (!c) continue;
            labelsHtml += `<text x="${c[0]}" y="${c[1]}" text-anchor="middle" dominant-baseline="central" `
              + `fill="var(--text-primary)" font-size="10" font-weight="600" opacity="0.85" class="prov-label">`
              + `${name}</text>`;
            labelsHtml += `<text x="${c[0]}" y="${c[1]+13}" text-anchor="middle" dominant-baseline="central" `
              + `fill="${accentVar}" font-size="9" font-weight="700" opacity="0.9">`
              + `${count}</text>`;
          }

          mapEl.innerHTML = `<svg viewBox="0 0 560 400" xmlns="http://www.w3.org/2000/svg" class="china-map-svg">
            <defs>
              <filter id="glow"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            ${pathsHtml}
            ${labelsHtml}
          </svg>`;

          // Hover tooltips
          mapEl.querySelectorAll('.china-prov').forEach(el => {
            el.addEventListener('mouseenter', e => {
              const name = el.getAttribute('data-prov');
              const count = provinces[name] || 0;
              let tip = mapEl.querySelector('.map-tooltip');
              if (!tip) {
                tip = document.createElement('div');
                tip.className = 'map-tooltip';
                mapEl.appendChild(tip);
              }
              tip.textContent = `${name}: ${count} 访客`;
              tip.style.display = 'block';
              const rect = mapEl.getBoundingClientRect();
              const moveHandler = ev => {
                tip.style.left = (ev.clientX - rect.left + 10) + 'px';
                tip.style.top = (ev.clientY - rect.top - 28) + 'px';
              };
              el._moveHandler = moveHandler;
              mapEl.addEventListener('mousemove', moveHandler);
            });
            el.addEventListener('mouseleave', () => {
              const tip = mapEl.querySelector('.map-tooltip');
              if (tip) tip.style.display = 'none';
              if (el._moveHandler) {
                mapEl.removeEventListener('mousemove', el._moveHandler);
              }
            });
          });
        }

        // Province list tags (sorted by count, compact)
        if (listEl) {
          const sorted = Object.entries(provinces)
            .filter(([k]) => k !== '未知')
            .sort((a, b) => Number(b[1]) - Number(a[1]));
          listEl.innerHTML = sorted.map(([prov, count]) =>
            `<span class="sw-visitor-tag">${prov} <span class="v-count">${count}</span></span>`
          ).join('');
        }
      } catch {}
    }

    // ========== GUESTBOOK ==========
    let gbLoaded = false;
    async function loadGuestbook() {
      if (gbLoaded) return;
      gbLoaded = true;
      try {
        const res = await fetch('/api/sidebar/guestbook');
        const data = await res.json();
        renderGbMessages(data.messages || []);
      } catch {}
    }

    function renderGbMessages(msgs) {
      const el = document.getElementById('swGbMessages');
      if (!el) return;
      if (msgs.length === 0) {
        const zhLang = document.body.getAttribute('data-lang') === 'zh';
        el.innerHTML = `<div style="text-align:center;color:var(--text-tertiary);font-size:0.75rem;padding:20px 0">${zhLang ? '还没有留言，来第一个吧！' : 'No messages yet. Be the first!'}</div>`;
        return;
      }
      const latest = msgs.slice(-20).reverse();
      el.innerHTML = latest.map(m => {
        const ago = timeAgoShort(m.time);
        return `<div class="sw-gb-msg"><span class="sw-gb-msg-emoji">${m.emoji || '\uD83D\uDE0A'}</span><span class="sw-gb-msg-text">${escHtml(m.text)}</span><span class="sw-gb-msg-time">${ago}</span></div>`;
      }).join('');
    }

    function timeAgoShort(ts) {
      const diff = (Date.now() - ts) / 1000;
      if (diff < 60) return 'now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h';
      return Math.floor(diff / 86400) + 'd';
    }

    function escHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Emoji selector
    sidebar.querySelectorAll('.sw-gb-emoji').forEach(btn => {
      btn.addEventListener('click', () => {
        sidebar.querySelectorAll('.sw-gb-emoji').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Send message
    const gbSendBtn = document.getElementById('swGbSend');
    const gbInput = document.getElementById('swGbInput');
    if (gbSendBtn && gbInput) {
      async function sendMessage() {
        const text = gbInput.value.trim();
        if (!text) return;
        const emoji = sidebar.querySelector('.sw-gb-emoji.active')?.dataset?.emoji || '\uD83D\uDE0A';
        gbSendBtn.disabled = true;
        try {
          const res = await fetch('/api/sidebar/guestbook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, emoji })
          });
          const data = await res.json();
          if (data.ok) {
            gbInput.value = '';
            // Re-fetch all messages
            gbLoaded = false;
            loadGuestbook();
          } else {
            const zhLang = document.body.getAttribute('data-lang') === 'zh';
            alert(data.error || (zhLang ? '发送失败' : 'Send failed'));
          }
        } catch {
          alert('Network error');
        }
        gbSendBtn.disabled = false;
      }

      gbSendBtn.addEventListener('click', sendMessage);
      gbInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }

    // ========== QUOTE ==========
    let quoteLoaded = false;
    async function loadQuote() {
      try {
        const res = await fetch('/api/sidebar/quote');
        const data = await res.json();
        const textEl = document.getElementById('swQuoteText');
        const authorEl = document.getElementById('swQuoteAuthor');
        if (textEl) textEl.textContent = `"${data.text}"`;
        if (authorEl) authorEl.textContent = `— ${data.author}`;
        quoteLoaded = true;
      } catch {}
    }

    document.getElementById('swQuoteRefresh')?.addEventListener('click', () => {
      loadQuote();
    });
  }

  // Init sidebar on load
  initSidebarWidgets();

})();
