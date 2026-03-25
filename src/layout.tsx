/** layout.tsx — Refined minimal layout with floating pill nav */
import type { Lang } from './i18n'
import { t } from './i18n'

interface LayoutProps {
  lang: Lang
  activePage: 'home' | 'projects' | 'github' | 'downloads' | 'trending'
  children: any
}

export function pageLayout({ lang, activePage, children }: LayoutProps) {
  const otherLang = lang === 'zh' ? 'en' : 'zh'
  const langLabel = lang === 'zh' ? 'EN' : '中'

  return (
    <div class="portal site">
      {/* ===== FLOATING PILL HEADER ===== */}
      <header class="header" id="siteHeader">
        <div class="header-inner">
          <a href="/" class="logo">portal<span class="logo-dot">.</span></a>

          <nav class="nav-pill header-nav" id="headerNav">
            <a href="/" class={`nav-link ${activePage === 'home' ? 'active' : ''}`}>{t('nav', 'home', lang)}</a>
            <a href="/projects" class={`nav-link ${activePage === 'projects' ? 'active' : ''}`}>{t('nav', 'projects', lang)}</a>
            <a href="/github" class={`nav-link ${activePage === 'github' ? 'active' : ''}`}>GitHub</a>
            <a href="/downloads" class={`nav-link ${activePage === 'downloads' ? 'active' : ''}`}>{t('nav', 'downloads', lang)}</a>
            <a href="/trending" class={`nav-link ${activePage === 'trending' ? 'active' : ''}`}>{t('nav', 'trending', lang)}</a>
            <span class="nav-indicator" id="navIndicator"></span>
          </nav>

          <div class="header-actions">
            <a href="/admin" class="header-btn header-icon-btn admin-entry" title={lang === 'zh' ? '后台管理' : 'Admin'}>
              <i class="fa-solid fa-gear"></i>
            </a>
            <a href={`/api/set-lang?lang=${otherLang}`} class="header-btn header-icon-btn lang-toggle" id="langToggle" title={lang === 'zh' ? 'English' : '中文'}>
              {langLabel}
            </a>
            <button class="header-btn header-icon-btn theme-toggle" id="themeToggle" aria-label="Toggle theme">
              <i class="fa-solid fa-circle-half-stroke"></i>
            </button>
            <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main class="main">
        <div id="pageContent" class="page-transition" data-page={activePage}>
          {children}
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer class="site-footer">
        <div class="footer-inner">
          <span class="footer-brand">portal<span class="footer-dot">.</span></span>
          <p class="footer-text">{t('home', 'builtWith', lang)} <i class="fa-solid fa-heart" style="color: var(--accent)"></i> {t('home', 'and', lang)} <a href="https://hono.dev" target="_blank" rel="noopener">Hono</a></p>
        </div>
      </footer>

      {/* ===== RIGHT SIDEBAR WIDGETS (preserved) ===== */}
      <aside class="sidebar-widgets" id="sidebarWidgets">
        <div class="sw-toolbar">
          <button class="sw-btn" data-widget="music" title={lang === 'zh' ? '音乐' : 'Music'}>
            <i class="fa-solid fa-music"></i>
          </button>
          <button class="sw-btn" data-widget="pet" title={lang === 'zh' ? '小宠物' : 'Pet'}>
            <i class="fa-solid fa-cat"></i>
          </button>
          <button class="sw-btn" data-widget="visitors" title={lang === 'zh' ? '访客地图' : 'Visitors'}>
            <i class="fa-solid fa-earth-asia"></i>
          </button>
          <button class="sw-btn" data-widget="guestbook" title={lang === 'zh' ? '留言墙' : 'Guestbook'}>
            <i class="fa-solid fa-comment-dots"></i>
          </button>
          <button class="sw-btn" data-widget="quote" title={lang === 'zh' ? '每日一言' : 'Quote'}>
            <i class="fa-solid fa-lightbulb"></i>
          </button>
        </div>

        <div class="sw-panel" id="swPanel-music">
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-music"></i> {lang === 'zh' ? '音乐' : 'Music'}</span>
            <button class="sw-panel-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="sw-panel-body sw-music-body">
            <div class="sw-music-cover" id="swMusicCover"><i class="fa-solid fa-compact-disc"></i></div>
            <div class="sw-music-info">
              <div class="sw-music-title" id="swMusicTitle">Chill Vibes</div>
              <div class="sw-music-bars" id="swMusicBars"><span></span><span></span><span></span><span></span><span></span></div>
            </div>
            <div class="sw-music-controls">
              <button class="sw-music-prev" id="swMusicPrev"><i class="fa-solid fa-backward-step"></i></button>
              <button class="sw-music-play" id="swMusicPlay"><i class="fa-solid fa-play"></i></button>
              <button class="sw-music-next" id="swMusicNext"><i class="fa-solid fa-forward-step"></i></button>
            </div>
          </div>
        </div>

        <div class="sw-panel" id="swPanel-pet">
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-cat"></i> {lang === 'zh' ? '小猫咪' : 'Kitty'}</span>
            <button class="sw-panel-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="sw-panel-body sw-pet-body">
            <canvas id="swPetCanvas" width="200" height="160"></canvas>
            <div class="sw-pet-status" id="swPetStatus">{lang === 'zh' ? '点我玩耍！' : 'Click me!'}</div>
          </div>
        </div>

        <div class="sw-panel sw-panel-map" id="swPanel-visitors">
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-map-location-dot"></i> {lang === 'zh' ? '访客分布' : 'Visitor Map'}</span>
            <span class="sw-visitors-badge"><span id="swVisitorTotal">0</span> {lang === 'zh' ? '访客' : 'visitors'}</span>
            <button class="sw-panel-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="sw-panel-body sw-visitors-body">
            <div class="sw-visitors-map" id="swVisitorMap"></div>
            <div class="sw-visitors-list" id="swVisitorList"></div>
          </div>
        </div>

        <div class="sw-panel" id="swPanel-guestbook">
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-comment-dots"></i> {lang === 'zh' ? '留言墙' : 'Guestbook'}</span>
            <button class="sw-panel-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="sw-panel-body sw-guestbook-body">
            <div class="sw-gb-messages" id="swGbMessages"></div>
            <div class="sw-gb-input">
              <div class="sw-gb-emoji-row">
                <button class="sw-gb-emoji active" data-emoji="😊">😊</button>
                <button class="sw-gb-emoji" data-emoji="😎">😎</button>
                <button class="sw-gb-emoji" data-emoji="🚀">🚀</button>
                <button class="sw-gb-emoji" data-emoji="❤️">❤️</button>
                <button class="sw-gb-emoji" data-emoji="👍">👍</button>
                <button class="sw-gb-emoji" data-emoji="🌟">🌟</button>
              </div>
              <div class="sw-gb-row">
                <input type="text" id="swGbInput" maxlength="60" placeholder={lang === 'zh' ? '说点什么...' : 'Say something...'} />
                <button id="swGbSend"><i class="fa-solid fa-paper-plane"></i></button>
              </div>
            </div>
          </div>
        </div>

        <div class="sw-panel" id="swPanel-quote">
          <div class="sw-panel-header">
            <span><i class="fa-solid fa-lightbulb"></i> {lang === 'zh' ? '每日一言' : 'Quote'}</span>
            <button class="sw-panel-close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="sw-panel-body sw-quote-body">
            <div class="sw-quote-text" id="swQuoteText">Loading...</div>
            <div class="sw-quote-author" id="swQuoteAuthor"></div>
            <button class="sw-quote-refresh" id="swQuoteRefresh">
              <i class="fa-solid fa-rotate"></i> {lang === 'zh' ? '换一个' : 'Another'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
