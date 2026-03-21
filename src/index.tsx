import { Hono } from 'hono'
import { renderer } from './renderer'
import { adminPage } from './admin'
import { homePage } from './home'

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
  storageMode: 'kv', // kv | external
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

// ==================== 前台首页 ====================
app.get('/', async (c) => {
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  return c.render(homePage(profile, websites, repos, files), { title: `${profile.name} — Portal` })
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
app.get('/api/download/:key', async (c) => {
  const key = c.req.param('key')
  const files: any[] = await getData(c.env.KV, 'files', [])
  const fileMeta = files.find((f: any) => f.key === key)
  if (!fileMeta) return c.json({ error: 'File not found' }, 404)

  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)

  if (settings.storageMode === 'external' && fileMeta.externalUrl) {
    // 外链模式直接 302 跳转
    return c.redirect(fileMeta.externalUrl)
  }

  // KV 存储模式：从 KV 取 base64 数据
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
  return c.render(adminPage('login', {}), { title: 'Admin Login' })
})

app.post('/admin/login', async (c) => {
  const body = await c.req.parseBody()
  const password = body.password as string
  let storedPw = await c.env.KV.get('admin_password')
  if (!storedPw) {
    await c.env.KV.put('admin_password', 'admin123')
    storedPw = 'admin123'
  }
  if (password !== storedPw) {
    return c.render(adminPage('login', { error: '密码错误' }), { title: 'Admin Login' })
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
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  return c.render(adminPage('dashboard', { profile, websites, repos, files, settings }), { title: 'Admin Panel' })
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

// 上传文件 — KV 存 base64
app.post('/admin/api/upload', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const displayName = (formData.get('displayName') as string) || file.name
  if (!file) return c.json({ error: 'No file' }, 400)

  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)
  const maxBytes = (settings.maxFileSize || 25) * 1024 * 1024
  if (file.size > maxBytes) {
    return c.json({ error: `File too large. Max ${settings.maxFileSize}MB` }, 400)
  }

  const key = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

  // 读取文件为 base64 存入 KV
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const b64 = btoa(binary)
  await c.env.KV.put(`file:${key}`, b64)

  // 更新文件列表
  const files: any[] = await getData(c.env.KV, 'files', [])
  files.push({
    key,
    displayName,
    originalName: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  })
  await c.env.KV.put('files', JSON.stringify(files))
  return c.json({ ok: true, key })
})

// 添加外链文件（外部存储模式）
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

// 删除文件
app.post('/admin/api/delete-file', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { key } = await c.req.json()
  // 尝试删除 KV 中的文件数据
  await c.env.KV.delete(`file:${key}`)
  const files: any[] = await getData(c.env.KV, 'files', [])
  const newFiles = files.filter((f: any) => f.key !== key)
  await c.env.KV.put('files', JSON.stringify(newFiles))
  return c.json({ ok: true })
})

// 保存设置
app.post('/admin/api/settings', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await c.env.KV.put('settings', JSON.stringify(data))
  return c.json({ ok: true })
})

// 修改密码
app.post('/admin/api/password', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { oldPassword, newPassword } = await c.req.json()
  const stored = await c.env.KV.get('admin_password') || 'admin123'
  if (oldPassword !== stored) return c.json({ error: '旧密码错误' }, 400)
  await c.env.KV.put('admin_password', newPassword)
  return c.json({ ok: true })
})

export default app
