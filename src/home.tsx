/** home.tsx — 前台首页 JSX 渲染 */

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

export function homePage(profile: any, websites: any[], repos: any[], files: any[]) {
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)

  return (
    <div class="portal">
      <div class="bg-decor">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
        <div class="grain"></div>
      </div>

      <div class="container">
        <header class="header">
          <div class="header-left">
            <span class="logo-dot"></span>
            <span class="logo-text">portal</span>
          </div>
          <nav class="header-nav">
            <a href="#projects" class="nav-link">Projects</a>
            <a href="#github" class="nav-link">GitHub</a>
            <a href="#downloads" class="nav-link">Downloads</a>
          </nav>
          <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
            <i class="fa-solid fa-sun"></i>
          </button>
        </header>

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
              <h3 class="card-label">Quick Stats</h3>
              <div class="stats-grid">
                <div class="stat-item"><span class="stat-num">{websites.length}</span><span class="stat-label">Websites</span></div>
                <div class="stat-item"><span class="stat-num">{repos.length}</span><span class="stat-label">Repos</span></div>
                <div class="stat-item"><span class="stat-num">{totalStars}</span><span class="stat-label">Stars</span></div>
                <div class="stat-item"><span class="stat-num">{files.length}</span><span class="stat-label">Files</span></div>
              </div>
            </div>
          </div>

          {/* Web Projects */}
          {websites.length > 0 && (
            <div class="section-title" id="projects" data-aos="4"><h2><i class="fa-solid fa-globe"></i> Web Projects</h2></div>
          )}
          {websites.map((site: any, i: number) => (
            <a href={site.url} target="_blank" rel="noopener" class="card card-website" data-aos={5 + i} key={site.id}>
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

          {/* GitHub */}
          {repos.length > 0 && (
            <div class="section-title" id="github" data-aos="8"><h2><i class="fa-brands fa-github"></i> GitHub Projects</h2></div>
          )}
          {repos.map((repo: any, i: number) => (
            <a href={repo.url} target="_blank" rel="noopener" class="card card-repo" data-aos={9 + i} key={repo.id}>
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

          {/* Downloads */}
          {files.length > 0 && (
            <div class="section-title" id="downloads" data-aos="13"><h2><i class="fa-solid fa-cloud-arrow-down"></i> Downloads</h2></div>
          )}
          {files.map((file: any, i: number) => (
            <div class="card card-download" data-aos={14 + i} key={file.key}>
              <div class="card-inner">
                <div class="download-icon" style={`--accent: ${colorForType(file.type)}`}><i class={iconForType(file.type)}></i></div>
                <div class="download-info">
                  <h3 class="download-name">{file.displayName}</h3>
                  <p class="download-meta">{file.originalName} · {formatSize(file.size)}</p>
                </div>
                <a href={`/api/download/${file.key}`} class="download-btn" download><i class="fa-solid fa-download"></i><span>Download</span></a>
              </div>
            </div>
          ))}

          {/* Quote */}
          <div class="card card-quote" data-aos="17">
            <div class="card-inner">
              <blockquote class="quote-text">"{profile.quote || 'The best way to predict the future is to invent it.'}"</blockquote>
              <cite class="quote-author">— {profile.quoteAuthor || 'Alan Kay'}</cite>
            </div>
          </div>

          {/* Footer */}
          <div class="card card-footer" data-aos="18">
            <div class="card-inner">
              <p>Built with <i class="fa-solid fa-heart" style="color: #EF4444"></i> &amp; <a href="https://hono.dev" target="_blank" rel="noopener">Hono</a></p>
              <p class="footer-sub">Deployed on Cloudflare Pages</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
