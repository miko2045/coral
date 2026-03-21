/** home.tsx — 前台页面: 每个导航对应独立页面 (with i18n) */
import type { Lang } from './i18n'
import { t } from './i18n'

const langColors: Record<string, string> = {
  TypeScript: '#3178C6', JavaScript: '#F7DF1E', CSS: '#563D7C',
  HTML: '#E34C26', Python: '#3776AB', Rust: '#DEA584', Go: '#00ADD8',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const iconForType = (type: string) => {
  if (type.includes('pdf')) return 'fa-solid fa-file-pdf'
  if (type.includes('zip') || type.includes('rar') || type.includes('7z') || type.includes('tar')) return 'fa-solid fa-file-zipper'
  if (type.includes('image')) return 'fa-solid fa-file-image'
  if (type.includes('video')) return 'fa-solid fa-file-video'
  if (type.includes('audio')) return 'fa-solid fa-file-audio'
  if (type.includes('word') || type.includes('doc')) return 'fa-solid fa-file-word'
  if (type.includes('sheet') || type.includes('excel') || type.includes('xls')) return 'fa-solid fa-file-excel'
  if (type.includes('presentation') || type.includes('ppt')) return 'fa-solid fa-file-powerpoint'
  return 'fa-solid fa-file'
}

const colorForType = (type: string) => {
  if (type.includes('pdf')) return '#EF4444'
  if (type.includes('zip') || type.includes('rar')) return '#F59E0B'
  if (type.includes('image')) return '#22C55E'
  if (type.includes('video')) return '#8B5CF6'
  return '#6B7280'
}

/* ==========================================
   公共 Header — 所有前台页面共享
   ========================================== */
function siteHeader(lang: Lang, activePage: string) {
  const otherLang = lang === 'zh' ? 'en' : 'zh'
  const langLabel = lang === 'zh' ? 'EN' : '中'

  return (
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
        <div class="nav-indicator visible" id="navIndicator"></div>
      </nav>
      <div class="header-actions">
        <a href="/admin" class="header-icon-btn admin-entry" title={lang === 'zh' ? '后台管理' : 'Admin Panel'}>
          <i class="fa-solid fa-gear"></i>
        </a>
        <a href={`/api/set-lang?lang=${otherLang}`} class="header-icon-btn lang-toggle" id="langToggle" title={lang === 'zh' ? 'Switch to English' : '切换到中文'}>
          <span class="lang-label">{langLabel}</span>
        </a>
        <button class="header-icon-btn theme-toggle" id="themeToggle" aria-label="Toggle theme">
          <i class="fa-solid fa-sun"></i>
        </button>
        <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Menu">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>
    </header>
  )
}

/* ==========================================
   公共 Footer
   ========================================== */
function siteFooter(lang: Lang) {
  return (
    <div class="card card-footer" data-aos="99">
      <div class="card-inner">
        <p>{t('home', 'builtWith', lang)} <i class="fa-solid fa-heart" style="color: #EF4444"></i> {t('home', 'and', lang)} <a href="https://hono.dev" target="_blank" rel="noopener">Hono</a></p>
        <p class="footer-sub">{t('home', 'deployedOn', lang)}</p>
      </div>
    </div>
  )
}

/* ==========================================
   页面壳子
   ========================================== */
function shell(lang: Lang, activePage: string, children: any) {
  return (
    <div class="portal">
      <div class="bg-decor">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
        <div class="grain"></div>
      </div>
      <div class="container">
        {siteHeader(lang, activePage)}
        {children}
      </div>
    </div>
  )
}

/* ==========================================
   1. 首页 / — 个人信息 + 时钟 + 统计 + 快捷入口 + 名言
   ========================================== */
export function homePage(profile: any, websites: any[], repos: any[], files: any[], lang: Lang = 'zh') {
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)

  return shell(lang, 'home', (
    <main class="bento-grid">
      {/* Profile */}
      <div class="card card-profile" data-aos="1">
        <div class="card-inner">
          <div class="profile-top">
            <div class="avatar-wrap">
              <img src={profile.avatar} alt="Avatar" class="avatar" />
              <span class="status-dot"></span>
            </div>
            <div class="profile-info">
              <h1 class="profile-name">{profile.name}</h1>
              <p class="profile-tagline">{profile.tagline}</p>
            </div>
          </div>
          <p class="profile-bio">{profile.bio}</p>
          <div class="profile-meta">
            <span class="meta-item"><i class="fa-solid fa-location-dot"></i> {profile.location}</span>
            {profile.currentlyReading && (
              <span class="meta-item"><i class="fa-solid fa-book-open"></i> {profile.currentlyReading}</span>
            )}
          </div>
          {profile.status && (
            <div class="profile-status"><span class="status-badge">{profile.status}</span></div>
          )}
          <div class="profile-socials">
            {profile.socials?.github && <a href={profile.socials.github} class="social-btn" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i></a>}
            {profile.socials?.twitter && <a href={profile.socials.twitter} class="social-btn" target="_blank" rel="noopener"><i class="fa-brands fa-x-twitter"></i></a>}
            {profile.email && <a href={`mailto:${profile.email}`} class="social-btn"><i class="fa-solid fa-envelope"></i></a>}
          </div>
        </div>
      </div>

      {/* Time */}
      <div class="card card-time" data-aos="2">
        <div class="card-inner">
          <div class="time-display" id="timeDisplay">
            <span class="time-hour">00</span><span class="time-sep">:</span><span class="time-min">00</span>
          </div>
          <p class="time-date" id="dateDisplay">Loading...</p>
          <div class="time-deco">
            <div class="sun-graphic">
              <div class="sun-core"></div>
              {[1,2,3,4,5,6,7,8].map(i => <div class={`sun-ray ray-${i}`}></div>)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div class="card card-stats" data-aos="3">
        <div class="card-inner">
          <h3 class="card-label">{t('home', 'quickStats', lang)}</h3>
          <div class="stats-grid">
            <a href="/projects" class="stat-item stat-link">
              <span class="stat-num">{websites.length}</span>
              <span class="stat-label">{t('home', 'websites', lang)}</span>
            </a>
            <a href="/github" class="stat-item stat-link">
              <span class="stat-num">{repos.length}</span>
              <span class="stat-label">{t('home', 'repos', lang)}</span>
            </a>
            <div class="stat-item">
              <span class="stat-num">{totalStars}</span>
              <span class="stat-label">{t('home', 'stars', lang)}</span>
            </div>
            <a href="/downloads" class="stat-item stat-link">
              <span class="stat-num">{files.length}</span>
              <span class="stat-label">{t('home', 'files', lang)}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Quick entry cards — 导航到各独立页面 */}
      <a href="/projects" class="card card-entry" data-aos="4">
        <div class="card-inner">
          <div class="entry-icon"><i class="fa-solid fa-cube"></i></div>
          <div class="entry-text">
            <h3>{t('home', 'webProjects', lang)}</h3>
            <p>{websites.length} {t('home', 'websites', lang)}</p>
          </div>
          <span class="card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </div>
      </a>
      <a href="/github" class="card card-entry" data-aos="5">
        <div class="card-inner">
          <div class="entry-icon"><i class="fa-brands fa-github"></i></div>
          <div class="entry-text">
            <h3>{t('home', 'githubProjects', lang)}</h3>
            <p>{repos.length} {t('home', 'repos', lang)}</p>
          </div>
          <span class="card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </div>
      </a>
      <a href="/downloads" class="card card-entry" data-aos="6">
        <div class="card-inner">
          <div class="entry-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
          <div class="entry-text">
            <h3>{t('home', 'downloadsTitle', lang)}</h3>
            <p>{files.length} {t('home', 'files', lang)}</p>
          </div>
          <span class="card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </div>
      </a>
      <a href="/trending" class="card card-entry" data-aos="7">
        <div class="card-inner">
          <div class="entry-icon" style="--accent: #EF4444"><i class="fa-solid fa-fire-flame-curved"></i></div>
          <div class="entry-text">
            <h3>{t('nav', 'trending', lang)}</h3>
            <p>GitHub {lang === 'zh' ? '全站排行' : 'Trending'}</p>
          </div>
          <span class="card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </div>
      </a>

      {/* Quote */}
      <div class="card card-quote" data-aos="8">
        <div class="card-inner">
          <blockquote class="quote-text">"{profile.quote || 'The best way to predict the future is to invent it.'}"</blockquote>
          <cite class="quote-author">— {profile.quoteAuthor || 'Alan Kay'}</cite>
        </div>
      </div>

      {siteFooter(lang)}
    </main>
  ))
}

/* ==========================================
   2. 项目页 /projects
   ========================================== */
export function projectsPage(websites: any[], lang: Lang = 'zh') {
  return shell(lang, 'projects', (
    <main class="page-content">
      <div class="page-hero">
        <h1 class="page-title">
          <i class="fa-solid fa-globe"></i>
          {t('home', 'webProjects', lang)}
        </h1>
        <p class="page-subtitle">
          {lang === 'zh' ? `${websites.length} 个精选项目` : `${websites.length} curated project${websites.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {websites.length === 0 && (
        <div class="page-empty">
          <i class="fa-solid fa-folder-open"></i>
          <p>{lang === 'zh' ? '暂无项目' : 'No projects yet'}</p>
        </div>
      )}

      <div class="bento-grid">
        {websites.map((site: any, i: number) => (
          <a href={site.url} target="_blank" rel="noopener" class="card card-website" data-aos={i + 1} key={site.id}>
            <div class="card-inner">
              <div class="website-icon" style={`--accent: ${site.color || '#E8A838'}`}><i class={site.icon || 'fa-solid fa-globe'}></i></div>
              <h3 class="website-title">{site.title}</h3>
              <p class="website-desc">{site.description}</p>
              <div class="website-tags">
                {(site.tags || '').split(',').filter(Boolean).map((tag: string) => <span class="tag" key={tag}>{tag.trim()}</span>)}
              </div>
              <span class="card-arrow"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
            </div>
          </a>
        ))}
        {siteFooter(lang)}
      </div>
    </main>
  ))
}

/* ==========================================
   3. GitHub 页 /github
   ========================================== */
export function githubPage(repos: any[], lang: Lang = 'zh') {
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)
  const totalForks = repos.reduce((a: number, r: any) => a + (r.forks || 0), 0)

  return shell(lang, 'github', (
    <main class="page-content">
      <div class="page-hero">
        <h1 class="page-title">
          <i class="fa-brands fa-github"></i>
          {t('home', 'githubProjects', lang)}
        </h1>
        <p class="page-subtitle">
          {lang === 'zh'
            ? `${repos.length} 个仓库 · ${totalStars} 星标 · ${totalForks} 分支`
            : `${repos.length} repo${repos.length !== 1 ? 's' : ''} · ${totalStars} stars · ${totalForks} forks`
          }
        </p>
      </div>

      {repos.length === 0 && (
        <div class="page-empty">
          <i class="fa-brands fa-github"></i>
          <p>{lang === 'zh' ? '暂无仓库' : 'No repositories yet'}</p>
        </div>
      )}

      <div class="bento-grid">
        {repos.map((repo: any, i: number) => (
          <a href={repo.url} target="_blank" rel="noopener" class="card card-repo" data-aos={i + 1} key={repo.id}>
            <div class="card-inner">
              <div class="repo-header"><i class="fa-solid fa-book-bookmark repo-icon"></i><h3 class="repo-name">{repo.name}</h3></div>
              <p class="repo-desc">{repo.description}</p>
              <div class="repo-meta">
                <span class="repo-lang"><span class="lang-dot" style={`background: ${langColors[repo.language] || '#888'}`}></span>{repo.language}</span>
                <span class="repo-stat"><i class="fa-solid fa-star"></i> {repo.stars}</span>
                <span class="repo-stat"><i class="fa-solid fa-code-fork"></i> {repo.forks}</span>
              </div>
            </div>
          </a>
        ))}
        {siteFooter(lang)}
      </div>
    </main>
  ))
}

/* ==========================================
   4. 下载页 /downloads
   ========================================== */
export function downloadsPage(files: any[], lang: Lang = 'zh') {
  const totalSize = files.reduce((a: number, f: any) => a + (f.size || 0), 0)

  return shell(lang, 'downloads', (
    <main class="page-content">
      <div class="page-hero">
        <h1 class="page-title">
          <i class="fa-solid fa-cloud-arrow-down"></i>
          {t('home', 'downloadsTitle', lang)}
        </h1>
        <p class="page-subtitle">
          {lang === 'zh'
            ? `${files.length} 个文件 · 总计 ${formatSize(totalSize)}`
            : `${files.length} file${files.length !== 1 ? 's' : ''} · ${formatSize(totalSize)} total`
          }
        </p>
      </div>

      {files.length === 0 && (
        <div class="page-empty">
          <i class="fa-solid fa-file-circle-question"></i>
          <p>{lang === 'zh' ? '暂无文件' : 'No files available'}</p>
        </div>
      )}

      <div class="bento-grid">
        {files.map((file: any, i: number) => (
          <div class="card card-download" data-aos={i + 1} key={file.key}>
            <div class="card-inner">
              <div class="download-icon" style={`--accent: ${colorForType(file.type)}`}><i class={iconForType(file.type)}></i></div>
              <div class="download-info">
                <h3 class="download-name">{file.displayName}</h3>
                <p class="download-meta">{file.originalName} · {formatSize(file.size)}</p>
              </div>
              <a href={file.isExternal && file.externalUrl ? file.externalUrl : `/api/download/${file.key}`}
                 class="download-btn" download target={file.isExternal ? '_blank' : undefined}>
                <i class="fa-solid fa-download"></i><span>{t('home', 'download', lang)}</span>
              </a>
            </div>
          </div>
        ))}
        {siteFooter(lang)}
      </div>
    </main>
  ))
}
