/** github.tsx — GitHub 仓库独立页面 */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'

const langColors: Record<string, string> = {
  TypeScript: '#3178C6', JavaScript: '#F7DF1E', CSS: '#563D7C',
  HTML: '#E34C26', Python: '#3776AB', Rust: '#DEA584', Go: '#00ADD8',
  Java: '#B07219', 'C++': '#F34B7D', C: '#555555', Ruby: '#701516',
  PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
}

export function githubPage(repos: any[], lang: Lang = 'zh') {
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)
  const totalForks = repos.reduce((a: number, r: any) => a + (r.forks || 0), 0)

  const content = (
    <main class="page-content">
      <div class="page-hero">
        <h1 class="page-title">
          <i class="fa-brands fa-github"></i>
          {t('home', 'githubProjects', lang)}
        </h1>
        <p class="page-subtitle">
          {repos.length} {t('home', 'repos', lang)} · {totalStars} <i class="fa-solid fa-star" style="color: var(--accent)"></i> · {totalForks} <i class="fa-solid fa-code-fork"></i>
        </p>
      </div>

      {repos.length === 0 ? (
        <div class="page-empty">
          <i class="fa-brands fa-github"></i>
          <p>{lang === 'zh' ? '暂无仓库' : 'No repositories yet'}</p>
        </div>
      ) : (
        <div class="repos-grid">
          {repos.map((repo: any, i: number) => (
            <a href={repo.url} target="_blank" rel="noopener" class="card card-repo" data-aos={i + 1} key={repo.id}>
              <div class="card-inner">
                <div class="repo-header">
                  <i class="fa-solid fa-book-bookmark repo-icon"></i>
                  <h3 class="repo-name">{repo.name}</h3>
                </div>
                <p class="repo-desc">{repo.description}</p>
                <div class="repo-meta">
                  {repo.language && (
                    <span class="repo-lang">
                      <span class="lang-dot" style={`background: ${langColors[repo.language] || '#888'}`}></span>
                      {repo.language}
                    </span>
                  )}
                  <span class="repo-stat"><i class="fa-solid fa-star"></i> {repo.stars}</span>
                  <span class="repo-stat"><i class="fa-solid fa-code-fork"></i> {repo.forks}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  )

  return pageLayout({ lang, activePage: 'github', children: content })
}
