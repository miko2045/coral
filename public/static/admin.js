// ========================================
// ADMIN PANEL — Frontend Logic (v3: full pin support for websites & files)
// ========================================
(() => {
  'use strict';

  const D = window.__DATA__ || { websites: [], repos: [], files: [], settings: {}, lang: 'zh', csrfToken: '', shares: [] };
  let websites = [...D.websites];
  let repos = [...D.repos];
  let files = [...D.files];
  let settings = { ...D.settings };
  const lang = D.lang || 'zh';
  const csrfToken = D.csrfToken || '';
  const zh = lang === 'zh';

  // === i18n strings ===
  const i = {
    profileSaved: zh ? '个人信息已保存!' : 'Profile saved!',
    websitesSaved: zh ? '网站已保存!' : 'Websites saved!',
    reposSaved: zh ? '仓库已保存!' : 'Repos saved!',
    uploaded: zh ? '上传成功!' : 'uploaded!',
    uploadFailed: zh ? '上传失败' : 'Upload failed',
    linkAdded: zh ? '链接已添加!' : 'Link added!',
    fileDeleted: zh ? '文件已删除!' : 'File deleted!',
    settingsSaved: zh ? '设置已保存! 刷新中...' : 'Settings saved! Refreshing...',
    pwUpdated: zh ? '密码已更新!' : 'Password updated!',
    fillBoth: zh ? '请填写两个字段' : 'Please fill both fields',
    deleteWebsite: zh ? '确定删除此网站?' : 'Delete this website?',
    deleteRepo: zh ? '确定删除此仓库?' : 'Delete this repo?',
    deleteFile: zh ? '确定删除此文件?' : 'Delete this file?',
    addWebsite: zh ? '添加网站' : 'Add Website',
    editWebsite: zh ? '编辑网站' : 'Edit Website',
    addRepo: zh ? '添加仓库' : 'Add Repo',
    editRepo: zh ? '编辑仓库' : 'Edit Repo',
    addExtLink: zh ? '添加外部链接' : 'Add External Link',
    uploading: zh ? '上传中' : 'Uploading',
    lblTitle: zh ? '标题' : 'Title',
    lblUrl: zh ? 'URL' : 'URL',
    lblDesc: zh ? '描述' : 'Description',
    lblTags: zh ? '标签(逗号分隔)' : 'Tags (comma sep.)',
    lblColor: zh ? '颜色' : 'Color',
    lblIcon: zh ? '图标' : 'Icon',
    lblName: zh ? '名称' : 'Name',
    lblLang: zh ? '语言' : 'Language',
    lblStars: zh ? '星标' : 'Stars',
    lblForks: zh ? '分支' : 'Forks',
    lblDisplayName: zh ? '显示名称' : 'Display Name',
    lblDownloadUrl: zh ? '下载链接' : 'Download URL',
    lblFileName: zh ? '文件名' : 'File Name',
    lblFileSize: zh ? '文件大小(字节)' : 'File Size (bytes)',
    lblMimeType: zh ? 'MIME 类型' : 'MIME Type',
    pinned: zh ? '已置顶!' : 'Pinned!',
    unpinned: zh ? '已取消置顶!' : 'Unpinned!',
  };

  // === Helpers ===
  function toast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `adm-toast adm-toast-${type}`;
    const icon = document.createElement('i');
    icon.className = `fa-solid fa-${type === 'success' ? 'check' : 'triangle-exclamation'}`;
    t.appendChild(icon);
    t.appendChild(document.createTextNode(' ' + msg));
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  }

  async function api(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
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

  function sortByPin(arr) {
    return [...arr].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (a.order || 0) - (b.order || 0);
    });
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
    if (modalSave) modalSave.style.display = '';
  }

  function closeModal() {
    overlay.style.display = 'none';
    onModalSave = null;
    if (modalSave) modalSave.style.display = '';
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  modalSave.addEventListener('click', () => { if (onModalSave) onModalSave(); });

  // =============================================
  // === DATA EXPORT / IMPORT ===
  // =============================================
  document.getElementById('exportData')?.addEventListener('click', () => {
    window.location.href = '/admin/api/export';
    toast(zh ? '数据导出中...' : 'Exporting data...');
  });

  const importInput = document.getElementById('importDataInput');
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.version) throw new Error(zh ? '无效的备份文件' : 'Invalid backup file');
        if (!confirm(zh ? '导入将覆盖现有数据，确定继续？' : 'Import will overwrite existing data. Continue?')) return;
        await api('/admin/api/import', data);
        toast(zh ? '数据导入成功! 刷新中...' : 'Data imported! Refreshing...');
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        toast(err.message, 'error');
      }
      importInput.value = '';
    });
  }

  // === Profile ===
  document.getElementById('saveProfile')?.addEventListener('click', async () => {
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

  // =============================================
  // === WEBSITES CRUD + PIN + REORDER ===
  // =============================================
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

  function fileIconClass(mimeType) {
    if (!mimeType) return 'fa-solid fa-file';
    if (mimeType.startsWith('image/')) return 'fa-solid fa-file-image';
    if (mimeType.startsWith('video/')) return 'fa-solid fa-file-video';
    if (mimeType.startsWith('audio/')) return 'fa-solid fa-file-audio';
    if (mimeType.includes('pdf')) return 'fa-solid fa-file-pdf';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar')) return 'fa-solid fa-file-zipper';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fa-solid fa-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-solid fa-file-excel';
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) return 'fa-solid fa-file-code';
    return 'fa-solid fa-file';
  }

  function formatSizeJS(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function renderWebsites() {
    const sorted = sortByPin(websites);
    const list = document.getElementById('websitesList');
    list.innerHTML = sorted.map((w) => `
      <div class="adm-item adm-item-sortable${w.pinned ? ' adm-item-pinned' : ''}" data-id="${w.id}">
        <div class="adm-item-drag" title="${zh ? '拖拽排序' : 'Drag to reorder'}"><i class="fa-solid fa-grip-vertical"></i></div>
        <div class="adm-item-icon" style="color:${w.color || '#E8A838'}"><i class="${w.icon || 'fa-solid fa-globe'}"></i></div>
        <div class="adm-item-body">
          <strong>${w.pinned ? '<span class="adm-pin-badge"><i class="fa-solid fa-thumbtack"></i> ' + (zh ? '置顶' : 'PIN') + '</span>' : ''}${esc(w.title)}</strong>
          <span class="adm-item-sub">${esc(w.description)}</span>
        </div>
        <div class="adm-item-actions">
          <button class="adm-btn-icon pin-website${w.pinned ? ' adm-btn-icon-active' : ''}" title="${zh ? '置顶/取消' : 'Pin/Unpin'}"><i class="fa-solid fa-thumbtack"></i></button>
          <button class="adm-btn-icon move-up-website" title="${zh ? '上移' : 'Move Up'}"><i class="fa-solid fa-arrow-up"></i></button>
          <button class="adm-btn-icon move-down-website" title="${zh ? '下移' : 'Move Down'}"><i class="fa-solid fa-arrow-down"></i></button>
          <button class="adm-btn-icon edit-website" title="${i.editWebsite}"><i class="fa-solid fa-pen"></i></button>
          <button class="adm-btn-icon adm-btn-icon-danger delete-website" title="${zh ? '删除' : 'Delete'}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
    // Update pinned count badge
    const pinnedCount = websites.filter(w => w.pinned).length;
    const badge = document.getElementById('websitePinnedCount');
    if (badge) {
      badge.innerHTML = `<i class="fa-solid fa-thumbtack"></i> ${pinnedCount} ${zh ? '置顶' : 'pinned'}`;
      badge.style.display = pinnedCount > 0 ? '' : 'none';
    }
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
    // Pin toggle
    document.querySelectorAll('.pin-website').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.adm-item').dataset.id;
        const w = websites.find(x => x.id === id);
        if (!w) return;
        w.pinned = !w.pinned;
        toast(w.pinned ? i.pinned : i.unpinned);
        await saveWebsites();
      });
    });
    // Move up
    document.querySelectorAll('.move-up-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        const idx = websites.findIndex(x => x.id === id);
        if (idx <= 0) return;
        [websites[idx - 1], websites[idx]] = [websites[idx], websites[idx - 1]];
        saveWebsites();
      });
    });
    // Move down
    document.querySelectorAll('.move-down-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        const idx = websites.findIndex(x => x.id === id);
        if (idx < 0 || idx >= websites.length - 1) return;
        [websites[idx], websites[idx + 1]] = [websites[idx + 1], websites[idx]];
        saveWebsites();
      });
    });
  }

  document.getElementById('addWebsite')?.addEventListener('click', () => {
    openModal(i.addWebsite, websiteFormHTML(), () => {
      websites.push({ id: uid(), ...getWebsiteFromModal(), pinned: false, order: websites.length });
      saveWebsites();
    });
  });
  bindWebsiteEvents();

  // =============================================
  // === REPOS CRUD ===
  // =============================================
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
          <button class="adm-btn-icon adm-btn-icon-danger delete-repo" title="${zh ? '删除' : 'Delete'}"><i class="fa-solid fa-trash"></i></button>
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

  document.getElementById('addRepo')?.addEventListener('click', () => {
    openModal(i.addRepo, repoFormHTML(), () => {
      repos.push({ id: uid(), ...getRepoFromModal() });
      saveRepos();
    });
  });
  bindRepoEvents();

  // =============================================
  // === FILE UPLOAD ===
  // =============================================
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
      if (uploadProgress) uploadProgress.style.display = 'block';
      if (progressFill) progressFill.style.width = '0%';
      if (progressText) progressText.textContent = `${i.uploading} ${file.name}...`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('displayName', file.name);

      try {
        let p = 0;
        const iv = setInterval(() => { p = Math.min(p + Math.random() * 15, 85); if (progressFill) progressFill.style.width = p + '%'; }, 300);
        const res = await fetch('/admin/api/upload', { method: 'POST', body: formData, headers: { 'X-CSRF-Token': csrfToken } });
        clearInterval(iv);
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || i.uploadFailed); }
        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = `${file.name} ${i.uploaded}`;
        toast(`${file.name} ${i.uploaded}`);
        setTimeout(() => { if (uploadProgress) uploadProgress.style.display = 'none'; }, 1500);
        setTimeout(() => location.reload(), 1800);
      } catch (e) {
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = `Error: ${e.message}`;
        toast(e.message, 'error');
      }
    }
  }

  // =============================================
  // === FILE SEARCH, FILTER & BATCH OPERATIONS ===
  // =============================================
  const fileSearch = document.getElementById('fileSearch');
  const selectAllCb = document.getElementById('selectAllFiles');
  const batchDeleteBtn = document.getElementById('batchDeleteFiles');
  const batchDeleteCount = document.getElementById('batchDeleteCount');
  let filterPinnedOnly = false;

  function updateBatchDeleteUI() {
    const checked = document.querySelectorAll('.file-select-cb:checked');
    if (batchDeleteBtn) batchDeleteBtn.style.display = checked.length > 0 ? '' : 'none';
    if (batchDeleteCount) batchDeleteCount.textContent = `${zh ? '删除' : 'Delete'} ${checked.length}`;
  }

  function applyFileFilters() {
    const q = (fileSearch ? fileSearch.value : '').toLowerCase();
    document.querySelectorAll('.adm-file-item').forEach(item => {
      const name = item.getAttribute('data-name') || '';
      const matchesSearch = !q || name.includes(q);
      const isPinned = item.classList.contains('adm-item-pinned');
      const matchesFilter = !filterPinnedOnly || isPinned;
      item.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
    });
  }

  if (fileSearch) {
    fileSearch.addEventListener('input', applyFileFilters);
  }

  // Filter pinned only toggle
  const filterPinnedBtn = document.getElementById('filterPinnedFiles');
  if (filterPinnedBtn) {
    filterPinnedBtn.addEventListener('click', () => {
      filterPinnedOnly = !filterPinnedOnly;
      filterPinnedBtn.classList.toggle('adm-btn-sm-active', filterPinnedOnly);
      applyFileFilters();
    });
  }

  if (selectAllCb) {
    selectAllCb.addEventListener('change', () => {
      document.querySelectorAll('.file-select-cb').forEach(cb => {
        const item = cb.closest('.adm-file-item');
        if (item && item.style.display !== 'none') cb.checked = selectAllCb.checked;
      });
      updateBatchDeleteUI();
    });
  }

  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('file-select-cb')) updateBatchDeleteUI();
  });

  // Batch delete
  if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', async () => {
      const checked = document.querySelectorAll('.file-select-cb:checked');
      const keys = Array.from(checked).map(cb => cb.getAttribute('data-key'));
      if (keys.length === 0) return;
      if (!confirm(zh ? `确定删除选中的 ${keys.length} 个文件?` : `Delete ${keys.length} selected files?`)) return;
      try {
        await api('/admin/api/delete-files-batch', { keys });
        toast(zh ? `${keys.length} 个文件已删除!` : `${keys.length} files deleted!`);
        checked.forEach(cb => cb.closest('.adm-item')?.remove());
        files = files.filter(f => !keys.includes(f.key));
        updateBatchDeleteUI();
        updateFilePinnedCount();
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  // =============================================
  // === FILE PIN TOGGLE ===
  // =============================================
  function updateFilePinnedCount() {
    const pinnedCount = files.filter(f => f.pinned).length;
    const badge = document.getElementById('filePinnedCount');
    if (badge) {
      badge.innerHTML = `<i class="fa-solid fa-thumbtack"></i> ${pinnedCount} ${zh ? '置顶' : 'pinned'}`;
      badge.style.display = pinnedCount > 0 ? '' : 'none';
    }
  }

  document.addEventListener('click', async (e) => {
    const pinBtn = e.target.closest('.pin-file');
    if (pinBtn) {
      const key = pinBtn.getAttribute('data-key');
      try {
        const result = await api('/admin/api/files/pin', { key });
        const f = files.find(x => x.key === key);
        if (f) f.pinned = result.pinned;
        const item = pinBtn.closest('.adm-item');
        if (result.pinned) {
          item.classList.add('adm-item-pinned');
          pinBtn.classList.add('adm-btn-icon-active');
          // Add pin badge to name
          const strong = item.querySelector('.adm-item-body strong');
          if (strong && !strong.querySelector('.adm-pin-badge')) {
            strong.insertAdjacentHTML('afterbegin', `<span class="adm-pin-badge"><i class="fa-solid fa-thumbtack"></i> ${zh ? '置顶' : 'PIN'}</span>`);
          }
        } else {
          item.classList.remove('adm-item-pinned');
          pinBtn.classList.remove('adm-btn-icon-active');
          const badge = item.querySelector('.adm-pin-badge');
          if (badge) badge.remove();
        }
        updateFilePinnedCount();
        toast(result.pinned ? i.pinned : i.unpinned);
      } catch (err) { toast(err.message, 'error'); }
    }
  });

  // =============================================
  // === FILE RENAME ===
  // =============================================
  document.addEventListener('click', (e) => {
    const renameBtn = e.target.closest('.rename-file');
    if (renameBtn) {
      const key = renameBtn.getAttribute('data-key');
      const currentName = renameBtn.getAttribute('data-name') || '';
      openModal(zh ? '重命名文件' : 'Rename File', `
        <div class="adm-field"><label>${zh ? '新名称' : 'New Name'}</label><input id="rename-input" value="${esc(currentName)}" autofocus /></div>
      `, async () => {
        const newName = document.getElementById('rename-input')?.value?.trim();
        if (!newName) return toast(zh ? '请输入名称' : 'Please enter a name', 'error');
        try {
          await api('/admin/api/rename-file', { key, displayName: newName });
          toast(zh ? '已重命名!' : 'Renamed!');
          closeModal();
          const item = document.querySelector(`.adm-file-item[data-key="${key}"]`);
          if (item) {
            const strong = item.querySelector('.adm-item-body strong');
            const pinBadge = strong ? strong.querySelector('.adm-pin-badge') : null;
            if (strong) {
              strong.textContent = newName;
              if (pinBadge) strong.insertAdjacentElement('afterbegin', pinBadge);
            }
            item.setAttribute('data-name', newName.toLowerCase());
            renameBtn.setAttribute('data-name', newName);
          }
        } catch (err) { toast(err.message, 'error'); }
      });
    }
  });

  // =============================================
  // === FILE PREVIEW ===
  // =============================================
  document.addEventListener('click', (e) => {
    const previewBtn = e.target.closest('.preview-file');
    if (previewBtn) {
      const url = previewBtn.getAttribute('data-url');
      openModal(zh ? '图片预览' : 'Image Preview', `
        <div style="text-align:center;padding:8px">
          <img src="${url}" style="max-width:100%;max-height:60vh;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15)" />
        </div>
      `, () => closeModal());
      if (modalSave) modalSave.style.display = 'none';
    }
  });

  // === Add Link File (External mode) ===
  const addLinkBtn = document.getElementById('addLinkFile');
  if (addLinkBtn) {
    addLinkBtn.addEventListener('click', () => {
      const html = `<div class="adm-form-grid">
        <div class="adm-field adm-field-full"><label>${i.lblDisplayName}</label><input id="lf-name" placeholder="${zh ? '我的简历 2025' : 'My Resume 2025'}" /></div>
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
        files = files.filter(f => f.key !== key);
        updateBatchDeleteUI();
        updateFilePinnedCount();
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
    if (uploadZoneEl) uploadZoneEl.style.display = (mode === 'kv' || mode === 'local') ? '' : 'none';
    if (externalHintEl) externalHintEl.style.display = (mode === 'external') ? '' : 'none';
    if (localUploadHintEl) localUploadHintEl.style.display = (mode === 'local') ? '' : 'none';
    if (addLinkBtnEl) addLinkBtnEl.style.display = (mode === 'external') ? '' : 'none';
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

  // === Change Username ===
  document.getElementById('changeUsername')?.addEventListener('click', async () => {
    const newUsername = document.getElementById('set-newUsername')?.value;
    if (!newUsername || newUsername.trim().length < 2) {
      return toast(zh ? '用户名至少2位' : 'Username must be at least 2 characters', 'error');
    }
    try {
      await api('/admin/api/username', { newUsername: newUsername.trim() });
      toast(zh ? '用户名已更新!' : 'Username updated!');
      document.getElementById('set-newUsername').value = '';
    } catch (e) { toast(e.message, 'error'); }
  });

  // =============================================
  // === Share Links Management ===
  // =============================================
  async function loadShares() {
    const container = document.getElementById('sharesListContainer');
    if (!container) return;
    try {
      const resp = await fetch('/admin/api/shares', { credentials: 'same-origin' });
      const data = await resp.json();
      const shares = data.shares || [];
      
      if (shares.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-secondary)">
          <i class="fa-solid fa-share-nodes" style="font-size:2rem;margin-bottom:8px;display:block;opacity:0.5"></i>
          ${zh ? '暂无分享链接' : 'No share links yet'}
          <br><small>${zh ? '在下载页面点击分享按钮创建' : 'Create one from the Downloads page'}</small>
        </div>`;
        return;
      }
      
      const now = Date.now();
      container.innerHTML = shares.map(s => {
        const isExpired = s.expiresAt && now > s.expiresAt;
        const isMaxed = s.maxDownloads && s.downloads >= s.maxDownloads;
        const statusColor = (isExpired || isMaxed) ? '#EF4444' : '#22C55E';
        const statusText = isExpired ? (zh ? '已过期' : 'Expired') 
          : isMaxed ? (zh ? '已达上限' : 'Limit reached')
          : (zh ? '有效' : 'Active');
        const hasPassword = s.password ? '<i class="fa-solid fa-lock" style="color:var(--accent);margin-left:6px" title="Password protected"></i>' : '';
        const expiresText = s.expiresAt ? new Date(s.expiresAt).toLocaleString() : (zh ? '永不' : 'Never');
        const downloadsText = s.maxDownloads ? `${s.downloads}/${s.maxDownloads}` : `${s.downloads}/∞`;
        
        return `<div class="adm-item" data-share-id="${s.id}">
          <div class="adm-item-icon" style="color:${statusColor}"><i class="fa-solid fa-link"></i></div>
          <div class="adm-item-body">
            <strong>${s.fileName}${hasPassword}</strong>
            <span class="adm-item-sub">
              <span style="color:${statusColor};font-weight:600">${statusText}</span>
              · ${zh ? '下载' : 'Downloads'}: ${downloadsText}
              · ${zh ? '过期' : 'Expires'}: ${expiresText}
            </span>
          </div>
          <div class="adm-item-actions">
            <button class="adm-btn-icon copy-share-link" data-url="${window.location.origin}/s/${s.id}" title="Copy link"><i class="fa-solid fa-copy"></i></button>
            <button class="adm-btn-icon adm-btn-icon-danger delete-share" title="${zh ? '删除' : 'Delete'}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
      }).join('');
      
      container.querySelectorAll('.copy-share-link').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.getAttribute('data-url')).then(() => {
            btn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i>'; }, 1500);
          });
        });
      });
      
      container.querySelectorAll('.delete-share').forEach(btn => {
        btn.addEventListener('click', async () => {
          const item = btn.closest('.adm-item');
          const shareId = item.getAttribute('data-share-id');
          if (!confirm(zh ? '确定删除此分享链接?' : 'Delete this share link?')) return;
          try {
            await api('/admin/api/share/delete', { shareId });
            toast(zh ? '分享已删除' : 'Share deleted');
            loadShares();
          } catch (e) { toast(e.message, 'error'); }
        });
      });
    } catch (e) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:#EF4444">${e.message}</div>`;
    }
  }
  
  document.querySelectorAll('.adm-nav-item[data-tab="shares"]').forEach(btn => {
    btn.addEventListener('click', () => loadShares());
  });

  // =============================================
  // === GitHub Token Pool Management ===
  // =============================================
  const tokenI = {
    active: zh ? '可用' : 'Active',
    cooldown: zh ? '冷却中' : 'Cooldown',
    cooldownUntil: zh ? '冷却至' : 'Until',
    noTokens: zh ? '未配置任何 Token — 使用公开 API (60次/小时)' : 'No tokens configured — using public API (60 req/hour)',
    tokenCount: zh ? '个 Token' : ' token(s)',
    activeTokens: zh ? '可用' : 'active',
    tokensSaved: zh ? 'Token 配置已保存!' : 'Token config saved!',
    remove: zh ? '移除' : 'Remove',
  };

  let tokenList = [];

  function rateLimitColor(percent) {
    if (percent >= 70) return '#22C55E';
    if (percent >= 30) return '#F59E0B';
    return '#EF4444';
  }

  function formatResetTime(resetAt) {
    if (!resetAt) return '--';
    const reset = new Date(resetAt);
    const now = new Date();
    const diffMs = reset.getTime() - now.getTime();
    if (diffMs <= 0) return zh ? '已重置' : 'Reset';
    const mins = Math.ceil(diffMs / 60000);
    if (mins < 60) return `${mins} ${zh ? '分钟后' : 'min'}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  function rateLimitBar(label, used, remaining, limit, percent, resetAt) {
    const color = rateLimitColor(percent);
    const usedPercent = limit > 0 ? Math.round((used / limit) * 100) : 0;
    const resetText = formatResetTime(resetAt);
    return `<div class="adm-rl-bar-wrap">
      <div class="adm-rl-bar-header"><span class="adm-rl-bar-label">${label}</span><span class="adm-rl-bar-nums" style="color:${color}">${remaining} <small>/ ${limit}</small></span></div>
      <div class="adm-rl-bar-track"><div class="adm-rl-bar-fill" style="width:${percent}%;background:${color}"></div></div>
      <div class="adm-rl-bar-footer"><span>${zh ? '已用' : 'Used'}: ${used} (${usedPercent}%)</span><span>${zh ? '重置' : 'Reset'}: ${resetText}</span></div>
    </div>`;
  }

  async function loadTokenStatus() {
    const container = document.getElementById('tokenStatusContent');
    if (!container) return;
    try {
      const [statusResp, rlResp] = await Promise.all([fetch('/admin/api/github-tokens'), fetch('/admin/api/github-tokens/rate-limit')]);
      if (!statusResp.ok) throw new Error('Failed to load');
      const data = await statusResp.json();
      const rlData = rlResp.ok ? await rlResp.json() : null;

      if (data.totalTokens === 0) {
        container.innerHTML = `<div class="adm-token-no-tokens"><i class="fa-solid fa-info-circle"></i> ${tokenI.noTokens}</div>`;
        tokenList = [];
        return;
      }

      let html = `<div class="adm-token-summary"><span><span class="summary-num">${data.totalTokens}</span> ${tokenI.tokenCount}</span><span style="color:#22C55E;font-weight:600">${data.activeTokens} ${tokenI.activeTokens}</span><span style="color:#F59E0B;font-weight:600">${data.totalTokens - data.activeTokens} ${tokenI.cooldown}</span></div>`;

      if (rlData && rlData.total) {
        const coreResets = (rlData.tokens || []).filter(t => t.core && t.core.resetAt).map(t => t.core.resetAt);
        const searchResets = (rlData.tokens || []).filter(t => t.search && t.search.resetAt).map(t => t.search.resetAt);
        html += `<div class="adm-rl-total"><h4 class="adm-rl-total-title"><i class="fa-solid fa-chart-pie"></i> ${zh ? '总配额概览' : 'Total Quota Overview'}</h4><div class="adm-rl-total-grid">
          ${rateLimitBar('Core API', rlData.total.core.used, rlData.total.core.remaining, rlData.total.core.limit, rlData.total.core.percent, coreResets.sort()[0] || null)}
          ${rateLimitBar(zh ? 'Search API (排行榜)' : 'Search API (Trending)', rlData.total.search.used, rlData.total.search.remaining, rlData.total.search.limit, rlData.total.search.percent, searchResets.sort()[0] || null)}
        </div></div>`;
      }

      html += `<div class="adm-token-status-grid">`;
      data.tokens.forEach((t, idx) => {
        const stateClass = t.active ? 'active' : 'cooldown';
        const stateText = t.active ? tokenI.active : tokenI.cooldown;
        const cdText = t.cooldownUntil ? `<br><small>${tokenI.cooldownUntil} ${new Date(t.cooldownUntil).toLocaleTimeString()}</small>` : '';
        const rl = rlData && rlData.tokens ? rlData.tokens[idx] : null;
        html += `<div class="adm-token-status-card"><div class="adm-token-card-top"><span class="token-index">${idx + 1}</span><div class="token-info"><div class="token-masked">${t.masked}</div><div class="token-state ${stateClass}">${stateText}${cdText}</div></div><span class="adm-token-status-dot ${stateClass}"></span></div>`;
        if (rl && !rl.error && rl.core && rl.search) {
          html += `<div class="adm-token-rl-detail">${rateLimitBar('Core', rl.core.used, rl.core.remaining, rl.core.limit, rl.core.percent, rl.core.resetAt)}${rateLimitBar('Search', rl.search.used, rl.search.remaining, rl.search.limit, rl.search.percent, rl.search.resetAt)}</div>`;
        } else if (rl && rl.error) {
          html += `<div class="adm-token-rl-error"><i class="fa-solid fa-triangle-exclamation"></i> ${rl.error}</div>`;
        }
        html += `</div>`;
      });
      html += '</div>';
      container.innerHTML = html;
      tokenList = data.tokens.map(t => t.masked);
    } catch (e) {
      container.innerHTML = `<p style="color:var(--text-tertiary);text-align:center;padding:16px">Error loading status</p>`;
    }
  }

  async function loadTokensForEditing() {
    try {
      const resp = await fetch('/admin/api/github-tokens');
      if (!resp.ok) return;
      const data = await resp.json();
      tokenList = [];
      if (data.totalTokens > 0) renderTokenListWithMasked(data.tokens);
    } catch (e) { /* silently fail */ }
  }

  function renderTokenListWithMasked(tokens) {
    const container = document.getElementById('tokenListContainer');
    if (!container || tokens.length === 0) return;
    container.innerHTML = tokens.map((t, idx) => `
      <div class="adm-token-item" data-idx="${idx}">
        <span class="token-num">${idx + 1}</span>
        <input type="text" value="${t.masked}" readonly style="opacity:0.6;cursor:default" />
        <button class="adm-btn-icon adm-btn-icon-danger remove-token-btn" title="${tokenI.remove}" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
      </div>`).join('');
    container.querySelectorAll('.remove-token-btn').forEach(btn => {
      btn.addEventListener('click', () => { btn.closest('.adm-token-item').style.display = 'none'; btn.closest('.adm-token-item').dataset.removed = 'true'; });
    });
  }

  const addTokenBtn = document.getElementById('addTokenBtn');
  const newTokenInput = document.getElementById('newTokenInput');
  if (addTokenBtn && newTokenInput) {
    addTokenBtn.addEventListener('click', () => {
      const val = newTokenInput.value.trim();
      if (!val) return;
      const container = document.getElementById('tokenListContainer');
      const item = document.createElement('div');
      item.className = 'adm-token-item';
      item.dataset.newToken = val;
      item.innerHTML = `<span class="token-num">+</span><input type="text" value="${val.slice(0, 8)}***${val.slice(-4)}" readonly style="color:#22C55E" /><button class="adm-btn-icon adm-btn-icon-danger remove-new-token-btn" title="${tokenI.remove}"><i class="fa-solid fa-trash"></i></button>`;
      item.querySelector('.remove-new-token-btn').addEventListener('click', () => item.remove());
      container.appendChild(item);
      newTokenInput.value = '';
      newTokenInput.focus();
    });
    newTokenInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTokenBtn.click(); } });
  }

  const saveTokensBtn = document.getElementById('saveTokensBtn');
  if (saveTokensBtn) {
    saveTokensBtn.addEventListener('click', async () => {
      const container = document.getElementById('tokenListContainer');
      const tokens = [];
      let hasExistingNotRemoved = false;
      container.querySelectorAll('.adm-token-item').forEach(item => {
        if (item.dataset.removed === 'true') return;
        if (item.dataset.newToken) tokens.push(item.dataset.newToken);
        else hasExistingNotRemoved = true;
      });
      try {
        if (hasExistingNotRemoved && tokens.length > 0) {
          const resp = await fetch('/admin/api/github-tokens/add', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ tokens }) });
          if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Failed'); }
        } else if (hasExistingNotRemoved && tokens.length === 0) {
          const removedIndices = [];
          container.querySelectorAll('.adm-token-item').forEach(item => {
            if (item.dataset.removed === 'true' && !item.dataset.newToken) removedIndices.push(parseInt(item.dataset.idx));
          });
          if (removedIndices.length > 0) {
            const resp = await fetch('/admin/api/github-tokens/remove', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ indices: removedIndices }) });
            if (!resp.ok) { const err = await resp.json(); throw new Error(err.error || 'Failed'); }
          }
        } else {
          await api('/admin/api/github-tokens', { tokens });
        }
        toast(tokenI.tokensSaved);
        setTimeout(async () => { await loadTokenStatus(); await loadTokensForEditing(); }, 500);
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  document.querySelectorAll('.adm-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.tab === 'tokens') { loadTokenStatus(); loadTokensForEditing(); }
    });
  });

  // =============================================
  // === ANNOUNCEMENTS ===
  // =============================================
  const addAnnBtn = document.getElementById('addAnnouncement');
  if (addAnnBtn) {
    addAnnBtn.addEventListener('click', () => {
      openModal(zh ? '添加公告' : 'Add Announcement', `
        <div class="adm-field"><label>${zh ? '内容' : 'Content'}</label><textarea id="ann-content" rows="3" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text-primary);resize:vertical" placeholder="${zh ? '公告内容...' : 'Announcement content...'}"></textarea></div>
        <div class="adm-field"><label>${zh ? '类型' : 'Type'}</label>
          <select id="ann-type" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text-primary);width:100%">
            <option value="info">${zh ? '信息 (蓝色)' : 'Info (blue)'}</option>
            <option value="warning">${zh ? '警告 (黄色)' : 'Warning (yellow)'}</option>
            <option value="success">${zh ? '成功 (绿色)' : 'Success (green)'}</option>
          </select></div>
        <div class="adm-field"><label>${zh ? '过期时间 (可选)' : 'Expiration (optional)'}</label>
          <select id="ann-expires" style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text-primary);width:100%">
            <option value="0">${zh ? '永不过期' : 'Never'}</option>
            <option value="3600000">${zh ? '1 小时' : '1 hour'}</option>
            <option value="86400000">${zh ? '1 天' : '1 day'}</option>
            <option value="604800000">${zh ? '7 天' : '7 days'}</option>
            <option value="2592000000">${zh ? '30 天' : '30 days'}</option>
          </select></div>
      `, async () => {
        const content = document.getElementById('ann-content')?.value?.trim();
        const type = document.getElementById('ann-type')?.value || 'info';
        const expiresMs = parseInt(document.getElementById('ann-expires')?.value || '0');
        if (!content) return toast(zh ? '请输入内容' : 'Please enter content', 'error');
        try {
          const payload = { content, type, enabled: true };
          if (expiresMs > 0) payload.expiresAt = Date.now() + expiresMs;
          await api('/admin/api/announcements', payload);
          closeModal();
          toast(zh ? '公告已创建!' : 'Announcement created!');
          location.reload();
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.toggle-announcement');
    if (toggleBtn) {
      const item = toggleBtn.closest('[data-ann-id]');
      if (item) {
        const id = item.dataset.annId;
        api('/admin/api/announcements/toggle', { id }).then(() => location.reload()).catch(e => toast(e.message, 'error'));
      }
    }
    const deleteBtn = e.target.closest('.delete-announcement');
    if (deleteBtn) {
      if (!confirm(zh ? '确定删除此公告?' : 'Delete this announcement?')) return;
      const item = deleteBtn.closest('[data-ann-id]');
      if (item) {
        const id = item.dataset.annId;
        api('/admin/api/announcements/delete', { id }).then(() => {
          item.remove();
          toast(zh ? '已删除!' : 'Deleted!');
        }).catch(e => toast(e.message, 'error'));
      }
    }
  });

})();
