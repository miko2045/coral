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

/** Medal emoji for top 3 */
function rankMedal(idx: number): string {
  if (idx === 0) return '🥇'
  if (idx === 1) return '🥈'
  if (idx === 2) return '🥉'
  return ''
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

  // Helper: render a repo list
  function repoList(repos: any[], listTab: string) {
    return (
      <div class={`trd-list`} id={`trendingList-${listTab}`}
           style={listTab !== tab ? 'display:none' : ''}>
        {repos.length === 0 && (
          <div class="trd-empty">
            <div class="trd-empty-icon">
              <i class="fa-solid fa-satellite-dish"></i>
            </div>
            <p class="trd-empty-title">{t('trending', 'noResults', lang)}</p>
            <p class="trd-empty-sub">{lang === 'zh' ? '换个语言筛选试试？' : 'Try a different language filter?'}</p>
          </div>
        )}
        {repos.map((repo: any, idx: number) => {
          const isTop3 = idx < 3
          return (
          <a href={repo.html_url} target="_blank" rel="noopener"
             class={`trd-card ${isTop3 ? 'trd-card-top' : ''}`} key={repo.id}
             style={`animation-delay: ${Math.min(idx * 0.03, 0.3)}s`}>
            {/* Rank */}
            <div class={`trd-rank ${isTop3 ? `trd-rank-${idx + 1}` : ''}`}>
              {isTop3
                ? <span class="trd-rank-medal">{rankMedal(idx)}</span>
                : <span class="trd-rank-num">{idx + 1}</span>
              }
            </div>

            {/* Main content */}
            <div class="trd-body">
              {/* Row 1: avatar + name + rising badge */}
              <div class="trd-header">
                <img src={repo.owner?.avatar_url || `https://github.com/${repo.owner?.login || 'ghost'}.png?size=40`}
                     alt="" class="trd-avatar" loading="lazy" />
                <div class="trd-names">
                  <span class="trd-owner">{repo.owner?.login}</span>
                  <span class="trd-sep">/</span>
                  <h3 class="trd-name">{repo.name}</h3>
                </div>
                {listTab === 'rising' && repo._starsToday > 0 && (
                  <span class="trd-rising-badge">
                    <i class="fa-solid fa-arrow-trend-up"></i> +{formatNumber(repo._starsToday)}{lang === 'zh' ? ' 今日' : ' today'}
                  </span>
                )}
              </div>

              {/* Row 2: description */}
              <p class="trd-desc">{repo.description || t('trending', 'noDesc', lang)}</p>

              {/* Row 3: meta stats */}
              <div class="trd-meta">
                {repo.language && (
                  <span class="trd-meta-lang">
                    <span class="trd-lang-dot" style={`background: ${langColors[repo.language] || '#888'}`}></span>
                    {repo.language}
                  </span>
                )}
                <span class="trd-meta-item trd-meta-stars">
                  <i class="fa-solid fa-star"></i> {formatNumber(repo.stargazers_count)}
                </span>
                <span class="trd-meta-item">
                  <i class="fa-solid fa-code-fork"></i> {formatNumber(repo.forks_count)}
                </span>
                {repo.open_issues_count > 0 && (
                  <span class="trd-meta-item">
                    <i class="fa-solid fa-circle-dot"></i> {formatNumber(repo.open_issues_count)}
                  </span>
                )}
                {repo.created_at && (() => {
                  const days = Math.floor((Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24))
                  return days <= 365
                })() && (
                  <span class="trd-meta-item trd-meta-time">
                    <i class="fa-regular fa-clock"></i> {timeAgo(repo.created_at, lang)}
                  </span>
                )}
              </div>

              {/* Row 4: topics */}
              {repo.topics && repo.topics.length > 0 && (
                <div class="trd-topics">
                  {repo.topics.slice(0, 5).map((topic: string) => (
                    <span class="trd-topic" key={topic}>{topic}</span>
                  ))}
                  {repo.topics.length > 5 && (
                    <span class="trd-topic trd-topic-more">+{repo.topics.length - 5}</span>
                  )}
                </div>
              )}
            </div>

            {/* External link icon */}
            <div class="trd-ext">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </div>
          </a>
        )})}
      </div>
    )
  }

  const statusOk = apiStatus === 'api_ok' || apiStatus === 'ok' || apiStatus === 'cached' || apiStatus === 'scrape_ok'
  const statusWarn = apiStatus === 'fallback' || apiStatus === 'scrape_fallback'

  const content = (
    <main class="page-content">
      {/* Page Title */}
      <div class="page-header-compact">
        <a href="/" class="page-back-btn" aria-label={lang === 'zh' ? '返回' : 'Back'}>
          <i class="fa-solid fa-arrow-left"></i>
        </a>
        <h1 class="page-header-title">
          <i class="fa-brands fa-github"></i>
          {t('trending', 'title', lang)}
        </h1>
        <span class="page-header-count">{t('trending', 'subtitle', lang)}</span>
      </div>

      {/* ── Control Bar: status + refresh ── */}
      <div class="trd-controls">
        <div class="trd-controls-left">
          <span class={`trd-badge ${statusOk ? 'trd-badge-ok' : statusWarn ? 'trd-badge-warn' : 'trd-badge-err'}`}>
            <i class={`fa-solid ${statusOk ? 'fa-circle-check' : statusWarn ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`}></i>
            {statusOk ? (apiStatus === 'cached' || apiStatus === 'scrape_ok' ? t('trending', 'cached', lang) : 'API') : statusWarn ? t('trending', 'noToken', lang) : t('trending', 'limited', lang)}
          </span>
          {cacheAge && (
            <span class="trd-cache-time">
              <i class="fa-regular fa-clock"></i>
              {new Date(cacheAge).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span class="trd-quota">
            <i class="fa-solid fa-gauge"></i> {rateLimitInfo.remaining}/30
          </span>
        </div>
        <a href={`/trending?tab=${tab}${selectedLang ? '&lang_filter=' + selectedLang : ''}&refresh=1`}
           class={`trd-refresh ${!rateLimitInfo.allowed ? 'disabled' : ''}`}
           title={!rateLimitInfo.allowed ? t('trending', 'limitReached', lang) : t('trending', 'forceRefresh', lang)}>
          <i class="fa-solid fa-arrows-rotate"></i>
          <span>{t('trending', 'refresh', lang)}</span>
        </a>
      </div>

      {!rateLimitInfo.allowed && (
        <div class="trd-rate-warn">
          <i class="fa-solid fa-shield-halved"></i>
          {t('trending', 'rateLimitMsg', lang)}
        </div>
      )}

      {/* ── Tab Switcher ── */}
      <div class="trd-tabs" id="trendingTabs" data-current-tab={tab}>
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

      {/* ── Language Filter ── */}
      <div class="trd-filters" id="trendingFilters" data-current-lang={selectedLang}>
        <span class="trd-filter-label"><i class="fa-solid fa-code"></i></span>
        <div class="trd-filter-tags">
          {popularLangs.map(pl => (
            <button type="button"
               class={`filter-tag ${selectedLang === pl ? 'active' : ''}`}
               data-lang={pl}
               key={pl || 'all'}>
              {pl || t('trending', 'allLangs', lang)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Both tab lists rendered, only active one visible ── */}
      <div id="trendingContent">
        {repoList(hotRepos, 'hot')}
        {repoList(risingRepos, 'rising')}
      </div>

      {/* ── Footer ── */}
      <div class="trd-footer">
        <p>{t('trending', 'poweredBy', lang)}</p>
      </div>
    </main>
  )

  return pageLayout({ lang, activePage: 'trending', children: content })
}
