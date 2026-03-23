/** projects.tsx — 网站项目独立页面 (超高级感) */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'

export function projectsPage(websites: any[], lang: Lang = 'zh') {
  // Sort: pinned first, then by order
  const sorted = [...websites].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (a.order || 0) - (b.order || 0)
  })

  const content = (
    <main class="page-content">
      <div class="page-header-compact">
        <a href="/" class="page-back-btn" aria-label={lang === 'zh' ? '返回' : 'Back'}>
          <i class="fa-solid fa-arrow-left"></i>
        </a>
        <h1 class="page-header-title">
          <i class="fa-solid fa-cube"></i>
          {t('home', 'webProjects', lang)}
        </h1>
        <span class="page-header-count">
          {lang === 'zh' ? `${sorted.length} 个精选项目` : `${sorted.length} curated project${sorted.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {sorted.length === 0 && (
        <div class="page-empty">
          <div class="page-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
          <p class="page-empty-title">{lang === 'zh' ? '暂无项目' : 'No projects yet'}</p>
          <p class="page-empty-sub">{lang === 'zh' ? '稍后会有精彩内容' : 'Exciting content coming soon'}</p>
        </div>
      )}

      <div class="projects-grid">
        {sorted.map((site: any, i: number) => (
          <a href={site.url} target="_blank" rel="noopener" class={`pj-card${site.pinned ? ' pj-card-pinned' : ''}`} style={`animation-delay:${Math.min(i * 0.06, 0.4)}s`} key={site.id}>
            <div class="pj-card-inner">
              {site.pinned && (
                <div class="pj-pin-badge">
                  <i class="fa-solid fa-thumbtack"></i>
                  <span>{lang === 'zh' ? '置顶' : 'Pinned'}</span>
                </div>
              )}
              <div class="pj-card-head">
                <div class="pj-icon" style={`--pj-accent: ${site.color || '#6366F1'}`}>
                  <i class={site.icon || 'fa-solid fa-globe'}></i>
                </div>
                <div class="pj-title-wrap">
                  <h3 class="pj-title">{site.title}</h3>
                  <span class="pj-go"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
                </div>
              </div>
              <p class="pj-desc">{site.description}</p>
              <div class="pj-tags">
                {(site.tags || '').split(',').filter(Boolean).map((tag: string) => (
                  <span class="pj-tag" key={tag}>{tag.trim()}</span>
                ))}
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  )

  return pageLayout({ lang, activePage: 'projects', children: content })
}
