/** home.tsx — 首页：全新布局设计 — 沉浸式 hero + 功能卡片 */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'
import type { Announcement } from './types'

export function homePage(profile: any, websites: any[], repos: any[], files: any[], lang: Lang = 'zh', announcements: Announcement[] = []) {
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)

  const content = (
    <div class="home">
      {/* Announcements */}
      {announcements.length > 0 && (
        <div class="announcements-bar" data-aos="0">
          {announcements.map((ann) => (
            <div class={`announcement-item announcement-${ann.type}`} key={ann.id}>
              <i class={`fa-solid ${ann.type === 'warning' ? 'fa-triangle-exclamation' : ann.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`}></i>
              <span>{ann.content}</span>
              <button class="announcement-close" data-ann-id={ann.id} aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
            </div>
          ))}
        </div>
      )}

      {/* ===== HERO — Full-width immersive section ===== */}
      <section class="hero-section" data-aos="0">
        <div class="hero-bg-shapes">
          <div class="hero-shape hero-shape-1"></div>
          <div class="hero-shape hero-shape-2"></div>
          <div class="hero-shape hero-shape-3"></div>
        </div>

        <div class="hero-content">
          <div class="hero-avatar-wrap">
            <img src={profile.avatar} alt={`${profile.name} avatar`} class="hero-avatar" loading="eager" width="96" height="96" fetchpriority="high" />
            <span class="hero-status-dot" aria-label="Online"></span>
          </div>

          <div class="hero-text">
            <p class="hero-greeting">{lang === 'zh' ? '你好，我是' : "Hi, I'm"}</p>
            <h1 class="hero-name" itemProp="name">{profile.name}</h1>
            <p class="hero-tagline" itemProp="description">{profile.tagline}</p>
          </div>

          {profile.status && (
            <div class="hero-badge">
              <span class="hero-badge-dot"></span>
              <span>{profile.status}</span>
            </div>
          )}

          <div class="hero-socials" role="list" aria-label={lang === 'zh' ? '社交链接' : 'Social links'}>
            {profile.socials?.github && <a href={profile.socials.github} class="hero-social-link" target="_blank" rel="noopener noreferrer" title="GitHub" role="listitem" aria-label="GitHub"><i class="fa-brands fa-github" aria-hidden="true"></i></a>}
            {profile.socials?.twitter && <a href={profile.socials.twitter} class="hero-social-link" target="_blank" rel="noopener noreferrer" title="Twitter" role="listitem" aria-label="Twitter"><i class="fa-brands fa-x-twitter" aria-hidden="true"></i></a>}
            {profile.email && <a href={`mailto:${profile.email}`} class="hero-social-link" title="Email" role="listitem" aria-label="Email"><i class="fa-solid fa-envelope" aria-hidden="true"></i></a>}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section class="about-section" data-aos="1">
        <p class="about-text">{profile.bio}</p>
        <div class="about-tags">
          <span class="about-tag"><i class="fa-solid fa-location-dot"></i> {profile.location}</span>
          {profile.currentlyReading && (
            <span class="about-tag"><i class="fa-solid fa-book-open"></i> {profile.currentlyReading}</span>
          )}
        </div>
      </section>

      {/* ===== FEATURE GRID — 2x2 large cards ===== */}
      <section class="feature-grid" data-aos="2" aria-label={lang === 'zh' ? '网站导航' : 'Site navigation'}>
        <a href="/projects" class="feature-card feature-card--blue">
          <div class="feature-card-icon"><i class="fa-solid fa-cube"></i></div>
          <div class="feature-card-content">
            <h3>{t('home', 'webProjects', lang)}</h3>
            <p>{websites.length} {t('home', 'websites', lang)}</p>
          </div>
          <span class="feature-card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </a>

        <a href="/github" class="feature-card feature-card--purple">
          <div class="feature-card-icon"><i class="fa-brands fa-github"></i></div>
          <div class="feature-card-content">
            <h3>{t('home', 'githubProjects', lang)}</h3>
            <p>{repos.length} {t('home', 'repos', lang)} · {totalStars} <i class="fa-solid fa-star" style="font-size: 0.6em; vertical-align: 1px"></i></p>
          </div>
          <span class="feature-card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </a>

        <a href="/downloads" class="feature-card feature-card--green">
          <div class="feature-card-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
          <div class="feature-card-content">
            <h3>{t('home', 'downloadsTitle', lang)}</h3>
            <p>{files.length} {t('home', 'files', lang)}</p>
          </div>
          <span class="feature-card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </a>

        <a href="/trending" class="feature-card feature-card--red">
          <div class="feature-card-icon"><i class="fa-solid fa-fire-flame-curved"></i></div>
          <div class="feature-card-content">
            <h3>{t('nav', 'trending', lang)}</h3>
            <p>GitHub {lang === 'zh' ? '实时热门' : 'Trending'}</p>
          </div>
          <span class="feature-card-arrow"><i class="fa-solid fa-arrow-right"></i></span>
        </a>
      </section>

      {/* ===== QUOTE — centered with decorative marks ===== */}
      <section class="quote-section" data-aos="3">
        <div class="quote-mark">"</div>
        <blockquote class="quote-text">{profile.quote || 'The best way to predict the future is to invent it.'}</blockquote>
        <cite class="quote-author">— {profile.quoteAuthor || 'Alan Kay'}</cite>
      </section>

      {/* ===== SEO CONTENT (preserved) ===== */}
      <section class="home-seo" data-aos="4">
        <h2 class="seo-heading">{lang === 'zh' ? '全栈开发者的数字空间' : 'A Full-Stack Developer\'s Digital Space'}</h2>
        <div class="seo-grid">
          <div class="seo-item">
            <i class="fa-solid fa-fire-flame-curved seo-icon"></i>
            <h3>{lang === 'zh' ? 'GitHub 排行榜' : 'GitHub Trending'}</h3>
            <p>{lang === 'zh' ? '实时追踪 GitHub 热门项目排行榜，每日更新今日最受欢迎的开源项目，帮你发现值得 Star 的优质仓库。' : 'Real-time GitHub trending rankings, daily updated hot open source projects.'}</p>
          </div>
          <div class="seo-item">
            <i class="fa-solid fa-cube seo-icon"></i>
            <h3>{lang === 'zh' ? '好的项目推荐' : 'Best Project Picks'}</h3>
            <p>{lang === 'zh' ? '精选优质开源项目与网站推荐，全栈开发者亲自筛选，每个项目都值得收藏和学习。' : 'Curated quality projects and websites, hand-picked by a full-stack developer.'}</p>
          </div>
          <div class="seo-item">
            <i class="fa-solid fa-cloud-arrow-down seo-icon"></i>
            <h3>{lang === 'zh' ? '软件库 & 文件库' : 'Software & File Library'}</h3>
            <p>{lang === 'zh' ? '免费软件资源下载中心，提供开发工具、编程资源、实用软件等文件的免费下载。' : 'Free software downloads, dev tools, programming resources and utilities.'}</p>
          </div>
          <div class="seo-item">
            <i class="fa-brands fa-github seo-icon"></i>
            <h3>{lang === 'zh' ? '开源项目展示' : 'Open Source Showcase'}</h3>
            <p>{lang === 'zh' ? '全栈开发者的 GitHub 开源项目作品集，涵盖前端、后端、工具链等方向。' : 'Full-stack developer GitHub portfolio, covering frontend, backend, and tooling.'}</p>
          </div>
        </div>
      </section>
    </div>
  )

  return pageLayout({ lang, activePage: 'home', children: content })
}
