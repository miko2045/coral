import { Hono } from 'hono'
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
  return c.render(downloadsPage(files, lang), { title: `${t('home', 'downloadsTitle', lang)} — ${profile.name}`, lang })
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

// ==================== GitHub Trending — Token Pool + Rate Limit ====================
const CACHE_TTL = 3600 // 数据缓存 1 小时
const RATE_LIMIT_WINDOW = 3600 // 限流窗口 1 小时 (秒)
const RATE_LIMIT_MAX = 30 // 每 IP 每小时最多刷新 30 次
const TOKEN_COOLDOWN = 600 // Token 失效后冷却 10 分钟 (秒)

interface TokenStatus {
  tokens: string[]          // 所有 token (ghp_xxx)
  cooldowns: Record<string, number>  // token -> 冷却到期时间戳
  lastIndex: number         // 上次使用的 token 索引
}

/** 从 KV 加载 token 列表和状态 */
async function getTokenPool(kv: KVNamespace): Promise<TokenStatus> {
  // 读取 admin 配置的 token 列表
  const raw = await kv.get('github_tokens')
  const tokens: string[] = raw ? JSON.parse(raw) : []
  // 读取冷却状态
  const cdRaw = await kv.get('github_token_cooldowns')
  const cooldowns: Record<string, number> = cdRaw ? JSON.parse(cdRaw) : {}
  // 读取轮询索引
  const idxRaw = await kv.get('github_token_index')
  const lastIndex = idxRaw ? parseInt(idxRaw) : 0
  return { tokens, cooldowns, lastIndex }
}

/** 获取下一个可用 token (轮询 + 跳过冷却中的) */
function pickToken(pool: TokenStatus): { token: string | null; index: number } {
  const now = Date.now()
  const { tokens, cooldowns, lastIndex } = pool
  if (tokens.length === 0) return { token: null, index: 0 }

  // 从 lastIndex+1 开始找一圈
  for (let i = 0; i < tokens.length; i++) {
    const idx = (lastIndex + 1 + i) % tokens.length
    const t = tokens[idx]
    const cd = cooldowns[t] || 0
    if (now > cd) {
      return { token: t, index: idx }
    }
  }
  // 全部冷却中，fallback 无 token
  return { token: null, index: lastIndex }
}

/** 标记 token 进入冷却 */
async function cooldownToken(kv: KVNamespace, pool: TokenStatus, token: string) {
  pool.cooldowns[token] = Date.now() + TOKEN_COOLDOWN * 1000
  await kv.put('github_token_cooldowns', JSON.stringify(pool.cooldowns)).catch(() => {})
}

/** 更新轮询索引 */
async function saveTokenIndex(kv: KVNamespace, index: number) {
  await kv.put('github_token_index', String(index)).catch(() => {})
}

/** IP 频率限制检查：返回 { allowed, remaining, resetAt } */
async function checkRateLimit(kv: KVNamespace, ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `ratelimit:${ip}`
  const raw = await kv.get(key)
  const now = Math.floor(Date.now() / 1000)

  if (raw) {
    const data = JSON.parse(raw) as { count: number; windowStart: number }
    // 窗口过期，重置
    if (now - data.windowStart >= RATE_LIMIT_WINDOW) {
      const newData = { count: 1, windowStart: now }
      await kv.put(key, JSON.stringify(newData), { expirationTtl: RATE_LIMIT_WINDOW }).catch(() => {})
      return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW }
    }
    if (data.count >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0, resetAt: data.windowStart + RATE_LIMIT_WINDOW }
    }
    data.count++
    const ttl = RATE_LIMIT_WINDOW - (now - data.windowStart)
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl > 0 ? ttl : 1 }).catch(() => {})
    return { allowed: true, remaining: RATE_LIMIT_MAX - data.count, resetAt: data.windowStart + RATE_LIMIT_WINDOW }
  }

  // 新窗口
  const newData = { count: 1, windowStart: now }
  await kv.put(key, JSON.stringify(newData), { expirationTtl: RATE_LIMIT_WINDOW }).catch(() => {})
  return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW }
}

/** 带 Token 池的 GitHub Search 请求 */
async function fetchGitHubSearch(
  kv: KVNamespace,
  q: string,
  sort: string,
  order: string,
  perPage: number = 30
): Promise<{ items: any[]; tokenUsed: string; apiStatus: string }> {
  const pool = await getTokenPool(kv)
  const params = new URLSearchParams({ q, sort, order, per_page: String(perPage) })
  const url = `https://api.github.com/search/repositories?${params.toString()}`

  // 尝试使用 token
  const { token, index } = pickToken(pool)

  if (token) {
    try {
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'portal-trending-app',
          'Authorization': `token ${token}`,
        },
      })

      // 检查限流 header
      const remaining = parseInt(resp.headers.get('X-RateLimit-Remaining') || '999')

      if (resp.status === 403 || resp.status === 429 || remaining <= 1) {
        // Token 用尽，进入冷却
        await cooldownToken(kv, pool, token)
        // 递归重试下一个 token
        await saveTokenIndex(kv, index)
        return fetchGitHubWithFallback(kv, url, pool, index)
      }

      if (resp.ok) {
        await saveTokenIndex(kv, index)
        const data = await resp.json() as any
        const masked = token.slice(0, 8) + '***'
        return { items: data.items || [], tokenUsed: masked, apiStatus: 'ok' }
      }

      // 其他错误 (401 等) -> 冷却该 token
      await cooldownToken(kv, pool, token)
      await saveTokenIndex(kv, index)
      return fetchGitHubWithFallback(kv, url, pool, index)
    } catch {
      await cooldownToken(kv, pool, token)
      return fetchGitHubWithFallback(kv, url, pool, index)
    }
  }

  // 无可用 token -> fallback 无认证请求
  return fetchGitHubNoAuth(url)
}

/** 继续尝试池中下一个 token，最终 fallback 到无认证 */
async function fetchGitHubWithFallback(
  kv: KVNamespace,
  url: string,
  pool: TokenStatus,
  startIndex: number
): Promise<{ items: any[]; tokenUsed: string; apiStatus: string }> {
  const now = Date.now()

  for (let i = 0; i < pool.tokens.length; i++) {
    const idx = (startIndex + 1 + i) % pool.tokens.length
    const t = pool.tokens[idx]
    const cd = pool.cooldowns[t] || 0
    if (now <= cd) continue // 跳过冷却中的

    try {
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'portal-trending-app',
          'Authorization': `token ${t}`,
        },
      })
      const remaining = parseInt(resp.headers.get('X-RateLimit-Remaining') || '999')

      if (resp.status === 403 || resp.status === 429 || remaining <= 1) {
        await cooldownToken(kv, pool, t)
        continue
      }
      if (resp.ok) {
        await saveTokenIndex(kv, idx)
        const data = await resp.json() as any
        const masked = t.slice(0, 8) + '***'
        return { items: data.items || [], tokenUsed: masked, apiStatus: 'ok' }
      }
      await cooldownToken(kv, pool, t)
    } catch {
      await cooldownToken(kv, pool, t)
    }
  }

  // 所有 token 都失败 -> 无认证
  return fetchGitHubNoAuth(url)
}

/** 无认证请求 (60次/小时) */
async function fetchGitHubNoAuth(url: string): Promise<{ items: any[]; tokenUsed: string; apiStatus: string }> {
  try {
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'portal-trending-app',
      },
    })
    if (!resp.ok) return { items: [], tokenUsed: 'none', apiStatus: resp.status === 403 ? 'rate_limited' : 'error' }
    const data = await resp.json() as any
    return { items: data.items || [], tokenUsed: 'none', apiStatus: 'fallback' }
  } catch {
    return { items: [], tokenUsed: 'none', apiStatus: 'error' }
  }
}

function getDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

async function getHotRepos(kv: KVNamespace, langFilter: string) {
  const langQ = langFilter ? ` language:${langFilter}` : ''
  const q = `stars:>5000${langQ}`
  return fetchGitHubSearch(kv, q, 'stars', 'desc', 30)
}

async function getRisingRepos(kv: KVNamespace, langFilter: string) {
  const weekAgo = getDateStr(7)
  const langQ = langFilter ? ` language:${langFilter}` : ''
  const q = `created:>${weekAgo}${langQ}`
  const result = await fetchGitHubSearch(kv, q, 'stars', 'desc', 30)
  return {
    ...result,
    items: result.items.map(r => ({ ...r, _starsToday: r.stargazers_count })),
  }
}

interface CachedData {
  repos: any[]
  timestamp: string
  tokenUsed: string
  apiStatus: string
}

async function getCachedTrending(kv: KVNamespace, tab: string, langFilter: string, forceRefresh: boolean = false) {
  const cacheKey = `trending:${tab}:${langFilter || 'all'}`

  if (!forceRefresh) {
    const cached = await kv.get(cacheKey)
    if (cached) {
      try {
        const data: CachedData = JSON.parse(cached)
        return { repos: data.repos, cacheAge: data.timestamp, tokenUsed: data.tokenUsed || '?', apiStatus: data.apiStatus || 'cached' }
      } catch { /* ignore */ }
    }
  }

  const result = tab === 'rising'
    ? await getRisingRepos(kv, langFilter)
    : await getHotRepos(kv, langFilter)

  const payload: CachedData = {
    repos: result.items,
    timestamp: new Date().toISOString(),
    tokenUsed: result.tokenUsed,
    apiStatus: result.apiStatus,
  }
  await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: CACHE_TTL }).catch(() => {})
  return { repos: payload.repos, cacheAge: payload.timestamp, tokenUsed: payload.tokenUsed, apiStatus: payload.apiStatus }
}

/** 获取客户端 IP */
function getClientIP(c: any): string {
  return c.req.header('CF-Connecting-IP')
    || c.req.header('X-Real-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || '0.0.0.0'
}

/** 获取 API 状态概览 (后台用) */
async function getApiStatusInfo(kv: KVNamespace) {
  const pool = await getTokenPool(kv)
  const now = Date.now()
  const tokenStatuses = pool.tokens.map((t, i) => {
    const cd = pool.cooldowns[t] || 0
    return {
      index: i,
      masked: t.slice(0, 8) + '***' + t.slice(-4),
      active: now > cd,
      cooldownUntil: cd > now ? new Date(cd).toISOString() : null,
    }
  })
  const activeCount = tokenStatuses.filter(t => t.active).length
  return {
    totalTokens: pool.tokens.length,
    activeTokens: activeCount,
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

    if (tab === 'rising') {
      const result = await getCachedTrending(c.env.KV, 'rising', langFilter, forceRefresh)
      risingRepos = result.repos
      cacheAge = result.cacheAge
      apiStatus = result.apiStatus
      const hotResult = await getCachedTrending(c.env.KV, 'hot', langFilter)
      hotRepos = hotResult.repos
    } else {
      const result = await getCachedTrending(c.env.KV, 'hot', langFilter, forceRefresh)
      hotRepos = result.repos
      cacheAge = result.cacheAge
      apiStatus = result.apiStatus
      const risingResult = await getCachedTrending(c.env.KV, 'rising', langFilter)
      risingRepos = risingResult.repos
    }
  } catch {
    // On error, show empty
  }

  // 不刷新也获取一下限流剩余信息展示
  if (!refresh) {
    const key = `ratelimit:${ip}`
    const raw = await c.env.KV.get(key).catch(() => null)
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
    const result = await getCachedTrending(c.env.KV, tab, langFilter, refresh)
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
  const info = await getApiStatusInfo(c.env.KV)
  return c.json(info)
})

app.post('/admin/api/github-tokens', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { tokens } = await c.req.json() as { tokens: string[] }
  // 过滤空值，去重
  const clean = [...new Set(tokens.filter(t => t && t.trim().length > 0).map(t => t.trim()))]
  await c.env.KV.put('github_tokens', JSON.stringify(clean))
  // 重置冷却和索引
  await c.env.KV.put('github_token_cooldowns', JSON.stringify({}))
  await c.env.KV.put('github_token_index', '0')
  return c.json({ ok: true, count: clean.length })
})

app.post('/admin/api/github-tokens/add', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { tokens: newTokens } = await c.req.json() as { tokens: string[] }
  const raw = await c.env.KV.get('github_tokens')
  const existing: string[] = raw ? JSON.parse(raw) : []
  const clean = [...new Set([
    ...existing,
    ...newTokens.filter(t => t && t.trim().length > 0).map(t => t.trim())
  ])]
  await c.env.KV.put('github_tokens', JSON.stringify(clean))
  return c.json({ ok: true, count: clean.length })
})

app.post('/admin/api/github-tokens/remove', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { indices } = await c.req.json() as { indices: number[] }
  const raw = await c.env.KV.get('github_tokens')
  const existing: string[] = raw ? JSON.parse(raw) : []
  const clean = existing.filter((_, idx) => !indices.includes(idx))
  await c.env.KV.put('github_tokens', JSON.stringify(clean))
  // 清除被删除 token 的冷却状态
  const cdRaw = await c.env.KV.get('github_token_cooldowns')
  if (cdRaw) {
    const cooldowns: Record<string, number> = JSON.parse(cdRaw)
    const removedTokens = existing.filter((_, idx) => indices.includes(idx))
    removedTokens.forEach(t => delete cooldowns[t])
    await c.env.KV.put('github_token_cooldowns', JSON.stringify(cooldowns))
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
