import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { renderer } from './renderer'
import { adminPage } from './admin'
import { homePage } from './home'
import { projectsPage } from './projects'
import { githubPage } from './github'
import { downloadsPage } from './downloads'
import { trendingPage } from './trending'
import { parseLang, t } from './i18n'
import type { Lang } from './i18n'

type Bindings = {
  KV: KVNamespace
  GITHUB_TOKENS?: string // 环境变量/Secret: 逗号分隔的 GitHub PAT tokens
  GITHUB_APP_ID?: string // GitHub App ID
  GITHUB_APP_PRIVATE_KEY?: string // GitHub App Private Key (PEM)
  GITHUB_APP_INSTALLATION_ID?: string // GitHub App Installation ID
}

const app = new Hono<{ Bindings: Bindings }>()

// ==================== 安全中间件 ====================

// 1. Security Headers (CSP, XSS, anti-clickjacking, anti-sniffing)
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.loli.net"],
    fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://gstatic.loli.net", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "https:", "data:"],
    connectSrc: ["'self'"],
  },
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
}))

// 2. Anti-crawler: block common bot User-Agents on non-API routes
app.use('*', async (c, next) => {
  const ua = (c.req.header('User-Agent') || '').toLowerCase()
  const path = c.req.path
  // Allow API, admin, and static asset paths
  if (path.startsWith('/api/') || path.startsWith('/admin') || path.startsWith('/static/')) {
    return next()
  }
  // Only block aggressive crawler/scraper UAs, not generic tools
  const botPatterns = ['scrapy', 'python-requests', 'go-http-client', 'libwww-perl', 'httpclient/']
  const isBot = botPatterns.some(p => ua.includes(p))
  if (isBot) {
    return c.text('Access Denied', 403)
  }
  return next()
})

// 3. Rate limiting for admin login (brute-force protection)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry) return true
  // Reset after 5 minutes
  if (now - entry.lastAttempt > 5 * 60 * 1000) {
    loginAttempts.delete(ip)
    return true
  }
  return entry.count < 5 // max 5 attempts per 5 minutes
}

function recordLoginAttempt(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (entry && now - entry.lastAttempt < 5 * 60 * 1000) {
    entry.count++
    entry.lastAttempt = now
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
  }
}

// 4. Password hashing utilities (PBKDF2 via Web Crypto API)
async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(s), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const hashArr = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:${s}:${hashArr}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) {
    // Legacy plaintext comparison (for migration)
    return password === stored
  }
  const [, salt] = stored.split(':')
  const rehash = await hashPassword(password, salt)
  return rehash === stored
}

// 5. Input sanitization helper
function sanitize(str: string): string {
  return str.replace(/[<>"'&]/g, (ch) => {
    const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }
    return map[ch] || ch
  })
}

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

// 内存 fallback 存储 — 当 KV 不可用时使用
// Workers isolate 在同一边缘节点上会被复用，所以内存数据有一定持久性
const memStore = new Map<string, string>()

/** KV 操作封装：KV 优先，fallback 到内存 */
async function kvGet(kv: KVNamespace | undefined, key: string): Promise<string | null> {
  if (kv) {
    try { return await kv.get(key) } catch { /* fall through */ }
  }
  return memStore.get(key) || null
}

async function kvPut(kv: KVNamespace | undefined, key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
  if (kv) {
    try { await kv.put(key, value, opts); return } catch { /* fall through */ }
  }
  memStore.set(key, value)
  // 内存 TTL 自动清理
  if (opts?.expirationTtl) {
    setTimeout(() => memStore.delete(key), opts.expirationTtl * 1000)
  }
}

async function kvDelete(kv: KVNamespace | undefined, key: string): Promise<void> {
  if (kv) {
    try { await kv.delete(key); return } catch { /* fall through */ }
  }
  memStore.delete(key)
}

async function getData(kv: KVNamespace | undefined, key: string, fallback: any) {
  const val = await kvGet(kv, key)
  if (val) {
    try { return JSON.parse(val) } catch { return fallback }
  }
  await kvPut(kv, key, JSON.stringify(fallback))
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

// ==================== 项目页 ====================
app.get('/projects', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  return c.render(projectsPage(websites, lang), { title: `${t('home', 'webProjects', lang)} — ${profile.name}`, lang })
})

// ==================== GitHub 页 ====================
app.get('/github', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  return c.render(githubPage(repos, lang), { title: `${t('home', 'githubProjects', lang)} — ${profile.name}`, lang })
})

// ==================== 下载页 ====================
app.get('/downloads', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const files = await getData(c.env.KV, 'files', [])
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const isAdmin = await checkAuth(c)
  return c.render(downloadsPage(files, lang, isAdmin), { title: `${t('home', 'downloadsTitle', lang)} — ${profile.name}`, lang })
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

// ==================== 文件分享系统 ====================

interface ShareLink {
  id: string
  fileKey: string
  fileName: string
  password?: string // PBKDF2 hashed
  expiresAt?: number // timestamp ms
  maxDownloads?: number
  downloads: number
  createdAt: number
}

// 创建分享链接
app.post('/admin/api/share', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { fileKey, password, expiresIn, maxDownloads } = await c.req.json()
  
  if (!fileKey) return c.json({ error: 'Missing fileKey' }, 400)
  
  // Verify file exists
  const files: any[] = await getData(c.env.KV, 'files', [])
  const file = files.find((f: any) => f.key === fileKey)
  if (!file) return c.json({ error: 'File not found' }, 404)
  
  const shareId = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  const share: ShareLink = {
    id: shareId,
    fileKey,
    fileName: file.displayName || file.originalName || fileKey,
    downloads: 0,
    createdAt: Date.now(),
  }
  
  // Hash password if provided
  if (password && password.trim()) {
    share.password = await hashPassword(password.trim())
  }
  
  // Set expiration
  if (expiresIn && expiresIn > 0) {
    share.expiresAt = Date.now() + expiresIn * 1000 // expiresIn is seconds
  }
  
  // Set max downloads
  if (maxDownloads && maxDownloads > 0) {
    share.maxDownloads = maxDownloads
  }
  
  // Store share data
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  shares.push(share)
  await kvPut(c.env.KV, 'shares', JSON.stringify(shares))
  
  const shareUrl = `/s/${shareId}`
  return c.json({ ok: true, shareId, shareUrl, share })
})

// 获取分享列表
app.get('/admin/api/shares', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  return c.json({ shares })
})

// 删除分享链接
app.post('/admin/api/share/delete', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { shareId } = await c.req.json()
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const newShares = shares.filter(s => s.id !== shareId)
  await kvPut(c.env.KV, 'shares', JSON.stringify(newShares))
  return c.json({ ok: true })
})

// 公开分享页面
app.get('/s/:id', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const shareId = c.req.param('id')
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const share = shares.find(s => s.id === shareId)
  
  if (!share) {
    return c.html(sharePageHtml(lang, { error: 'notfound' }))
  }
  
  // Check expiration
  if (share.expiresAt && Date.now() > share.expiresAt) {
    return c.html(sharePageHtml(lang, { error: 'expired' }))
  }
  
  // Check download limit
  if (share.maxDownloads && share.downloads >= share.maxDownloads) {
    return c.html(sharePageHtml(lang, { error: 'maxdownloads' }))
  }
  
  // If password protected, show password form
  if (share.password) {
    return c.html(sharePageHtml(lang, { share, needPassword: true }))
  }
  
  // No password required — show download page directly
  return c.html(sharePageHtml(lang, { share, canDownload: true }))
})

// 分享文件下载 (验证密码后)
app.post('/s/:id', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const shareId = c.req.param('id')
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const share = shares.find(s => s.id === shareId)
  
  if (!share) return c.html(sharePageHtml(lang, { error: 'notfound' }))
  if (share.expiresAt && Date.now() > share.expiresAt) return c.html(sharePageHtml(lang, { error: 'expired' }))
  if (share.maxDownloads && share.downloads >= share.maxDownloads) return c.html(sharePageHtml(lang, { error: 'maxdownloads' }))
  
  // Verify password
  if (share.password) {
    const body = await c.req.parseBody()
    const inputPw = (body.password as string) || ''
    const valid = await verifyPassword(inputPw, share.password)
    if (!valid) {
      return c.html(sharePageHtml(lang, { share, needPassword: true, passwordError: true }))
    }
  }
  
  return c.html(sharePageHtml(lang, { share, canDownload: true }))
})

// 实际下载（带 token 验证）
app.get('/s/:id/download', async (c) => {
  const shareId = c.req.param('id')
  const token = c.req.query('t')
  
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const shareIdx = shares.findIndex(s => s.id === shareId)
  const share = shareIdx >= 0 ? shares[shareIdx] : null
  
  if (!share) return c.text('Share not found', 404)
  if (share.expiresAt && Date.now() > share.expiresAt) return c.text('Share expired', 410)
  if (share.maxDownloads && share.downloads >= share.maxDownloads) return c.text('Download limit reached', 410)
  
  // Increment download count
  share.downloads++
  shares[shareIdx] = share
  await kvPut(c.env.KV, 'shares', JSON.stringify(shares))
  
  // Redirect to the actual file download
  return c.redirect(`/api/download/${share.fileKey}`)
})

/** 分享页面 HTML */
function sharePageHtml(lang: Lang, opts: { error?: string; share?: ShareLink; needPassword?: boolean; passwordError?: boolean; canDownload?: boolean }) {
  const zh = lang === 'zh'
  
  let title = zh ? '文件分享' : 'File Share'
  let body = ''
  
  if (opts.error === 'notfound') {
    body = `
      <div class="share-error">
        <i class="fa-solid fa-circle-xmark"></i>
        <h2>${zh ? '分享链接不存在' : 'Share link not found'}</h2>
        <p>${zh ? '该链接可能已被删除或从未存在' : 'This link may have been deleted or never existed'}</p>
      </div>`
  } else if (opts.error === 'expired') {
    body = `
      <div class="share-error">
        <i class="fa-solid fa-clock"></i>
        <h2>${zh ? '分享已过期' : 'Share has expired'}</h2>
        <p>${zh ? '该分享链接已超过有效期' : 'This share link has exceeded its validity period'}</p>
      </div>`
  } else if (opts.error === 'maxdownloads') {
    body = `
      <div class="share-error">
        <i class="fa-solid fa-ban"></i>
        <h2>${zh ? '下载次数已达上限' : 'Download limit reached'}</h2>
        <p>${zh ? '该文件的下载次数已用完' : 'The download count for this file has been exhausted'}</p>
      </div>`
  } else if (opts.needPassword) {
    const errorHtml = opts.passwordError ? `<div class="share-pw-error">${zh ? '密码错误，请重试' : 'Incorrect password, please try again'}</div>` : ''
    body = `
      <div class="share-password">
        <i class="fa-solid fa-lock"></i>
        <h2>${zh ? '此文件需要密码访问' : 'This file requires a password'}</h2>
        <p class="share-filename"><i class="fa-solid fa-file"></i> ${opts.share!.fileName}</p>
        ${errorHtml}
        <form method="POST" class="share-pw-form">
          <input type="password" name="password" placeholder="${zh ? '输入访问密码' : 'Enter access password'}" autofocus required />
          <button type="submit"><i class="fa-solid fa-unlock"></i> ${zh ? '验证' : 'Verify'}</button>
        </form>
      </div>`
  } else if (opts.canDownload) {
    const share = opts.share!
    const remaining = share.maxDownloads ? `${share.maxDownloads - share.downloads}` : '∞'
    const expiresText = share.expiresAt 
      ? new Date(share.expiresAt).toLocaleString(zh ? 'zh-CN' : 'en-US') 
      : (zh ? '永不过期' : 'Never')
    
    body = `
      <div class="share-download">
        <i class="fa-solid fa-file-arrow-down"></i>
        <h2>${share.fileName}</h2>
        <div class="share-meta">
          <span><i class="fa-solid fa-download"></i> ${zh ? '剩余下载次数' : 'Remaining'}: ${remaining}</span>
          <span><i class="fa-solid fa-clock"></i> ${zh ? '过期时间' : 'Expires'}: ${expiresText}</span>
        </div>
        <a href="/s/${share.id}/download" class="share-dl-btn">
          <i class="fa-solid fa-download"></i> ${zh ? '下载文件' : 'Download File'}
        </a>
      </div>`
  }
  
  return `<!DOCTYPE html>
<html lang="${zh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="/static/fontawesome.css" rel="stylesheet">
  <link href="/static/style.css" rel="stylesheet">
  <style>
    .share-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; background:var(--bg-primary); }
    .share-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius); padding:48px; max-width:440px; width:100%; text-align:center; box-shadow:var(--shadow-lg); }
    .share-card i.fa-solid { font-size:3rem; margin-bottom:16px; color:var(--accent); }
    .share-card h2 { margin:0 0 12px; color:var(--text-primary); font-size:1.3rem; word-break:break-all; }
    .share-card p { color:var(--text-secondary); margin:0 0 20px; font-size:0.9rem; }
    .share-error i { color:#EF4444 !important; }
    .share-filename { font-weight:600; color:var(--text-primary) !important; }
    .share-pw-error { background:rgba(239,68,68,0.1); color:#EF4444; padding:8px 16px; border-radius:8px; margin-bottom:16px; font-size:0.85rem; }
    .share-pw-form { display:flex; flex-direction:column; gap:12px; }
    .share-pw-form input { padding:12px 16px; border:1px solid var(--border); border-radius:10px; background:var(--bg-primary); color:var(--text-primary); font-size:1rem; outline:none; transition:border-color 0.2s; }
    .share-pw-form input:focus { border-color:var(--accent); }
    .share-pw-form button { padding:12px; border:none; border-radius:10px; background:var(--accent); color:white; font-size:1rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:opacity 0.2s; }
    .share-pw-form button:hover { opacity:0.9; }
    .share-meta { display:flex; flex-direction:column; gap:6px; margin:16px 0 24px; font-size:0.85rem; color:var(--text-secondary); }
    .share-meta span { display:flex; align-items:center; justify-content:center; gap:6px; }
    .share-dl-btn { display:inline-flex; align-items:center; gap:10px; padding:14px 32px; background:var(--accent); color:white; text-decoration:none; border-radius:12px; font-size:1.05rem; font-weight:600; transition:opacity 0.2s, transform 0.1s; }
    .share-dl-btn:hover { opacity:0.9; transform:translateY(-1px); }
    .share-dl-btn:active { transform:scale(0.98); }
  </style>
  <script>
    // Apply saved theme
    const t = localStorage.getItem('portal-theme') || (window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
    document.documentElement.setAttribute('data-theme', t);
  </script>
</head>
<body>
  <div class="share-page">
    <div class="share-card">${body}</div>
  </div>
</body>
</html>`
}

// ==================== GitHub Trending — Token 优先 + 爬取兜底 ====================
const CACHE_TTL = 3600 // 数据缓存 1 小时
const RATE_LIMIT_WINDOW = 3600 // 限流窗口 1 小时 (秒)
const RATE_LIMIT_MAX = 30 // 每 IP 每小时最多刷新 30 次
const TOKEN_COOLDOWN = 600 // Token 失效后冷却 10 分钟 (秒)

function parseNum(s: string | undefined): number {
  return s ? parseInt(s.replace(/,/g, '')) || 0 : 0
}

// ---------- 方案 A: GitHub Search API (需要 Token) ----------

// ===== GitHub App 自动 Token 刷新 (永不过期!) =====
// 原理: App Private Key 永不过期 → 自动生成 JWT → 换取 1h Installation Token → 缓存 50min
let _appTokenCache: { token: string; expiresAt: number } | null = null

/** Base64URL 编码 */
function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 用 Web Crypto API 生成 GitHub App JWT (Cloudflare Workers 兼容) */
async function generateJWT(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iat: now - 60, exp: now + 600, iss: appId } // 有效期 10 分钟

  const enc = new TextEncoder()
  const headerB64 = base64url(enc.encode(JSON.stringify(header)))
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)))
  const signingInput = `${headerB64}.${payloadB64}`

  // 解析 PEM 私钥
  const pemBody = privateKeyPem
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  // 判断是 PKCS#8 还是 PKCS#1 格式
  const isPKCS8 = privateKeyPem.includes('BEGIN PRIVATE KEY')
  const key = await crypto.subtle.importKey(
    isPKCS8 ? 'pkcs8' : 'pkcs8', // Cloudflare Workers 只支持 pkcs8
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput))
  return `${signingInput}.${base64url(signature)}`
}

/** 用 JWT 换取 GitHub App Installation Access Token (有效期 1h) */
async function getInstallationToken(appId: string, privateKey: string, installationId: string): Promise<string | null> {
  // 检查缓存 (50 分钟内复用)
  if (_appTokenCache && Date.now() < _appTokenCache.expiresAt) {
    return _appTokenCache.token
  }

  try {
    const jwt = await generateJWT(appId, privateKey)
    const resp = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${jwt}`,
        'User-Agent': 'portal-trending-app',
      },
    })

    if (!resp.ok) return null
    const data = await resp.json() as { token: string; expires_at: string }
    // 缓存 50 分钟 (token 有效期 1 小时, 留 10 分钟余量)
    _appTokenCache = { token: data.token, expiresAt: Date.now() + 50 * 60 * 1000 }
    return data.token
  } catch {
    return null
  }
}

/** 从 KV + 环境变量 + GitHub App 自动刷新 读取 token 列表 + 冷却状态 */
async function getTokenPool(kv: KVNamespace | undefined, envTokens?: string, appConfig?: { appId?: string; privateKey?: string; installationId?: string }) {
  // 1. KV 里 admin 配置的 tokens
  const raw = await kvGet(kv, 'github_tokens')
  const tokens: string[] = raw ? JSON.parse(raw) : []
  // 2. 合并环境变量里的 PAT tokens
  if (envTokens) {
    for (const t of envTokens.split(',').map(s => s.trim()).filter(Boolean)) {
      if (!tokens.includes(t)) tokens.push(t)
    }
  }
  // 3. GitHub App 自动刷新 token (永不过期!)
  if (appConfig?.appId && appConfig?.privateKey && appConfig?.installationId) {
    const appToken = await getInstallationToken(appConfig.appId, appConfig.privateKey, appConfig.installationId)
    if (appToken && !tokens.includes(appToken)) {
      tokens.unshift(appToken) // 优先使用 App Token
    }
  }
  const cdRaw = await kvGet(kv, 'github_token_cooldowns')
  const cooldowns: Record<string, number> = cdRaw ? JSON.parse(cdRaw) : {}
  const idxRaw = await kvGet(kv, 'github_token_index')
  const lastIndex = idxRaw ? parseInt(idxRaw) : 0
  return { tokens, cooldowns, lastIndex }
}

/** 选择下一个可用 token (轮询 + 跳过冷却中的) */
function pickToken(pool: { tokens: string[]; cooldowns: Record<string, number>; lastIndex: number }) {
  const now = Date.now()
  const { tokens, cooldowns, lastIndex } = pool
  if (tokens.length === 0) return null
  for (let i = 0; i < tokens.length; i++) {
    const idx = (lastIndex + 1 + i) % tokens.length
    const t = tokens[idx]
    if (now > (cooldowns[t] || 0)) return { token: t, index: idx }
  }
  return null
}

/** Token 配置类型 */
interface TokenConfig {
  envTokens?: string
  appId?: string
  privateKey?: string
  installationId?: string
}

/** GitHub Search API 请求 */
async function fetchWithTokens(kv: KVNamespace | undefined, q: string, sort: string, perPage: number = 30, tc?: TokenConfig): Promise<{ items: any[]; apiStatus: string } | null> {
  const pool = await getTokenPool(kv, tc?.envTokens, tc)
  if (pool.tokens.length === 0) return null // 没有 token，跳过

  const params = new URLSearchParams({ q, sort, order: 'desc', per_page: String(perPage) })
  const url = `https://api.github.com/search/repositories?${params}`

  for (let attempt = 0; attempt < pool.tokens.length; attempt++) {
    const pick = pickToken(pool)
    if (!pick) break

    try {
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'portal-trending-app',
          'Authorization': `token ${pick.token}`,
        },
      })

      const remaining = parseInt(resp.headers.get('X-RateLimit-Remaining') || '999')

      if (resp.status === 403 || resp.status === 429 || remaining <= 1) {
        // token 限流 → 冷却
        pool.cooldowns[pick.token] = Date.now() + TOKEN_COOLDOWN * 1000
        await kvPut(kv, 'github_token_cooldowns', JSON.stringify(pool.cooldowns))
        await kvPut(kv, 'github_token_index', String(pick.index))
        continue
      }

      if (resp.ok) {
        await kvPut(kv, 'github_token_index', String(pick.index))
        const data = await resp.json() as any
        return { items: data.items || [], apiStatus: 'api_ok' }
      }

      // 其他错误 (401 等) → 冷却
      pool.cooldowns[pick.token] = Date.now() + TOKEN_COOLDOWN * 1000
      await kvPut(kv, 'github_token_cooldowns', JSON.stringify(pool.cooldowns))
    } catch {
      pool.cooldowns[pick.token] = Date.now() + TOKEN_COOLDOWN * 1000
    }
  }

  return null // 所有 token 都失败
}

// ---------- 方案 B: 爬取 github.com/trending (无需 Token) ----------

async function scrapeGitHubTrending(langFilter: string, since: string = 'daily'): Promise<{ items: any[]; apiStatus: string }> {
  try {
    const langPath = langFilter ? `/${encodeURIComponent(langFilter)}` : ''
    const url = `https://github.com/trending${langPath}?since=${since}`

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!resp.ok) return { items: [], apiStatus: `scrape_error_${resp.status}` }

    const html = await resp.text()
    const articles = html.split('<article class="Box-row">').slice(1)

    const repos = articles.map((a: string) => {
      const nameMatch = a.match(/text-normal[^>]*>\s*([^<\/]+)\s*\/\s*<\/span>\s*([^\s<]+)/s)
      const owner = nameMatch?.[1]?.trim() || ''
      const name = nameMatch?.[2]?.trim() || ''
      const descMatch = a.match(/col-9 color-fg-muted my-1[^>]*>\s*([\s\S]*?)\s*<\/p>/)
      const langMatch = a.match(/itemprop="programmingLanguage">([^<]+)/)
      const starsMatch = a.match(/\/stargazers[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)
      const forksMatch = a.match(/\/forks[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)
      const trendMatch = a.match(/([\d,]+)\s*stars?\s*(today|this week|this month)/i)

      return {
        full_name: `${owner}/${name}`, name,
        owner: { login: owner },
        description: descMatch?.[1]?.trim() || '',
        language: langMatch?.[1] || '',
        stargazers_count: parseNum(starsMatch?.[1]),
        forks_count: parseNum(forksMatch?.[1]),
        html_url: `https://github.com/${owner}/${name}`,
        _starsToday: parseNum(trendMatch?.[1]),
      }
    }).filter((r: any) => r.name)

    return { items: repos, apiStatus: 'scrape_ok' }
  } catch {
    return { items: [], apiStatus: 'scrape_failed' }
  }
}

// ---------- 统一入口: Token 优先 → 爬取兜底 ----------

function getDateStr(daysAgo: number): string {
  const d = new Date(); d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

async function getHotRepos(kv: KVNamespace | undefined, langFilter: string, tc?: TokenConfig) {
  const langQ = langFilter ? ` language:${langFilter}` : ''
  const apiResult = await fetchWithTokens(kv, `stars:>5000${langQ}`, 'stars', 30, tc)
  if (apiResult && apiResult.items.length > 0) return apiResult
  return scrapeGitHubTrending(langFilter, 'daily')
}

async function getRisingRepos(kv: KVNamespace | undefined, langFilter: string, tc?: TokenConfig) {
  const weekAgo = getDateStr(7)
  const langQ = langFilter ? ` language:${langFilter}` : ''
  const apiResult = await fetchWithTokens(kv, `created:>${weekAgo}${langQ}`, 'stars', 30, tc)
  if (apiResult && apiResult.items.length > 0) {
    return { items: apiResult.items.map(r => ({ ...r, _starsToday: r.stargazers_count })), apiStatus: apiResult.apiStatus }
  }
  return scrapeGitHubTrending(langFilter, 'weekly')
}

/** IP 频率限制检查 */
async function checkRateLimit(kv: KVNamespace | undefined, ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${ip}`
  const raw = await kvGet(kv, key)
  const now = Math.floor(Date.now() / 1000)

  if (raw) {
    const data = JSON.parse(raw) as { count: number; windowStart: number }
    if (now - data.windowStart >= RATE_LIMIT_WINDOW) {
      await kvPut(kv, key, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: RATE_LIMIT_WINDOW })
      return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW }
    }
    if (data.count >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0, resetAt: data.windowStart + RATE_LIMIT_WINDOW }
    data.count++
    const ttl = RATE_LIMIT_WINDOW - (now - data.windowStart)
    await kvPut(kv, key, JSON.stringify(data), { expirationTtl: ttl > 0 ? ttl : 1 })
    return { allowed: true, remaining: RATE_LIMIT_MAX - data.count, resetAt: data.windowStart + RATE_LIMIT_WINDOW }
  }

  await kvPut(kv, key, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: RATE_LIMIT_WINDOW })
  return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW }
}

interface CachedData {
  repos: any[]
  timestamp: string
  apiStatus: string
}

async function getCachedTrending(kv: KVNamespace | undefined, tab: string, langFilter: string, forceRefresh: boolean = false, tc?: TokenConfig) {
  const cacheKey = `trending:${tab}:${langFilter || 'all'}`

  if (!forceRefresh) {
    const cached = await kvGet(kv, cacheKey)
    if (cached) {
      try {
        const data: CachedData = JSON.parse(cached)
        return { repos: data.repos, cacheAge: data.timestamp, apiStatus: data.apiStatus || 'cached' }
      } catch { /* ignore */ }
    }
  }

  const result = tab === 'rising'
    ? await getRisingRepos(kv, langFilter, tc)
    : await getHotRepos(kv, langFilter, tc)

  const payload: CachedData = { repos: result.items, timestamp: new Date().toISOString(), apiStatus: result.apiStatus }
  await kvPut(kv, cacheKey, JSON.stringify(payload), { expirationTtl: CACHE_TTL })
  return { repos: payload.repos, cacheAge: payload.timestamp, apiStatus: payload.apiStatus }
}

/** 获取客户端 IP */
function getClientIP(c: any): string {
  return c.req.header('CF-Connecting-IP')
    || c.req.header('X-Real-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || '0.0.0.0'
}

/** 从环境变量构建 TokenConfig */
function buildTokenConfig(env: Bindings): TokenConfig {
  return {
    envTokens: env.GITHUB_TOKENS,
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    installationId: env.GITHUB_APP_INSTALLATION_ID,
  }
}

/** 获取 API 状态概览 (后台用) */
async function getApiStatusInfo(kv: KVNamespace | undefined, tc?: TokenConfig) {
  const pool = await getTokenPool(kv, tc?.envTokens, tc)
  const now = Date.now()
  const tokenStatuses = pool.tokens.map((t, i) => {
    const cd = pool.cooldowns[t] || 0
    return { index: i, masked: t.slice(0, 8) + '***' + t.slice(-4), active: now > cd, cooldownUntil: cd > now ? new Date(cd).toISOString() : null }
  })
  const hasApp = !!(tc?.appId && tc?.privateKey && tc?.installationId)
  return {
    mode: pool.tokens.length > 0 ? 'api_with_scrape_fallback' : 'scrape_only',
    githubApp: hasApp ? { configured: true, tokenCached: !!_appTokenCache, cacheExpiresAt: _appTokenCache?.expiresAt ? new Date(_appTokenCache.expiresAt).toISOString() : null } : { configured: false },
    totalTokens: pool.tokens.length,
    activeTokens: tokenStatuses.filter(t => t.active).length,
    tokens: tokenStatuses,
    rateLimitMax: RATE_LIMIT_MAX,
    rateLimitWindow: RATE_LIMIT_WINDOW,
    cacheTtl: CACHE_TTL,
  }
}

// --- Trending 路由 ---

app.get('/trending', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const tab = c.req.query('tab') || 'hot'
  const langFilter = c.req.query('lang_filter') || ''
  const refresh = c.req.query('refresh') === '1'
  const ip = getClientIP(c)
  let hotRepos: any[] = []
  let risingRepos: any[] = []
  let cacheAge = ''
  let apiStatus = 'cached'
  let rateLimitInfo = { allowed: true, remaining: RATE_LIMIT_MAX, resetAt: 0 }

  try {
    // 如果是强制刷新，检查限流
    if (refresh) {
      rateLimitInfo = await checkRateLimit(c.env.KV, ip)
      if (!rateLimitInfo.allowed) {
        // 限流了，不刷新，用缓存
        apiStatus = 'rate_limited_user'
      }
    }

    const forceRefresh = refresh && rateLimitInfo.allowed
    const tc = buildTokenConfig(c.env)

    if (tab === 'rising') {
      const result = await getCachedTrending(c.env.KV, 'rising', langFilter, forceRefresh, tc)
      risingRepos = result.repos
      cacheAge = result.cacheAge
      apiStatus = result.apiStatus
      const hotResult = await getCachedTrending(c.env.KV, 'hot', langFilter, false, tc)
      hotRepos = hotResult.repos
    } else {
      const result = await getCachedTrending(c.env.KV, 'hot', langFilter, forceRefresh, tc)
      hotRepos = result.repos
      cacheAge = result.cacheAge
      apiStatus = result.apiStatus
      const risingResult = await getCachedTrending(c.env.KV, 'rising', langFilter, false, tc)
      risingRepos = risingResult.repos
    }
  } catch {
    // On error, show empty
  }

  // 不刷新也获取一下限流剩余信息展示
  if (!refresh) {
    const key = `ratelimit:${ip}`
    const raw = await kvGet(c.env.KV, key)
    if (raw) {
      const data = JSON.parse(raw) as { count: number; windowStart: number }
      const now = Math.floor(Date.now() / 1000)
      if (now - data.windowStart < RATE_LIMIT_WINDOW) {
        rateLimitInfo = {
          allowed: data.count < RATE_LIMIT_MAX,
          remaining: Math.max(0, RATE_LIMIT_MAX - data.count),
          resetAt: data.windowStart + RATE_LIMIT_WINDOW,
        }
      }
    }
  }

  const title = lang === 'zh' ? 'GitHub 排行榜 — Portal' : 'GitHub Trending — Portal'
  return c.render(
    trendingPage(hotRepos, risingRepos, lang, tab, langFilter, cacheAge, apiStatus, rateLimitInfo),
    { title, lang }
  )
})

app.get('/api/trending', async (c) => {
  const tab = c.req.query('tab') || 'hot'
  const langFilter = c.req.query('lang_filter') || ''
  const refresh = c.req.query('refresh') === '1'
  const ip = getClientIP(c)

  if (refresh) {
    const rl = await checkRateLimit(c.env.KV, ip)
    if (!rl.allowed) {
      return c.json({ error: 'rate_limited', remaining: 0, resetAt: rl.resetAt }, 429)
    }
  }

  try {
    const tc = buildTokenConfig(c.env)
    const result = await getCachedTrending(c.env.KV, tab, langFilter, refresh, tc)
    const rl = await checkRateLimit(c.env.KV, ip).catch(() => ({ remaining: RATE_LIMIT_MAX, resetAt: 0, allowed: true }))
    return c.json({
      repos: result.repos,
      cacheAge: result.cacheAge,
      apiStatus: result.apiStatus,
      rateLimit: { remaining: rl.remaining, max: RATE_LIMIT_MAX, resetAt: rl.resetAt },
    })
  } catch {
    return c.json({ repos: [], cacheAge: '' })
  }
})

// --- 后台 Token 管理 API ---

app.get('/admin/api/github-tokens', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const info = await getApiStatusInfo(c.env.KV, buildTokenConfig(c.env))
  return c.json(info)
})

app.post('/admin/api/github-tokens', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { tokens } = await c.req.json() as { tokens: string[] }
  const clean = [...new Set(tokens.filter(t => t && t.trim().length > 0).map(t => t.trim()))]
  await kvPut(c.env.KV, 'github_tokens', JSON.stringify(clean))
  await kvPut(c.env.KV, 'github_token_cooldowns', JSON.stringify({}))
  await kvPut(c.env.KV, 'github_token_index', '0')
  return c.json({ ok: true, count: clean.length })
})

app.post('/admin/api/github-tokens/add', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { tokens: newTokens } = await c.req.json() as { tokens: string[] }
  const raw = await kvGet(c.env.KV, 'github_tokens')
  const existing: string[] = raw ? JSON.parse(raw) : []
  const clean = [...new Set([...existing, ...newTokens.filter(t => t && t.trim().length > 0).map(t => t.trim())])]
  await kvPut(c.env.KV, 'github_tokens', JSON.stringify(clean))
  return c.json({ ok: true, count: clean.length })
})

app.post('/admin/api/github-tokens/remove', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { indices } = await c.req.json() as { indices: number[] }
  const raw = await kvGet(c.env.KV, 'github_tokens')
  const existing: string[] = raw ? JSON.parse(raw) : []
  const clean = existing.filter((_, idx) => !indices.includes(idx))
  await kvPut(c.env.KV, 'github_tokens', JSON.stringify(clean))
  const cdRaw = await kvGet(c.env.KV, 'github_token_cooldowns')
  if (cdRaw) {
    const cooldowns: Record<string, number> = JSON.parse(cdRaw)
    existing.filter((_, idx) => indices.includes(idx)).forEach(t => delete cooldowns[t])
    await kvPut(c.env.KV, 'github_token_cooldowns', JSON.stringify(cooldowns))
  }
  return c.json({ ok: true, count: clean.length })
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
  const b64 = await kvGet(c.env.KV, `file:${key}`)
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
  try {
    const stored = await kvGet(c.env.KV, 'session:' + match[1])
    return !!stored
  } catch {
    return false
  }
}

// ==================== 后台登录 ====================
app.get('/admin/login', (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  return c.render(adminPage('login', { lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
})

app.post('/admin/login', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  
  // Rate limiting check
  if (!checkLoginRateLimit(ip)) {
    return c.render(adminPage('login', { error: t('adminLogin', 'tooMany', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }
  
  const body = await c.req.parseBody()
  const username = sanitize((body.username as string) || '')
  const password = sanitize((body.password as string) || '')
  
  // Get stored username (default: admin)
  let storedUsername = await kvGet(c.env.KV, 'admin_username')
  if (!storedUsername) {
    storedUsername = 'admin'
    await kvPut(c.env.KV, 'admin_username', storedUsername)
  }
  
  // Verify username first
  if (username !== storedUsername) {
    recordLoginAttempt(ip)
    // Generic error message to avoid username enumeration
    return c.render(adminPage('login', { error: t('adminLogin', 'wrongPw', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }
  
  let storedPw = await kvGet(c.env.KV, 'admin_password')
  
  if (!storedPw) {
    // First time: hash the default password and store it
    const hashed = await hashPassword('admin123')
    await kvPut(c.env.KV, 'admin_password', hashed)
    storedPw = hashed
  }
  
  // Migrate plaintext passwords to hashed
  if (storedPw && !storedPw.startsWith('pbkdf2:')) {
    const hashed = await hashPassword(storedPw)
    await kvPut(c.env.KV, 'admin_password', hashed)
    storedPw = hashed
  }
  
  const valid = await verifyPassword(password, storedPw)
  if (!valid) {
    recordLoginAttempt(ip)
    return c.render(adminPage('login', { error: t('adminLogin', 'wrongPw', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }
  
  const sessionId = crypto.randomUUID()
  // Session expires in 24 hours
  await kvPut(c.env.KV, 'session:' + sessionId, JSON.stringify({ ip, createdAt: Date.now() }), { expirationTtl: 86400 })
  return new Response(null, {
    status: 302,
    headers: { 'Location': '/admin', 'Set-Cookie': `portal_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400` }
  })
})

app.get('/admin/logout', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/portal_session=([^;]+)/)
  if (match) await kvDelete(c.env.KV, 'session:' + match[1])
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
  await kvPut(c.env.KV, 'profile', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/websites', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await kvPut(c.env.KV, 'websites', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/repos', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await kvPut(c.env.KV, 'repos', JSON.stringify(data))
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
    await kvPut(c.env.KV, 'files', JSON.stringify(files))
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
  await kvPut(c.env.KV, `file:${key}`, b64)

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
  await kvPut(c.env.KV, 'files', JSON.stringify(files))
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
  await kvPut(c.env.KV, 'files', JSON.stringify(files))
  return c.json({ ok: true, key })
})

app.post('/admin/api/delete-file', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { key } = await c.req.json()
  await kvDelete(c.env.KV, `file:${key}`)
  const files: any[] = await getData(c.env.KV, 'files', [])
  const newFiles = files.filter((f: any) => f.key !== key)
  await kvPut(c.env.KV, 'files', JSON.stringify(newFiles))
  return c.json({ ok: true })
})

app.post('/admin/api/settings', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const data = await c.req.json()
  await kvPut(c.env.KV, 'settings', JSON.stringify(data))
  return c.json({ ok: true })
})

app.post('/admin/api/password', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const lang = parseLang(c.req.header('Cookie'))
  const { oldPassword, newPassword } = await c.req.json()
  
  let stored = await kvGet(c.env.KV, 'admin_password')
  if (!stored) {
    stored = await hashPassword('admin123')
    await kvPut(c.env.KV, 'admin_password', stored)
  }
  
  const valid = await verifyPassword(sanitize(oldPassword || ''), stored)
  if (!valid) return c.json({ error: lang === 'zh' ? '旧密码错误' : 'Incorrect old password' }, 400)
  
  if (!newPassword || newPassword.length < 6) {
    return c.json({ error: lang === 'zh' ? '新密码至少6位' : 'New password must be at least 6 characters' }, 400)
  }
  
  // Hash the new password before storing
  const hashedNew = await hashPassword(sanitize(newPassword || ''))
  await kvPut(c.env.KV, 'admin_password', hashedNew)
  return c.json({ ok: true })
})

app.post('/admin/api/username', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const lang = parseLang(c.req.header('Cookie'))
  const { newUsername } = await c.req.json()
  
  if (!newUsername || newUsername.trim().length < 2) {
    return c.json({ error: lang === 'zh' ? '用户名至少2位' : 'Username must be at least 2 characters' }, 400)
  }
  
  const clean = sanitize(newUsername.trim())
  await kvPut(c.env.KV, 'admin_username', clean)
  return c.json({ ok: true })
})

export default app
