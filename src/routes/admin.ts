/** routes/admin.ts — Admin dashboard and management APIs */
import { Hono } from 'hono'
import type { AppEnv, FileMeta, ShareLink } from '../types'
import { DANGEROUS_EXTENSIONS, ALLOWED_MIME_PREFIXES } from '../types'
import { parseLang, t } from '../i18n'
import { kvGet, kvPut, kvPutBuffer, kvDelete, getData } from '../lib/kv'
import { checkAuth, hashPassword, verifyPassword, getClientIP } from '../lib/auth'
import { DEFAULT_PROFILE, DEFAULT_WEBSITES, DEFAULT_REPOS, DEFAULT_SETTINGS, FILE_SERVER_SECRET_HEADER } from '../lib/constants'
import { validate, ProfileSchema, WebsitesArraySchema, ReposArraySchema, SettingsSchema, PasswordChangeSchema, UsernameChangeSchema, ExternalLinkSchema, AnnouncementSchema, TokensSchema } from '../lib/validation'
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
  return next()
})

// Dashboard
admin.get('/admin', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  const announcements: Announcement[] = await getData(c.env.KV, 'announcements', [])
  return c.render(adminPage('dashboard', { profile, websites, repos, files, settings, lang, announcements }), { title: lang === 'zh' ? '管理面板' : 'Admin Panel', lang })
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

// === Repos API ===
admin.post('/admin/api/repos', async (c) => {
  const data = await c.req.json()
  const result = validate(ReposArraySchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)
  await kvPut(c.env.KV, 'repos', JSON.stringify(result.data))
  return c.json({ ok: true })
})

// === File Upload ===
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

  // MIME type check (allow if prefix matches or if unknown)
  const mimeOk = !file.type || ALLOWED_MIME_PREFIXES.some(p => file.type.startsWith(p))
  if (!mimeOk) {
    return c.json({ error: `MIME type ${file.type} is not allowed` }, 400)
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
