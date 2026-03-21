import { Hono } from 'hono'
import { renderer } from './renderer'
import { adminPage } from './admin'
import { homePage } from './home'
import { trendingPage } from './trending'
import { parseLang, t } from './i18n'
import type { Lang } from './i18n'

type Bindings = {
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)

// ==================== 默认数据 ====================
const DEFAULT_PROFILE = {
  name: 'Alex Chen',
  tagline: 'Builder · Dreamer · Explorer',
  avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=transparent',
  bio: '热爱构建美好的数字产品，用代码把想法变成现实。相信好的设计能让世界更有趣。',
  location: 'Shanghai, China',
  email: 'hello@example.com',
  status: '正在探索 WebAssembly 的无限可能',
  currentlyReading: '《Designing Data-Intensive Applications》',
  quote: 'The best way to predict the future is to invent it.',
  quoteAuthor: 'Alan Kay',
  socials: {
    github: 'https://github.com',
    twitter: 'https://twitter.com',
  },
}

const DEFAULT_WEBSITES = [
  { id: '1', title: 'Cloudflare Dashboard', description: '一个现代化的云服务管理面板，支持实时监控和数据可视化', url: 'https://dash.cloudflare.com', tags: 'Hono,TypeScript,D1', color: '#F6A623', icon: 'fa-solid fa-cloud' },
  { id: '2', title: 'AI Writing Studio', description: '基于 AI 的智能写作助手，让创作更高效', url: 'https://example.com', tags: 'React,OpenAI,TailwindCSS', color: '#7C5CFC', icon: 'fa-solid fa-wand-magic-sparkles' },
  { id: '3', title: 'Photo Gallery', description: '极简风格的在线相册，支持图片压缩和 CDN 加速', url: 'https://example.com', tags: 'Astro,R2,WASM', color: '#22C55E', icon: 'fa-solid fa-camera-retro' },
]

const DEFAULT_REPOS = [
  { id: '1', name: 'hono-starter', description: '一套开箱即用的 Hono + Cloudflare Pages 项目模板', language: 'TypeScript', stars: 128, forks: 32, url: 'https://github.com' },
  { id: '2', name: 'bento-css', description: '纯 CSS 实现的 Bento Grid 布局库，零依赖', language: 'CSS', stars: 256, forks: 45, url: 'https://github.com' },
  { id: '3', name: 'mini-orm', description: '轻量级 D1 数据库 ORM，支持类型安全查询', language: 'TypeScript', stars: 89, forks: 12, url: 'https://github.com' },
  { id: '4', name: 'pixel-weather', description: '像素风格的天气小组件，可嵌入任何网页', language: 'JavaScript', stars: 67, forks: 8, url: 'https://github.com' },
]

const DEFAULT_SETTINGS = {
  storageMode: 'kv', // kv | local | external
  localServerUrl: '',
  localStoragePath: '/data/portal/files',
  externalUploadUrl: '',
  externalDownloadPrefix: '',
  maxFileSize: 25, // MB, KV 单值上限 25MB
}

// ==================== 辅助函数 ====================
async function getData(kv: KVNamespace, key: string, fallback: any) {
  const val = await kv.get(key)
  if (val) return JSON.parse(val)
  await kv.put(key, JSON.stringify(fallback))
  return fallback
}

// ==================== 语言切换 API ====================
app.get('/api/set-lang', (c) => {
  const lang = c.req.query('lang') === 'en' ? 'en' : 'zh'
  const referer = c.req.header('Referer') || '/'
  return new Response(null, {
    status: 302,
    headers: {
      'Location': referer,
      'Set-Cookie': `portal_lang=${lang}; Path=/; SameSite=Lax; Max-Age=${365 * 24 * 3600}`,
    },
  })
})

// ==================== 前台首页 ====================
app.get('/', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  return c.render(homePage(profile, websites, repos, files, lang), { title: `${profile.name} — Portal`, lang })
})

// ==================== API: 公开数据 ====================
app.get('/api/data', async (c) => {
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  return c.json({ profile, websites, repos, files })
})

// ==================== API: 文件下载 ====================

// ==================== GitHub Trending API ====================
const CACHE_TTL = 3600 // 1 hour

async function fetchGitHubSearch(q: string, sort: string, order: string, perPage: number = 30): Promise<any[]> {
  const params = new URLSearchParams({ q, sort, order, per_page: String(perPage) })
  const url = `https://api.github.com/search/repositories?${params.toString()}`
  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'portal-trending-app',
      },
    })
    if (!resp.ok) return []
    const data = await resp.json() as any
    return data.items || []
  } catch {
    return []
  }
}

function getDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

async function getHotRepos(langFilter: string): Promise<any[]> {
  const langQ = langFilter ? ` language:${langFilter}` : ''
  const q = `stars:>5000${langQ}`
  return fetchGitHubSearch(q, 'stars', 'desc', 30)
}

async function getRisingRepos(langFilter: string): Promise<any[]> {
  const weekAgo = getDateStr(7)
  const langQ = langFilter ? ` language:${langFilter}` : ''
  const q = `created:>${weekAgo}${langQ}`
  const repos = await fetchGitHubSearch(q, 'stars', 'desc', 30)
  return repos.map(r => ({
    ...r,
    _starsToday: r.stargazers_count,
  }))
}

async function getCachedTrending(kv: KVNamespace, tab: string, langFilter: string) {
  const cacheKey = `trending:${tab}:${langFilter || 'all'}`
  const cached = await kv.get(cacheKey)
  if (cached) {
    try {
      const data = JSON.parse(cached)
      return { repos: data.repos, cacheAge: data.timestamp }
    } catch { /* ignore */ }
  }

  const repos = tab === 'rising'
    ? await getRisingRepos(langFilter)
    : await getHotRepos(langFilter)

  const payload = { repos, timestamp: new Date().toISOString() }
  await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: CACHE_TTL }).catch(() => {})
  return { repos, cacheAge: payload.timestamp }
}

app.get('/trending', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const tab = c.req.query('tab') || 'hot'
  const langFilter = c.req.query('lang_filter') || ''

  let hotRepos: any[] = []
  let risingRepos: any[] = []
  let cacheAge = ''

  try {
    if (tab === 'rising') {
      const result = await getCachedTrending(c.env.KV, 'rising', langFilter)
      risingRepos = result.repos
      cacheAge = result.cacheAge
      // Also get hot count for tab badge
      const hotResult = await getCachedTrending(c.env.KV, 'hot', langFilter)
      hotRepos = hotResult.repos
    } else {
      const result = await getCachedTrending(c.env.KV, 'hot', langFilter)
      hotRepos = result.repos
      cacheAge = result.cacheAge
      // Also get rising count for tab badge
      const risingResult = await getCachedTrending(c.env.KV, 'rising', langFilter)
      risingRepos = risingResult.repos
    }
  } catch {
    // On error, show empty
  }

  const title = lang === 'zh' ? 'GitHub 排行榜 — Portal' : 'GitHub Trending — Portal'
  return c.render(
    trendingPage(hotRepos, risingRepos, lang, tab, langFilter, cacheAge),
    { title, lang }
  )
})

app.get('/api/trending', async (c) => {
  const tab = c.req.query('tab') || 'hot'
  const langFilter = c.req.query('lang_filter') || ''
  try {
    const result = await getCachedTrending(c.env.KV, tab, langFilter)
    return c.json({ repos: result.repos, cacheAge: result.cacheAge })
  } catch {
    return c.json({ repos: [], cacheAge: '' })
  }
})

app.get('/api/download/:key', async (c) => {
  const key = c.req.param('key')
  const files: any[] = await getData(c.env.KV, 'files', [])
  const fileMeta = files.find((f: any) => f.key === key)
  if (!fileMeta) return c.json({ error: 'File not found' }, 404)

  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)

  // 外链模式
  if (fileMeta.isExternal && fileMeta.externalUrl) {
    return c.redirect(fileMeta.externalUrl)
  }

  // 本地存储模式：代理到本地文件服务器
  if (fileMeta.storageType === 'local' && settings.localServerUrl) {
    const serverUrl = settings.localServerUrl.replace(/\/$/, '')
    const storagePath = (settings.localStoragePath || '/data/portal/files').replace(/\/$/, '')
    const fileUrl = `${serverUrl}${storagePath}/${fileMeta.storedName || key}`
    try {
      const resp = await fetch(fileUrl)
      if (!resp.ok) return c.json({ error: 'File not found on local server' }, 404)
      const headers = new Headers()
      headers.set('Content-Type', fileMeta.type || 'application/octet-stream')
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName || key)}"`)
      return new Response(resp.body, { headers })
    } catch (e) {
      return c.json({ error: 'Local server unreachable' }, 502)
    }
  }

  // KV 存储模式
  const b64 = await c.env.KV.get(`file:${key}`)
  if (!b64) return c.json({ error: 'File data not found' }, 404)

  const binary = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))
  const headers = new Headers()
  headers.set('Content-Type', fileMeta.type || 'application/octet-stream')
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName || key)}"`)
  headers.set('Content-Length', String(binary.length))
  return new Response(binary, { headers })
})

// ==================== 后台认证 ====================
async function checkAuth(c: any): Promise<boolean> {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/portal_session=([^;]+)/)
  if (!match) return false
  const stored = await c.env.KV.get('session:' + match[1])
  return !!stored
}

// ==================== 后台登录 ====================
app.get('/admin/login', (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  return c.render(adminPage('login', { lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
})

app.post('/admin/login', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const body = await c.req.parseBody()
  const password = body.password as string
  let storedPw = await c.env.KV.get('admin_password')
  if (!storedPw) {
    await c.env.KV.put('admin_password', 'admin123')
    storedPw = 'admin123'
  }
  if (password !== storedPw) {
    return c.render(adminPage('login', { error: t('adminLogin', 'wrongPw', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }
  const sessionId = crypto.randomUUID()
  await c.env.KV.put('session:' + sessionId, '1', { expirationTtl: 86400 })
  return new Response(null, {
    status: 302,
    headers: { 'Location': '/admin', 'Set-Cookie': `portal_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400` }
  })
})

app.get('/admin/logout', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/portal_session=([^;]+)/)
  if (match) await c.env.KV.delete('session:' + match[1])
  return new Response(null, {
    status: 302,
    headers: { 'Location': '/admin/login', 'Set-Cookie': 'portal_session=; Path=/; Max-Age=0' }
  })
})

// ==================== 后台面板 ====================
app.get('/admin', async (c) => {
  if (!await checkAuth(c)) return c.redirect('/admin/login')
  const lang = parseLang(c.req.header('Cookie'))
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  return c.render(adminPage('dashboard', { profile, websites, repos, files, settings, lang }), { title: lang === 'zh' ? '管理面板' : 'Admin Panel', lang })
})

// ==================== 后台 API ====================
app.post('/admin/api/profile', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await c.env.KV.put('profile', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/websites', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await c.env.KV.put('websites', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/repos', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await c.env.KV.put('repos', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/upload', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const displayName = (formData.get('displayName') as string) || file.name
  if (!file) return c.json({ error: 'No file' }, 400)

  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  const key = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

  if (settings.storageMode === 'local' && settings.localServerUrl) {
    // 本地存储模式：转发到本地文件服务器
    const serverUrl = settings.localServerUrl.replace(/\/$/, '')
    const storagePath = (settings.localStoragePath || '/data/portal/files').replace(/\/$/, '')
    const uploadUrl = `${serverUrl}/upload`
    try {
      const proxyForm = new FormData()
      proxyForm.append('file', file)
      proxyForm.append('path', storagePath)
      proxyForm.append('filename', key)
      const resp = await fetch(uploadUrl, { method: 'POST', body: proxyForm })
      if (!resp.ok) {
        const errText = await resp.text().catch(() => 'Upload failed')
        return c.json({ error: `Local server error: ${errText}` }, 502)
      }
    } catch (e) {
      return c.json({ error: 'Local server unreachable' }, 502)
    }

    // 文件元数据仍存 KV
    const files: any[] = await getData(c.env.KV, 'files', [])
    files.push({
      key,
      displayName,
      originalName: file.name,
      storedName: key,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      storageType: 'local',
    })
    await c.env.KV.put('files', JSON.stringify(files))
    return c.json({ ok: true, key })
  }

  // KV 存储模式
  const maxBytes = (settings.maxFileSize || 25) * 1024 * 1024
  if (file.size > maxBytes) {
    return c.json({ error: `File too large. Max ${settings.maxFileSize}MB` }, 400)
  }

  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  await c.env.KV.put(`file:${key}`, b64)

  const files: any[] = await getData(c.env.KV, 'files', [])
  files.push({
    key,
    displayName,
    originalName: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    storageType: 'kv',
  })
  await c.env.KV.put('files', JSON.stringify(files))
  return c.json({ ok: true, key })
})

app.post('/admin/api/add-link', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { displayName, originalName, externalUrl, size, type } = await c.req.json()
  if (!displayName || !externalUrl) return c.json({ error: 'Missing fields' }, 400)

  const key = Date.now() + '-link-' + (originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
  const files: any[] = await getData(c.env.KV, 'files', [])
  files.push({
    key,
    displayName,
    originalName: originalName || displayName,
    externalUrl,
    size: size || 0,
    type: type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    isExternal: true,
  })
  await c.env.KV.put('files', JSON.stringify(files))
  return c.json({ ok: true, key })
})

app.post('/admin/api/delete-file', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { key } = await c.req.json()
  await c.env.KV.delete(`file:${key}`)
  const files: any[] = await getData(c.env.KV, 'files', [])
  const newFiles = files.filter((f: any) => f.key !== key)
  await c.env.KV.put('files', JSON.stringify(newFiles))
  return c.json({ ok: true })
})

app.post('/admin/api/settings', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await c.env.KV.put('settings', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/password', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const lang = parseLang(c.req.header('Cookie'))
  const { oldPassword, newPassword } = await c.req.json()
  const stored = await c.env.KV.get('admin_password') || 'admin123'
  if (oldPassword !== stored) return c.json({ error: lang === 'zh' ? '旧密码错误' : 'Incorrect old password' }, 400)
  await c.env.KV.put('admin_password', newPassword)
  return c.json({ ok: true })
})

export default app
