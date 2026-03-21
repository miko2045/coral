/** trending.tsx — GitHub 全站排行榜页面 (热门榜 + 飙升榜) */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'

const langColors: Record<string, string> = {
  TypeScript: '#3178C6', JavaScript: '#F7DF1E', CSS: '#563D7C',
  HTML: '#E34C26', Python: '#3776AB', Rust: '#DEA584', Go: '#00ADD8',
  Java: '#B07219', 'C++': '#F34B7D', C: '#555555', 'C#': '#178600',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
  Dart: '#00B4AB', Scala: '#DC322F', Shell: '#89E051', Lua: '#000080',
  Vue: '#41B883', Svelte: '#FF3E00', Zig: '#F7A41D', Elixir: '#6E4A7E',
  Haskell: '#5E5086', Julia: '#9558B2', R: '#198CE7', Perl: '#0298C3',
  Objective: '#438EFF', MATLAB: '#E16737', Vim: '#019833',
}

function formatNumber(num: number): string {
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(num)
}

function timeAgo(dateStr: string, lang: Lang): string {
  const now = Date.now()
  const created = new Date(dateStr).getTime()
  const diff = now - created
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return lang === 'zh' ? '今天' : 'today'
  if (days === 1) return lang === 'zh' ? '昨天' : 'yesterday'
  if (days < 7) return lang === 'zh' ? `${days} 天前` : `${days} days ago`
  if (days < 30) {
    const w = Math.floor(days / 7)
    return lang === 'zh' ? `${w} 周前` : `${w} week${w > 1 ? 's' : ''} ago`
  }
  if (days < 365) {
    const m = Math.floor(days / 30)
    return lang === 'zh' ? `${m} 个月前` : `${m} month${m > 1 ? 's' : ''} ago`
  }
  const y = Math.floor(days / 365)
  return lang === 'zh' ? `${y} 年前` : `${y} year${y > 1 ? 's' : ''} ago`
}

export function trendingPage(
  hotRepos: any[],
  risingRepos: any[],
  lang: Lang = 'zh',
  tab: string = 'hot',
  selectedLang: string = '',
  cacheAge: string = '',
  apiStatus: string = 'cached',
  rateLimitInfo: { allowed: boolean; remaining: number; resetAt: number } = { allowed: true, remaining: 30, resetAt: 0 }
) {
  const popularLangs = [
    '', 'Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust', 'C++', 'C', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Shell'
  ]

  const activeRepos = tab === 'rising' ? risingRepos : hotRepos

  // Helper: render a repo list
  function repoList(repos: any[], listTab: string) {
    return (
      <div class={`trending-list`} id={`trendingList-${listTab}`}
           style={listTab !== tab ? 'display:none' : ''}>
        {repos.length === 0 && (
          <div class="trending-empty">
            <i class="fa-solid fa-magnifying-glass"></i>
            <p>{t('trending', 'noResults', lang)}</p>
          </div>
        )}
        {repos.map((repo: any, idx: number) => (
          <a href={repo.html_url} target="_blank" rel="noopener"
             class="trending-repo-card" key={repo.id}>
            <div class="trending-rank">
              <span class={`rank-num ${idx < 3 ? 'rank-top' : ''}`}>{idx + 1}</span>
            </div>
            <div class="trending-repo-body">
              <div class="trending-repo-header">
                <img src={repo.owner?.avatar_url} alt="" class="trending-owner-avatar" loading="lazy" />
                <div class="trending-repo-names">
                  <span class="trending-owner-name">{repo.owner?.login}</span>
                  <span class="trending-name-sep">/</span>
                  <h3 class="trending-repo-name">{repo.name}</h3>
                </div>
                {listTab === 'rising' && repo._starsToday > 0 && (
                  <span class="trending-rising-badge">
                    <i class="fa-solid fa-arrow-up"></i> +{formatNumber(repo._starsToday)}
                  </span>
                )}
              </div>
              <p class="trending-repo-desc">{repo.description || t('trending', 'noDesc', lang)}</p>
              <div class="trending-repo-meta">
                {repo.language && (
                  <span class="trending-meta-item">
                    <span class="lang-dot" style={`background: ${langColors[repo.language] || '#888'}`}></span>
                    {repo.language}
                  </span>
                )}
                <span class="trending-meta-item">
                  <i class="fa-solid fa-star"></i> {formatNumber(repo.stargazers_count)}
                </span>
                <span class="trending-meta-item">
                  <i class="fa-solid fa-code-fork"></i> {formatNumber(repo.forks_count)}
                </span>
                <span class="trending-meta-item">
                  <i class="fa-solid fa-eye"></i> {formatNumber(repo.watchers_count)}
                </span>
                {repo.open_issues_count > 0 && (
                  <span class="trending-meta-item">
                    <i class="fa-solid fa-circle-dot"></i> {formatNumber(repo.open_issues_count)}
                  </span>
                )}
                <span class="trending-meta-item trending-meta-time">
                  <i class="fa-regular fa-clock"></i> {timeAgo(repo.created_at, lang)}
                </span>
              </div>
              {repo.topics && repo.topics.length > 0 && (
                <div class="trending-topics">
                  {repo.topics.slice(0, 6).map((topic: string) => (
                    <span class="trending-topic" key={topic}>{topic}</span>
                  ))}
                  {repo.topics.length > 6 && (
                    <span class="trending-topic trending-topic-more">+{repo.topics.length - 6}</span>
                  )}
                </div>
              )}
            </div>
            <div class="trending-repo-arrow">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </div>
          </a>
        ))}
      </div>
    )
  }

  const content = (
    <main class="page-content">
      {/* Page Title */}
      <div class="page-header-compact">
        <h1 class="page-header-title">
          <i class="fa-brands fa-github"></i>
          {t('trending', 'title', lang)}
        </h1>
        <span class="page-header-count">{t('trending', 'subtitle', lang)}</span>
      </div>

      <div class="trending-status-bar-standalone">
        {cacheAge && (
          <span class="trending-cache-hint">
            <i class="fa-solid fa-clock"></i> {t('trending', 'dataFrom', lang)} {new Date(cacheAge).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}
          </span>
        )}
        <span class={`trending-api-badge ${apiStatus === 'ok' || apiStatus === 'cached' ? 'api-ok' : apiStatus === 'fallback' ? 'api-warn' : 'api-err'}`}>
          <i class={`fa-solid ${apiStatus === 'ok' || apiStatus === 'cached' ? 'fa-circle-check' : apiStatus === 'fallback' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`}></i>
          {apiStatus === 'ok' ? 'Token API' : apiStatus === 'cached' ? t('trending', 'cached', lang) : apiStatus === 'fallback' ? t('trending', 'noToken', lang) : t('trending', 'limited', lang)}
        </span>
        <span class="trending-quota-hint">
          <i class="fa-solid fa-gauge-high"></i> {t('trending', 'refreshQuota', lang)}: {rateLimitInfo.remaining}/30
        </span>
        <a href={`/trending?tab=${tab}${selectedLang ? '&lang_filter=' + selectedLang : ''}&refresh=1`}
           class={`trending-refresh-btn ${!rateLimitInfo.allowed ? 'disabled' : ''}`}
           title={!rateLimitInfo.allowed ? t('trending', 'limitReached', lang) : t('trending', 'forceRefresh', lang)}>
          <i class="fa-solid fa-rotate"></i> {t('trending', 'refresh', lang)}
        </a>
      </div>
      {!rateLimitInfo.allowed && (
        <div class="trending-rate-warn">
          <i class="fa-solid fa-shield-halved"></i>
          {t('trending', 'rateLimitMsg', lang)}
        </div>
      )}

      {/* Tab Switcher — client-side switching */}
      <div class="trending-tabs" id="trendingTabs" data-current-tab={tab}>
        <button type="button" class={`trending-tab ${tab === 'hot' ? 'active' : ''}`} data-tab="hot">
          <i class="fa-solid fa-fire"></i>
          <span>{t('trending', 'hotTab', lang)}</span>
          <span class="tab-badge">{hotRepos.length}</span>
        </button>
        <button type="button" class={`trending-tab ${tab === 'rising' ? 'active' : ''}`} data-tab="rising">
          <i class="fa-solid fa-arrow-trend-up"></i>
          <span>{t('trending', 'risingTab', lang)}</span>
          <span class="tab-badge">{risingRepos.length}</span>
        </button>
      </div>

      {/* Language Filter */}
      <div class="trending-filters">
        <span class="filter-label"><i class="fa-solid fa-code"></i> {t('trending', 'language', lang)}</span>
        <div class="filter-tags">
          {popularLangs.map(pl => (
            <a href={`/trending?tab=${tab}${pl ? '&lang_filter=' + encodeURIComponent(pl) : ''}`}
               class={`filter-tag ${selectedLang === pl ? 'active' : ''}`}
               key={pl || 'all'}>
              {pl || t('trending', 'allLangs', lang)}
            </a>
          ))}
        </div>
      </div>

      {/* Both tab lists rendered, only active one visible */}
      <div id="trendingContent">
        {repoList(hotRepos, 'hot')}
        {repoList(risingRepos, 'rising')}
      </div>

      {/* Trending Footer */}
      <div class="trending-footer">
        <p>{t('trending', 'poweredBy', lang)}</p>
      </div>
    </main>
  )

  return pageLayout({ lang, activePage: 'trending', children: content })
}
