/** admin.tsx — Admin panel (with i18n, safe JSON injection, announcements) */
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

function dashboardView({ profile, websites, repos, files, settings, lang: dataLang, announcements, csrfToken }: any, lang: Lang) {
  const st = settings || { storageMode: 'kv', maxFileSize: 25 }
  const data = { csrfToken } // preserve for template access
  const otherLang = lang === 'zh' ? 'en' : 'zh'
  const langLabel = lang === 'zh' ? 'EN' : '中'
  const anns: Announcement[] = announcements || []

  return (
    <div class="adm">
      {/* Sidebar */}
      <aside class="adm-sidebar">
        <div class="adm-sidebar-logo">
          <span class="logo-dot"></span>
          <span>{t('admin', 'sidebarTitle', lang)}</span>
        </div>
        <nav class="adm-nav">
          <a href="#panel-profile" class="adm-nav-item active" data-tab="profile"><i class="fa-solid fa-user"></i> {t('admin', 'profile', lang)}</a>
          <a href="#panel-websites" class="adm-nav-item" data-tab="websites"><i class="fa-solid fa-globe"></i> {t('admin', 'websitesTab', lang)}</a>
          <a href="#panel-repos" class="adm-nav-item" data-tab="repos"><i class="fa-brands fa-github"></i> {t('admin', 'githubTab', lang)}</a>
          <a href="#panel-files" class="adm-nav-item" data-tab="files"><i class="fa-solid fa-cloud-arrow-up"></i> {t('admin', 'filesTab', lang)}</a>
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
        {/* ===== Profile ===== */}
        <section id="panel-profile" class="adm-panel active">
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

        {/* ===== Websites ===== */}
        <section id="panel-websites" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-globe"></i> {t('admin', 'webProjectsTitle', lang)}</h2>
            <button class="adm-btn adm-btn-primary" id="addWebsite"><i class="fa-solid fa-plus"></i> {t('admin', 'add', lang)}</button>
          </div>
          <div id="websitesList" class="adm-items">
            {websites.map((w: any) => (
              <div class="adm-item" data-id={w.id} key={w.id}>
                <div class="adm-item-icon" style={`color: ${w.color || '#E8A838'}`}><i class={w.icon || 'fa-solid fa-globe'}></i></div>
                <div class="adm-item-body"><strong>{w.title}</strong><span class="adm-item-sub">{w.description}</span></div>
                <div class="adm-item-actions">
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

        {/* ===== Files ===== */}
        <section id="panel-files" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-cloud-arrow-up"></i> {t('admin', 'fileManager', lang)}</h2>
            <button class="adm-btn adm-btn-primary" id="addLinkFile" style={st.storageMode === 'external' ? '' : 'display:none'}>
              <i class="fa-solid fa-link"></i> {t('admin', 'addLink', lang)}
            </button>
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
            {files.map((f: any) => (
              <div class="adm-item" data-key={f.key} key={f.key}>
                <div class="adm-item-icon">
                  <i class={f.isExternal ? 'fa-solid fa-link' : 'fa-solid fa-file'}></i>
                </div>
                <div class="adm-item-body">
                  <strong>{f.displayName}</strong>
                  <span class="adm-item-sub">
                    {f.originalName} · {formatSize(f.size)}
                    {f.isExternal ? ` · ${t('admin', 'external', lang)}` : f.storageType === 'local' ? ` · ${t('admin', 'localStorageInfo', lang)}` : ' · KV'}
                  </span>
                </div>
                <div class="adm-item-actions">
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

      {/* SAFE JSON injection — prevents </script> XSS */}
      {raw(`<script>
        window.__DATA__ = ${safeJsonStringify({
          websites,
          repos,
          files,
          settings: st,
          lang,
          announcements: anns,
          csrfToken: data.csrfToken || '',
        })};
      </script>`)}
      <script src="/static/admin.js"></script>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
