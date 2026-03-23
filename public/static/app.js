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

    if (actual === currentTheme) {
      document.querySelectorAll('.theme-toggle i').forEach(i => i.className = iconClass);
      return;
    }

    // Switch instantly — no overlay, no delay
    document.documentElement.setAttribute('data-theme', actual);
    document.documentElement.style.colorScheme = actual === 'dark' ? 'dark only' : 'light only';
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', actual === 'dark' ? 'dark only' : 'light only');

    // Icon rotate animation as visual feedback (only on user click)
    if (clickEvent && !themeAnimating) {
      themeAnimating = true;
      document.querySelectorAll('.theme-toggle i').forEach(i => {
        i.className = iconClass + ' theme-icon-anim';
      });
      setTimeout(() => {
        themeAnimating = false;
        document.querySelectorAll('.theme-toggle i').forEach(i => i.classList.remove('theme-icon-anim'));
      }, 350);
    } else {
      document.querySelectorAll('.theme-toggle i').forEach(i => i.className = iconClass);
    }
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

      // Quick fade-out on content area
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
          // Fade in with upward slide
          const newPortal = document.querySelector('.portal') || document.body;
          newPortal.classList.add('lang-switch-in');
          setTimeout(() => newPortal.classList.remove('lang-switch-in'), 300);
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
      }, 230);
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
    // Track visitor once per page load (POST — records IP, deduplicates on server)
    let visitorTracked = false;
    let visitorDataCache = null;
    async function trackVisitor() {
      if (visitorTracked) return;
      visitorTracked = true;
      try {
        const res = await fetch('/api/sidebar/visitors/track', { method: 'POST' });
        const data = await res.json();
        // Cache the result from track (it returns updated data)
        if (data && typeof data.total !== 'undefined') {
          visitorDataCache = data;
          // If the visitors panel is already open, refresh it immediately
          renderVisitorMap(data);
        }
      } catch {}
    }
    // Track on first page load
    trackVisitor();

    // China province SVG paths (Mercator projection, viewBox 0 0 516 505)
    const provPaths = {
      '北京':'M363.9,163.8L365.3,162.9L360.8,162.4L358.2,158.6L355.7,160L356.7,161.8L350.8,164.6L352.7,167.1L348.3,170.1L349.1,174.2L354.6,174.3L356.5,175.8L357.2,174.2L359.4,174.2L360.7,172.3L359.3,169.6L363.9,168.5L362.8,164.6L363.9,163.8Z',
      '天津':'M367.3,176.3L368.7,174.4L366.9,174.9L365.2,171L367.4,169.3L364.5,167.3L362.7,169.2L362.5,173.7L359.6,174L360.4,179.3L359,183L363.2,185.1L367,183.8L366.3,182.2L368,182L369.7,178L365.3,176.7L367.3,176.3ZM367.6,176.5L368,176.5L368,176.2L367.3,176.3L367.5,176.5L367.6,176.5Z',
      '河北':'M364.9,163L362.9,166L367.4,169.3L365.2,171L366.4,174.4L368.7,174.4L367.7,176.7L373.2,181.4L384.4,170.4L381.9,164.1L376.1,161.2L379.3,155.9L372.1,155.6L370.3,151.3L371.6,147.8L367.6,141.7L360.6,143.9L358.9,149L356,148.3L353.8,150.9L351.6,149.1L347.9,152.8L343.7,152.8L343.5,146.9L339.6,148.9L335.3,158.2L341.1,166.3L336,169.8L341.4,174.4L339.6,179.7L335.9,179.7L333.2,185L337.9,194.2L332.4,204L334.6,207.5L344.2,210.6L348.8,209.6L347.1,206.1L352.8,197.6L367.4,189.4L368.9,186.9L366.3,184.3L359,183L359.6,174L356.5,175.8L348.4,172.6L348.6,169.6L352.7,167.1L351,164.2L356.7,161.8L355.7,160L358.2,158.6L360.8,162.4L364.9,163ZM362.8,169.1L361.5,169.3L361.3,169.6L359.3,169.6L359.1,170.3L359.4,171.1L360.4,171.6L360.7,172.3L360.3,172.4L360.2,173.2L360.6,173L361,173.8L362.5,173.7L362.4,172.6L362.8,172.4L362.4,171.9L363.1,171.7L363.1,171.4L362.4,171.2L362.3,170.5L362.7,170L362.8,169.1ZM367.5,176.5L366,176.1L365.3,176.7L366.5,177.1L366.5,176.7L367.5,176.5ZM376.3,179L375.9,179.3L376.2,179.4L376.3,179Z',
      '山西':'M307.4,225.1L333.7,214.8L334.6,207.5L332.4,204L337.9,194.2L333.2,185L335.9,179.7L339.6,179.7L341.4,174.4L336,169.8L341.1,166.3L337.8,162.1L332.7,166.4L323,167.2L320,173.9L316.4,173.5L313.4,176.6L311.4,186.1L308.4,188.8L310.7,195.4L307.4,200.8L309.2,214.8L306.2,222.3L307.4,225.1Z',
      '内蒙古':'M200.2,139.7L205.6,152.2L203.7,154.1L209.6,160.1L209.7,163.9L212.3,161.7L213.4,163.5L216.4,160.8L224,160.6L224.5,167L218.6,171.1L229.9,176.2L231,181L233.1,180.2L237.5,184L239.9,181.6L238,179.5L243,177.8L247.5,179.4L256.3,176.1L257.2,180.6L250.8,186.6L250.4,190.4L257.1,196.9L269.9,192.9L271.1,182.6L276.7,176.5L279.7,180.2L276.3,188.1L289.1,194.7L294.4,194.1L296.6,186.3L303.5,177.6L306,177.5L305.5,175.7L309.4,177.7L313.5,174.3L312.9,176.3L315.1,176L316.4,173.5L320,173.9L323,167.2L326.6,168.2L337.3,164.3L335.7,154.8L338.6,153.7L341.3,147L343.8,147.4L343.7,152.8L347,153L351.6,149.1L353.8,150.9L356,148.3L358.9,149L360.6,143.9L367.6,141.7L371.6,147.8L370.3,151.3L372.3,155.9L378.9,156.2L380.7,153.1L379.3,146.2L381.4,144.2L386.2,151.7L389.2,147.3L401.2,140.9L405.2,139.2L408.6,140.6L414.5,137.4L412.9,124.4L410.8,120.5L403.9,123.4L403.1,109.8L398.8,106.2L400.4,103L407.7,106.7L408.1,102.4L411.3,100.4L409.8,96.5L414.7,95.2L412.3,91.5L412.8,93.4L409.8,94.7L405.1,87.3L420,73L422.2,77.7L424.5,65.8L428.2,63.3L428.1,53.5L434.6,41.4L427.1,33.4L421.2,38.5L409.8,38L406.8,28.1L408.1,25.6L403.1,22.2L400.4,25.2L395.4,21.3L400.2,14.8L397.6,11.1L392.6,11.7L385.7,18.7L386.1,21.2L391.4,21.9L391.8,26.9L386.2,33.2L379.6,47.1L380.2,52.7L367.7,60.8L358.8,56.7L351.5,76.3L349.2,77.6L352.5,83.3L359.4,80.7L364.2,83.8L367.7,79.3L373.8,79.6L383.2,89.2L384.7,95.4L376.1,94.2L365.1,96.2L364.1,99.1L357.7,99.9L355.3,105.9L350.5,109.6L341.6,110.2L333.8,117.8L320.5,113.8L315.8,122.2L320.1,129.7L313,133.4L307.8,139.9L298.5,143.7L283.7,143.4L263.8,153L259.8,152.1L259.9,149.8L251.1,149.8L229.8,141L219.1,142.2L200.2,139.7Z',
      '辽宁':'M414.1,172.2L419.2,172.6L423.9,166L431.6,161.7L432.5,157.5L428.4,150.4L430,146.9L425,139.8L425.1,135.9L420.9,138.8L420.2,134.8L416.3,132L411.7,139.3L401.2,140.9L389.2,147.3L386.2,151.7L384.2,146.1L381.4,144.2L379.6,145.6L380.6,154.2L376.1,161.2L381.9,164.1L384.3,170.1L389.1,168.1L394.6,160.7L400.2,160.4L403.7,164.4L395.4,174.6L397.4,177.4L399.5,176.6L394.7,183.3L414.1,172.2ZM406.9,177.5L406.5,177.5L406.1,177.2L405.8,177.4L406.4,177.6L407.2,177.6L407.2,177.6L407.1,177.6L407,177.6L406.9,177.4L406.9,177.5ZM404.3,178.7L404.5,178.9L404.7,178.6L404.9,178.8L404.8,178.5L404.9,178.2L404.5,178.3L404.3,178.6L404.3,178.6L404.3,178.7L404.3,178.7ZM407.3,178L407.3,178.3L407.8,178.1L407.7,177.9L406.9,177.9L406.8,178L407.3,178L407.3,178L407.3,178ZM407.7,180.1L407.4,180L407.6,180.3L407.8,180.4L407.7,180.1L407.7,180.1ZM410,174.7L409.5,174.7L409.4,175L409.8,175.3L410.1,174.9L410,174.7ZM405.8,177.9L405.8,178.1L406.1,178.1L405.8,177.9ZM391.8,164.9L392.2,164.7L392.2,164.5L392,164.3L391.7,164.8L391.8,164.9ZM410.5,176L410.5,175.7L410.2,175.7L410.5,176ZM411.1,180.2L411.5,179.9L411.4,179.6L411,179.5L411,180L411.1,180.2ZM415.6,172.6L416,172.5L415.7,172.4L415.6,172.6Z',
      '吉林':'M463.4,143.9L465.8,137.4L471.9,143.8L469.9,140.4L475.9,138.1L477.3,131.9L473.6,132.6L470,130.2L469.6,125.7L457.5,131.4L453.4,120.4L448.6,125.4L446.8,119.7L442.7,119.8L442,113.4L434.1,113L431.6,108.9L421.2,109.8L417.9,106L417.6,99.9L408.1,102.4L407.7,106.7L399.8,103.3L398.8,106.2L403.6,111.7L402.1,115.9L403.9,123.4L410.8,120.5L413.2,132.9L416.8,132.3L421.7,139.1L425.1,135.9L425,139.8L430,146.9L428.6,152L432.5,157.5L430.8,160.4L434.5,160L441.7,150.5L444.3,154L451.3,155.3L453,153.1L450.7,148.4L458.1,148.2L461.5,143.4L463.4,143.9Z',
      '黑龙江':'M414.4,100.7L417.6,99.9L417.9,106L421.2,109.8L431.6,108.9L434.1,113L442,113.4L442.7,119.8L446.8,119.7L448.6,125.4L453.4,120.4L457.5,131.4L469.6,125.7L470,130.2L475.9,132.7L477.3,125.7L474.5,116.6L482,110.9L490.6,114.6L492.1,113.4L498.4,100.3L500.5,87.6L505.4,82.9L504.6,76.4L508,74.2L492,77.9L487.4,82.9L474.6,83L472,78.2L472.2,68.7L468.6,68.9L462.7,62L448.9,59.9L446.6,57L447.2,51.7L441.7,41.2L438.7,27.2L431,14.5L425,14.3L414.8,8.2L400.2,10L397.6,11.1L400,15.4L395.1,21L400.4,25.2L403.1,22.2L408.1,25.6L406.8,28.1L409.8,38L421.2,38.5L427.1,33.4L434.6,41.4L428.1,53.5L428.2,63.3L424.5,65.8L422.2,77.7L420,73L405.1,87.3L409.8,94.7L412.8,93.4L412.3,91.5L414.7,92.8L414.7,95.2L409.8,96.5L411.3,100.4L414.4,100.7Z',
      '上海':'M392.8,259.7L393.5,259.7L393.5,261.4L394.4,261.2L395.8,262.9L399.1,261.5L401.2,261.9L401.6,261.1L401.3,259.2L399.4,256.9L396.4,255L394.5,256.3L394.2,258.3L392.6,258.5L392.8,259.7ZM401.5,254L398.4,253.1L397.1,252.5L396.2,251.6L395.7,251.6L394.5,252.6L396.6,254.6L397.1,254.2L400.2,255.7L401.5,255.4L401.5,254ZM400,256.7L400,256.4L399.6,256L398.3,255.5L398.2,255.2L397.8,255.1L397.7,255.2L398.2,255.7L399.5,256.5L399.8,256.8L399.9,256.9L400,256.7ZM400.1,256.4L400.4,257L402.5,257.4L402.7,256.9L400,256.2L400.1,256.4ZM398.7,255.6L398.7,255.5L398.3,255.3L398.7,255.6ZM401.2,257.8L401.4,258.3L401.7,258.3L401.8,257.7L401.3,257.6L401.2,257.8ZM400.7,257.5L401,258L401.1,257.6L400.7,257.5Z',
      '江苏':'M363.6,225.4L362.5,226.7L359.6,221.4L355.9,223.9L362.2,230L366.6,231L367.2,233.8L370.5,233.5L368.7,238.1L371,238.8L372.3,243.4L376.1,241.1L378.8,242.4L378,246L373.8,244.7L374.7,247.9L372.4,249.6L376.2,253.9L375.7,257.6L384.8,258.2L389.6,262.1L396.4,255L395.2,251.9L401.5,254L397,246.2L393.3,244.4L388,227.9L379.3,223.1L379.7,220L376.2,220.9L372.3,226.9L368.8,224.3L363.6,225.4Z',
      '浙江':'M372.7,285.1L375.7,285.6L376.6,292.7L382.3,290.8L383.6,294.1L387.6,293L389.5,295.7L391.8,289.9L395.1,289.4L394.1,286.9L398.7,285.5L398.5,277L401.4,278.1L400.3,272.5L402.9,270.4L394.3,264.4L395.8,262.4L393.2,259.5L389.4,262.1L382.8,258.2L379.3,263.5L380.6,265.7L376.4,266.3L375.3,271.7L369.4,277L372.7,285.1ZM403,269.3L404.3,269.8L404.5,269L404.2,268.9L404.1,268.3L402.9,268.2L402.5,267.8L401.3,267.5L401.9,269.3L403,269.3ZM403.4,267.5L403.1,267.4L402.9,267.4L402.9,267.7L403.1,267.9L403.4,267.5ZM403.6,271.9L403.4,272L403.9,272.2L403.6,271.9L403.6,271.9ZM405.2,262.3L405.2,262.7L406,262.7L406,262.4L405.5,262.5L405.3,262.2L405.2,262.3ZM403,266.1L402.2,266.5L402.9,266.9L403.6,267L403.7,266.4L403.5,266.1L403.2,266.1L403.1,265.9L403,266.1ZM404.3,266.9L403.9,267L404.6,267L404.7,266.8L405.1,267L405,266.7L404.4,266.7L404.3,266.9ZM401.9,276.9L401.8,277.1L402.2,277.1L402.3,276.9L402,276.6L401.9,276.9ZM404.7,270.2L404.8,270.8L405.1,270.8L405,270.5L405.2,270.3L405.2,270L405,269.7L404.9,269.8L404.5,269.6L404.4,269.8L404.4,270.1L404.6,270.2L404.6,270.2L404.7,270.2ZM405.2,265.4L405.2,265.1L404.7,264.9L403.9,264.8L404,265.3L404.3,265.4L404.6,265.3L405.2,265.4ZM400.4,280.7L400.6,280.6L400.6,280.3L400.4,280.7ZM403.8,270.7L403.5,270.8L403.7,271.1L404.2,271.4L404.3,271.3L404.1,270.9L404.3,270.8L403.8,270.7ZM400,277.8L400.3,278.1L400.4,277.8L400.2,277.6L400,277.8ZM395.2,291.2L395.2,291.3L395.2,291.3L395.2,291.2L395.2,291.2ZM401.2,261.9L401.4,262.8L401.7,263L402.4,263.6L402.8,263.6L402.3,263.1L401.8,262.9L401.6,262.7L401.6,262.1L401.4,261.8L401.2,261.9ZM400.8,283.4L401,283.2L400.7,283.2L400.8,283.4ZM403.2,272.5L403.4,272.1L403.3,271.9L402.9,271.6L402.8,271.2L402.4,271.3L402.1,271.9L402.3,272L402.5,271.9L402.8,272.4L403.2,272.5ZM405.4,269.8L405.4,269.8L405.4,269.7L405.4,269.8L405.4,269.8L405.3,269.8L405.3,269.8L405.4,269.8L405.4,269.8L405.4,269.9L405.4,269.9L405.4,269.9L405.5,269.9L405.4,269.8L405.4,269.8ZM406.3,263.2L406.2,262.8L406.1,263.1L406.3,263.2ZM400.6,283.9L401,283.7L400.8,283.6L400.6,283.9ZM402.2,267.5L402.1,267.4L401.8,267.5L401.9,267.7L402.2,267.5ZM404.9,269.5L405,269L404.8,269L404.7,269.4L404.9,269.5ZM400.5,269.4L400.7,269.6L401.1,269.3L401.1,268.7L400.8,268.3L400.5,268.3L400.4,268.8L400.4,269.4L400.5,269.4ZM394.1,292.6L394.1,292.7L394.4,292.9L394.1,292.6L394.1,292.6ZM401.3,276.8L401.5,277.1L401.5,276.8L401.3,276.8ZM402,271.5L401.8,271.6L401.9,271.9L402,271.5ZM401.2,268.2L401,268.4L401.3,268.6L401.4,268.2L401.2,268.2ZM401.3,266.5L401.7,266.3L401.6,266L401.2,266.1L401.1,266.3L401.3,266.5ZM403.3,269.6L403,269.3L402.9,269.5L402.9,269.5L403,269.5L403.2,269.6L403.3,269.6ZM404,271.8L404.1,271.6L403.8,271.5L403.7,271.2L403.4,271.4L403.7,271.7L404,271.8ZM394.7,289.7L394.7,289.8L394.7,289.7L394.7,289.7ZM407.9,267.9L408.1,268L408,268L408,268L407.9,267.9L407.9,267.9L407.9,267.9L407.9,267.9ZM403.8,266.7L403.8,267L404.3,266.9L404.1,266.7L403.8,266.7ZM404,270.5L404.2,270.6L404.5,270.5L404.5,270.3L404.1,270.3L404,270.5ZM408,262.7L408.2,262.5L408,262.4L407.8,262.5L408,262.7ZM394.4,288.4L394.8,288.1L394.6,287.9L394.1,287.9L393.9,288.3L394.4,288.4ZM395.1,288.1L395.5,287.9L395.2,287.8L395,288L395.1,288.1ZM405.4,269.6L405.3,269.6L405.3,269.7L405.3,269.7L405.3,269.7L405.4,269.7L405.4,269.7L405.4,269.6L405.4,269.6ZM408.5,262.7L408.4,262.4L408.2,262.5L408.5,262.7ZM403.3,269.5L403.6,269.7L403.9,269.9L403.6,269.6L403.3,269.5ZM401.9,269.7L402,269.9L402.2,269.6L401.9,269.7ZM393.9,288L394.3,287.8L394.2,287.7L393.9,288ZM405.5,269.9L405.5,269.9L405.5,269.9L405.5,269.9L405.5,269.9ZM402.9,269.5L403,269.5L402.9,269.5L402.9,269.5Z',
      '安徽':'M357.9,230.8L354.2,233.8L350.2,230.3L347.2,239.4L344.1,239.4L346.5,244.6L350,246.4L352.3,244.9L352.3,252.1L347.9,256.5L353.5,259.7L351.1,262.8L354.1,270.9L358.4,268.5L360.3,269.7L358.8,273.3L362.9,269.9L365.5,273.1L371.8,274.6L376.5,269.8L376.4,266.3L380.6,265.7L379.3,263.5L382.5,259.6L380.2,257L375.1,257.1L376.2,253.9L372.2,251L374.7,247.9L373.8,244.7L378,246L378.8,242.4L376.1,241.1L372.3,243.4L371,238.8L368.7,238.1L370.5,233.5L367.2,233.8L360.9,227.1L354.6,225.3L357.9,230.8ZM376.2,254.9L376.2,255L376.4,255.1L376.4,254.9L376.2,254.9ZM358.7,272L358.5,271.9L358.3,272.1L358.5,272.2L358.7,272.1L358.7,272.1L358.7,272.1L358.7,272ZM349,245.8L349,245.8L349,245.8L349,245.8L349,245.8L349,245.8Z',
      '福建':'M377.4,315.3L376.5,312.8L378.3,314.9L379.4,310.6L384.4,310.9L381.2,309.3L382.2,304.5L385.1,302.8L382,300.4L386.6,300.2L385.9,298.2L389.2,295.6L387.6,293L383.6,294.1L382.3,290.8L376.6,292.7L375.7,285.6L372.7,285.1L361.1,291.2L362.5,294.3L357.4,298.4L358.2,301.7L351.9,315.3L359.6,318.1L363.6,327.9L370.5,321.5L370.2,318.8L374.2,319.3L374.5,316.4L377.4,315.3ZM372.6,319.3L372.3,319.8L371.8,319.6L371.6,319.7L371.8,320.1L371.5,320.2L371.9,320.5L372.1,320.2L372.5,320.1L372.9,320.2L373.1,320L372.9,319.4L372.6,319.3ZM381.2,313.2L381.5,313.3L381.6,313.6L381.8,313.5L381.9,313.1L381.7,313.2L381.4,313L381.2,312.7L380.9,312.8L380.9,313.2L381.2,313.2ZM382,309.4L382.3,309L382.1,309.2L382,309.4ZM385.3,304.3L385.6,304L385.4,303.9L385.2,304L385.3,304.3ZM371.1,320.3L371.4,320L371.1,319.9L371.1,320.3ZM384.7,299.8L384.9,300L385.1,299.7L384.7,299.8ZM370.9,319.4L370.8,319.1L370.4,318.9L370,319.1L369.8,319.8L369.9,320L370.4,320.2L370.8,319.8L370.9,319.4ZM384.9,304.8L385.1,304.7L384.8,304.4L384.9,304.8ZM382.6,304.8L382.7,304.6L382.4,304.4L382.3,304.6L382.6,304.8ZM385.7,301.6L386,301.5L386,301.3L385.7,301.3L385.7,301.6ZM382.7,309.2L382.8,309.3L383.2,309.3L383.2,309L382.7,309.2ZM383.5,300.4L383.6,300.6L384,300.4L383.8,300.3L383.5,300.4ZM386.6,301L386.8,300.8L386.7,300.5L386.4,300.9L386.6,301ZM388.4,297.7L388.7,297.5L388.4,297.2L388.1,297.3L388,297.4L388.4,297.7ZM386.7,298.8L386.6,298.8L386.8,298.8L386.8,298.7L386.7,298.8ZM382.8,300.3L383.2,300.2L383.5,300L383.4,299.8L383.1,299.9L382.8,299.8L382.6,300L382.8,300.3Z',
      '江西':'M370.8,274.9L362.9,269.9L358.8,273.3L360.3,269.7L358,268.5L336.6,277.4L338.8,284.8L333.3,292L335.7,293.4L335.6,300L337.6,300.8L336.4,304.6L338.7,304.6L336,308.7L336.9,312.5L342.8,312.5L338.1,317.8L340,319.5L348.2,316.8L351.7,318.9L351.8,313.1L358.2,301.7L357.4,298.4L362.5,294.3L361.1,291.2L373.1,284.8L369.5,277.6L370.8,274.9Z',
      '山东':'M356,224.7L356.6,222.1L359.6,221.4L362.5,226.7L368.8,224.3L372.5,226.8L376.2,220.9L380.4,220.3L382.7,215.2L387.9,211.4L386.9,209.1L391.2,209.9L392.3,204.9L401.8,201.4L405.7,202.2L407.4,196.8L398.2,196.6L391.4,192.5L387.3,194L383.3,199.7L380,199.9L376.8,195.7L379.7,192.2L376.6,189.4L368.4,187.7L364.7,192.3L359.5,192.4L347.1,206.1L347.6,213.2L353.4,211.4L343.4,220.6L349.4,225.4L356,224.7ZM391.4,191.4L391.3,191.7L391.7,191.9L391.7,191.6L391.4,191.4ZM391.1,191L391.4,191.2L391.3,190.9L391.1,191ZM393.5,207L393.4,206.8L393.2,207L393.5,207ZM391.5,189.3L391.8,189.2L391.5,188.8L391.5,189.3ZM392.9,187.3L392.9,187L392.7,187.1L392.9,187.3ZM386.7,213.5L386.8,213.7L387,213.6L386.9,213.3L386.7,213.5ZM390.5,191.4L390.6,191L390.3,191L390.5,191.4ZM392,187.9L392.3,187.7L392.1,187.5L392,187.9ZM397.5,195.2L397.5,195.2L397.5,195.1L397.5,195.2L397.5,195.2ZM397.5,195.1L397.5,195.2L397.5,195.1L397.5,195.1ZM397.5,195.1L397.5,195.2L397.5,195.2L397.5,195.1L397.5,195.1L397.5,195.1ZM348.9,212.2L348.8,212.3L349,212.2L349,212.2L348.9,212.2Z',
      '河南':'M326.3,246.9L334.6,246.4L335.6,251.8L341.5,252.6L343.5,255.5L346.2,254.1L347.9,256L352.1,252.4L352.3,244.9L350,246.4L346.5,244.6L344,239.8L347.2,239.4L347.8,235.6L350.1,235L350.2,230.3L355.1,233.6L358.2,232L357.7,228.3L343.4,220.6L353.8,210L347.8,213.3L348.6,209.4L344.2,210.6L334.6,207.5L333.7,214.8L331.1,216.9L326.4,219.1L321,218.3L321,220.6L317,222.7L307.4,225.1L314.5,241.8L321.8,246.7L326.3,246.9ZM334.9,247.6L334.9,247.4L334.7,247.7L334.8,247.6L334.9,247.6Z',
      '湖北':'M312.8,239L299.7,239.2L305.6,242.9L304.4,245.1L301.3,244.5L300.2,247.4L300.9,252.9L305.9,258.3L304.9,261.7L302.5,261.2L299,264.7L296.5,263.1L291.5,264.6L291.1,270.7L293.4,270.6L297.3,277L302.5,271.5L308.8,271.9L308.3,268.7L311.2,268L322.9,273.7L328.8,271.4L329.3,274.5L333.3,270.6L333.6,276.2L335.9,278.3L349,270.7L354.1,270.9L351.1,262.8L353.6,260.2L351.9,258.4L346.2,254.1L343.5,255.5L341.5,252.6L336.7,252.7L334.6,246.4L323.2,247.2L317.1,244.6L312.8,239ZM297,263.9L297,263.8L297,263.8L297,263.9ZM312.8,238.7L312.7,238.9L312.7,239L312.8,239L312.8,238.7ZM326.3,246.9L326.5,246.9L326.5,246.9L326.4,246.9L326.3,246.9ZM327.8,271.2L327.8,271.3L328,271.4L328.1,271.3L327.8,271.2Z',
      '湖南':'M320.7,317.3L322,313.4L327.6,315.9L327.5,312L336.3,311L338.7,304.6L336.4,304.6L337.6,300.8L335.6,300L335.7,293.4L333.3,292L338.8,284.1L338,280.1L333.6,276.2L333.3,270.6L329.3,274.5L328.8,271.4L322.9,273.7L311.2,268L308.3,268.7L307.9,272.4L303.2,271.3L299.5,273.9L297.7,281.9L299.9,291.8L294.5,296.2L300,295.7L301,299.2L298.5,299.7L298.4,303L301.7,307.1L304,304.2L306.4,306.3L309.2,303L314.7,303.5L313.9,306.4L316.3,307.3L312.1,315.2L314.6,313.6L316.1,318L320.7,317.3ZM300.5,299.3L300.4,299.2L300.4,299.2L300.5,299.3Z',
      '广东':'M333.2,339.7L334.1,335.2L335.9,337.7L340.9,337.7L342.5,334.6L343.9,336.8L346.4,334.3L349.5,335.8L350.2,333.9L357.1,333.4L362.7,327.8L359.6,318.1L352.1,315.6L351.7,318.9L348.2,316.8L340.2,319.6L338.1,317.8L342.7,313.9L341.1,311.3L337.1,312.7L336.8,311L333.4,312.2L330.5,310.4L327.5,312L327.6,315.9L322,313.4L315.3,333.7L310.4,336.6L309.8,340L307.1,339.8L307.5,342.5L302.2,344.9L303.5,356.9L308.7,355.3L305.8,351.2L307.7,348.6L328.1,342.9L329.3,340.4L330.8,342.7L333.2,339.7ZM361.3,328.9L361,328.7L360.7,328.9L360.7,329L361.3,329.1L361.5,329.2L361.8,329.1L362.1,329.3L362.3,329.2L362.3,328.7L362.2,328.5L361.9,328.7L361.6,328.6L361.3,328.8L361.3,328.9ZM327.4,343.8L327.6,343.5L327.3,343.5L326.9,343.8L326.4,344L326.2,344.3L326.5,344.4L326.8,344.4L326.4,344.9L326.8,345.3L327.1,345.1L327,344.9L327.2,344.5L327,344.3L327.3,343.8L327.4,343.8ZM324.8,345.2L325.1,345.1L325.2,344.9L325.6,345L325.9,344.7L325.7,344.4L325.9,344.3L325.9,344L325.3,344.2L325.1,344.4L325.1,344.6L324.9,344.8L324.8,345.2ZM338.6,341.4L339.3,341.2L339.2,341.1L338.7,341.2L338.6,341.4ZM307.8,348.8L308.3,349L308.4,349L308.7,349.5L309,349.4L309.4,348.4L309.1,348.6L308.5,348.6L308.3,348.4L307.9,348.6L307.8,348.7L307.8,348.8ZM324,344.5L324.2,344.6L324.2,344.2L324,344.5ZM308.5,349.6L306.8,349.5L305.9,350.8L307.6,350.3L308.1,350.4L308.4,351L308.8,349.7L308.5,349.6ZM334.8,341.9L334.9,341.5L334.7,341.6L334.8,341.9ZM334.5,342.2L334.7,342L334.5,342L334.5,342.2ZM329.8,343L329.9,342.8L330.3,342.7L330,342.6L329.7,342.7L329.8,343ZM335.3,338.1L335.2,337.9L335,337.9L335.3,338.1ZM338.3,341.7L338.6,341.6L338.2,341.4L338.3,341.7ZM338,341.8L338.1,341.5L337.8,341.7L338,341.8ZM359.2,352.2L359.2,352.4L360.1,352.5L360.2,353L359.9,353.5L359.1,353.7L359.4,353.9L360,353.8L360.3,353.6L360.6,353.1L360.5,352.6L360.2,352.2L359.6,352.2L359.2,352.2ZM328.8,342.9L329,342.6L328.7,342.7L328.8,342.9ZM307.6,353L307.8,353.1L307.6,352.8L307.6,353ZM309.5,350.8L309,350.7L308.7,351L308.8,351.5L309.2,351.5L309.5,351L309.5,350.8ZM308.8,356.1L309.1,355.8L309,355.6L308.8,356.1ZM352.5,349.4L352.6,349.7L352.9,349.9L353.3,350.1L353.5,349.9L353.3,349.3L353.2,349.2L352.7,349.2L352.5,349.4ZM352.4,350.4L352.5,350.7L352.7,351L353,350.9L353,350.7L352.6,350.3L352.4,350.4ZM351.6,335.2L351.6,335.2L351.6,335.2L351.6,335.2ZM351.6,335.2L351.6,335.2L351.6,335.2L351.6,335.2Z',
      '广西':'M300.1,305.7L298.6,308.6L295.3,308.6L296.4,310.4L293.6,309.4L293.1,312.2L290.9,310.2L286.1,313.9L281.6,309.5L272,318.3L265.4,315L259.5,318.1L261.3,321L264.6,320.2L265.8,323.4L272.2,323.1L273,327.7L268.9,329.2L268.4,332.2L278.6,334.5L276.4,337.5L277.5,341.9L283.1,345.1L302.5,346.3L303.8,342.9L307.5,342.5L307.1,339.8L309.8,340L310.4,336.6L315.3,333.7L315.6,328.6L320,324L320.7,317.3L316.1,318L314.6,313.6L312.1,315.2L316.3,307.3L313.9,306.4L314.7,303.5L309.2,303L306.4,306.3L304,304.2L302.5,307.2L300.1,305.7ZM264.5,315.6L264.5,315.6L264.3,315.7L264.4,315.7L264.5,315.6ZM296.9,350.1L297.1,350L297.1,350.1L297.3,349.9L297.3,349.7L296.9,349.8L296.9,350L296.9,350.1Z',
      '海南':'M305.1,358.7L298.6,359.6L293.3,364.5L293.6,372.3L300.9,374.9L308.3,370.5L312.8,361L309.9,357.5L305.1,358.7ZM322.2,493.1L322.5,493.4L322.8,493.2L322.6,492.8L322.3,492.8L322.2,493.1ZM330.8,458.4L331.2,458L331.4,457.9L331,458.5L331.5,458L331.8,457.5L331.8,457.1L331.5,457L331.5,457.5L331,458L330.8,458.4ZM320.5,493.3L320.6,493.5L321,493.5L321.1,493.2L320.8,493L320.5,493.3ZM316.2,383.9L316.8,383.7L316.3,384.1L316.9,383.8L316.8,383.6L316.1,383.8L316.2,383.9ZM366.9,399.9L366.9,400.5L367,400.6L367.8,400.5L367,400.4L367,399.8L367.1,399.6L367.5,400L367.9,400.1L367.5,399.9L367.2,399.5L366.9,399.6L366.9,399.9ZM322.5,492.6L322.9,492.5L322.9,492.3L322.6,492.3L322.5,492.6ZM318.4,391.4L318.7,391.4L319,391.2L319,390.8L318.7,390.7L318.2,390.9L318.8,390.9L318.8,391.2L318.4,391.4ZM317.7,390.9L317.1,391.3L317,391.7L317.4,391.7L318,391.3L317.3,391.5L317.3,391.4L317.9,390.8L317.7,390.9ZM335.9,462.7L336.6,463.3L339.7,462.4L340.5,461L341.3,460.4L341.1,459.9L340.1,459.8L338.9,460.5L338.5,461.2L335.9,462.7ZM336.6,452.3L336.9,452.6L337,453L337.2,452.8L337.1,452.5L336.7,452.3L336.6,452.3ZM336.4,452.6L336.5,453L336.8,452.9L336.6,452.6L336.4,452.6ZM320.3,390.3L320.5,390.5L321.1,390.3L321.1,390.1L320.9,390L320.5,390.1L320.3,390.3ZM318.4,389.2L318.6,389.1L318.8,388.7L318.6,388.4L318.6,388.9L318.4,389.2ZM322.3,452.4L322.2,452.2L322,452.4L322.3,452.4ZM335.1,464.6L335.4,464.7L335.4,464.5L335.1,464.6ZM338.3,453.2L338.4,453.5L338.8,453.5L338.6,453L338.3,453.2ZM322.4,384.6L322.2,384.7L322.3,384.9L322.9,384.9L322.7,384.6L322.4,384.6ZM342.3,440.2L342.5,440.5L342.6,440.4L342.8,440L342.6,439.9L342.3,440.2ZM351.7,445.4L351.9,445.5L351.9,445.9L352.2,445.7L352.4,444.8L352.2,444.7L351.9,444.9L351.7,445.4ZM341.8,443.3L342,443.7L342.2,443.6L342.3,443.2L341.8,443.3ZM334.9,462.4L334.9,462.7L335.2,462.7L335.4,462.4L334.9,462.4ZM299.9,464.8L299.9,465.1L300.3,465L301.9,463.5L303.9,463.4L302,462.9L299.9,464.8ZM355.2,452.2L355.4,452.4L355.7,452.1L355.5,451.9L355.2,452.2ZM324.4,393L325.1,393L325.5,392.7L325.3,392.4L324.3,392.7L324.2,393L324.4,393ZM324.9,452.5L325.1,452.8L325.7,452.7L325.4,452.4L324.9,452.5ZM340.6,436.1L340.6,436.3L340.9,436L341.3,436.1L341.6,436L341.5,435.5L341.3,435.6L340.6,436.1ZM323.8,390.6L323.6,390.8L323.9,390.8L324.4,390.6L324.8,390.6L324.9,390.4L324.6,390.4L323.8,390.6ZM357,439.8L356.7,440.2L356.8,440.5L357.1,440.6L357.6,440.5L358.2,440.3L358.2,440L357.2,440.2L357.4,439.6L357.3,439.5L357,439.8ZM323.3,385.3L323.4,385.2L323.2,384.9L323,384.9L323.3,385.3ZM316.5,389.2L316.4,389.4L316.8,389.4L316.8,389.1L316.5,389.2ZM348.9,443.9L349.3,444.1L349.6,443.9L349.6,443.7L349.1,443.6L348.9,443.9ZM342.2,457.7L342.4,457.9L342.8,457.9L342.6,457.7L342.2,457.7ZM340.9,458.5L341.1,458.6L341.6,458.5L341.8,458.2L341.6,458.2L340.9,458.5ZM346.2,456.3L346.3,456.6L346.8,456.8L347.2,456.9L347.4,456.5L347.3,456.4L346.5,456.2L346.2,456.3ZM335.9,459.4L336,459.8L336.5,459.9L336.5,459.7L336.3,459.3L335.9,459.4ZM348.4,448L348.5,448.4L348.7,448.3L348.6,447.8L348.4,448ZM356.7,449.8L356.9,450.1L357,449.9L356.7,449.8ZM333.8,451.4L333.9,451.6L334.6,451.2L334.5,451.1L333.9,451.3L333.8,451.4ZM342.4,434.7L342.5,434.8L343.2,434.1L343.2,433.9L343,433.9L342.5,434.5L342.4,434.7ZM341.8,431.2L342,431.2L342.1,430.5L341.8,430.5L341.8,431.2ZM344.1,435.9L344.3,436.1L344.5,435.6L344.3,435.6L344.1,435.9ZM317,389.1L317.1,389.3L317.4,389.3L317.2,388.9L317,389.1ZM336.3,452.3L336,452.2L335.9,452.4L336.1,452.6L336.3,452.3ZM303.8,460.7L303.8,460.9L304.2,461L304.7,460.7L305,460.3L304.9,459.9L304.5,459.9L303.9,460.4L303.8,460.7ZM358.9,430.6L359.2,431.2L359.3,431.1L359,430.5L358.9,430.6ZM318,388.1L318.3,388.3L318.2,388L318,388.1ZM324.6,389.1L325.3,388.6L325.2,388.5L324.6,388.9L324.6,389.1ZM318.6,392.5L318.8,392.8L319.1,392.6L319.1,392.4L318.6,392.5ZM335.5,442.9L335.7,443L335.7,442L335.6,442L335.5,442.9ZM343.2,458.1L343.1,458.5L343.3,458.6L343.4,458.3L343.2,458.1ZM357.5,445.1L357.6,445.3L357.8,445.3L357.5,445.1ZM347.2,441.4L347.2,441.6L347.6,441.4L347.2,441.3L347.2,441.4ZM359.7,439.1L359.9,439.2L360,438.9L359.7,439.1ZM342.5,391.6L343.4,391.4L343.3,391.2L342.5,391.4L342.5,391.6ZM352.8,448.6L352.4,448.7L352.5,449L352.8,449.1L353,448.8L352.8,448.6ZM334,449.4L334.1,449.6L334.3,449.4L334,449.4ZM342.2,462.8L342.2,463L342.6,462.8L342.5,462.6L342.2,462.8ZM340.8,437.1L340.9,437.1L341.3,436.6L341.1,436.5L340.8,437.1ZM367.4,436.7L367.6,436.8L367.9,436.4L367.9,436.1L367.6,436.1L367.4,436.4L367.4,436.7ZM338.7,441L338.9,441.1L339.4,440.7L339.3,440.6L338.9,440.8L338.7,441ZM342.3,430.9L342.6,431.2L342.7,430.9L342.6,430.7L342.3,430.9ZM358.2,438.9L358.3,439L358.7,439L358.7,438.8L358.2,438.9ZM308,458.5L308.1,458.9L308.8,458.7L309.1,458.2L308.9,458L308,458.4L308,458.5ZM316.2,455.2L316.4,455.2L316.5,454.9L316.2,455.2ZM347,455.3L347.1,455.5L347.3,455.3L347,455.3ZM330.4,458.9L330.5,458.9L330.9,458.6L330.8,458.5L330.4,458.9ZM337.4,435.4L337.3,435.6L337.6,435.5L337.5,435.2L337.4,435.4ZM363.2,440.4L363.5,440.4L363.5,440.2L363.3,440.1L363.2,440.4ZM338.5,392.7L339.3,392.8L339.2,392.6L338.9,392.5L338.5,392.7ZM309.2,459.4L309.5,459.6L309.5,459.2L309.3,459.1L309.2,459.4ZM349,455.4L349.1,455.7L349.4,455.7L349.5,455.4L349.4,455.2L349,455.2L349,455.4ZM316.8,463.2L316.8,463.4L317.1,463.2L317.4,462.8L317,462.7L316.8,463.2ZM317.7,453.9L317.8,454.4L318.2,454.1L318.1,453.9L317.7,453.9ZM308,461.1L308.2,461.2L308.4,461.1L308.2,460.9L308,461.1ZM323.3,451.9L323.7,451.9L323.6,451.7L323.3,451.9ZM356.8,444.6L356.9,444.8L357.1,444.8L357,444.5L356.8,444.6ZM319.9,458.9L320.1,459L320.5,459.1L320.7,458.9L320.6,458.7L320.1,458.6L319.9,458.9ZM340.5,396.4L340.5,396.6L340.7,396.5L340.5,396.4ZM344.7,434.1L345,434.3L345,434.1L344.7,434.1ZM337.6,393L337.6,393.2L337.8,393L337.6,393ZM353.4,442.2L353.5,442.5L353.8,442.3L353.6,442L353.4,442.2ZM363.3,437.3L363.9,437.5L364.4,437.5L364.5,437.2L364.1,436.9L363.5,437L363.3,437.3ZM343.7,465.6L343.4,466.1L343.8,466L343.7,465.6ZM327.2,452L327.5,452.2L327.6,452L327.2,452ZM317.8,462.3L318.1,462.3L318.5,461.9L318.3,461.7L318,461.8L317.8,462.3ZM322.2,452.6L322.4,452.7L322.5,452.5L322.2,452.6ZM324.8,477.5L324.8,477.7L325.1,477.8L325.1,477.3L324.8,477.5ZM341.6,452.5L342,452.5L342.3,452.2L342.2,452.1L341.8,452.2L341.6,452.5ZM343.8,459.6L344.1,459.9L344.2,459.4L343.9,459.4L343.8,459.6ZM328.2,456.1L328.5,455.9L328.2,455.9L328.2,456.1ZM333.5,468L333.3,468.3L333.7,468.1L333.5,468ZM358.6,390.1L358.7,390.5L359,390.5L359.1,390L358.8,389.9L358.6,390.1ZM363.9,442.3L364,442.5L364.2,442.5L364.1,442.2L363.9,442.3ZM328.6,363.5L328.9,363.4L329,363.2L328.9,363L328.6,363L328.5,363.3L328.6,363.5ZM340.4,392.8L340.7,392.8L341,392.6L340.5,392.5L340.4,392.8ZM335.4,366.2L335.7,366.2L336.1,366L336.1,365.6L335.7,365.5L335.2,365.6L335.1,365.8L335.4,366.2ZM325.8,483.1L325.8,483.5L326.1,483.6L326.4,483.3L326,483L325.8,483.1ZM317.6,460.2L317.8,460.4L318.2,460.4L318.2,460.1L317.7,460L317.6,460.2ZM322.5,452.3L322.8,452.4L322.9,452.2L322.5,452.3ZM327.8,460.7L328.1,460.9L328.1,460.5L327.8,460.7ZM325.2,479.4L325.4,479.7L325.5,480.2L325.7,480L325.5,479.3L325.2,479.4ZM324.8,478.6L324.9,478.9L325.1,478.8L325.1,478.4L324.8,478.4L324.8,478.6ZM347.8,410.3L348.1,410.5L348.4,410.3L348.3,410L347.9,410.1L347.8,410.3ZM333.5,441L333.6,441.2L333.8,441L333.5,441ZM335.6,397.5L335.9,397.6L335.9,397.3L335.6,397.5ZM327.9,484L328.2,484L328.2,483.6L327.9,483.6L327.9,484ZM325,483.1L325.1,483.4L325.5,483.2L325.4,483L325,483.1ZM323.4,478.9L323.6,478.9L323.6,478.7L323.4,478.9ZM322.4,386.6L322.6,386.7L322.6,386.5L322.2,386.3L322.4,386.6ZM322.4,395.6L322.6,395.3L322.5,395.2L322.2,395.5L322.4,395.6ZM325.5,481L325.7,481.1L326.1,480.9L326.1,480.6L325.6,480.7L325.5,481ZM324.3,477.9L324.5,478L324.6,477.6L324.3,477.9ZM330.4,473.3L330.5,473.5L330.6,473.2L330.4,473.3ZM354.2,446.5L354.5,446.6L354.5,446.4L354.2,446.5ZM344.5,463.5L344.5,463.7L345,463.7L345,463.3L344.5,463.5ZM316.9,461L317.1,461.3L317.4,460.8L317.3,460.6L316.9,461ZM336.3,394.4L336.5,394.7L336.5,394.4L336.3,394.4ZM344.3,392.7L344,392.7L344.1,393L344.3,392.7ZM359.1,450.8L358.7,450.9L358.7,451.1L359,451L359.1,450.8ZM325.8,389.8L326,389.7L325.9,389.4L325.8,389.8ZM314,359.6L314,359.6L314.1,359.6L314.1,359.6L314,359.6ZM351,439.2L351.2,439.4L351.4,439.2L351,439.2ZM362.8,437L362.6,436.9L362.8,437.2L362.8,437ZM326,390.2L326.2,390.2L326,390L326,390.2ZM351.2,438.6L351.3,438.9L351.4,438.7L351.2,438.6ZM324.7,446.8L324.6,446.9L325.1,447L325.1,446.7L324.7,446.8ZM341.7,396L341.5,396.2L341.7,396.3L341.7,396ZM363.5,434.1L363.2,434.3L363.4,434.6L363.6,434.6L363.5,434.1ZM366.7,434.4L366.4,434.4L366.4,434.6L366.7,434.6L366.7,434.4ZM338.1,448.1L338.2,448.4L338.3,448.4L338.3,448L338.1,448.1ZM342.6,445.2L342.4,445.2L342.3,445.4L342.5,445.5L342.6,445.2ZM325,476L325,476.3L325.2,476L325,476Z',
      '重庆':'M274.8,282.9L275.7,280.1L277.9,283.5L280.1,279.6L283,280L283.2,276.8L286,276.7L287,278.9L290.5,277.8L292.8,284.6L293.8,283.2L294,285.7L296.9,286.1L298.8,278.2L293.4,270.6L291.6,271.7L291.5,264.6L296.5,263.1L299,264.7L302.5,261.2L304.9,261.7L305.2,255.9L291.3,248.4L290.1,250.6L292.5,253.5L286.8,261.8L283.8,261.3L280.4,268.9L270.1,265.2L268,267.8L269.7,270.3L266.4,274.5L270.2,279.1L273.5,279.4L274.8,282.9ZM297,263.7L297,263.5L296.9,263.8L297,263.8L297,263.8L297,263.8L297,263.7ZM268.4,268.1L268.4,268L268.4,268L268.4,268L268.4,268.1ZM297,263.8L296.9,263.8L297,263.9L297,263.9L297,263.8ZM280.4,268.8L280.4,268.8L280.4,268.8L280.4,268.9L280.4,268.8Z',
      '四川':'M232.6,295.1L236.3,304L240.2,305.4L247.3,302.9L246.5,294.2L254.6,284.9L254.4,281.6L259,282L258,287.3L260.2,289.3L264.2,286.9L266.2,290.5L273.8,289.9L273.5,286.6L268.9,284.8L271.5,280.8L274.9,283.4L273.5,279.4L270.2,279.1L266.4,274.5L269.7,270.3L268,267.8L270.4,265.1L280.4,268.8L283.8,261.3L286.8,261.8L292.5,253.5L290.1,250.6L292.2,247.9L287.9,248.9L283.5,245.2L281.6,246.2L280.5,243.5L275.2,244.4L272.2,242L268.5,243.6L267.5,241.4L265.2,244.4L260.8,243.9L258,242.3L259,237.5L256.4,234.2L248.8,232.9L246.7,227.9L240.4,231.3L243.2,235.4L241,238.5L237.9,239.5L238.1,234.8L236.4,239.7L232.2,238.5L232.5,243.9L228.3,245.3L226.3,243L224,244.2L222.1,240.2L220.8,243.3L217.2,241.9L213,238L210.1,230.1L204.2,229.7L201.8,232.7L204.9,236.7L201.6,241.7L208.6,247L214.1,256.3L211.8,258L214.7,262.4L216.3,283.9L218,286.1L220.8,280L225.6,290.3L228.6,288.5L232.6,295.1ZM274,267.3L273.9,267.3L273.9,267.3L273.9,267.4L274,267.3ZM279.7,268.4L279.7,268.4L279.7,268.5L279.8,268.4L279.8,268.4L279.8,268.4L279.8,268.4L279.7,268.4L279.7,268.4ZM268.2,267.5L268.2,267.5L268.2,267.6L268.2,267.5L268.2,267.5Z',
      '贵州':'M298.4,283.2L296.9,286.1L294,285.7L290.5,277.8L287,278.9L283.5,276.7L283,280L280.1,279.6L277.9,283.5L275.7,280.1L274.9,283.4L271.5,280.8L268.8,283L274,287.2L273.8,289.9L267.3,289.8L262.6,294.3L255,292.9L252.3,296.4L253.5,300.4L259,299.6L261,302.1L258.1,309.2L262.3,312.9L259.9,317.4L261.5,318.4L265.4,315L272,318.3L281.6,309.5L286.7,314L290.5,310.3L293.1,312.2L293.6,309.4L296.4,310.4L295.3,308.6L298.9,308.4L300.4,296.4L294.5,296.2L299.9,291.8L298.4,283.2ZM300,298.5L300.1,299.1L300.4,299.2L300.4,299.2L300.2,298.6L300.3,298.4L300.3,298L300.1,297.9L299.8,298.2L300,298.5L300,298.5ZM300.5,299.3L300.8,299.4L301,299.2L300.7,299.3L300.5,299.3Z',
      '云南':'M266.2,290.5L264.2,286.9L260.2,289.3L258,287.3L259,282L254.4,281.6L254.6,284.9L246.5,294.2L247.3,302.9L238,305.6L228.6,288.5L225.6,290.3L220.8,280L217.5,285.7L214.8,276.7L214.8,280.1L211.9,278.9L212.6,285.7L210,286.7L209.3,284.2L208,286.5L209.4,292.2L212.6,291.9L212.6,307.3L204.6,314.3L203.1,320L204.9,322.4L203,324.6L214,322.6L212.3,325.7L214.2,331.1L219.6,333.4L216.3,340.1L222.9,341.1L225,346.2L232.2,343.5L233,348.2L237.4,349L236.7,337.4L241.5,337.9L243.5,334.7L247.7,337.7L250.1,334.4L255.3,337.1L256.5,334.4L261.6,334.3L262.7,331.3L266.3,329.3L268.1,331.1L273,327.7L271.8,322.8L265.8,323.4L264.6,320.2L260.2,320.1L262.3,312.9L258.1,309.2L261,302.1L259,299.6L254.1,301.2L252.3,296.4L255,292.9L265.2,293.6L266.2,290.5Z',
      '西藏':'M139.6,210.2L129.5,206.3L120.5,206.9L111.7,209.4L106.3,214.6L101.8,213.6L94.5,217.5L86.1,217.1L84.8,214.5L80.8,214L74.4,218.8L64.3,216.6L59.1,226.3L52.9,226.8L49.9,230.1L55.1,243.3L52.4,247.1L50.5,243.5L47.7,245.2L50.8,251L50.6,256.4L69.9,269.1L72.3,265.3L77.8,266L78.4,268.6L89.9,276.9L94.2,275.9L95.1,279.6L102.9,282L102.3,284.6L107.2,284.4L109.5,288.6L111,286.3L112.8,288.7L115.1,286.9L119,289.5L131.9,287.2L133.7,295L140.2,285.6L150.3,289.1L153.8,287.8L154.8,292L159.2,294.4L159,298.3L172.9,296.7L176.6,291.6L189.6,285L199.5,290.2L201.9,288.9L203.4,282.8L208,286.5L209.3,284.2L210,286.7L212.6,285.7L211.9,278.9L214.8,280.1L215.9,276.5L214.7,262.4L211.8,258L214.1,256.3L208.6,247L201.7,244.9L201.3,249.6L196.5,250.2L197,253.4L192.2,251.2L191.9,254.1L190.5,252.1L186.7,252.7L184.3,246.5L179.4,243.8L170.5,245.7L145.2,238.2L139,230.5L140.9,223L137.5,218.9L140.3,212.7L137.1,211L139.6,210.2Z',
      '陕西':'M307.4,225.1L306.2,222.3L309.2,214.8L307.4,200.8L310.7,195.4L308.4,188.8L311.4,186.1L313.5,174.3L310,177.6L305.5,175.7L306,177.5L303.2,177.9L296.6,186.3L294.4,194.1L289.1,194.7L285.5,192L282.5,194.8L282.4,201.9L293.1,206.8L293,217.8L286,218L286.9,221.1L284.2,222L276.2,220.3L274.4,225.3L277.6,227.3L275.1,231.8L276.5,235.1L271.6,234.7L269.5,237L271.1,240.7L268,242.7L280.5,243.5L281.6,246.2L283.5,245.2L287.9,248.9L291.9,247.7L300.9,252.9L301.3,244.5L306,244.2L300.3,238.4L310,239.7L312.6,237.5L307.4,225.1ZM312.6,236L312.6,236.1L312.6,236.1L312.6,236.1L312.6,236ZM272.4,243L272.4,243L272.4,243L272.4,243L272.4,243Z',
      '甘肃':'M275.9,213.8L274.8,218.7L271,217L269.9,213.9L266.8,213.2L267.9,209.7L265,201.1L260.4,198.6L261.1,196.9L257.1,196.9L250.8,192.3L250.8,186.6L257.2,180.6L256.3,176.1L247.5,179.4L243,177.8L238,179.5L239.9,181.6L237.5,184L233.1,180.2L231,181L229.9,176.2L218.6,171.1L224.5,167L224,160.6L216.4,160.8L213.4,163.5L212.3,161.7L209.7,163.9L209.6,160.1L203.7,154.1L205.6,152.2L200.2,139.7L191.5,141.8L191.1,149.1L184.9,153.2L183.6,150.9L178.7,153.8L172.5,162.9L165.7,163.8L161.1,179.8L167.2,178.6L167.7,181.2L177.4,182.9L179,187.2L188.2,186.7L192.8,189.3L199.2,184.7L198.4,178.4L207.6,182.7L212.9,179.5L224.1,188.4L223.6,185.5L232.5,192.2L239.3,193.6L244.6,200L243,201.4L248,209L247.1,212.6L238.7,222.4L241.4,227.5L239,229.9L230.8,227.2L229.3,229.2L232.6,234.3L238.4,235.1L238.2,239.7L243.1,236.3L240.4,231.3L246.7,227.9L248.8,232.9L257,234.9L259.3,243.1L264.6,244.6L267.1,241.4L270.7,241.3L271,235.3L276.5,235.1L275.1,231.8L277.6,227.3L274.4,225.3L276.2,220.3L282,222.3L286.8,221.3L286,218L292.8,218.2L293.3,207.3L281.4,199.6L276.8,199.7L277,203.9L274.8,205.6L279.6,210.2L278.8,213.8L275.9,213.8ZM272.2,216.2L272.2,216.2L272.2,216.6L272.4,216.5L272.4,216L272.2,216.2ZM246.1,207.5L246.1,207.5L246.1,207.7L246.1,207.7L246.1,207.5ZM272.4,216.7L272.4,216.8L272.4,216.9L272.5,216.9L272.4,216.7ZM275.9,213.8L275.9,213.8L275.8,213.8L275.9,213.8L275.9,213.8Z',
      '青海':'M246.1,207.5L243,201.4L244.6,200L239.3,193.6L232.5,192.2L223.6,185.5L224.1,188.4L213.5,179.6L209.4,180L207.6,182.7L198.4,178.4L199.2,184.7L192.4,189.3L188.2,186.7L179,187.2L177.4,182.9L167.7,181.2L167.2,178.6L162.1,179.4L142.8,185.9L144.2,188.4L146.2,187.5L146.1,193.6L150.9,196.5L152.5,200.9L147.9,202.8L150.7,210.3L142,208.3L141.4,210.5L137.2,210.7L140.3,212.7L137.5,218.9L140.9,223L139,230.5L147.6,239.4L154.1,239.6L170.5,245.7L179.4,243.8L184.3,246.5L186.7,252.7L190.5,252.1L192.3,254.1L192.7,251L197,253.4L196.5,250.2L201.3,249.6L201.4,245.1L204.7,245.2L201.6,241.7L204.9,236.7L201.8,232.5L205.3,228.9L210.1,230.1L213,238L217.2,241.9L220.8,243.3L222.1,240.2L224.8,244.5L232.5,243.9L232.2,238.5L236.4,239.7L237.5,235.5L232.6,234.3L229.8,227.8L237.2,230.2L241.4,227.5L238.7,222.4L242.6,219.3L241.7,216.9L245.9,215.5L244.9,213.4L248,209L246.1,207.5Z',
      '宁夏':'M282.1,200L282.5,194.8L285.3,192.4L281.5,189.2L275.7,187.5L279.6,181.1L277.9,176.5L274.1,177.7L271.6,181.4L269.9,192.9L257.9,196.7L261.1,196.9L260.4,198.6L262.5,198.9L266.4,203.1L265.3,204.1L267.9,209.7L266.5,210.8L266.8,213.2L269.9,213.9L270.6,216.2L272.4,216L274.8,218.7L275.3,214.3L278.8,213.8L279.5,211.3L274.8,205.6L277,203.9L276.7,199.8L282.1,200ZM272.2,216.2L271,216.6L271,217L271.8,216.7L272.1,216.4L272.2,216.6L272.2,216.2ZM272.4,216.6L272.4,216.6L272.4,216.6L272.4,216.6L272.4,216.6Z',
      '新疆':'M193.8,140.4L185.2,125.9L185.9,122.9L180.3,122.4L170.4,115.2L149.1,112.7L147.4,108.2L150.3,103L150.5,94.9L145,83.8L138.4,79L134.4,79.7L125.5,72.5L124.2,65.1L116.7,65.6L114.2,72.9L107.8,74.4L106.1,77.2L105.8,90.8L101,93.2L85.3,88.9L79.1,107.7L81.6,112.5L75.3,110.5L59.8,115.9L64,119.1L67.3,135.5L63.8,137.1L65.6,138.6L62.9,139.3L61.9,148.1L45.8,155.1L42.7,159L35.5,159L31,166.3L25.9,167L25,162.9L22.1,165.2L18.9,164.4L19.4,166.3L12.2,169L11.7,174.2L8,176.4L10.4,184.5L19,185.8L21.3,197.4L16.1,200.3L27.2,204.4L29.6,212.9L32.8,211.9L39.6,216.5L45.7,216.2L46.2,223.9L51.8,227.5L59.1,226.3L64.3,216.6L74.4,218.8L80.8,214L84.8,214.5L86.1,217.1L94.5,217.5L101.8,213.6L106.3,214.6L111.7,209.4L120.5,206.9L129.5,206.3L140,210.4L142,208.3L149.4,210.9L151.1,210L147.9,202.8L152.3,199.4L146.1,193.6L146.2,187.5L144.2,188.4L142.8,185.9L161.5,180.3L165.7,163.8L172.5,162.9L178.7,153.8L183.6,150.9L184.9,153.2L191.1,149.1L190.8,142.5L193.8,140.4Z',
      '台湾':'M389.1,337.7L392.4,342.6L401.8,315L398.6,312.3L393.8,314.6L386.3,326.6L385.6,332.1L389.1,337.7ZM422.3,306.9L422.7,306.8L422.5,306.5L422.3,306.9ZM413.4,308.5L413.6,308.6L413.9,308.5L414,308.2L413.7,308.1L413.4,308.3L413.4,308.5ZM382.6,327.9L382.9,327.9L382.8,327.4L382.3,327.4L382.2,327.7L381.9,327.6L381.9,328.1L382,328.3L382.3,328.3L382.6,327.9ZM415.2,306.8L415.5,306.8L415.4,306.5L415.2,306.8ZM381.4,327.2L381.4,327.7L381.2,327.8L381.6,327.8L381.6,327.2L381.4,327.2ZM381.4,329.3L381.4,329.7L381.5,329.7L381.4,329.3ZM381.9,326.9L382.3,327.3L382.3,326.9L382.1,326.8L381.9,326.9ZM402.2,309.4L402.4,309.5L402.4,309.3L402.2,309.4ZM397.4,335.6L397.4,335.9L397.7,336L397.8,335.6L397.4,335.6ZM397.7,340.8L397.7,341.1L397.9,341.3L398.4,341.6L398.5,341.3L398.2,341.2L398.2,340.8L397.7,340.8ZM402.5,310.5L402.6,310.8L402.7,310.5L402.5,310.5ZM380.8,330.8L380.9,331.1L381,330.8L380.8,330.8ZM388.3,338.7L388.7,338.5L388.6,338.4L388.3,338.7Z',
      '香港':'M337,337.1L336.1,337.9L336.1,338.3L337,338.5L336.4,338.9L336.5,338.7L335.9,338.8L335.5,339.9L335.9,339.6L336.7,339.7L337.3,338.7L337.7,338.7L337.7,339.2L338.9,339.8L338.8,339.1L339.3,339.2L339,338.1L339.6,338.6L340,338.4L340,337.7L339.4,337.3L338.5,337.8L338.6,337.4L338.8,337.6L339.5,337.1L338.9,336.7L338.6,336.9L338.1,336.6L337,337.1ZM337.9,339.7L337.8,339.4L337.7,340L338,340L338.1,339.7L337.9,339.7ZM339.2,338.3L339.3,338.5L339.5,338.4L339.2,338.3L339.2,338.3ZM339.3,338.2L339.4,338.2L339.4,338.2L339.4,338.2L339.4,338.2L339.3,338.2L339.3,338.2L339.3,338.2ZM339.2,338.3L339.2,338.3L339.2,338.3L339.2,338.3ZM339.3,338.9L339.3,338.9L339.3,338.9L339.3,338.9L339.3,338.9ZM339.3,338.2L339.3,338.2L339.3,338.2L339.3,338.2ZM339.8,338.7L339.8,338.7L339.8,338.7L339.8,338.7ZM339.4,338.9L339.4,338.9L339.4,338.9L339.4,338.9Z',
      '澳门':'M333.1,340.6L333.5,340.4L333.3,339.8L333.2,339.7L333,339.7L333,340L333.1,340.3L333.1,340.6ZM333.4,339.8L333.3,339.8L333.3,339.8L333.4,339.8Z',
    };

    const provCenter = {
      '北京':[357.9,167.5],'天津':[365.7,176.5],'河北':[359.2,171.3],'山西':[324,189.7],
      '内蒙古':[335.7,124],'辽宁':[405.8,170],'吉林':[438.4,131.2],'黑龙江':[441.4,76.5],
      '上海':[398.7,256.8],'江苏':[376.1,238.5],'浙江':[401.3,272.1],'安徽':[363.1,253.4],
      '福建':[379.5,307.4],'江西':[350.1,294.9],'山东':[383.4,201.1],'河南':[338.8,235.2],
      '湖北':[318.3,258.3],'湖南':[316.2,295.9],'广东':[334,341.7],'广西':[292,324.5],
      '海南':[335.2,436.2],'重庆':[286.4,269.5],'四川':[254.1,261.7],'贵州':[284.9,297],
      '云南':[239,310.7],'西藏':[137.4,256.7],'陕西':[293,221.7],'甘肃':[243.2,200.5],
      '青海':[197,217.4],'宁夏':[272.7,205.2],'新疆':[99.2,158.7],'台湾':[394.8,324.6],
      '香港':[338.6,338.5],'澳门':[333.2,340],
    };

    /** Render the map + list using given visitor data */
    function renderVisitorMap(data) {
      const totalEl = document.getElementById('swVisitorTotal');
      const listEl = document.getElementById('swVisitorList');
      const mapEl = document.getElementById('swVisitorMap');
      if (totalEl) totalEl.textContent = data.total || 0;
      const provinces = data.provinces || {};

      if (mapEl) {
        const maxCount = Math.max(...Object.values(provinces).map(Number), 1);
        let pathsHtml = '';
        let labelsHtml = '';

        // Heat-map color scale: light → deep as visitor count grows
        // 6-level color stops from pale to intense
        const heatColors = [
          '#FFF3DC', // level 0: very light (barely any visitors)
          '#FFE0A3', // level 1
          '#FFCA63', // level 2
          '#F0A830', // level 3
          '#D4851A', // level 4
          '#B5640B', // level 5: deep (most visitors)
        ];
        const darkHeatColors = [
          '#2A2418', // level 0
          '#3D3018', // level 1
          '#5C4820', // level 2
          '#8B6B1F', // level 3
          '#C08E20', // level 4
          '#F0B955', // level 5
        ];
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
          || document.body.closest('[data-theme="dark"]');
        const palette = isDark ? darkHeatColors : heatColors;

        function getHeatColor(count) {
          if (count <= 0) return null;
          // Map count to 0~1 ratio using log scale for better spread
          const ratio = Math.min(Math.log(count + 1) / Math.log(maxCount + 1), 1);
          const idx = Math.min(Math.floor(ratio * (palette.length - 1)), palette.length - 2);
          const t = (ratio * (palette.length - 1)) - idx;
          // Interpolate between two adjacent colors
          const c1 = palette[idx], c2 = palette[idx + 1];
          const r = Math.round(parseInt(c1.slice(1,3),16) * (1-t) + parseInt(c2.slice(1,3),16) * t);
          const g = Math.round(parseInt(c1.slice(3,5),16) * (1-t) + parseInt(c2.slice(3,5),16) * t);
          const b = Math.round(parseInt(c1.slice(5,7),16) * (1-t) + parseInt(c2.slice(5,7),16) * t);
          return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
        }

        for (const name of Object.keys(provPaths)) {
          const d = provPaths[name];
          const count = Number(provinces[name] || 0);
          let fill, fOpacity;
          if (count > 0) {
            fill = getHeatColor(count); fOpacity = 1;
          } else {
            fill = isDark ? '#1A1A1A' : '#F5F0E8'; fOpacity = 1;
          }
          const strokeColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)';
          pathsHtml += `<path d="${d}" fill="${fill}" fill-opacity="${fOpacity}" `
            + `stroke="${strokeColor}" stroke-width="0.8" stroke-linejoin="round" `
            + `data-prov="${name}" class="china-prov">`
            + `</path>`;
        }

        const sortedProvs = Object.entries(provinces)
          .filter(([k]) => k !== '\u672a\u77e5' && k !== '\u6d77\u5916' && provCenter[k])
          .sort((a, b) => Number(b[1]) - Number(a[1]));
        for (const [name, count] of sortedProvs.slice(0, 6)) {
          const c = provCenter[name];
          if (!c) continue;
          const labelColor = isDark ? '#F0EDE8' : '#1A1A1A';
          const numColor = isDark ? '#F0B955' : '#B5640B';
          labelsHtml += `<text x="${c[0]}" y="${c[1]}" text-anchor="middle" dominant-baseline="central" `
            + `fill="${labelColor}" font-size="9" font-weight="600" opacity="0.9" style="text-shadow:0 0 3px ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}">${name}</text>`;
          labelsHtml += `<text x="${c[0]}" y="${c[1]+11}" text-anchor="middle" dominant-baseline="central" `
            + `fill="${numColor}" font-size="8" font-weight="700" opacity="0.95" style="text-shadow:0 0 3px ${isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}">${count}</text>`;
        }

        mapEl.innerHTML = `<svg viewBox="0 0 516 505" xmlns="http://www.w3.org/2000/svg" class="china-map-svg">
          <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          ${pathsHtml}${labelsHtml}</svg>`;

        // Hover tooltips (desktop) + touch tooltips (mobile)
        function getOrCreateTooltip() {
          let tip = mapEl.querySelector('.map-tooltip');
          if (!tip) { tip = document.createElement('div'); tip.className = 'map-tooltip'; mapEl.appendChild(tip); }
          return tip;
        }
        mapEl.querySelectorAll('.china-prov').forEach(el => {
          // Desktop hover
          el.addEventListener('mouseenter', e => {
            const nm = el.getAttribute('data-prov');
            const cnt = provinces[nm] || 0;
            const tip = getOrCreateTooltip();
            tip.textContent = `${nm}: ${cnt} \u8bbf\u5ba2`;
            tip.style.display = 'block';
            const rect = mapEl.getBoundingClientRect();
            const mh = ev => { tip.style.left = (ev.clientX - rect.left + 10) + 'px'; tip.style.top = (ev.clientY - rect.top - 28) + 'px'; };
            el._mh = mh; mapEl.addEventListener('mousemove', mh);
          });
          el.addEventListener('mouseleave', () => {
            const tip = mapEl.querySelector('.map-tooltip');
            if (tip) tip.style.display = 'none';
            if (el._mh) mapEl.removeEventListener('mousemove', el._mh);
          });
          // Mobile tap
          el.addEventListener('click', e => {
            e.stopPropagation();
            const nm = el.getAttribute('data-prov');
            const cnt = provinces[nm] || 0;
            const tip = getOrCreateTooltip();
            tip.textContent = `${nm}: ${cnt} \u8bbf\u5ba2`;
            tip.style.display = 'block';
            const rect = mapEl.getBoundingClientRect();
            const touch = e.changedTouches ? e.changedTouches[0] : e;
            tip.style.left = Math.min(Math.max(0, touch.clientX - rect.left - 30), rect.width - 80) + 'px';
            tip.style.top = Math.max(0, touch.clientY - rect.top - 32) + 'px';
            clearTimeout(mapEl._tipTimer);
            mapEl._tipTimer = setTimeout(() => { tip.style.display = 'none'; }, 2000);
          });
        });
        // Hide tooltip on map background tap
        mapEl.addEventListener('click', (e) => {
          if (e.target === mapEl || e.target.tagName === 'svg') {
            const tip = mapEl.querySelector('.map-tooltip');
            if (tip) tip.style.display = 'none';
          }
        });
      }

      if (listEl) {
        const sorted = Object.entries(provinces)
          .filter(([k]) => k !== '\u672a\u77e5')
          .sort((a, b) => Number(b[1]) - Number(a[1]));
        listEl.innerHTML = sorted.map(([prov, count]) =>
          `<span class="sw-visitor-tag">${prov} <span class="v-count">${count}</span></span>`
        ).join('');
      }
    }

    /** Load visitors data (GET — read-only, always refreshes) */
    async function loadVisitors() {
      try {
        // If we already have fresh data from track call, use it first
        if (visitorDataCache) {
          renderVisitorMap(visitorDataCache);
        }
        // Always fetch latest data from server
        const res = await fetch('/api/sidebar/visitors');
        const data = await res.json();
        visitorDataCache = data;
        renderVisitorMap(data);
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
