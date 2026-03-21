/** home.tsx — 首页：仅展示个人资料 + 统计 + 快捷入口 + 名言 */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'

export function homePage(profile: any, websites: any[], repos: any[], files: any[], lang: Lang = 'zh') {
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)

  const content = (
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
            <a href="/projects" class="stat-item stat-item-link">
              <span class="stat-num">{websites.length}</span>
              <span class="stat-label">{t('home', 'websites', lang)}</span>
            </a>
            <a href="/github" class="stat-item stat-item-link">
              <span class="stat-num">{repos.length}</span>
              <span class="stat-label">{t('home', 'repos', lang)}</span>
            </a>
            <div class="stat-item">
              <span class="stat-num">{totalStars}</span>
              <span class="stat-label">{t('home', 'stars', lang)}</span>
            </div>
            <a href="/downloads" class="stat-item stat-item-link">
              <span class="stat-num">{files.length}</span>
              <span class="stat-label">{t('home', 'files', lang)}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Quick entry cards */}
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
    </main>
  )

  return pageLayout({ lang, activePage: 'home', children: content })
}
