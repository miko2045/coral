/** routes/trending.ts — GitHub Trending with token pool and scrape fallback */
import { Hono } from 'hono'
import type { AppEnv, TokenConfig, CachedData, Bindings } from '../types'
import { parseLang, t } from '../i18n'
import { kvGet, kvPut } from '../lib/kv'
import { getClientIP } from '../lib/auth'
import { TRENDING_CACHE_TTL, TRENDING_RATE_LIMIT_WINDOW, TRENDING_RATE_LIMIT_MAX, TRENDING_TOKEN_COOLDOWN } from '../lib/constants'
import { trendingPage } from '../trending'

const trending = new Hono<AppEnv>()

// ==================== Helpers ====================

function parseNum(s: string | undefined): number {
  return s ? parseInt(s.replace(/,/g, '')) || 0 : 0
}

function getDateStr(daysAgo: number): string {
  const d = new Date(); d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

// ==================== GitHub App Token ====================
let _appTokenCache: { token: string; expiresAt: number } | null = null

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function generateJWT(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iat: now - 60, exp: now + 600, iss: appId }
  const enc = new TextEncoder()
  const headerB64 = base64url(enc.encode(JSON.stringify(header)))
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)))
  const signingInput = `${headerB64}.${payloadB64}`

  const pemBody = privateKeyPem
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const isPKCS8 = privateKeyPem.includes('BEGIN PRIVATE KEY')
  const key = await crypto.subtle.importKey(
    isPKCS8 ? 'pkcs8' : 'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput))
  return `${signingInput}.${base64url(signature)}`
}

async function getInstallationToken(appId: string, privateKey: string, installationId: string): Promise<string | null> {
  if (_appTokenCache && Date.now() < _appTokenCache.expiresAt) return _appTokenCache.token
  try {
    const jwt = await generateJWT(appId, privateKey)
    const resp = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${jwt}`, 'User-Agent': 'portal-trending-app' },
    })
    if (!resp.ok) return null
    const data = await resp.json() as { token: string; expires_at: string }
    _appTokenCache = { token: data.token, expiresAt: Date.now() + 50 * 60 * 1000 }
    return data.token
  } catch { return null }
}

// ==================== Token Pool ====================

async function getTokenPool(kv: KVNamespace | undefined, envTokens?: string, appConfig?: { appId?: string; privateKey?: string; installationId?: string }) {
  const raw = await kvGet(kv, 'github_tokens')
  const tokens: string[] = raw ? JSON.parse(raw) : []
  if (envTokens) {
    for (const t of envTokens.split(',').map(s => s.trim()).filter(Boolean)) {
      if (!tokens.includes(t)) tokens.push(t)
    }
  }
  if (appConfig?.appId && appConfig?.privateKey && appConfig?.installationId) {
    const appToken = await getInstallationToken(appConfig.appId, appConfig.privateKey, appConfig.installationId)
    if (appToken && !tokens.includes(appToken)) tokens.unshift(appToken)
  }
  const cdRaw = await kvGet(kv, 'github_token_cooldowns')
  const cooldowns: Record<string, number> = cdRaw ? JSON.parse(cdRaw) : {}
  const idxRaw = await kvGet(kv, 'github_token_index')
  const lastIndex = idxRaw ? parseInt(idxRaw) : 0
  return { tokens, cooldowns, lastIndex }
}

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

async function fetchWithTokens(kv: KVNamespace | undefined, q: string, sort: string, perPage: number = 30, tc?: TokenConfig): Promise<{ items: any[]; apiStatus: string } | null> {
  const pool = await getTokenPool(kv, tc?.envTokens, tc)
  if (pool.tokens.length === 0) return null
  const params = new URLSearchParams({ q, sort, order: 'desc', per_page: String(perPage) })
  const url = `https://api.github.com/search/repositories?${params}`

  for (let attempt = 0; attempt < pool.tokens.length; attempt++) {
    const pick = pickToken(pool)
    if (!pick) break
    try {
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'portal-trending-app', 'Authorization': `token ${pick.token}` },
      })
      const remaining = parseInt(resp.headers.get('X-RateLimit-Remaining') || '999')
      if (resp.status === 403 || resp.status === 429 || remaining <= 1) {
        pool.cooldowns[pick.token] = Date.now() + TRENDING_TOKEN_COOLDOWN * 1000
        await kvPut(kv, 'github_token_cooldowns', JSON.stringify(pool.cooldowns))
        await kvPut(kv, 'github_token_index', String(pick.index))
        continue
      }
      if (resp.ok) {
        await kvPut(kv, 'github_token_index', String(pick.index))
        const data = await resp.json() as any
        return { items: data.items || [], apiStatus: 'api_ok' }
      }
      pool.cooldowns[pick.token] = Date.now() + TRENDING_TOKEN_COOLDOWN * 1000
      await kvPut(kv, 'github_token_cooldowns', JSON.stringify(pool.cooldowns))
    } catch {
      pool.cooldowns[pick.token] = Date.now() + TRENDING_TOKEN_COOLDOWN * 1000
    }
  }
  return null
}

// ==================== Scrape Fallback ====================

async function scrapeGitHubTrending(langFilter: string, since: string = 'daily'): Promise<{ items: any[]; apiStatus: string }> {
  try {
    const langPath = langFilter ? `/${encodeURIComponent(langFilter)}` : ''
    const url = `https://github.com/trending${langPath}?since=${since}`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
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
        full_name: `${owner}/${name}`, name, owner: { login: owner },
        description: descMatch?.[1]?.trim() || '', language: langMatch?.[1] || '',
        stargazers_count: parseNum(starsMatch?.[1]), forks_count: parseNum(forksMatch?.[1]),
        html_url: `https://github.com/${owner}/${name}`, _starsToday: parseNum(trendMatch?.[1]),
      }
    }).filter((r: any) => r.name)
    return { items: repos, apiStatus: 'scrape_ok' }
  } catch { return { items: [], apiStatus: 'scrape_failed' } }
}

// ==================== Unified Entry ====================

function buildTokenConfig(env: Bindings): TokenConfig {
  return { envTokens: env.GITHUB_TOKENS, appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY, installationId: env.GITHUB_APP_INSTALLATION_ID }
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

async function checkTrendingRateLimit(kv: KVNamespace | undefined, ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `trending_ratelimit:${ip}`
  const raw = await kvGet(kv, key)
  const now = Math.floor(Date.now() / 1000)
  if (raw) {
    const data = JSON.parse(raw) as { count: number; windowStart: number }
    if (now - data.windowStart >= TRENDING_RATE_LIMIT_WINDOW) {
      await kvPut(kv, key, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: TRENDING_RATE_LIMIT_WINDOW })
      return { allowed: true, remaining: TRENDING_RATE_LIMIT_MAX - 1, resetAt: now + TRENDING_RATE_LIMIT_WINDOW }
    }
    if (data.count >= TRENDING_RATE_LIMIT_MAX) return { allowed: false, remaining: 0, resetAt: data.windowStart + TRENDING_RATE_LIMIT_WINDOW }
    data.count++
    const ttl = TRENDING_RATE_LIMIT_WINDOW - (now - data.windowStart)
    await kvPut(kv, key, JSON.stringify(data), { expirationTtl: ttl > 0 ? ttl : 1 })
    return { allowed: true, remaining: TRENDING_RATE_LIMIT_MAX - data.count, resetAt: data.windowStart + TRENDING_RATE_LIMIT_WINDOW }
  }
  await kvPut(kv, key, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: TRENDING_RATE_LIMIT_WINDOW })
  return { allowed: true, remaining: TRENDING_RATE_LIMIT_MAX - 1, resetAt: now + TRENDING_RATE_LIMIT_WINDOW }
}

async function getCachedTrending(kv: KVNamespace | undefined, tab: string, langFilter: string, forceRefresh: boolean = false, tc?: TokenConfig) {
  const cacheKey = `trending:${tab}:${langFilter || 'all'}`
  if (!forceRefresh) {
    const cached = await kvGet(kv, cacheKey)
    if (cached) {
      try { const data: CachedData = JSON.parse(cached); return { repos: data.repos, cacheAge: data.timestamp, apiStatus: data.apiStatus || 'cached' } } catch { /* ignore */ }
    }
  }
  const result = tab === 'rising' ? await getRisingRepos(kv, langFilter, tc) : await getHotRepos(kv, langFilter, tc)
  const payload: CachedData = { repos: result.items, timestamp: new Date().toISOString(), apiStatus: result.apiStatus }
  await kvPut(kv, cacheKey, JSON.stringify(payload), { expirationTtl: TRENDING_CACHE_TTL })
  return { repos: payload.repos, cacheAge: payload.timestamp, apiStatus: payload.apiStatus }
}

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
    totalTokens: pool.tokens.length, activeTokens: tokenStatuses.filter(t => t.active).length,
    tokens: tokenStatuses, rateLimitMax: TRENDING_RATE_LIMIT_MAX, rateLimitWindow: TRENDING_RATE_LIMIT_WINDOW, cacheTtl: TRENDING_CACHE_TTL,
  }
}

// ==================== Routes ====================

trending.get('/trending', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const tab = c.req.query('tab') || 'hot'
  const langFilter = c.req.query('lang_filter') || ''
  const refresh = c.req.query('refresh') === '1'
  const ip = getClientIP(c)
  let hotRepos: any[] = [], risingRepos: any[] = []
  let cacheAge = '', apiStatus = 'cached'
  let rateLimitInfo = { allowed: true, remaining: TRENDING_RATE_LIMIT_MAX, resetAt: 0 }

  try {
    if (refresh) {
      rateLimitInfo = await checkTrendingRateLimit(c.env.KV, ip)
      if (!rateLimitInfo.allowed) apiStatus = 'rate_limited_user'
    }
    const forceRefresh = refresh && rateLimitInfo.allowed
    const tc = buildTokenConfig(c.env)
    if (tab === 'rising') {
      const result = await getCachedTrending(c.env.KV, 'rising', langFilter, forceRefresh, tc)
      risingRepos = result.repos; cacheAge = result.cacheAge; apiStatus = result.apiStatus
      const hotResult = await getCachedTrending(c.env.KV, 'hot', langFilter, false, tc)
      hotRepos = hotResult.repos
    } else {
      const result = await getCachedTrending(c.env.KV, 'hot', langFilter, forceRefresh, tc)
      hotRepos = result.repos; cacheAge = result.cacheAge; apiStatus = result.apiStatus
      const risingResult = await getCachedTrending(c.env.KV, 'rising', langFilter, false, tc)
      risingRepos = risingResult.repos
    }
  } catch { /* empty on error */ }

  if (!refresh) {
    const key = `trending_ratelimit:${ip}`
    const raw = await kvGet(c.env.KV, key)
    if (raw) {
      const data = JSON.parse(raw) as { count: number; windowStart: number }
      const now = Math.floor(Date.now() / 1000)
      if (now - data.windowStart < TRENDING_RATE_LIMIT_WINDOW) {
        rateLimitInfo = { allowed: data.count < TRENDING_RATE_LIMIT_MAX, remaining: Math.max(0, TRENDING_RATE_LIMIT_MAX - data.count), resetAt: data.windowStart + TRENDING_RATE_LIMIT_WINDOW }
      }
    }
  }

  const title = lang === 'zh' ? 'GitHub 排行榜 — Portal' : 'GitHub Trending — Portal'
  return c.render(trendingPage(hotRepos, risingRepos, lang, tab, langFilter, cacheAge, apiStatus, rateLimitInfo), { title, lang })
})

trending.get('/api/trending', async (c) => {
  const tab = c.req.query('tab') || 'hot'
  const langFilter = c.req.query('lang_filter') || ''
  const refresh = c.req.query('refresh') === '1'
  const ip = getClientIP(c)
  if (refresh) {
    const rl = await checkTrendingRateLimit(c.env.KV, ip)
    if (!rl.allowed) return c.json({ error: 'rate_limited', remaining: 0, resetAt: rl.resetAt }, 429)
  }
  try {
    const tc = buildTokenConfig(c.env)
    const result = await getCachedTrending(c.env.KV, tab, langFilter, refresh, tc)
    const rl = await checkTrendingRateLimit(c.env.KV, ip).catch(() => ({ remaining: TRENDING_RATE_LIMIT_MAX, resetAt: 0, allowed: true }))
    return c.json({ repos: result.repos, cacheAge: result.cacheAge, apiStatus: result.apiStatus, rateLimit: { remaining: rl.remaining, max: TRENDING_RATE_LIMIT_MAX, resetAt: rl.resetAt } })
  } catch { return c.json({ repos: [], cacheAge: '' }) }
})

// Token management APIs
trending.get('/admin/api/github-tokens', async (c) => {
  const info = await getApiStatusInfo(c.env.KV, buildTokenConfig(c.env))
  return c.json(info)
})

trending.post('/admin/api/github-tokens', async (c) => {
  const data = await c.req.json()
  const result = data as { tokens: string[] }
  const clean = [...new Set(result.tokens.filter(t => t && t.trim().length > 0).map(t => t.trim()))]
  await kvPut(c.env.KV, 'github_tokens', JSON.stringify(clean))
  await kvPut(c.env.KV, 'github_token_cooldowns', JSON.stringify({}))
  await kvPut(c.env.KV, 'github_token_index', '0')
  return c.json({ ok: true, count: clean.length })
})

trending.post('/admin/api/github-tokens/add', async (c) => {
  const { tokens: newTokens } = await c.req.json() as { tokens: string[] }
  const raw = await kvGet(c.env.KV, 'github_tokens')
  const existing: string[] = raw ? JSON.parse(raw) : []
  const clean = [...new Set([...existing, ...newTokens.filter(t => t && t.trim().length > 0).map(t => t.trim())])]
  await kvPut(c.env.KV, 'github_tokens', JSON.stringify(clean))
  return c.json({ ok: true, count: clean.length })
})

trending.post('/admin/api/github-tokens/remove', async (c) => {
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

export default trending
