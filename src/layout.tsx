/** layout.tsx — 共享页面布局：header + bg + footer */
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
    <div class="portal">
      <div class="bg-decor">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
        <div class="grain"></div>
      </div>

      <div class="container">
        <header class="header" id="siteHeader">
          <div class="header-left">
            <a href="/" class="logo-link">
              <span class="logo-dot"></span>
              <span class="logo-text">portal</span>
            </a>
          </div>
          <nav class="header-nav" id="headerNav">
            <a href="/" class={`nav-link ${activePage === 'home' ? 'active' : ''}`}>
              <i class="fa-solid fa-house"></i><span>{t('nav', 'home', lang)}</span>
            </a>
            <a href="/projects" class={`nav-link ${activePage === 'projects' ? 'active' : ''}`}>
              <i class="fa-solid fa-cube"></i><span>{t('nav', 'projects', lang)}</span>
            </a>
            <a href="/github" class={`nav-link ${activePage === 'github' ? 'active' : ''}`}>
              <i class="fa-brands fa-github"></i><span>{t('nav', 'github', lang)}</span>
            </a>
            <a href="/downloads" class={`nav-link ${activePage === 'downloads' ? 'active' : ''}`}>
              <i class="fa-solid fa-cloud-arrow-down"></i><span>{t('nav', 'downloads', lang)}</span>
            </a>
            <a href="/trending" class={`nav-link ${activePage === 'trending' ? 'active' : ''}`}>
              <i class="fa-solid fa-fire-flame-curved"></i><span>{t('nav', 'trending', lang)}</span>
            </a>
            <div class="nav-indicator" id="navIndicator"></div>
          </nav>
          <div class="header-actions">
            <a href="/admin" class="header-icon-btn admin-entry" title={lang === 'zh' ? '后台管理' : 'Admin Panel'}>
              <i class="fa-solid fa-gear"></i>
            </a>
            <a href={`/api/set-lang?lang=${otherLang}`} class="header-icon-btn lang-toggle" id="langToggle" title={lang === 'zh' ? 'Switch to English' : '切换到中文'}>
              <span class="lang-label">{langLabel}</span>
            </a>
            <button class="header-icon-btn theme-toggle" id="themeToggle" aria-label="Toggle theme">
              <i class="fa-solid fa-circle-half-stroke"></i>
            </button>
            <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
          </div>
        </header>

        <div id="pageContent" class="page-transition" data-page={activePage}>
          {children}
        </div>

        <footer class="page-footer">
          <p>{t('home', 'builtWith', lang)} <i class="fa-solid fa-heart" style="color: #EF4444"></i> {t('home', 'and', lang)} <a href="https://hono.dev" target="_blank" rel="noopener">Hono</a></p>
          <p class="footer-sub">{t('home', 'deployedOn', lang)}</p>
        </footer>
      </div>
    </div>
  )
}
