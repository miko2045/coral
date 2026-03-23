/** routes/admin.ts — Admin dashboard and management APIs */
import { Hono } from 'hono'
import type { AppEnv, FileMeta, ShareLink } from '../types'
import { DANGEROUS_EXTENSIONS, ALLOWED_MIME_PREFIXES } from '../types'
import { parseLang, t } from '../i18n'
import { kvGet, kvPut, kvPutBuffer, kvDelete, getData } from '../lib/kv'
import { checkAuth, hashPassword, verifyPassword, getClientIP, generateCsrfToken, validateCsrfToken } from '../lib/auth'
import { DEFAULT_PROFILE, DEFAULT_WEBSITES, DEFAULT_REPOS, DEFAULT_SETTINGS, FILE_SERVER_SECRET_HEADER } from '../lib/constants'
import { validate, ProfileSchema, WebsitesArraySchema, ReposArraySchema, SettingsSchema, PasswordChangeSchema, UsernameChangeSchema, ExternalLinkSchema, AnnouncementSchema, TokensSchema, FileRenameSchema } from '../lib/validation'
import { adminPage } from '../admin'
import type { Announcement } from '../types'

const admin = new Hono<AppEnv>()

// Auth guard for all admin routes
admin.use('/admin/*', async (c, next) => {
  // Skip login page
  if (c.req.path === '/admin/login') return next()
  if (c.req.method === 'POST' && c.req.path === '/admin/login') return next()
  if (c.req.path === '/admin/logout') return next()
  if (!await checkAuth(c)) {
    if (c.req.path.startsWith('/admin/api/')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    return c.redirect('/admin/login')
  }
  // CSRF validation for all POST API requests
  if (c.req.method === 'POST' && c.req.path.startsWith('/admin/api/')) {
    const csrfToken = c.req.header('X-CSRF-Token') || ''
    const cookie = c.req.header('Cookie') || ''
    const match = cookie.match(/__Host-portal_session=([^;]+)/) || cookie.match(/portal_session=([^;]+)/)
    const sessionId = match ? match[1] : ''
    if (!await validateCsrfToken(c.env.KV, sessionId, csrfToken)) {
      return c.json({ error: 'CSRF token invalid or missing' }, 403)
    }
  }
  return next()
})

// Dashboard
admin.get('/admin', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const [profile, websites, repos, files, settings, announcements, shares] = await Promise.all([
    getData(c.env.KV, 'profile', DEFAULT_PROFILE),
    getData(c.env.KV, 'websites', DEFAULT_WEBSITES),
    getData(c.env.KV, 'repos', DEFAULT_REPOS),
    getData(c.env.KV, 'files', []),
    getData(c.env.KV, 'settings', DEFAULT_SETTINGS),
    getData<Announcement[]>(c.env.KV, 'announcements', []),
    getData<ShareLink[]>(c.env.KV, 'shares', []),
  ])
  // Generate CSRF token for this session
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/__Host-portal_session=([^;]+)/) || cookie.match(/portal_session=([^;]+)/)
  const sessionId = match ? match[1] : ''
  const csrfToken = await generateCsrfToken(c.env.KV, sessionId)
  return c.render(adminPage('dashboard', { profile, websites, repos, files, settings, lang, announcements, shares, csrfToken }), { title: lang === 'zh' ? '管理面板' : 'Admin Panel', lang, isAdmin: true })
})

// === Dashboard Stats API ===
admin.get('/admin/api/stats', async (c) => {
  const [files, websites, repos, shares, announcements] = await Promise.all([
    getData<FileMeta[]>(c.env.KV, 'files', []),
    getData(c.env.KV, 'websites', DEFAULT_WEBSITES),
    getData(c.env.KV, 'repos', DEFAULT_REPOS),
    getData<ShareLink[]>(c.env.KV, 'shares', []),
    getData<Announcement[]>(c.env.KV, 'announcements', []),
  ])
  const now = Date.now()
  const activeShares = shares.filter(s => {
    if (s.expiresAt && now > s.expiresAt) return false
    if (s.maxDownloads && s.downloads >= s.maxDownloads) return false
    return true
  })
  const totalFileSize = files.reduce((a, f) => a + (f.size || 0), 0)
  const totalDownloads = shares.reduce((a, s) => a + (s.downloads || 0), 0)
  const totalStars = repos.reduce((a: number, r: any) => a + (r.stars || 0), 0)

  // File type distribution
  const typeMap: Record<string, number> = {}
  files.forEach(f => {
    const category = f.type ? f.type.split('/')[0] : 'other'
    typeMap[category] = (typeMap[category] || 0) + 1
  })

  // Recent uploads (last 7 days)
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const recentFiles = files.filter(f => new Date(f.uploadedAt).getTime() > weekAgo)

  return c.json({
    files: { total: files.length, totalSize: totalFileSize, recentCount: recentFiles.length, typeDistribution: typeMap },
    websites: { total: websites.length, pinnedCount: websites.filter((w: any) => w.pinned).length },
    repos: { total: repos.length, totalStars },
    shares: { total: shares.length, active: activeShares.length, totalDownloads },
    announcements: { total: announcements.length, active: announcements.filter(a => a.enabled).length },
  })
})

// === Profile API ===
admin.post('/admin/api/profile', async (c) => {
  const data = await c.req.json()
  const result = validate(ProfileSchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)
  await kvPut(c.env.KV, 'profile', JSON.stringify(result.data))
  return c.json({ ok: true })
})

// === Websites API ===
admin.post('/admin/api/websites', async (c) => {
  const data = await c.req.json()
  const result = validate(WebsitesArraySchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)
  await kvPut(c.env.KV, 'websites', JSON.stringify(result.data))
  return c.json({ ok: true })
})

// === Website Pin Toggle ===
admin.post('/admin/api/websites/pin', async (c) => {
  const { id } = await c.req.json()
  if (!id) return c.json({ error: 'Missing id' }, 400)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const site = websites.find((w: any) => w.id === id)
  if (!site) return c.json({ error: 'Website not found' }, 404)
  ;(site as any).pinned = !(site as any).pinned
  await kvPut(c.env.KV, 'websites', JSON.stringify(websites))
  return c.json({ ok: true, pinned: (site as any).pinned })
})

// === Website Reorder ===
admin.post('/admin/api/websites/reorder', async (c) => {
  const { ids } = await c.req.json() as { ids: string[] }
  if (!ids || !Array.isArray(ids)) return c.json({ error: 'Missing ids array' }, 400)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  // Reorder based on provided ids
  const reordered = ids.map(id => websites.find((w: any) => w.id === id)).filter(Boolean)
  // Add any items not in the ids list at the end
  const remaining = websites.filter((w: any) => !ids.includes(w.id))
  const final = [...reordered, ...remaining].map((w: any, i: number) => ({ ...w, order: i }))
  await kvPut(c.env.KV, 'websites', JSON.stringify(final))
  return c.json({ ok: true })
})

// === File Pin Toggle ===
admin.post('/admin/api/files/pin', async (c) => {
  const { key } = await c.req.json()
  if (!key) return c.json({ error: 'Missing key' }, 400)
  const files: FileMeta[] = await getData(c.env.KV, 'files', [])
  const file = files.find(f => f.key === key)
  if (!file) return c.json({ error: 'File not found' }, 404)
  file.pinned = !file.pinned
  await kvPut(c.env.KV, 'files', JSON.stringify(files))
  return c.json({ ok: true, pinned: file.pinned })
})

// === File Reorder ===
admin.post('/admin/api/files/reorder', async (c) => {
  const { keys } = await c.req.json() as { keys: string[] }
  if (!keys || !Array.isArray(keys)) return c.json({ error: 'Missing keys array' }, 400)
  const files: FileMeta[] = await getData(c.env.KV, 'files', [])
  const reordered = keys.map(k => files.find(f => f.key === k)).filter(Boolean) as FileMeta[]
  const remaining = files.filter(f => !keys.includes(f.key))
  const final = [...reordered, ...remaining].map((f, i) => ({ ...f, order: i }))
  await kvPut(c.env.KV, 'files', JSON.stringify(final))
  return c.json({ ok: true })
})

// === Repos API ===
admin.post('/admin/api/repos', async (c) => {
  const data = await c.req.json()
  const result = validate(ReposArraySchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)
  await kvPut(c.env.KV, 'repos', JSON.stringify(result.data))
  return c.json({ ok: true })
})

// === File Upload (with improved MIME handling) ===
admin.post('/admin/api/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const displayName = (formData.get('displayName') as string) || file.name
  if (!file) return c.json({ error: 'No file' }, 400)

  // File type validation
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return c.json({ error: `File type .${ext} is not allowed for security reasons` }, 400)
  }

  // MIME type check — relaxed: allow if prefix matches, unknown, or empty
  const mimeOk = !file.type || file.type === '' || ALLOWED_MIME_PREFIXES.some(p => file.type.startsWith(p))
  if (!mimeOk) {
    // Second check: allow based on safe extension
    const safeExtensions = new Set([
      'zip', 'gz', 'tar', 'rar', '7z', 'bz2', 'xz',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'odt', 'ods', 'odp', 'rtf', 'csv', 'tsv',
      'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico', 'avif',
      'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
      'mp4', 'mkv', 'avi', 'mov', 'webm', 'flv',
      'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'toml',
      'html', 'css', 'ts', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h',
      'woff', 'woff2', 'ttf', 'otf', 'eot',
      'apk', 'dmg', 'iso', 'deb', 'rpm', 'wasm', 'epub', 'mobi',
    ])
    if (!safeExtensions.has(ext)) {
      return c.json({ error: `MIME type ${file.type} is not allowed` }, 400)
    }
  }

  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  // Generate safe key: UUID-based, no user input in filename
  const safeKey = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

  if (settings.storageMode === 'local' && settings.localServerUrl) {
    // Local storage mode: proxy to local file server with auth
    const serverUrl = settings.localServerUrl.replace(/\/$/, '')
    const storagePath = (settings.localStoragePath || '/data/portal/files').replace(/\/$/, '')
    const uploadUrl = `${serverUrl}/upload`
    try {
      const proxyForm = new FormData()
      proxyForm.append('file', file)
      proxyForm.append('path', storagePath)
      proxyForm.append('filename', safeKey)
      // Add auth secret
      const secret = await kvGet(c.env.KV, 'fileserver_secret') || ''
      const resp = await fetch(uploadUrl, {
        method: 'POST',
        body: proxyForm,
        headers: secret ? { [FILE_SERVER_SECRET_HEADER]: secret } : {},
      })
      if (!resp.ok) {
        const errText = await resp.text().catch(() => 'Upload failed')
        return c.json({ error: `Local server error: ${errText}` }, 502)
      }
    } catch (e) {
      return c.json({ error: 'Local server unreachable' }, 502)
    }

    // File metadata still in KV
    const files: FileMeta[] = await getData(c.env.KV, 'files', [])
    files.push({
      key: safeKey,
      displayName,
      originalName: file.name,
      storedName: safeKey,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      storageType: 'local',
    })
    await kvPut(c.env.KV, 'files', JSON.stringify(files))
    return c.json({ ok: true, key: safeKey })
  }

  // KV storage mode — store as ArrayBuffer (no base64 bloat!)
  const maxBytes = (settings.maxFileSize || 25) * 1024 * 1024
  if (file.size > maxBytes) {
    return c.json({ error: `File too large. Max ${settings.maxFileSize}MB` }, 400)
  }

  const buf = await file.arrayBuffer()
  await kvPutBuffer(c.env.KV, `file:${safeKey}`, buf)

  const files: FileMeta[] = await getData(c.env.KV, 'files', [])
  files.push({
    key: safeKey,
    displayName,
    originalName: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    storageType: 'kv',
  })
  await kvPut(c.env.KV, 'files', JSON.stringify(files))
  return c.json({ ok: true, key: safeKey })
})

// === File Rename ===
admin.post('/admin/api/rename-file', async (c) => {
  const data = await c.req.json()
  const result = validate(FileRenameSchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)

  const files: FileMeta[] = await getData(c.env.KV, 'files', [])
  const file = files.find(f => f.key === result.data.key)
  if (!file) return c.json({ error: 'File not found' }, 404)

  file.displayName = result.data.displayName
  await kvPut(c.env.KV, 'files', JSON.stringify(files))
  return c.json({ ok: true })
})

// === Batch Delete Files ===
admin.post('/admin/api/delete-files-batch', async (c) => {
  const { keys } = await c.req.json() as { keys: string[] }
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    return c.json({ error: 'Missing keys array' }, 400)
  }
  if (keys.length > 50) return c.json({ error: 'Max 50 files at once' }, 400)

  const keySet = new Set(keys)
  const files: FileMeta[] = await getData(c.env.KV, 'files', [])
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)

  // Delete file data from KV
  const deletePromises: Promise<void>[] = []
  const filesToDelete = files.filter(f => keySet.has(f.key))

  for (const f of filesToDelete) {
    deletePromises.push(kvDelete(c.env.KV, `file:${f.key}`))
    // Delete from local server if applicable
    if (f.storageType === 'local' && settings.localServerUrl) {
      try {
        const serverUrl = settings.localServerUrl.replace(/\/$/, '')
        const secret = await kvGet(c.env.KV, 'fileserver_secret') || ''
        deletePromises.push(
          fetch(`${serverUrl}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(secret ? { [FILE_SERVER_SECRET_HEADER]: secret } : {}) },
            body: JSON.stringify({ filename: f.storedName || f.key, path: settings.localStoragePath }),
          }).then(() => {}).catch(() => {})
        )
      } catch { /* best effort */ }
    }
  }

  await Promise.allSettled(deletePromises)

  // Update files list
  const newFiles = files.filter(f => !keySet.has(f.key))
  await kvPut(c.env.KV, 'files', JSON.stringify(newFiles))

  // Cascade: delete shares referencing deleted files
  const newShares = shares.filter(s => !keySet.has(s.fileKey))
  if (newShares.length !== shares.length) {
    await kvPut(c.env.KV, 'shares', JSON.stringify(newShares))
  }

  return c.json({ ok: true, deleted: filesToDelete.length })
})

// === Add External Link ===
admin.post('/admin/api/add-link', async (c) => {
  const data = await c.req.json()
  const result = validate(ExternalLinkSchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)

  const key = `${Date.now()}-link-${crypto.randomUUID().slice(0, 8)}`
  const files: FileMeta[] = await getData(c.env.KV, 'files', [])
  files.push({
    key,
    displayName: result.data.displayName,
    originalName: result.data.originalName || result.data.displayName,
    externalUrl: result.data.externalUrl,
    size: result.data.size,
    type: result.data.type,
    uploadedAt: new Date().toISOString(),
    isExternal: true,
  })
  await kvPut(c.env.KV, 'files', JSON.stringify(files))
  return c.json({ ok: true, key })
})

// === Delete File (with cascade share cleanup) ===
admin.post('/admin/api/delete-file', async (c) => {
  const { key } = await c.req.json()
  if (!key) return c.json({ error: 'Missing key' }, 400)

  await kvDelete(c.env.KV, `file:${key}`)

  // Cascade: delete shares referencing this file
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const newShares = shares.filter(s => s.fileKey !== key)
  if (newShares.length !== shares.length) {
    await kvPut(c.env.KV, 'shares', JSON.stringify(newShares))
  }

  const files: FileMeta[] = await getData(c.env.KV, 'files', [])
  const newFiles = files.filter(f => f.key !== key)
  await kvPut(c.env.KV, 'files', JSON.stringify(newFiles))

  // Also try to delete from local file server
  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  if (settings.storageMode === 'local' && settings.localServerUrl) {
    const file = files.find(f => f.key === key)
    if (file && file.storageType === 'local') {
      try {
        const serverUrl = settings.localServerUrl.replace(/\/$/, '')
        const secret = await kvGet(c.env.KV, 'fileserver_secret') || ''
        await fetch(`${serverUrl}/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(secret ? { [FILE_SERVER_SECRET_HEADER]: secret } : {}),
          },
          body: JSON.stringify({ filename: file.storedName || key, path: settings.localStoragePath }),
        })
      } catch { /* best effort */ }
    }
  }

  return c.json({ ok: true })
})

// === Settings ===
admin.post('/admin/api/settings', async (c) => {
  const data = await c.req.json()
  const result = validate(SettingsSchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)
  await kvPut(c.env.KV, 'settings', JSON.stringify(result.data))
  return c.json({ ok: true })
})

// === Password Change (NO sanitize on passwords!) ===
admin.post('/admin/api/password', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const data = await c.req.json()
  const result = validate(PasswordChangeSchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)

  let stored = await kvGet(c.env.KV, 'admin_password')
  if (!stored) {
    stored = await hashPassword('admin123')
    await kvPut(c.env.KV, 'admin_password', stored)
  }

  const valid = await verifyPassword(result.data.oldPassword, stored)
  if (!valid) return c.json({ error: lang === 'zh' ? '旧密码错误' : 'Incorrect old password' }, 400)

  const hashedNew = await hashPassword(result.data.newPassword)
  await kvPut(c.env.KV, 'admin_password', hashedNew)
  return c.json({ ok: true })
})

// === Username Change ===
admin.post('/admin/api/username', async (c) => {
  const data = await c.req.json()
  const result = validate(UsernameChangeSchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)
  await kvPut(c.env.KV, 'admin_username', result.data.newUsername)
  return c.json({ ok: true })
})

// === Data Export (all data as JSON) ===
admin.get('/admin/api/export', async (c) => {
  const [profile, websites, repos, files, settings, announcements, shares] = await Promise.all([
    getData(c.env.KV, 'profile', DEFAULT_PROFILE),
    getData(c.env.KV, 'websites', DEFAULT_WEBSITES),
    getData(c.env.KV, 'repos', DEFAULT_REPOS),
    getData(c.env.KV, 'files', []),
    getData(c.env.KV, 'settings', DEFAULT_SETTINGS),
    getData<Announcement[]>(c.env.KV, 'announcements', []),
    getData<ShareLink[]>(c.env.KV, 'shares', []),
  ])
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    profile,
    websites,
    repos,
    files, // metadata only (not actual file content)
    settings,
    announcements,
    shares,
  }
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="portal-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
})

// === Data Import ===
admin.post('/admin/api/import', async (c) => {
  const data = await c.req.json()
  if (!data || !data.version) return c.json({ error: 'Invalid import data' }, 400)

  const writeOps: Promise<void>[] = []
  let importedCount = 0

  if (data.profile) {
    const r = validate(ProfileSchema, data.profile)
    if (r.success) { writeOps.push(kvPut(c.env.KV, 'profile', JSON.stringify(r.data))); importedCount++ }
  }
  if (data.websites && Array.isArray(data.websites)) {
    const r = validate(WebsitesArraySchema, data.websites)
    if (r.success) { writeOps.push(kvPut(c.env.KV, 'websites', JSON.stringify(r.data))); importedCount++ }
  }
  if (data.repos && Array.isArray(data.repos)) {
    const r = validate(ReposArraySchema, data.repos)
    if (r.success) { writeOps.push(kvPut(c.env.KV, 'repos', JSON.stringify(r.data))); importedCount++ }
  }
  if (data.files && Array.isArray(data.files)) {
    writeOps.push(kvPut(c.env.KV, 'files', JSON.stringify(data.files))); importedCount++
  }
  if (data.settings) {
    const r = validate(SettingsSchema, data.settings)
    if (r.success) { writeOps.push(kvPut(c.env.KV, 'settings', JSON.stringify(r.data))); importedCount++ }
  }
  if (data.announcements && Array.isArray(data.announcements)) {
    writeOps.push(kvPut(c.env.KV, 'announcements', JSON.stringify(data.announcements))); importedCount++
  }

  await Promise.all(writeOps)
  return c.json({ ok: true, imported: importedCount })
})

// === Announcement Management ===
admin.get('/admin/api/announcements', async (c) => {
  const announcements: Announcement[] = await getData(c.env.KV, 'announcements', [])
  return c.json({ announcements })
})

admin.post('/admin/api/announcements', async (c) => {
  const data = await c.req.json()
  const result = validate(AnnouncementSchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)

  const announcements: Announcement[] = await getData(c.env.KV, 'announcements', [])
  const newAnnouncement: Announcement = {
    id: crypto.randomUUID().slice(0, 12),
    ...result.data,
    createdAt: Date.now(),
  }
  announcements.push(newAnnouncement)
  await kvPut(c.env.KV, 'announcements', JSON.stringify(announcements))
  return c.json({ ok: true, announcement: newAnnouncement })
})

admin.post('/admin/api/announcements/delete', async (c) => {
  const { id } = await c.req.json()
  const announcements: Announcement[] = await getData(c.env.KV, 'announcements', [])
  const filtered = announcements.filter(a => a.id !== id)
  await kvPut(c.env.KV, 'announcements', JSON.stringify(filtered))
  return c.json({ ok: true })
})

admin.post('/admin/api/announcements/toggle', async (c) => {
  const { id } = await c.req.json()
  const announcements: Announcement[] = await getData(c.env.KV, 'announcements', [])
  const ann = announcements.find(a => a.id === id)
  if (ann) ann.enabled = !ann.enabled
  await kvPut(c.env.KV, 'announcements', JSON.stringify(announcements))
  return c.json({ ok: true })
})

export default admin
