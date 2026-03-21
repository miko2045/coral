/** projects.tsx — 网站项目独立页面 */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'

export function projectsPage(websites: any[], lang: Lang = 'zh') {
  const content = (
    <main class="page-content">
      <div class="page-header-compact">
        <h1 class="page-header-title">
          <i class="fa-solid fa-cube"></i>
          {t('home', 'webProjects', lang)}
        </h1>
        <span class="page-header-count">
          {lang === 'zh' ? `${websites.length} 个精选项目` : `${websites.length} curated project${websites.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {websites.length === 0 && (
        <div class="page-empty">
          <i class="fa-solid fa-folder-open"></i>
          <p>{lang === 'zh' ? '暂无项目' : 'No projects yet'}</p>
        </div>
      )}

      <div class="projects-grid">
        {websites.map((site: any, i: number) => (
          <a href={site.url} target="_blank" rel="noopener" class="card card-website" data-aos={i + 1} key={site.id}>
            <div class="card-inner">
              <div class="website-icon" style={`--accent: ${site.color || '#E8A838'}`}>
                <i class={site.icon || 'fa-solid fa-globe'}></i>
              </div>
              <h3 class="website-title">{site.title}</h3>
              <p class="website-desc">{site.description}</p>
              <div class="website-tags">
                {(site.tags || '').split(',').filter(Boolean).map((tag: string) => (
                  <span class="tag" key={tag}>{tag.trim()}</span>
                ))}
              </div>
              <span class="card-arrow"><i class="fa-solid fa-arrow-up-right-from-square"></i></span>
            </div>
          </a>
        ))}
      </div>
    </main>
  )

  return pageLayout({ lang, activePage: 'projects', children: content })
}
