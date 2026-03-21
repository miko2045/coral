// ========================================
// ADMIN PANEL — Frontend Logic (with i18n)
// ========================================
(() => {
  'use strict';

  const D = window.__DATA__ || { websites: [], repos: [], files: [], settings: {}, lang: 'zh' };
  let websites = [...D.websites];
  let repos = [...D.repos];
  let settings = { ...D.settings };
  const lang = D.lang || 'zh';

  // === i18n strings ===
  const i = {
    profileSaved: lang === 'zh' ? '个人信息已保存!' : 'Profile saved!',
    websitesSaved: lang === 'zh' ? '网站已保存!' : 'Websites saved!',
    reposSaved: lang === 'zh' ? '仓库已保存!' : 'Repos saved!',
    uploaded: lang === 'zh' ? '上传成功!' : 'uploaded!',
    uploadFailed: lang === 'zh' ? '上传失败' : 'Upload failed',
    linkAdded: lang === 'zh' ? '链接已添加!' : 'Link added!',
    fileDeleted: lang === 'zh' ? '文件已删除!' : 'File deleted!',
    settingsSaved: lang === 'zh' ? '设置已保存! 刷新中...' : 'Settings saved! Refreshing...',
    pwUpdated: lang === 'zh' ? '密码已更新!' : 'Password updated!',
    fillBoth: lang === 'zh' ? '请填写两个字段' : 'Please fill both fields',
    deleteWebsite: lang === 'zh' ? '确定删除此网站?' : 'Delete this website?',
    deleteRepo: lang === 'zh' ? '确定删除此仓库?' : 'Delete this repo?',
    deleteFile: lang === 'zh' ? '确定删除此文件?' : 'Delete this file?',
    addWebsite: lang === 'zh' ? '添加网站' : 'Add Website',
    editWebsite: lang === 'zh' ? '编辑网站' : 'Edit Website',
    addRepo: lang === 'zh' ? '添加仓库' : 'Add Repo',
    editRepo: lang === 'zh' ? '编辑仓库' : 'Edit Repo',
    addExtLink: lang === 'zh' ? '添加外部链接' : 'Add External Link',
    uploading: lang === 'zh' ? '上传中' : 'Uploading',
    // Form labels
    lblTitle: lang === 'zh' ? '标题' : 'Title',
    lblUrl: lang === 'zh' ? 'URL' : 'URL',
    lblDesc: lang === 'zh' ? '描述' : 'Description',
    lblTags: lang === 'zh' ? '标签(逗号分隔)' : 'Tags (comma sep.)',
    lblColor: lang === 'zh' ? '颜色' : 'Color',
    lblIcon: lang === 'zh' ? '图标' : 'Icon',
    lblName: lang === 'zh' ? '名称' : 'Name',
    lblLang: lang === 'zh' ? '语言' : 'Language',
    lblStars: lang === 'zh' ? '星标' : 'Stars',
    lblForks: lang === 'zh' ? '分支' : 'Forks',
    lblDisplayName: lang === 'zh' ? '显示名称' : 'Display Name',
    lblDownloadUrl: lang === 'zh' ? '下载链接' : 'Download URL',
    lblFileName: lang === 'zh' ? '文件名' : 'File Name',
    lblFileSize: lang === 'zh' ? '文件大小(字节)' : 'File Size (bytes)',
    lblMimeType: lang === 'zh' ? 'MIME 类型' : 'MIME Type',
  };

  // === Helpers ===
  function toast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `adm-toast adm-toast-${type}`;
    t.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check' : 'triangle-exclamation'}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  }

  async function api(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  // === Tab Navigation ===
  document.querySelectorAll('.adm-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.adm-nav-item[data-tab]').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      const panel = document.getElementById('panel-' + item.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // === Modal ===
  const overlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalSave = document.getElementById('modalSave');
  let onModalSave = null;

  function openModal(title, html, onSave) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    onModalSave = onSave;
    overlay.style.display = 'flex';
  }

  function closeModal() {
    overlay.style.display = 'none';
    onModalSave = null;
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  modalSave.addEventListener('click', () => { if (onModalSave) onModalSave(); });

  // === Profile ===
  document.getElementById('saveProfile').addEventListener('click', async () => {
    const data = {
      name: document.getElementById('pf-name').value,
      tagline: document.getElementById('pf-tagline').value,
      avatar: document.getElementById('pf-avatar').value,
      bio: document.getElementById('pf-bio').value,
      location: document.getElementById('pf-location').value,
      email: document.getElementById('pf-email').value,
      status: document.getElementById('pf-status').value,
      currentlyReading: document.getElementById('pf-reading').value,
      quote: document.getElementById('pf-quote').value,
      quoteAuthor: document.getElementById('pf-quoteAuthor').value,
      socials: {
        github: document.getElementById('pf-github').value,
        twitter: document.getElementById('pf-twitter').value,
      }
    };
    try {
      await api('/admin/api/profile', data);
      toast(i.profileSaved);
    } catch (e) { toast(e.message, 'error'); }
  });

  // === Websites CRUD ===
  const ICON_OPTIONS = [
    'fa-solid fa-globe', 'fa-solid fa-cloud', 'fa-solid fa-code', 'fa-solid fa-wand-magic-sparkles',
    'fa-solid fa-camera-retro', 'fa-solid fa-palette', 'fa-solid fa-rocket', 'fa-solid fa-bolt',
    'fa-solid fa-cube', 'fa-solid fa-chart-line', 'fa-solid fa-shield-halved', 'fa-solid fa-store',
    'fa-solid fa-music', 'fa-solid fa-gamepad', 'fa-solid fa-robot', 'fa-solid fa-book',
  ];

  function websiteFormHTML(w = {}) {
    const iconOpts = ICON_OPTIONS.map(ic => `<option value="${ic}" ${ic === (w.icon || 'fa-solid fa-globe') ? 'selected' : ''}>${ic.split(' ').pop()}</option>`).join('');
    return `<div class="adm-form-grid">
      <div class="adm-field"><label>${i.lblTitle}</label><input id="mf-title" value="${esc(w.title || '')}" /></div>
      <div class="adm-field"><label>${i.lblUrl}</label><input id="mf-url" value="${esc(w.url || '')}" /></div>
      <div class="adm-field adm-field-full"><label>${i.lblDesc}</label><textarea id="mf-desc" rows="2">${esc(w.description || '')}</textarea></div>
      <div class="adm-field"><label>${i.lblTags}</label><input id="mf-tags" value="${esc(w.tags || '')}" /></div>
      <div class="adm-field"><label>${i.lblColor}</label><input id="mf-color" type="color" value="${w.color || '#E8A838'}" /></div>
      <div class="adm-field"><label>${i.lblIcon}</label><select id="mf-icon">${iconOpts}</select></div>
    </div>`;
  }

  function getWebsiteFromModal() {
    return {
      title: document.getElementById('mf-title').value,
      url: document.getElementById('mf-url').value,
      description: document.getElementById('mf-desc').value,
      tags: document.getElementById('mf-tags').value,
      color: document.getElementById('mf-color').value,
      icon: document.getElementById('mf-icon').value,
    };
  }

  async function saveWebsites() {
    try {
      await api('/admin/api/websites', websites);
      toast(i.websitesSaved);
      renderWebsites();
      closeModal();
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderWebsites() {
    const list = document.getElementById('websitesList');
    list.innerHTML = websites.map(w => `
      <div class="adm-item" data-id="${w.id}">
        <div class="adm-item-icon" style="color:${w.color || '#E8A838'}"><i class="${w.icon || 'fa-solid fa-globe'}"></i></div>
        <div class="adm-item-body"><strong>${esc(w.title)}</strong><span class="adm-item-sub">${esc(w.description)}</span></div>
        <div class="adm-item-actions">
          <button class="adm-btn-icon edit-website" title="${i.editWebsite}"><i class="fa-solid fa-pen"></i></button>
          <button class="adm-btn-icon adm-btn-icon-danger delete-website" title="${lang === 'zh' ? '删除' : 'Delete'}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
    bindWebsiteEvents();
  }

  function bindWebsiteEvents() {
    document.querySelectorAll('.edit-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        const w = websites.find(x => x.id === id);
        if (!w) return;
        openModal(i.editWebsite, websiteFormHTML(w), () => {
          Object.assign(w, getWebsiteFromModal());
          saveWebsites();
        });
      });
    });
    document.querySelectorAll('.delete-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        if (!confirm(i.deleteWebsite)) return;
        websites = websites.filter(x => x.id !== id);
        saveWebsites();
      });
    });
  }

  document.getElementById('addWebsite').addEventListener('click', () => {
    openModal(i.addWebsite, websiteFormHTML(), () => {
      websites.push({ id: uid(), ...getWebsiteFromModal() });
      saveWebsites();
    });
  });
  bindWebsiteEvents();

  // === Repos CRUD ===
  function repoFormHTML(r = {}) {
    return `<div class="adm-form-grid">
      <div class="adm-field"><label>${i.lblName}</label><input id="mr-name" value="${esc(r.name || '')}" /></div>
      <div class="adm-field"><label>${i.lblUrl}</label><input id="mr-url" value="${esc(r.url || '')}" /></div>
      <div class="adm-field adm-field-full"><label>${i.lblDesc}</label><textarea id="mr-desc" rows="2">${esc(r.description || '')}</textarea></div>
      <div class="adm-field"><label>${i.lblLang}</label><input id="mr-lang" value="${esc(r.language || '')}" /></div>
      <div class="adm-field"><label>${i.lblStars}</label><input id="mr-stars" type="number" value="${r.stars || 0}" /></div>
      <div class="adm-field"><label>${i.lblForks}</label><input id="mr-forks" type="number" value="${r.forks || 0}" /></div>
    </div>`;
  }

  function getRepoFromModal() {
    return {
      name: document.getElementById('mr-name').value,
      url: document.getElementById('mr-url').value,
      description: document.getElementById('mr-desc').value,
      language: document.getElementById('mr-lang').value,
      stars: parseInt(document.getElementById('mr-stars').value) || 0,
      forks: parseInt(document.getElementById('mr-forks').value) || 0,
    };
  }

  async function saveRepos() {
    try {
      await api('/admin/api/repos', repos);
      toast(i.reposSaved);
      renderRepos();
      closeModal();
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderRepos() {
    const list = document.getElementById('reposList');
    list.innerHTML = repos.map(r => `
      <div class="adm-item" data-id="${r.id}">
        <div class="adm-item-icon"><i class="fa-solid fa-book-bookmark"></i></div>
        <div class="adm-item-body"><strong>${esc(r.name)}</strong><span class="adm-item-sub">${esc(r.description)}</span></div>
        <div class="adm-item-actions">
          <button class="adm-btn-icon edit-repo" title="${i.editRepo}"><i class="fa-solid fa-pen"></i></button>
          <button class="adm-btn-icon adm-btn-icon-danger delete-repo" title="${lang === 'zh' ? '删除' : 'Delete'}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
    bindRepoEvents();
  }

  function bindRepoEvents() {
    document.querySelectorAll('.edit-repo').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        const r = repos.find(x => x.id === id);
        if (!r) return;
        openModal(i.editRepo, repoFormHTML(r), () => {
          Object.assign(r, getRepoFromModal());
          saveRepos();
        });
      });
    });
    document.querySelectorAll('.delete-repo').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        if (!confirm(i.deleteRepo)) return;
        repos = repos.filter(x => x.id !== id);
        saveRepos();
      });
    });
  }

  document.getElementById('addRepo').addEventListener('click', () => {
    openModal(i.addRepo, repoFormHTML(), () => {
      repos.push({ id: uid(), ...getRepoFromModal() });
      saveRepos();
    });
  });
  bindRepoEvents();

  // === File Upload (KV mode) ===
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault(); uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) uploadFiles(fileInput.files);
      fileInput.value = '';
    });
  }

  async function uploadFiles(fileList) {
    for (const file of fileList) {
      uploadProgress.style.display = 'block';
      progressFill.style.width = '0%';
      progressText.textContent = `${i.uploading} ${file.name}...`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('displayName', file.name);

      try {
        let p = 0;
        const iv = setInterval(() => { p = Math.min(p + Math.random() * 15, 85); progressFill.style.width = p + '%'; }, 300);
        const res = await fetch('/admin/api/upload', { method: 'POST', body: formData });
        clearInterval(iv);
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || i.uploadFailed); }
        progressFill.style.width = '100%';
        progressText.textContent = `${file.name} ${i.uploaded}`;
        toast(`${file.name} ${i.uploaded}`);
        setTimeout(() => { uploadProgress.style.display = 'none'; }, 1500);
        setTimeout(() => location.reload(), 1800);
      } catch (e) {
        progressFill.style.width = '0%';
        progressText.textContent = `Error: ${e.message}`;
        toast(e.message, 'error');
      }
    }
  }

  // === Add Link File (External mode) ===
  const addLinkBtn = document.getElementById('addLinkFile');
  if (addLinkBtn) {
    addLinkBtn.addEventListener('click', () => {
      const html = `<div class="adm-form-grid">
        <div class="adm-field adm-field-full"><label>${i.lblDisplayName}</label><input id="lf-name" placeholder="${lang === 'zh' ? '我的简历 2025' : 'My Resume 2025'}" /></div>
        <div class="adm-field adm-field-full"><label>${i.lblDownloadUrl}</label><input id="lf-url" placeholder="https://drive.google.com/..." /></div>
        <div class="adm-field"><label>${i.lblFileName}</label><input id="lf-filename" placeholder="resume.pdf" /></div>
        <div class="adm-field"><label>${i.lblFileSize}</label><input id="lf-size" type="number" placeholder="0" /></div>
        <div class="adm-field adm-field-full"><label>${i.lblMimeType}</label><input id="lf-type" value="application/octet-stream" /></div>
      </div>`;
      openModal(i.addExtLink, html, async () => {
        try {
          await api('/admin/api/add-link', {
            displayName: document.getElementById('lf-name').value,
            originalName: document.getElementById('lf-filename').value,
            externalUrl: document.getElementById('lf-url').value,
            size: parseInt(document.getElementById('lf-size').value) || 0,
            type: document.getElementById('lf-type').value,
          });
          toast(i.linkAdded);
          closeModal();
          setTimeout(() => location.reload(), 800);
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  // === Delete File ===
  document.querySelectorAll('.delete-file').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.closest('.adm-item').dataset.key;
      if (!confirm(i.deleteFile)) return;
      try {
        await api('/admin/api/delete-file', { key });
        toast(i.fileDeleted);
        btn.closest('.adm-item').remove();
      } catch (e) { toast(e.message, 'error'); }
    });
  });

  // === Storage Settings ===
  const radioGroup = document.getElementById('storageModeGroup');
  const localConfigEl = document.getElementById('localConfig');
  const uploadZoneEl = document.getElementById('uploadZone');
  const externalHintEl = document.getElementById('externalHint');
  const localUploadHintEl = document.getElementById('localUploadHint');
  const addLinkBtnEl = document.getElementById('addLinkFile');

  function updateStorageModeUI(mode) {
    // Show/hide upload zone (for KV and local modes)
    if (uploadZoneEl) uploadZoneEl.style.display = (mode === 'kv' || mode === 'local') ? '' : 'none';
    // Show/hide external hint
    if (externalHintEl) externalHintEl.style.display = (mode === 'external') ? '' : 'none';
    // Show/hide local upload hint
    if (localUploadHintEl) localUploadHintEl.style.display = (mode === 'local') ? '' : 'none';
    // Show/hide add link button
    if (addLinkBtnEl) addLinkBtnEl.style.display = (mode === 'external') ? '' : 'none';
    // Show/hide local config fields
    if (localConfigEl) localConfigEl.style.display = (mode === 'local') ? '' : 'none';
  }

  if (radioGroup) {
    radioGroup.querySelectorAll('input[name="storageMode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        radioGroup.querySelectorAll('.adm-radio-card').forEach(c => c.classList.remove('active'));
        radio.closest('.adm-radio-card').classList.add('active');
        updateStorageModeUI(radio.value);
      });
    });
  }

  document.getElementById('saveSettings')?.addEventListener('click', async () => {
    const mode = document.querySelector('input[name="storageMode"]:checked')?.value || 'kv';
    const localServerUrl = document.getElementById('set-localServerUrl')?.value || '';
    const localStoragePath = document.getElementById('set-localStoragePath')?.value || '/data/portal/files';
    try {
      const newSettings = { ...settings, storageMode: mode, localServerUrl, localStoragePath };
      await api('/admin/api/settings', newSettings);
      settings = newSettings;
      toast(i.settingsSaved);
      setTimeout(() => location.reload(), 1000);
    } catch (e) { toast(e.message, 'error'); }
  });

  // === Change Password ===
  document.getElementById('changePw')?.addEventListener('click', async () => {
    const oldPw = document.getElementById('set-oldpw').value;
    const newPw = document.getElementById('set-newpw').value;
    if (!oldPw || !newPw) return toast(i.fillBoth, 'error');
    try {
      await api('/admin/api/password', { oldPassword: oldPw, newPassword: newPw });
      toast(i.pwUpdated);
      document.getElementById('set-oldpw').value = '';
      document.getElementById('set-newpw').value = '';
    } catch (e) { toast(e.message, 'error'); }
  });

  // =============================================
  // === GitHub Token Pool Management ===
  // =============================================
  const tokenI = {
    active: lang === 'zh' ? '可用' : 'Active',
    cooldown: lang === 'zh' ? '冷却中' : 'Cooldown',
    cooldownUntil: lang === 'zh' ? '冷却至' : 'Until',
    noTokens: lang === 'zh' ? '未配置任何 Token — 使用公开 API (60次/小时)' : 'No tokens configured — using public API (60 req/hour)',
    tokenCount: lang === 'zh' ? '个 Token' : ' token(s)',
    activeTokens: lang === 'zh' ? '可用' : 'active',
    tokensSaved: lang === 'zh' ? 'Token 配置已保存!' : 'Token config saved!',
    remove: lang === 'zh' ? '移除' : 'Remove',
  };

  let tokenList = []; // Current tokens in the editor

  // Load token status on panel show
  async function loadTokenStatus() {
    const container = document.getElementById('tokenStatusContent');
    if (!container) return;

    try {
      const resp = await fetch('/admin/api/github-tokens');
      if (!resp.ok) throw new Error('Failed to load');
      const data = await resp.json();

      if (data.totalTokens === 0) {
        container.innerHTML = `
          <div class="adm-token-no-tokens">
            <i class="fa-solid fa-info-circle"></i>
            ${tokenI.noTokens}
          </div>`;
        // Init empty token list
        tokenList = [];
        renderTokenList();
        return;
      }

      // Summary + grid
      let html = `
        <div class="adm-token-summary">
          <span><span class="summary-num">${data.totalTokens}</span> ${tokenI.tokenCount}</span>
          <span style="color:#22C55E;font-weight:600">${data.activeTokens} ${tokenI.activeTokens}</span>
          <span style="color:#F59E0B;font-weight:600">${data.totalTokens - data.activeTokens} ${tokenI.cooldown}</span>
        </div>
        <div class="adm-token-status-grid">`;

      data.tokens.forEach((t, idx) => {
        const stateClass = t.active ? 'active' : 'cooldown';
        const stateText = t.active ? tokenI.active : `${tokenI.cooldown}`;
        const cdText = t.cooldownUntil ? `<br><small>${tokenI.cooldownUntil} ${new Date(t.cooldownUntil).toLocaleTimeString()}</small>` : '';
        html += `
          <div class="adm-token-status-card">
            <span class="token-index">${idx + 1}</span>
            <div class="token-info">
              <div class="token-masked">${t.masked}</div>
              <div class="token-state ${stateClass}">${stateText}${cdText}</div>
            </div>
            <span class="adm-token-status-dot ${stateClass}"></span>
          </div>`;
      });

      html += '</div>';
      container.innerHTML = html;

      // Populate token list for editing (only masked values; we need full values)
      // We load full tokens from the token list API
      tokenList = data.tokens.map(t => t.masked);

    } catch (e) {
      container.innerHTML = `<p style="color:var(--text-tertiary);text-align:center;padding:16px">Error loading status</p>`;
    }
  }

  // Load actual token values for editing
  async function loadTokensForEditing() {
    try {
      const resp = await fetch('/admin/api/github-tokens');
      if (!resp.ok) return;
      const data = await resp.json();
      // We can't get full tokens from the status API (they're masked)
      // So we only allow adding new tokens, not editing existing ones
      // Show masked list count
      tokenList = [];
      if (data.totalTokens > 0) {
        // Show existing count as placeholder
        renderTokenListWithMasked(data.tokens);
      } else {
        renderTokenList();
      }
    } catch (e) {
      // silently fail
    }
  }

  function renderTokenListWithMasked(tokens) {
    const container = document.getElementById('tokenListContainer');
    if (!container) return;

    if (tokens.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = tokens.map((t, idx) => `
      <div class="adm-token-item" data-idx="${idx}">
        <span class="token-num">${idx + 1}</span>
        <input type="text" value="${t.masked}" readonly style="opacity:0.6;cursor:default" title="Existing token (masked)" />
        <button class="adm-btn-icon adm-btn-icon-danger remove-token-btn" title="${tokenI.remove}" data-idx="${idx}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `).join('');

    // Bind remove buttons
    container.querySelectorAll('.remove-token-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        // Mark for removal
        btn.closest('.adm-token-item').style.display = 'none';
        btn.closest('.adm-token-item').dataset.removed = 'true';
      });
    });
  }

  function renderTokenList() {
    const container = document.getElementById('tokenListContainer');
    if (!container) return;
    // Clear any items with data-new attribute (newly added tokens)
    // Keep masked ones
  }

  // Add token button
  const addTokenBtn = document.getElementById('addTokenBtn');
  const newTokenInput = document.getElementById('newTokenInput');

  if (addTokenBtn && newTokenInput) {
    addTokenBtn.addEventListener('click', () => {
      const val = newTokenInput.value.trim();
      if (!val) return;

      const container = document.getElementById('tokenListContainer');
      const idx = container.children.length;
      const item = document.createElement('div');
      item.className = 'adm-token-item';
      item.dataset.newToken = val;
      item.innerHTML = `
        <span class="token-num">+</span>
        <input type="text" value="${val.slice(0, 8)}***${val.slice(-4)}" readonly style="color:#22C55E" />
        <button class="adm-btn-icon adm-btn-icon-danger remove-new-token-btn" title="${tokenI.remove}">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;
      item.querySelector('.remove-new-token-btn').addEventListener('click', () => item.remove());
      container.appendChild(item);
      newTokenInput.value = '';
      newTokenInput.focus();
    });

    // Also allow Enter key
    newTokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTokenBtn.click();
      }
    });
  }

  // Save tokens button
  const saveTokensBtn = document.getElementById('saveTokensBtn');
  if (saveTokensBtn) {
    saveTokensBtn.addEventListener('click', async () => {
      const container = document.getElementById('tokenListContainer');
      const tokens = [];

      // Collect new tokens (ones with data-new-token)
      container.querySelectorAll('.adm-token-item').forEach(item => {
        if (item.dataset.removed === 'true') return; // Skip removed
        if (item.dataset.newToken) {
          tokens.push(item.dataset.newToken);
        }
        // Note: existing masked tokens can't be re-sent, so we tell user 
        // that saving replaces all tokens with the new list
      });

      // If there are masked (existing) items that aren't removed, we need to
      // tell the backend to keep them. Since we can't read full token values
      // from the client, we use a different approach: send only new tokens
      // and let backend merge, OR send all tokens (replace mode).
      // For simplicity, we use replace mode and warn the user.
      
      // Gather all non-removed existing masked tokens
      let hasExistingNotRemoved = false;
      container.querySelectorAll('.adm-token-item').forEach(item => {
        if (item.dataset.removed === 'true') return;
        if (!item.dataset.newToken) {
          hasExistingNotRemoved = true;
        }
      });

      try {
        if (hasExistingNotRemoved && tokens.length > 0) {
          // We're adding new tokens to existing ones
          // Use the append endpoint
          const resp = await fetch('/admin/api/github-tokens/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens }),
          });
          if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Failed');
          }
        } else if (hasExistingNotRemoved && tokens.length === 0) {
          // Check if any existing tokens were removed
          let anyRemoved = false;
          container.querySelectorAll('.adm-token-item').forEach(item => {
            if (item.dataset.removed === 'true' && !item.dataset.newToken) anyRemoved = true;
          });
          if (anyRemoved) {
            // Need to remove tokens - use remove endpoint
            const removedIndices = [];
            container.querySelectorAll('.adm-token-item').forEach(item => {
              if (item.dataset.removed === 'true' && !item.dataset.newToken) {
                removedIndices.push(parseInt(item.dataset.idx));
              }
            });
            const resp = await fetch('/admin/api/github-tokens/remove', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ indices: removedIndices }),
            });
            if (!resp.ok) {
              const err = await resp.json();
              throw new Error(err.error || 'Failed');
            }
          } else {
            // Nothing changed
            toast(tokenI.tokensSaved);
            return;
          }
        } else {
          // No existing tokens, only new tokens (or empty)
          await api('/admin/api/github-tokens', { tokens });
        }

        toast(tokenI.tokensSaved);
        // Reload status
        setTimeout(async () => {
          await loadTokenStatus();
          await loadTokensForEditing();
        }, 500);
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  }

  // Load tokens when switching to tokens tab
  document.querySelectorAll('.adm-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.tab === 'tokens') {
        loadTokenStatus();
        loadTokensForEditing();
      }
    });
  });

})();
