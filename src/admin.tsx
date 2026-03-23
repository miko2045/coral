/** admin.tsx — Admin panel (major UI overhaul with full pin support) */
import { raw } from 'hono/html'
import type { Lang } from './i18n'
import { t } from './i18n'
import { safeJsonStringify } from './lib/auth'
import type { Announcement } from './types'

export function adminPage(page: 'login' | 'dashboard', data: any) {
  const lang: Lang = data.lang || 'zh'
  if (page === 'login') return loginView(data, lang)
  return dashboardView(data, lang)
}

function loginView({ error }: { error?: string; lang?: Lang }, lang: Lang) {
  return (
    <div class="adm-login-wrap">
      <div class="adm-login-card">
        <div class="adm-login-header">
          <span class="logo-dot"></span>
          <h1>{t('adminLogin', 'title', lang)}</h1>
        </div>
        <p class="adm-login-sub">{t('adminLogin', 'subtitle', lang)}</p>
        {error && <div class="adm-alert adm-alert-err">{error}</div>}
        <form method="POST" action="/admin/login" class="adm-login-form">
          <div class="adm-field">
            <label>{t('adminLogin', 'username', lang)}</label>
            <input type="text" name="username" placeholder={t('adminLogin', 'usernamePlaceholder', lang)} autofocus required autocomplete="username" />
          </div>
          <div class="adm-field">
            <label>{t('adminLogin', 'password', lang)}</label>
            <input type="password" name="password" placeholder={t('adminLogin', 'placeholder', lang)} required autocomplete="current-password" />
          </div>
          <button type="submit" class="adm-btn adm-btn-primary adm-btn-full">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> {t('adminLogin', 'signIn', lang)}
          </button>
        </form>
        <a href="/" class="adm-login-back">
          <i class="fa-solid fa-arrow-left"></i> {lang === 'zh' ? '返回首页' : 'Back to Home'}
        </a>
      </div>
    </div>
  )
}

function dashboardView({ profile, websites, repos, files, settings, lang: dataLang, announcements, shares, csrfToken }: any, lang: Lang) {
  const st = settings || { storageMode: 'kv', maxFileSize: 25 }
  const data = { csrfToken }
  const otherLang = lang === 'zh' ? 'en' : 'zh'
  const langLabel = lang === 'zh' ? 'EN' : '中'
  const anns: Announcement[] = announcements || []
  const allShares = shares || []
  const totalFileSize = files.reduce((a: number, f: any) => a + (f.size || 0), 0)
  const totalDownloads = allShares.reduce((a: number, s: any) => a + (s.downloads || 0), 0)
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)
  const pinnedWebsites = websites.filter((w: any) => w.pinned)
  const pinnedFiles = files.filter((f: any) => f.pinned)

  // Sort websites and files: pinned first
  const sortedWebsites = [...websites].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (a.order || 0) - (b.order || 0)
  })
  const sortedFiles = [...files].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (a.order || 0) - (b.order || 0)
  })

  return (
    <div class="adm">
      {/* Sidebar */}
      <aside class="adm-sidebar">
        <div class="adm-sidebar-logo">
          <span class="logo-dot"></span>
          <span>{t('admin', 'sidebarTitle', lang)}</span>
        </div>
        <nav class="adm-nav">
          <a href="#panel-overview" class="adm-nav-item active" data-tab="overview"><i class="fa-solid fa-chart-line"></i> {lang === 'zh' ? '仪表盘' : 'Dashboard'}</a>
          <a href="#panel-profile" class="adm-nav-item" data-tab="profile"><i class="fa-solid fa-user"></i> {t('admin', 'profile', lang)}</a>
          <a href="#panel-websites" class="adm-nav-item" data-tab="websites">
            <i class="fa-solid fa-globe"></i> {t('admin', 'websitesTab', lang)}
            {pinnedWebsites.length > 0 && <span class="adm-nav-badge">{pinnedWebsites.length}<i class="fa-solid fa-thumbtack" style="font-size:0.55rem;margin-left:2px"></i></span>}
          </a>
          <a href="#panel-repos" class="adm-nav-item" data-tab="repos"><i class="fa-brands fa-github"></i> {t('admin', 'githubTab', lang)}</a>
          <a href="#panel-files" class="adm-nav-item" data-tab="files">
            <i class="fa-solid fa-cloud-arrow-up"></i> {t('admin', 'filesTab', lang)}
            {pinnedFiles.length > 0 && <span class="adm-nav-badge">{pinnedFiles.length}<i class="fa-solid fa-thumbtack" style="font-size:0.55rem;margin-left:2px"></i></span>}
          </a>
          <a href="#panel-shares" class="adm-nav-item" data-tab="shares"><i class="fa-solid fa-share-nodes"></i> {t('admin', 'sharesTab', lang)}</a>
          <a href="#panel-announcements" class="adm-nav-item" data-tab="announcements"><i class="fa-solid fa-bullhorn"></i> {t('admin', 'announcementsTab', lang)}</a>
          <a href="#panel-tokens" class="adm-nav-item" data-tab="tokens"><i class="fa-solid fa-key"></i> {t('admin', 'githubTokens', lang)}</a>
          <a href="#panel-settings" class="adm-nav-item" data-tab="settings"><i class="fa-solid fa-gear"></i> {t('admin', 'settingsTab', lang)}</a>
        </nav>
        <div class="adm-sidebar-footer">
          <a href={`/api/set-lang?lang=${otherLang}`} class="adm-nav-item" title={lang === 'zh' ? 'Switch to English' : '切换到中文'}>
            <i class="fa-solid fa-globe"></i> {langLabel}
          </a>
          <a href="/" class="adm-nav-item" target="_blank"><i class="fa-solid fa-eye"></i> {t('admin', 'viewSite', lang)}</a>
          <a href="/admin/logout" class="adm-nav-item adm-nav-danger"><i class="fa-solid fa-right-from-bracket"></i> {t('admin', 'logout', lang)}</a>
        </div>
      </aside>

      {/* Main */}
      <main class="adm-main">
        {/* ===== Dashboard Overview ===== */}
        <section id="panel-overview" class="adm-panel active">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-chart-line"></i> {lang === 'zh' ? '仪表盘' : 'Dashboard'}</h2>
            <div style="display:flex;gap:8px">
              <button class="adm-btn" id="exportData" title={lang === 'zh' ? '导出数据' : 'Export Data'}><i class="fa-solid fa-download"></i> {lang === 'zh' ? '导出' : 'Export'}</button>
              <label class="adm-btn" id="importDataLabel" title={lang === 'zh' ? '导入数据' : 'Import Data'}><i class="fa-solid fa-upload"></i> {lang === 'zh' ? '导入' : 'Import'}<input type="file" id="importDataInput" accept=".json" hidden /></label>
            </div>
          </div>

          {/* Stats Cards */}
          <div class="adm-stats-grid">
            <div class="adm-stat-card">
              <div class="adm-stat-icon" style="background:rgba(99,102,241,0.12);color:var(--accent)"><i class="fa-solid fa-globe"></i></div>
              <div class="adm-stat-info">
                <span class="adm-stat-num">{websites.length}</span>
                <span class="adm-stat-label">{lang === 'zh' ? '网站项目' : 'Websites'}{pinnedWebsites.length > 0 ? ` (${pinnedWebsites.length} ${lang === 'zh' ? '置顶' : 'pinned'})` : ''}</span>
              </div>
            </div>
            <div class="adm-stat-card">
              <div class="adm-stat-icon" style="background:rgba(34,197,94,0.12);color:#22C55E"><i class="fa-brands fa-github"></i></div>
              <div class="adm-stat-info">
                <span class="adm-stat-num">{repos.length}</span>
                <span class="adm-stat-label">{lang === 'zh' ? '代码仓库' : 'Repos'}</span>
              </div>
            </div>
            <div class="adm-stat-card">
              <div class="adm-stat-icon" style="background:rgba(245,158,11,0.12);color:#F59E0B"><i class="fa-solid fa-file"></i></div>
              <div class="adm-stat-info">
                <span class="adm-stat-num">{files.length}</span>
                <span class="adm-stat-label">{lang === 'zh' ? '文件' : 'Files'} ({formatSize(totalFileSize)}){pinnedFiles.length > 0 ? ` · ${pinnedFiles.length} ${lang === 'zh' ? '置顶' : 'pinned'}` : ''}</span>
              </div>
            </div>
            <div class="adm-stat-card">
              <div class="adm-stat-icon" style="background:rgba(236,72,153,0.12);color:#EC4899"><i class="fa-solid fa-share-nodes"></i></div>
              <div class="adm-stat-info">
                <span class="adm-stat-num">{allShares.length}</span>
                <span class="adm-stat-label">{lang === 'zh' ? '分享链接' : 'Shares'} ({totalDownloads} {lang === 'zh' ? '次下载' : 'dl'})</span>
              </div>
            </div>
            <div class="adm-stat-card">
              <div class="adm-stat-icon" style="background:rgba(139,92,246,0.12);color:#8B5CF6"><i class="fa-solid fa-star"></i></div>
              <div class="adm-stat-info">
                <span class="adm-stat-num">{totalStars}</span>
                <span class="adm-stat-label">{lang === 'zh' ? '总星标' : 'Total Stars'}</span>
              </div>
            </div>
            <div class="adm-stat-card">
              <div class="adm-stat-icon" style="background:rgba(14,165,233,0.12);color:#0EA5E9"><i class="fa-solid fa-bullhorn"></i></div>
              <div class="adm-stat-info">
                <span class="adm-stat-num">{anns.filter(a => a.enabled).length}/{anns.length}</span>
                <span class="adm-stat-label">{lang === 'zh' ? '活跃公告' : 'Active Announcements'}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div class="adm-card" style="margin-top:16px">
            <h3 class="adm-card-title"><i class="fa-solid fa-bolt"></i> {lang === 'zh' ? '快捷操作' : 'Quick Actions'}</h3>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
              <button class="adm-btn adm-btn-primary" onclick="document.querySelector('[data-tab=websites]').click()"><i class="fa-solid fa-plus"></i> {lang === 'zh' ? '添加网站' : 'Add Website'}</button>
              <button class="adm-btn adm-btn-primary" onclick="document.querySelector('[data-tab=repos]').click()"><i class="fa-solid fa-plus"></i> {lang === 'zh' ? '添加仓库' : 'Add Repo'}</button>
              <button class="adm-btn adm-btn-primary" onclick="document.querySelector('[data-tab=files]').click()"><i class="fa-solid fa-cloud-arrow-up"></i> {lang === 'zh' ? '上传文件' : 'Upload File'}</button>
              <button class="adm-btn" onclick="document.querySelector('[data-tab=announcements]').click()"><i class="fa-solid fa-bullhorn"></i> {lang === 'zh' ? '发布公告' : 'Post Announcement'}</button>
              <a href="/" class="adm-btn" target="_blank"><i class="fa-solid fa-eye"></i> {lang === 'zh' ? '查看网站' : 'View Site'}</a>
            </div>
          </div>

          {/* Pinned items overview */}
          {(pinnedWebsites.length > 0 || pinnedFiles.length > 0) && (
            <div class="adm-card adm-pinned-overview" style="margin-top:16px">
              <h3 class="adm-card-title"><i class="fa-solid fa-thumbtack"></i> {lang === 'zh' ? '已置顶项目' : 'Pinned Items'}</h3>
              <div class="adm-pinned-list">
                {pinnedWebsites.map((w: any) => (
                  <div class="adm-pinned-chip adm-pinned-chip-website" key={w.id}>
                    <i class={w.icon || 'fa-solid fa-globe'} style={`color:${w.color || '#6366F1'}`}></i>
                    <span>{w.title}</span>
                    <span class="adm-pinned-chip-type">{lang === 'zh' ? '网站' : 'Website'}</span>
                  </div>
                ))}
                {pinnedFiles.map((f: any) => (
                  <div class="adm-pinned-chip adm-pinned-chip-file" key={f.key}>
                    <i class={getFileIcon(f.type)}></i>
                    <span>{f.displayName}</span>
                    <span class="adm-pinned-chip-type">{lang === 'zh' ? '文件' : 'File'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent files */}
          {files.length > 0 && (
            <div class="adm-card" style="margin-top:16px">
              <h3 class="adm-card-title"><i class="fa-solid fa-clock-rotate-left"></i> {lang === 'zh' ? '最近文件' : 'Recent Files'}</h3>
              <div class="adm-items" style="margin-top:8px">
                {files.slice(-5).reverse().map((f: any) => (
                  <div class="adm-item" key={f.key} style="padding:8px 0">
                    <div class="adm-item-icon"><i class={f.isExternal ? 'fa-solid fa-link' : 'fa-solid fa-file'}></i></div>
                    <div class="adm-item-body">
                      <strong style="font-size:0.85rem">{f.displayName}</strong>
                      <span class="adm-item-sub">{formatSize(f.size)} · {new Date(f.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ===== Profile ===== */}
        <section id="panel-profile" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-user"></i> {t('admin', 'personalInfo', lang)}</h2>
            <button class="adm-btn adm-btn-primary" id="saveProfile"><i class="fa-solid fa-save"></i> {t('admin', 'save', lang)}</button>
          </div>
          <div class="adm-card">
            <div class="adm-form-grid">
              <div class="adm-field"><label>{t('admin', 'name', lang)}</label><input id="pf-name" value={profile.name} /></div>
              <div class="adm-field"><label>{t('admin', 'tagline', lang)}</label><input id="pf-tagline" value={profile.tagline} /></div>
              <div class="adm-field adm-field-full"><label>{t('admin', 'avatarUrl', lang)}</label><input id="pf-avatar" value={profile.avatar} /></div>
              <div class="adm-field adm-field-full"><label>{t('admin', 'bio', lang)}</label><textarea id="pf-bio" rows={3}>{profile.bio}</textarea></div>
              <div class="adm-field"><label>{t('admin', 'location', lang)}</label><input id="pf-location" value={profile.location} /></div>
              <div class="adm-field"><label>{t('admin', 'email', lang)}</label><input id="pf-email" value={profile.email} /></div>
              <div class="adm-field"><label>{t('admin', 'status', lang)}</label><input id="pf-status" value={profile.status} /></div>
              <div class="adm-field"><label>{t('admin', 'currentlyReading', lang)}</label><input id="pf-reading" value={profile.currentlyReading} /></div>
              <div class="adm-field"><label>{t('admin', 'quote', lang)}</label><input id="pf-quote" value={profile.quote} /></div>
              <div class="adm-field"><label>{t('admin', 'quoteAuthor', lang)}</label><input id="pf-quoteAuthor" value={profile.quoteAuthor} /></div>
              <div class="adm-field"><label>{t('admin', 'githubUrl', lang)}</label><input id="pf-github" value={profile.socials?.github || ''} /></div>
              <div class="adm-field"><label>{t('admin', 'twitterUrl', lang)}</label><input id="pf-twitter" value={profile.socials?.twitter || ''} /></div>
            </div>
          </div>
        </section>

        {/* ===== Websites (with pin/reorder) ===== */}
        <section id="panel-websites" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-globe"></i> {t('admin', 'webProjectsTitle', lang)}</h2>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="adm-header-badge" id="websitePinnedCount" style={pinnedWebsites.length > 0 ? '' : 'display:none'}>
                <i class="fa-solid fa-thumbtack"></i> {pinnedWebsites.length} {lang === 'zh' ? '置顶' : 'pinned'}
              </span>
              <button class="adm-btn adm-btn-primary" id="addWebsite"><i class="fa-solid fa-plus"></i> {t('admin', 'add', lang)}</button>
            </div>
          </div>
          <div id="websitesList" class="adm-items">
            {sortedWebsites.map((w: any) => (
              <div class={`adm-item adm-item-sortable${w.pinned ? ' adm-item-pinned' : ''}`} data-id={w.id} key={w.id}>
                <div class="adm-item-drag" title={lang === 'zh' ? '拖拽排序' : 'Drag to reorder'}>
                  <i class="fa-solid fa-grip-vertical"></i>
                </div>
                <div class="adm-item-icon" style={`color: ${w.color || '#6366F1'}`}><i class={w.icon || 'fa-solid fa-globe'}></i></div>
                <div class="adm-item-body">
                  <strong>
                    {w.pinned && <span class="adm-pin-badge"><i class="fa-solid fa-thumbtack"></i> {lang === 'zh' ? '置顶' : 'PIN'}</span>}
                    {w.title}
                  </strong>
                  <span class="adm-item-sub">{w.description}</span>
                </div>
                <div class="adm-item-actions">
                  <button class={`adm-btn-icon pin-website${w.pinned ? ' adm-btn-icon-active' : ''}`} title={lang === 'zh' ? '置顶/取消' : 'Pin/Unpin'}><i class="fa-solid fa-thumbtack"></i></button>
                  <button class="adm-btn-icon move-up-website" title={lang === 'zh' ? '上移' : 'Move Up'}><i class="fa-solid fa-arrow-up"></i></button>
                  <button class="adm-btn-icon move-down-website" title={lang === 'zh' ? '下移' : 'Move Down'}><i class="fa-solid fa-arrow-down"></i></button>
                  <button class="adm-btn-icon edit-website" title={t('admin', 'edit', lang)}><i class="fa-solid fa-pen"></i></button>
                  <button class="adm-btn-icon adm-btn-icon-danger delete-website" title={t('admin', 'delete', lang)}><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Repos ===== */}
        <section id="panel-repos" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-brands fa-github"></i> {t('admin', 'githubProjectsTitle', lang)}</h2>
            <button class="adm-btn adm-btn-primary" id="addRepo"><i class="fa-solid fa-plus"></i> {t('admin', 'add', lang)}</button>
          </div>
          <div id="reposList" class="adm-items">
            {repos.map((r: any) => (
              <div class="adm-item" data-id={r.id} key={r.id}>
                <div class="adm-item-icon"><i class="fa-solid fa-book-bookmark"></i></div>
                <div class="adm-item-body"><strong>{r.name}</strong><span class="adm-item-sub">{r.description}</span></div>
                <div class="adm-item-actions">
                  <button class="adm-btn-icon edit-repo" title={t('admin', 'edit', lang)}><i class="fa-solid fa-pen"></i></button>
                  <button class="adm-btn-icon adm-btn-icon-danger delete-repo" title={t('admin', 'delete', lang)}><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Files (with pin/reorder) ===== */}
        <section id="panel-files" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-cloud-arrow-up"></i> {t('admin', 'fileManager', lang)}</h2>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="adm-header-badge" id="filePinnedCount" style={pinnedFiles.length > 0 ? '' : 'display:none'}>
                <i class="fa-solid fa-thumbtack"></i> {pinnedFiles.length} {lang === 'zh' ? '置顶' : 'pinned'}
              </span>
              <button class="adm-btn adm-btn-danger" id="batchDeleteFiles" style="display:none">
                <i class="fa-solid fa-trash"></i> <span id="batchDeleteCount">0</span>
              </button>
              <button class="adm-btn adm-btn-primary" id="addLinkFile" style={st.storageMode === 'external' ? '' : 'display:none'}>
                <i class="fa-solid fa-link"></i> {t('admin', 'addLink', lang)}
              </button>
            </div>
          </div>

          {/* File search + filter bar */}
          <div class="adm-file-toolbar">
            <div class="adm-search-box">
              <i class="fa-solid fa-search"></i>
              <input type="text" id="fileSearch" placeholder={lang === 'zh' ? '搜索文件名...' : 'Search files...'} />
            </div>
            <div class="adm-file-toolbar-actions">
              <button class="adm-btn-sm" id="filterPinnedFiles" title={lang === 'zh' ? '只显示置顶' : 'Show pinned only'}>
                <i class="fa-solid fa-thumbtack"></i> {lang === 'zh' ? '置顶' : 'Pinned'}
              </button>
              <label class="adm-checkbox-label">
                <input type="checkbox" id="selectAllFiles" /> {lang === 'zh' ? '全选' : 'All'}
              </label>
            </div>
          </div>

          <div class="adm-card adm-upload-zone" id="uploadZone" style={st.storageMode === 'kv' || st.storageMode === 'local' ? '' : 'display:none'}>
            <div class="adm-upload-inner">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <p>{t('admin', 'dragDrop', lang)} <label for="fileInput" class="adm-upload-link">{t('admin', 'browse', lang)}</label></p>
              <input type="file" id="fileInput" multiple hidden />
              <span class="adm-upload-hint">
                {st.storageMode === 'local'
                  ? t('admin', 'storedInLocal', lang)
                  : (<>{t('admin', 'maxFileHint', lang)} {st.maxFileSize || 25}MB · {t('admin', 'storedIn', lang)}</>)
                }
              </span>
            </div>
            <div class="adm-upload-progress" id="uploadProgress" style="display:none">
              <div class="adm-progress-bar"><div class="adm-progress-fill" id="progressFill"></div></div>
              <span id="progressText">{t('admin', 'uploading', lang)}</span>
            </div>
          </div>

          <div class="adm-card" id="localUploadHint" style={st.storageMode === 'local' ? '' : 'display:none'}>
            <div style="text-align:center;padding:12px;color:var(--text-secondary);font-size:0.85rem">
              <i class="fa-solid fa-server" style="font-size:1.5rem;margin-bottom:8px;display:block;color:var(--accent)"></i>
              {t('admin', 'localUploadHint', lang)}
              {st.localServerUrl && (<span> — <strong>{st.localServerUrl}</strong></span>)}
              {st.localStoragePath && (<span> ({st.localStoragePath})</span>)}
            </div>
          </div>

          <div class="adm-card" id="externalHint" style={st.storageMode === 'external' ? '' : 'display:none'}>
            <div style="text-align:center;padding:12px;color:var(--text-secondary);font-size:0.85rem">
              <i class="fa-solid fa-link" style="font-size:1.5rem;margin-bottom:8px;display:block;color:var(--accent)"></i>
              {t('admin', 'externalHint', lang)} <strong>{t('admin', 'addLink', lang)}</strong> {t('admin', 'externalHintEnd', lang)}
            </div>
          </div>

          <div id="filesList" class="adm-items">
            {sortedFiles.map((f: any) => (
              <div class={`adm-item adm-file-item adm-item-sortable${f.pinned ? ' adm-item-pinned' : ''}`} data-key={f.key} data-name={(f.displayName || '').toLowerCase()} key={f.key}>
                <label class="adm-file-checkbox"><input type="checkbox" class="file-select-cb" data-key={f.key} /></label>
                <div class="adm-item-icon">
                  <i class={f.isExternal ? 'fa-solid fa-link' : getFileIcon(f.type)}></i>
                </div>
                <div class="adm-item-body">
                  <strong>
                    {f.pinned && <span class="adm-pin-badge"><i class="fa-solid fa-thumbtack"></i> {lang === 'zh' ? '置顶' : 'PIN'}</span>}
                    {f.displayName}
                  </strong>
                  <span class="adm-item-sub">
                    {f.originalName} · {formatSize(f.size)} · {new Date(f.uploadedAt).toLocaleDateString()}
                    {f.isExternal ? ` · ${t('admin', 'external', lang)}` : f.storageType === 'local' ? ` · ${t('admin', 'localStorageInfo', lang)}` : ' · KV'}
                  </span>
                </div>
                <div class="adm-item-actions">
                  <button class={`adm-btn-icon pin-file${f.pinned ? ' adm-btn-icon-active' : ''}`} data-key={f.key} title={lang === 'zh' ? '置顶/取消' : 'Pin/Unpin'}><i class="fa-solid fa-thumbtack"></i></button>
                  {f.type && f.type.startsWith('image/') && !f.isExternal && (
                    <button class="adm-btn-icon preview-file" data-url={'/api/download/' + f.key} title={lang === 'zh' ? '预览' : 'Preview'}><i class="fa-solid fa-eye"></i></button>
                  )}
                  <button class="adm-btn-icon rename-file" data-key={f.key} data-name={f.displayName} title={lang === 'zh' ? '重命名' : 'Rename'}><i class="fa-solid fa-pen-to-square"></i></button>
                  <a href={f.isExternal && f.externalUrl ? f.externalUrl : '/api/download/' + f.key} class="adm-btn-icon" title={t('home', 'download', lang)} target="_blank"><i class="fa-solid fa-download"></i></a>
                  <button class="adm-btn-icon adm-btn-icon-danger delete-file" title={t('admin', 'delete', lang)}><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Shares ===== */}
        <section id="panel-shares" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-share-nodes"></i> {t('admin', 'sharesTab', lang)}</h2>
          </div>
          <div class="adm-card">
            <p class="adm-card-desc">{t('admin', 'sharesDesc', lang)}</p>
            <div id="sharesListContainer">
              <div style="text-align:center;padding:20px;color:var(--text-secondary)">
                <i class="fa-solid fa-spinner fa-spin"></i> {lang === 'zh' ? '加载中...' : 'Loading...'}
              </div>
            </div>
          </div>
        </section>

        {/* ===== Announcements ===== */}
        <section id="panel-announcements" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-bullhorn"></i> {t('admin', 'announcementsTab', lang)}</h2>
            <button class="adm-btn adm-btn-primary" id="addAnnouncement"><i class="fa-solid fa-plus"></i> {t('admin', 'add', lang)}</button>
          </div>
          <div class="adm-card">
            <p class="adm-card-desc">{t('admin', 'announcementsDesc', lang)}</p>
            <div id="announcementsList" class="adm-items">
              {anns.length === 0 && (
                <div style="text-align:center;padding:20px;color:var(--text-secondary)">
                  <i class="fa-solid fa-bullhorn" style="font-size:2rem;margin-bottom:8px;display:block;opacity:0.5"></i>
                  {lang === 'zh' ? '暂无公告' : 'No announcements yet'}
                </div>
              )}
              {anns.map((a: Announcement) => (
                <div class="adm-item" data-ann-id={a.id} key={a.id}>
                  <div class="adm-item-icon" style={`color:${a.type === 'warning' ? '#F59E0B' : a.type === 'success' ? '#22C55E' : 'var(--accent)'}`}>
                    <i class={`fa-solid ${a.type === 'warning' ? 'fa-triangle-exclamation' : a.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}`}></i>
                  </div>
                  <div class="adm-item-body">
                    <strong>{a.content.length > 60 ? a.content.slice(0, 60) + '...' : a.content}</strong>
                    <span class="adm-item-sub">
                      <span style={`color:${a.enabled ? '#22C55E' : '#EF4444'};font-weight:600`}>{a.enabled ? (lang === 'zh' ? '启用' : 'Active') : (lang === 'zh' ? '禁用' : 'Disabled')}</span>
                      · {a.type}
                      {a.expiresAt ? ` · ${lang === 'zh' ? '过期' : 'Expires'}: ${new Date(a.expiresAt).toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div class="adm-item-actions">
                    <button class="adm-btn-icon toggle-announcement" title={lang === 'zh' ? '启用/禁用' : 'Toggle'}><i class={`fa-solid ${a.enabled ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                    <button class="adm-btn-icon adm-btn-icon-danger delete-announcement" title={t('admin', 'delete', lang)}><i class="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== GitHub Tokens ===== */}
        <section id="panel-tokens" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-key"></i> {t('admin', 'githubTokens', lang)}</h2>
          </div>
          <div class="adm-card adm-token-how">
            <h3 class="adm-card-title"><i class="fa-solid fa-lightbulb"></i> {t('admin', 'tokenHowItWorks', lang)}</h3>
            <ul class="adm-token-how-list">
              <li><i class="fa-solid fa-rotate"></i> {t('admin', 'tokenHowDesc1', lang)}</li>
              <li><i class="fa-solid fa-shield-halved"></i> {t('admin', 'tokenHowDesc2', lang)}</li>
              <li><i class="fa-solid fa-arrow-down"></i> {t('admin', 'tokenHowDesc3', lang)}</li>
              <li><i class="fa-solid fa-gauge-high"></i> {t('admin', 'tokenHowDesc4', lang)}</li>
            </ul>
          </div>
          <div class="adm-card" id="tokenStatusCard">
            <h3 class="adm-card-title"><i class="fa-solid fa-chart-bar"></i> {t('admin', 'tokenStatus', lang)}</h3>
            <div id="tokenStatusContent" class="adm-token-status-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>
          </div>
          <div class="adm-card">
            <h3 class="adm-card-title"><i class="fa-solid fa-database"></i> {t('admin', 'tokenPool', lang)}</h3>
            <p class="adm-card-desc">{t('admin', 'githubTokensDesc', lang)}</p>
            <div id="tokenListContainer" class="adm-token-list"></div>
            <div class="adm-token-add-row" style="margin-top: 12px">
              <input type="text" id="newTokenInput" class="adm-token-input" placeholder={t('admin', 'tokenPlaceholder', lang)} />
              <button class="adm-btn adm-btn-primary" id="addTokenBtn"><i class="fa-solid fa-plus"></i> {t('admin', 'addToken', lang)}</button>
            </div>
            <button class="adm-btn adm-btn-primary" id="saveTokensBtn" style="margin-top: 16px"><i class="fa-solid fa-save"></i> {t('admin', 'saveTokens', lang)}</button>
          </div>
          <div class="adm-card">
            <h3 class="adm-card-title"><i class="fa-solid fa-gauge-high"></i> {t('admin', 'rateLimitConfig', lang)}</h3>
            <div class="adm-status-grid">
              <div class="adm-status-item"><span class="adm-status-label">{t('admin', 'perIpLimit', lang)}</span><span class="adm-status-value">30 {lang === 'zh' ? '次' : 'times'}</span></div>
              <div class="adm-status-item"><span class="adm-status-label">{t('admin', 'cacheDuration', lang)}</span><span class="adm-status-value">1 {t('admin', 'hour', lang)}</span></div>
              <div class="adm-status-item"><span class="adm-status-label">{t('admin', 'tokenCooldownTime', lang)}</span><span class="adm-status-value">10 {t('admin', 'minutes', lang)}</span></div>
            </div>
          </div>
        </section>

        {/* ===== Settings ===== */}
        <section id="panel-settings" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-gear"></i> {t('admin', 'settingsTitle', lang)}</h2>
          </div>
          <div class="adm-card adm-storage-status">
            <h3 class="adm-card-title"><i class="fa-solid fa-chart-pie"></i> {t('admin', 'storageStatus', lang)}</h3>
            <div class="adm-status-grid">
              <div class="adm-status-item">
                <span class="adm-status-label">{t('admin', 'currentMode', lang)}</span>
                <span class="adm-status-value adm-status-badge" id="statusMode">
                  {st.storageMode === 'kv' ? t('admin', 'kvStorage', lang) : st.storageMode === 'local' ? t('admin', 'localStorage', lang) : t('admin', 'externalLinks', lang)}
                </span>
              </div>
              {st.storageMode === 'local' && st.localServerUrl && (<div class="adm-status-item"><span class="adm-status-label">{t('admin', 'serverAddress', lang)}</span><span class="adm-status-value adm-status-mono">{st.localServerUrl}</span></div>)}
              {st.storageMode === 'local' && st.localStoragePath && (<div class="adm-status-item"><span class="adm-status-label">{t('admin', 'storagePath', lang)}</span><span class="adm-status-value adm-status-mono">{st.localStoragePath}</span></div>)}
              <div class="adm-status-item"><span class="adm-status-label">{t('admin', 'fileCount', lang)}</span><span class="adm-status-value">{files.length}</span></div>
              <div class="adm-status-item"><span class="adm-status-label">{t('admin', 'totalSize', lang)}</span><span class="adm-status-value">{formatSize(files.reduce((a: number, f: any) => a + (f.size || 0), 0))}</span></div>
            </div>
          </div>

          <div class="adm-card">
            <h3 class="adm-card-title"><i class="fa-solid fa-hard-drive"></i> {t('admin', 'storage', lang)}</h3>
            <p class="adm-card-desc">{t('admin', 'storageDesc', lang)}</p>
            <div class="adm-radio-group" id="storageModeGroup">
              <label class={`adm-radio-card ${st.storageMode === 'kv' ? 'active' : ''}`}>
                <input type="radio" name="storageMode" value="kv" checked={st.storageMode === 'kv'} />
                <div class="adm-radio-card-body"><div class="adm-radio-icon"><i class="fa-solid fa-database"></i></div><div><strong>{t('admin', 'kvStorage', lang)}</strong><span>{t('admin', 'kvDesc', lang)}</span></div></div>
              </label>
              <label class={`adm-radio-card ${st.storageMode === 'local' ? 'active' : ''}`}>
                <input type="radio" name="storageMode" value="local" checked={st.storageMode === 'local'} />
                <div class="adm-radio-card-body"><div class="adm-radio-icon"><i class="fa-solid fa-server"></i></div><div><strong>{t('admin', 'localStorage', lang)}</strong><span>{t('admin', 'localDesc', lang)}</span></div></div>
              </label>
              <label class={`adm-radio-card ${st.storageMode === 'external' ? 'active' : ''}`}>
                <input type="radio" name="storageMode" value="external" checked={st.storageMode === 'external'} />
                <div class="adm-radio-card-body"><div class="adm-radio-icon"><i class="fa-solid fa-link"></i></div><div><strong>{t('admin', 'externalLinks', lang)}</strong><span>{t('admin', 'externalDesc', lang)}</span></div></div>
              </label>
            </div>
            <div class="adm-local-config" id="localConfig" style={st.storageMode === 'local' ? '' : 'display:none'}>
              <div class="adm-form-grid" style="margin-top:16px">
                <div class="adm-field adm-field-full"><label>{t('admin', 'localServerUrl', lang)}</label><input id="set-localServerUrl" value={st.localServerUrl || ''} placeholder="http://192.168.1.100:8080" /><span class="adm-field-hint">{t('admin', 'localServerUrlHint', lang)}</span></div>
                <div class="adm-field adm-field-full"><label>{t('admin', 'localStoragePath', lang)}</label><input id="set-localStoragePath" value={st.localStoragePath || '/data/portal/files'} placeholder="/data/portal/files" /><span class="adm-field-hint">{t('admin', 'localStoragePathHint', lang)}</span></div>
              </div>
            </div>
            <button class="adm-btn adm-btn-primary" id="saveSettings" style="margin-top:16px"><i class="fa-solid fa-save"></i> {t('admin', 'saveStorage', lang)}</button>
          </div>

          <div class="adm-card">
            <h3 class="adm-card-title"><i class="fa-solid fa-shield-halved"></i> {t('admin', 'changePassword', lang)}</h3>
            <div class="adm-form-grid">
              <div class="adm-field"><label>{t('admin', 'changeUsername', lang)}</label><input id="set-newUsername" type="text" placeholder={t('admin', 'newUsername', lang)} /></div>
              <div class="adm-field"><button class="adm-btn adm-btn-primary" id="changeUsername" style="margin-top:24px"><i class="fa-solid fa-user-pen"></i> {t('admin', 'updateUsername', lang)}</button></div>
            </div>
            <hr style="border:none;border-top:1px solid var(--border);margin:20px 0" />
            <div class="adm-form-grid">
              <div class="adm-field"><label>{t('admin', 'currentPw', lang)}</label><input id="set-oldpw" type="password" autocomplete="current-password" /></div>
              <div class="adm-field"><label>{t('admin', 'newPw', lang)}</label><input id="set-newpw" type="password" autocomplete="new-password" /></div>
            </div>
            <button class="adm-btn adm-btn-primary" id="changePw" style="margin-top:16px"><i class="fa-solid fa-key"></i> {t('admin', 'updatePw', lang)}</button>
          </div>
        </section>
      </main>

      {/* Modal */}
      <div class="adm-modal-overlay" id="modalOverlay" style="display:none">
        <div class="adm-modal" id="modal">
          <div class="adm-modal-header"><h3 id="modalTitle">{t('admin', 'edit', lang)}</h3><button class="adm-btn-icon" id="modalClose"><i class="fa-solid fa-xmark"></i></button></div>
          <div class="adm-modal-body" id="modalBody"></div>
          <div class="adm-modal-footer"><button class="adm-btn" id="modalCancel">{t('admin', 'cancel', lang)}</button><button class="adm-btn adm-btn-primary" id="modalSave">{t('admin', 'save', lang)}</button></div>
        </div>
      </div>
      <div class="adm-toast-container" id="toastContainer"></div>

      {/* SAFE JSON injection */}
      {raw(`<script>
        window.__DATA__ = ${safeJsonStringify({
          websites: sortedWebsites,
          repos,
          files: sortedFiles,
          settings: st,
          lang,
          announcements: anns,
          shares: allShares,
          csrfToken: data.csrfToken || '',
        })};
      </script>`)}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function getFileIcon(mimeType: string): string {
  if (!mimeType) return 'fa-solid fa-file'
  if (mimeType.startsWith('image/')) return 'fa-solid fa-file-image'
  if (mimeType.startsWith('video/')) return 'fa-solid fa-file-video'
  if (mimeType.startsWith('audio/')) return 'fa-solid fa-file-audio'
  if (mimeType.includes('pdf')) return 'fa-solid fa-file-pdf'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar') || mimeType.includes('gzip')) return 'fa-solid fa-file-zipper'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-solid fa-file-word'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-solid fa-file-excel'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fa-solid fa-file-powerpoint'
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) return 'fa-solid fa-file-code'
  return 'fa-solid fa-file'
}
