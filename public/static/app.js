// ========================================
// PORTAL — Frontend Interactions (with i18n)
// Multi-page navigation support
// ========================================

(() => {
  'use strict';

  // === Get current language from body data attribute ===
  const lang = document.body.getAttribute('data-lang') || 'zh';

  // === Theme Toggle ===
  const themeToggle = document.getElementById('themeToggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function getTheme() {
    return localStorage.getItem('portal-theme') || (prefersDark.matches ? 'dark' : 'light');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal-theme', theme);
    const icon = themeToggle?.querySelector('i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
  }

  setTheme(getTheme());

  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // === Language Toggle ===
  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const newLang = lang === 'zh' ? 'en' : 'zh';
      document.cookie = `portal_lang=${newLang}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`;
      window.location.reload();
    });
  }

  // === Header scroll effect ===
  const header = document.getElementById('siteHeader');
  if (header) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // === Mobile menu ===
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const headerNav = document.getElementById('headerNav');
  if (mobileMenuBtn && headerNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuBtn.classList.toggle('open');
      headerNav.classList.toggle('mobile-open');
    });

    // Close on nav click
    headerNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenuBtn.classList.remove('open');
        headerNav.classList.remove('mobile-open');
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!headerNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenuBtn.classList.remove('open');
        headerNav.classList.remove('mobile-open');
      }
    });
  }

  // === Nav indicator (sliding pill) — based on active class from server ===
  const navIndicator = document.getElementById('navIndicator');
  const navLinks = document.querySelectorAll('.header-nav .nav-link');

  function moveIndicator(el) {
    if (!navIndicator || !el) return;
    const nav = el.parentElement;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    navIndicator.style.width = elRect.width + 'px';
    navIndicator.style.left = (elRect.left - navRect.left) + 'px';
    navIndicator.classList.add('visible');
  }

  function clearIndicator() {
    if (!navIndicator) return;
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) {
      moveIndicator(activeLink);
    } else {
      navIndicator.classList.remove('visible');
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => moveIndicator(link));
  });

  const navContainer = document.querySelector('.header-nav');
  if (navContainer) {
    navContainer.addEventListener('mouseleave', clearIndicator);
  }

  // Initialize indicator on active link (set by server)
  const initialActive = document.querySelector('.nav-link.active');
  if (initialActive) {
    // Small delay to ensure layout is ready
    requestAnimationFrame(() => moveIndicator(initialActive));
  }

  // === Live Clock (locale-aware) — only on home page ===
  function updateTime() {
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
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
      } else {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
      }
    }
  }

  if (document.querySelector('.time-hour')) {
    updateTime();
    setInterval(updateTime, 1000);
  }

  // === Card hover tilt effect ===
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -2;
      const rotateY = ((x - centerX) / centerX) * 2;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // === Animate stat numbers on scroll ===
  function animateCountUp(el, target) {
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = current;
    }, 30);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const nums = entry.target.querySelectorAll('.stat-num');
        nums.forEach(n => {
          const target = parseInt(n.textContent, 10);
          if (!isNaN(target) && !n.dataset.animated) {
            n.dataset.animated = 'true';
            animateCountUp(n, target);
          }
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const statsCard = document.querySelector('.card-stats');
  if (statsCard) observer.observe(statsCard);

  // === Download button click feedback ===
  const preparingText = lang === 'zh' ? '准备中...' : 'Preparing...';
  const readyText = lang === 'zh' ? '完成!' : 'Ready!';

  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const icon = btn.querySelector('i');
      const text = btn.querySelector('span');
      if (icon && text) {
        const origIcon = icon.className;
        const origText = text.textContent;
        icon.className = 'fa-solid fa-spinner fa-spin';
        text.textContent = preparingText;

        setTimeout(() => {
          icon.className = 'fa-solid fa-check';
          text.textContent = readyText;
          setTimeout(() => {
            icon.className = origIcon;
            text.textContent = origText;
          }, 1500);
        }, 1000);
      }
    });
  });

  // === Card entrance animation ===
  const animCards = document.querySelectorAll('[data-aos]');
  if (animCards.length > 0) {
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-in');
          cardObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

    animCards.forEach(card => cardObserver.observe(card));
  }

})();
