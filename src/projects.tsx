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
    <main class="page-content" itemScope itemType="https://schema.org/CollectionPage">
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

      {/* SEO description */}
      <p class="page-seo-desc">
        {lang === 'zh'
          ? `精选好的项目推荐 — ${sorted.length} 个优质网站与 Web 应用展示，全栈开发者作品集。涵盖前端开发、后端服务、全栈项目等方向，每个项目都值得学习和参考。`
          : `Best project picks — ${sorted.length} quality websites and web apps, a full-stack developer portfolio. Covering frontend, backend, and full-stack projects.`}
      </p>

      {sorted.length === 0 && (
        <div class="page-empty">
          <div class="page-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
          <p class="page-empty-title">{lang === 'zh' ? '暂无项目' : 'No projects yet'}</p>
          <p class="page-empty-sub">{lang === 'zh' ? '稍后会有精彩内容' : 'Exciting content coming soon'}</p>
        </div>
      )}

      <div class="projects-grid">
        {sorted.map((site: any, i: number) => (
          <a href={site.url} target="_blank" rel="noopener noreferrer" class={`pj-card${site.pinned ? ' pj-card-pinned' : ''}`} style={`animation-delay:${Math.min(i * 0.06, 0.4)}s`} key={site.id} itemScope itemType="https://schema.org/WebPage">
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
