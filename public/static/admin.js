// ========================================
// ADMIN PANEL — Frontend Logic
// ========================================
(() => {
  'use strict';

  const D = window.__DATA__ || { websites: [], repos: [], files: [] };
  let websites = [...D.websites];
  let repos = [...D.repos];

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
      toast('Profile saved!');
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
    const iconOpts = ICON_OPTIONS.map(i => `<option value="${i}" ${i === (w.icon || 'fa-solid fa-globe') ? 'selected' : ''}>${i.split(' ').pop()}</option>`).join('');
    return `<div class="adm-form-grid">
      <div class="adm-field"><label>Title</label><input id="mf-title" value="${w.title || ''}" /></div>
      <div class="adm-field"><label>URL</label><input id="mf-url" value="${w.url || ''}" /></div>
      <div class="adm-field adm-field-full"><label>Description</label><textarea id="mf-desc" rows="2">${w.description || ''}</textarea></div>
      <div class="adm-field"><label>Tags (comma separated)</label><input id="mf-tags" value="${w.tags || ''}" /></div>
      <div class="adm-field"><label>Color</label><input id="mf-color" type="color" value="${w.color || '#E8A838'}" /></div>
      <div class="adm-field"><label>Icon</label><select id="mf-icon">${iconOpts}</select></div>
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
      toast('Websites saved!');
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
          <button class="adm-btn-icon edit-website" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="adm-btn-icon adm-btn-icon-danger delete-website" title="Delete"><i class="fa-solid fa-trash"></i></button>
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
        openModal('Edit Website', websiteFormHTML(w), () => {
          Object.assign(w, getWebsiteFromModal());
          saveWebsites();
        });
      });
    });
    document.querySelectorAll('.delete-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        if (!confirm('Delete this website?')) return;
        websites = websites.filter(x => x.id !== id);
        saveWebsites();
      });
    });
  }

  document.getElementById('addWebsite').addEventListener('click', () => {
    openModal('Add Website', websiteFormHTML(), () => {
      websites.push({ id: uid(), ...getWebsiteFromModal() });
      saveWebsites();
    });
  });

  bindWebsiteEvents();

  // === Repos CRUD ===
  function repoFormHTML(r = {}) {
    return `<div class="adm-form-grid">
      <div class="adm-field"><label>Name</label><input id="mr-name" value="${r.name || ''}" /></div>
      <div class="adm-field"><label>URL</label><input id="mr-url" value="${r.url || ''}" /></div>
      <div class="adm-field adm-field-full"><label>Description</label><textarea id="mr-desc" rows="2">${r.description || ''}</textarea></div>
      <div class="adm-field"><label>Language</label><input id="mr-lang" value="${r.language || ''}" /></div>
      <div class="adm-field"><label>Stars</label><input id="mr-stars" type="number" value="${r.stars || 0}" /></div>
      <div class="adm-field"><label>Forks</label><input id="mr-forks" type="number" value="${r.forks || 0}" /></div>
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
      toast('Repos saved!');
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
          <button class="adm-btn-icon edit-repo" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="adm-btn-icon adm-btn-icon-danger delete-repo" title="Delete"><i class="fa-solid fa-trash"></i></button>
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
        openModal('Edit Repo', repoFormHTML(r), () => {
          Object.assign(r, getRepoFromModal());
          saveRepos();
        });
      });
    });
    document.querySelectorAll('.delete-repo').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        if (!confirm('Delete this repo?')) return;
        repos = repos.filter(x => x.id !== id);
        saveRepos();
      });
    });
  }

  document.getElementById('addRepo').addEventListener('click', () => {
    openModal('Add Repo', repoFormHTML(), () => {
      repos.push({ id: uid(), ...getRepoFromModal() });
      saveRepos();
    });
  });

  bindRepoEvents();

  // === File Upload ===
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) uploadFiles(fileInput.files);
    fileInput.value = '';
  });

  async function uploadFiles(fileList) {
    for (const file of fileList) {
      uploadProgress.style.display = 'block';
      progressFill.style.width = '0%';
      progressText.textContent = `Uploading ${file.name}...`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('displayName', file.name);

      try {
        // Simulate progress
        let p = 0;
        const interval = setInterval(() => {
          p = Math.min(p + Math.random() * 20, 90);
          progressFill.style.width = p + '%';
        }, 200);

        const res = await fetch('/admin/api/upload', { method: 'POST', body: formData });
        clearInterval(interval);

        if (!res.ok) throw new Error('Upload failed');
        progressFill.style.width = '100%';
        progressText.textContent = `${file.name} uploaded!`;
        toast(`${file.name} uploaded!`);

        setTimeout(() => { uploadProgress.style.display = 'none'; }, 1500);
        // Reload page to refresh file list
        setTimeout(() => location.reload(), 1800);
      } catch (e) {
        progressText.textContent = `Error: ${e.message}`;
        toast(e.message, 'error');
      }
    }
  }

  // === Delete File ===
  document.querySelectorAll('.delete-file').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.closest('.adm-item').dataset.key;
      if (!confirm('Delete this file?')) return;
      try {
        await api('/admin/api/delete-file', { key });
        toast('File deleted!');
        btn.closest('.adm-item').remove();
      } catch (e) { toast(e.message, 'error'); }
    });
  });

  // === Change Password ===
  document.getElementById('changePw').addEventListener('click', async () => {
    const oldPw = document.getElementById('set-oldpw').value;
    const newPw = document.getElementById('set-newpw').value;
    if (!oldPw || !newPw) return toast('Please fill in both fields', 'error');
    try {
      await api('/admin/api/password', { oldPassword: oldPw, newPassword: newPw });
      toast('Password updated!');
      document.getElementById('set-oldpw').value = '';
      document.getElementById('set-newpw').value = '';
    } catch (e) { toast(e.message, 'error'); }
  });

  // === XSS escape ===
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

})();
