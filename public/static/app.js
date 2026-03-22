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

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (activePanel && !e.target.closest('.sidebar-widgets')) {
        closePanel();
      }
    });

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

        // Province positions on a simplified China map (x%, y% in 100x80 viewBox)
        const provPos = {
          '北京':[67,30],'天津':[69,33],'上海':[78,50],'重庆':[54,53],
          '河北':[65,32],'山西':[60,35],'辽宁':[74,24],'吉林':[77,18],
          '黑龙江':[78,10],'江苏':[74,45],'浙江':[77,52],'安徽':[70,47],
          '福建':[74,58],'江西':[68,56],'山东':[70,38],'河南':[63,42],
          '湖北':[60,48],'湖南':[58,56],'广东':[64,66],'海南':[59,76],
          '四川':[45,50],'贵州':[51,58],'云南':[42,62],'陕西':[55,40],
          '甘肃':[42,35],'青海':[34,38],'台湾':[78,62],
          '内蒙古':[55,20],'广西':[55,66],'西藏':[24,42],
          '宁夏':[50,35],'新疆':[22,22],'香港':[67,70],'澳门':[63,72],
        };

        // Draw China map outline (simplified) + province dots
        if (mapEl) {
          const maxCount = Math.max(...Object.values(provinces).map(Number), 1);
          // Simplified China border path
          const chinaPath = 'M22,18 L30,12 L42,10 L55,8 L65,10 L72,8 L80,10 L82,16 L78,22 L80,28 L75,30 L72,36 L74,40 L78,44 L80,48 L78,54 L76,58 L74,62 L70,66 L66,70 L60,72 L56,76 L54,72 L56,68 L52,64 L48,62 L42,64 L38,60 L40,54 L44,50 L48,44 L50,38 L46,34 L40,32 L34,36 L28,38 L22,40 L18,36 L20,28 L22,22 Z';

          let dots = '';
          for (const [prov, count] of Object.entries(provinces)) {
            const pos = provPos[prov];
            if (!pos) continue;
            const r = 2.5 + Math.min((Number(count) / maxCount) * 3, 3.5);
            const opacity = 0.5 + Math.min((Number(count) / maxCount) * 0.5, 0.5);
            dots += `<circle cx="${pos[0]}" cy="${pos[1]}" r="${r}" fill="var(--accent)" opacity="${opacity}">` +
              `<animate attributeName="r" values="${r};${r+1.2};${r}" dur="2.5s" repeatCount="indefinite"/>` +
              `<animate attributeName="opacity" values="${opacity};${Math.min(opacity+0.2,1)};${opacity}" dur="2.5s" repeatCount="indefinite"/>` +
              `</circle>`;
            // Province label for top 3
            dots += `<text x="${pos[0]}" y="${pos[1]+5}" text-anchor="middle" fill="var(--text-tertiary)" font-size="3.2" opacity="0.7">${prov}</text>`;
          }

          mapEl.innerHTML = `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
            <path d="${chinaPath}" fill="none" stroke="var(--border)" stroke-width="0.5" opacity="0.6"/>
            ${dots}
          </svg>`;
        }

        // Province list tags (sorted by count)
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
