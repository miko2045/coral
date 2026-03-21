/** admin.tsx — 后台管理面板 */
import { raw } from 'hono/html'

export function adminPage(page: 'login' | 'dashboard', data: any) {
  if (page === 'login') return loginView(data)
  return dashboardView(data)
}

function loginView({ error }: { error?: string }) {
  return (
    <div class="adm-login-wrap">
      <div class="adm-login-card">
        <div class="adm-login-header">
          <span class="logo-dot"></span>
          <h1>Portal Admin</h1>
        </div>
        <p class="adm-login-sub">Enter your password to manage your portal</p>
        {error && <div class="adm-alert adm-alert-err">{error}</div>}
        <form method="POST" action="/admin/login" class="adm-login-form">
          <div class="adm-field">
            <label>Password</label>
            <input type="password" name="password" placeholder="Enter admin password" autofocus required />
          </div>
          <button type="submit" class="adm-btn adm-btn-primary adm-btn-full">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In
          </button>
        </form>
        <p class="adm-login-hint">Default password: admin123</p>
      </div>
    </div>
  )
}

function dashboardView({ profile, websites, repos, files }: any) {
  return (
    <div class="adm">
      {/* Sidebar */}
      <aside class="adm-sidebar">
        <div class="adm-sidebar-logo">
          <span class="logo-dot"></span>
          <span>Admin</span>
        </div>
        <nav class="adm-nav">
          <a href="#panel-profile" class="adm-nav-item active" data-tab="profile"><i class="fa-solid fa-user"></i> Profile</a>
          <a href="#panel-websites" class="adm-nav-item" data-tab="websites"><i class="fa-solid fa-globe"></i> Websites</a>
          <a href="#panel-repos" class="adm-nav-item" data-tab="repos"><i class="fa-brands fa-github"></i> GitHub</a>
          <a href="#panel-files" class="adm-nav-item" data-tab="files"><i class="fa-solid fa-cloud-arrow-up"></i> Files</a>
          <a href="#panel-settings" class="adm-nav-item" data-tab="settings"><i class="fa-solid fa-gear"></i> Settings</a>
        </nav>
        <div class="adm-sidebar-footer">
          <a href="/" class="adm-nav-item" target="_blank"><i class="fa-solid fa-eye"></i> View Site</a>
          <a href="/admin/logout" class="adm-nav-item adm-nav-danger"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
        </div>
      </aside>

      {/* Main */}
      <main class="adm-main">
        {/* ===== Profile Panel ===== */}
        <section id="panel-profile" class="adm-panel active">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-user"></i> Personal Info</h2>
            <button class="adm-btn adm-btn-primary" id="saveProfile"><i class="fa-solid fa-save"></i> Save</button>
          </div>
          <div class="adm-card">
            <div class="adm-form-grid">
              <div class="adm-field"><label>Name</label><input id="pf-name" value={profile.name} /></div>
              <div class="adm-field"><label>Tagline</label><input id="pf-tagline" value={profile.tagline} /></div>
              <div class="adm-field adm-field-full"><label>Avatar URL</label><input id="pf-avatar" value={profile.avatar} /></div>
              <div class="adm-field adm-field-full"><label>Bio</label><textarea id="pf-bio" rows={3}>{profile.bio}</textarea></div>
              <div class="adm-field"><label>Location</label><input id="pf-location" value={profile.location} /></div>
              <div class="adm-field"><label>Email</label><input id="pf-email" value={profile.email} /></div>
              <div class="adm-field"><label>Status</label><input id="pf-status" value={profile.status} /></div>
              <div class="adm-field"><label>Currently Reading</label><input id="pf-reading" value={profile.currentlyReading} /></div>
              <div class="adm-field"><label>Quote</label><input id="pf-quote" value={profile.quote} /></div>
              <div class="adm-field"><label>Quote Author</label><input id="pf-quoteAuthor" value={profile.quoteAuthor} /></div>
              <div class="adm-field"><label>GitHub URL</label><input id="pf-github" value={profile.socials?.github || ''} /></div>
              <div class="adm-field"><label>Twitter URL</label><input id="pf-twitter" value={profile.socials?.twitter || ''} /></div>
            </div>
          </div>
        </section>

        {/* ===== Websites Panel ===== */}
        <section id="panel-websites" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-globe"></i> Web Projects</h2>
            <button class="adm-btn adm-btn-primary" id="addWebsite"><i class="fa-solid fa-plus"></i> Add</button>
          </div>
          <div id="websitesList" class="adm-items">
            {websites.map((w: any) => (
              <div class="adm-item" data-id={w.id} key={w.id}>
                <div class="adm-item-icon" style={`color: ${w.color || '#E8A838'}`}><i class={w.icon || 'fa-solid fa-globe'}></i></div>
                <div class="adm-item-body">
                  <strong>{w.title}</strong>
                  <span class="adm-item-sub">{w.description}</span>
                </div>
                <div class="adm-item-actions">
                  <button class="adm-btn-icon edit-website" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button class="adm-btn-icon adm-btn-icon-danger delete-website" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Repos Panel ===== */}
        <section id="panel-repos" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-brands fa-github"></i> GitHub Projects</h2>
            <button class="adm-btn adm-btn-primary" id="addRepo"><i class="fa-solid fa-plus"></i> Add</button>
          </div>
          <div id="reposList" class="adm-items">
            {repos.map((r: any) => (
              <div class="adm-item" data-id={r.id} key={r.id}>
                <div class="adm-item-icon"><i class="fa-solid fa-book-bookmark"></i></div>
                <div class="adm-item-body">
                  <strong>{r.name}</strong>
                  <span class="adm-item-sub">{r.description}</span>
                </div>
                <div class="adm-item-actions">
                  <button class="adm-btn-icon edit-repo" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button class="adm-btn-icon adm-btn-icon-danger delete-repo" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Files Panel ===== */}
        <section id="panel-files" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-cloud-arrow-up"></i> File Manager</h2>
          </div>
          <div class="adm-card adm-upload-zone" id="uploadZone">
            <div class="adm-upload-inner">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <p>Drag & drop files here or <label for="fileInput" class="adm-upload-link">browse</label></p>
              <input type="file" id="fileInput" multiple hidden />
              <span class="adm-upload-hint">Max 100MB per file</span>
            </div>
            <div class="adm-upload-progress" id="uploadProgress" style="display:none">
              <div class="adm-progress-bar"><div class="adm-progress-fill" id="progressFill"></div></div>
              <span id="progressText">Uploading...</span>
            </div>
          </div>
          <div id="filesList" class="adm-items">
            {files.map((f: any) => (
              <div class="adm-item" data-key={f.key} key={f.key}>
                <div class="adm-item-icon"><i class="fa-solid fa-file"></i></div>
                <div class="adm-item-body">
                  <strong>{f.displayName}</strong>
                  <span class="adm-item-sub">{f.originalName} · {formatSize(f.size)} · {new Date(f.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div class="adm-item-actions">
                  <a href={'/api/download/' + f.key} class="adm-btn-icon" title="Download" target="_blank"><i class="fa-solid fa-download"></i></a>
                  <button class="adm-btn-icon adm-btn-icon-danger delete-file" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Settings Panel ===== */}
        <section id="panel-settings" class="adm-panel">
          <div class="adm-panel-header">
            <h2><i class="fa-solid fa-gear"></i> Settings</h2>
          </div>
          <div class="adm-card">
            <h3 class="adm-card-title">Change Password</h3>
            <div class="adm-form-grid">
              <div class="adm-field"><label>Current Password</label><input id="set-oldpw" type="password" /></div>
              <div class="adm-field"><label>New Password</label><input id="set-newpw" type="password" /></div>
            </div>
            <button class="adm-btn adm-btn-primary" id="changePw" style="margin-top:16px"><i class="fa-solid fa-key"></i> Update Password</button>
          </div>
        </section>
      </main>

      {/* Modal */}
      <div class="adm-modal-overlay" id="modalOverlay" style="display:none">
        <div class="adm-modal" id="modal">
          <div class="adm-modal-header">
            <h3 id="modalTitle">Edit</h3>
            <button class="adm-btn-icon" id="modalClose"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="adm-modal-body" id="modalBody"></div>
          <div class="adm-modal-footer">
            <button class="adm-btn" id="modalCancel">Cancel</button>
            <button class="adm-btn adm-btn-primary" id="modalSave">Save</button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div class="adm-toast-container" id="toastContainer"></div>

      {/* Inline data for JS */}
      {raw(`<script>
        window.__DATA__ = {
          websites: ${JSON.stringify(websites)},
          repos: ${JSON.stringify(repos)},
          files: ${JSON.stringify(files)}
        };
      </script>`)}
      <script src="/static/admin.js"></script>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
