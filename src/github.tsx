/** github.tsx — GitHub 仓库页面 (超级高级感) */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'

const langColors: Record<string, string> = {
  TypeScript: '#3178C6', JavaScript: '#F7DF1E', CSS: '#563D7C',
  HTML: '#E34C26', Python: '#3776AB', Rust: '#DEA584', Go: '#00ADD8',
  Java: '#B07219', 'C++': '#F34B7D', C: '#555555', 'C#': '#178600',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
  Dart: '#00B4AB', Shell: '#89E051', Vue: '#41B883',
}

export function githubPage(repos: any[], lang: Lang = 'zh') {
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)
  const totalForks = repos.reduce((a: number, r: any) => a + (r.forks || 0), 0)
  const languages = [...new Set(repos.map((r: any) => r.language).filter(Boolean))]

  const content = (
    <main class="page-content">
      {/* Page header */}
      <div class="page-header-compact">
        <a href="/" class="page-back-btn" aria-label={lang === 'zh' ? '返回' : 'Back'}>
          <i class="fa-solid fa-arrow-left"></i>
        </a>
        <h1 class="page-header-title">
          <i class="fa-brands fa-github"></i>
          {t('home', 'githubProjects', lang)}
        </h1>
        <span class="page-header-count">
          {lang === 'zh'
            ? `${repos.length} 个仓库`
            : `${repos.length} repo${repos.length !== 1 ? 's' : ''}`
          }
        </span>
      </div>

      {/* SEO description */}
      <p class="page-seo-desc">
        {lang === 'zh'
          ? `精选 ${repos.length} 个 GitHub 开源项目推荐 — 涵盖全栈开发、前端框架、后端服务、开发工具等方向。每个项目都经过精心筛选，是值得 Star 和学习的好项目。`
          : `${repos.length} curated GitHub open source projects — covering full-stack dev, frameworks, backend, and tooling. Every repo is hand-picked and worth starring.`}
      </p>

      {/* Overview stats strip */}
      {repos.length > 0 && (
        <div class="gh-overview">
          <div class="gh-overview-stats">
            <div class="gh-stat-chip">
              <i class="fa-solid fa-book-bookmark"></i>
              <span class="gh-stat-chip-num">{repos.length}</span>
              <span class="gh-stat-chip-label">{lang === 'zh' ? '仓库' : 'Repos'}</span>
            </div>
            <div class="gh-stat-chip">
              <i class="fa-solid fa-star"></i>
              <span class="gh-stat-chip-num">{totalStars}</span>
              <span class="gh-stat-chip-label">{lang === 'zh' ? '星标' : 'Stars'}</span>
            </div>
            <div class="gh-stat-chip">
              <i class="fa-solid fa-code-fork"></i>
              <span class="gh-stat-chip-num">{totalForks}</span>
              <span class="gh-stat-chip-label">{lang === 'zh' ? '分支' : 'Forks'}</span>
            </div>
          </div>
          <div class="gh-lang-strip">
            {languages.map((l: string) => (
              <span class="gh-lang-chip" key={l}>
                <span class="gh-lang-dot" style={`background:${langColors[l] || '#888'}`}></span>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {repos.length === 0 && (
        <div class="page-empty">
          <i class="fa-brands fa-github"></i>
          <p>{lang === 'zh' ? '暂无仓库' : 'No repositories yet'}</p>
        </div>
      )}

      <div class="gh-grid">
        {repos.map((repo: any, i: number) => {
          const color = langColors[repo.language] || '#888'
          return (
          <a href={repo.url} target="_blank" rel="noopener noreferrer"
             class={`gh-card ${i === 0 ? 'gh-card-featured' : ''}`}
             style={`animation-delay:${Math.min(i * 0.06, 0.4)}s; --lang-color:${color}`}
             key={repo.id}>
            <div class="gh-card-inner">
              <div class="gh-card-head">
                <span class="gh-card-icon-wrap">
                  <i class="fa-solid fa-book-bookmark"></i>
                </span>
                <h3 class="gh-card-name">{repo.name}</h3>
                {i === 0 && (
                  <span class="gh-pinned">
                    <i class="fa-solid fa-thumbtack"></i>
                    {lang === 'zh' ? '置顶' : 'Pinned'}
                  </span>
                )}
              </div>
              <p class="gh-card-desc">{repo.description || (lang === 'zh' ? '暂无描述' : 'No description')}</p>
              <div class="gh-card-footer">
                {repo.language && (
                  <span class="gh-card-lang">
                    <span class="gh-card-lang-dot" style={`background:${color}`}></span>
                    {repo.language}
                  </span>
                )}
                <span class="gh-card-stat">
                  <i class="fa-solid fa-star"></i> {repo.stars}
                </span>
                <span class="gh-card-stat">
                  <i class="fa-solid fa-code-fork"></i> {repo.forks}
                </span>
                <span class="gh-card-go">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </span>
              </div>
            </div>
          </a>
        )})}
      </div>

      <div class="gh-footer">
        <a href="https://github.com/miko2045" target="_blank" rel="noopener" class="gh-footer-link">
          <i class="fa-brands fa-github"></i>
          {lang === 'zh' ? '在 GitHub 上查看更多' : 'View more on GitHub'}
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
      </div>
    </main>
  )

  return pageLayout({ lang, activePage: 'github', children: content })
}
