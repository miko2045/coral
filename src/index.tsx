/** index.tsx — Main application entry point (modular architecture) */
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { renderer } from './renderer'
import { kvGet, kvPut } from './lib/kv'
import type { AppEnv } from './types'

// Route modules
import pages from './routes/pages'
import auth from './routes/auth'
import adminRoutes from './routes/admin'
import shareRoutes from './routes/share'
import fileRoutes from './routes/files'
import trendingRoutes from './routes/trending'
import sidebarRoutes from './routes/sidebar'

const app = new Hono<AppEnv>()

// ==================== Global Error Handler ====================
app.onError((err, c) => {
  const reqId = crypto.randomUUID().slice(0, 8)
  console.error(`[Error:${reqId}]`, err.message, err.stack)
  if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/admin/api/')) {
    return c.json({ error: 'Internal server error', requestId: reqId }, 500)
  }
  return c.html(`<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px;text-align:center">
    <h1>500</h1><p>Something went wrong. Please try again later.</p>
    <p style="color:#999;font-size:0.8rem">Request ID: ${reqId}</p>
    <a href="/" style="color:#6366F1">Go Home</a></body></html>`, 500)
})

// ==================== Security Middleware ====================

// 1. Security Headers (CSP, XSS, anti-clickjacking, anti-MIME-sniffing)
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.loli.net"],
    fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://gstatic.loli.net", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "https:", "data:"],
    connectSrc: ["'self'", "https://api.github.com"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: [],
  },
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'cross-origin',
}))

// 2. Additional security headers + Cache control + CORS hardening
app.use('*', async (c, next) => {
  await next()
  // Permissions-Policy: restrict browser features
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()')
  // Prevent caching of sensitive data
  c.header('X-Permitted-Cross-Domain-Policies', 'none')
  // Remove server identification (defense in depth)
  c.res.headers.delete('X-Powered-By')
  c.res.headers.delete('Server')

  const path = c.req.path

  // Prevent caching of admin pages and API responses with sensitive data
  if (path.startsWith('/admin')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0')
    c.header('Pragma', 'no-cache')
    c.header('Expires', '0')
    return
  }

  // API responses: no cache for dynamic data
  if (path.startsWith('/api/')) {
    c.header('Cache-Control', 'no-store, private')
    return
  }

  // Static assets: long-term cache (cache-busted via ?v=hash)
  if (path.startsWith('/static/') && (path.includes('?v=') || path.match(/\.(woff2?|ttf|eot|svg|png|jpg|ico)$/))) {
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
    return
  }
  // Static assets without version: short cache
  if (path.startsWith('/static/')) {
    c.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    return
  }
  // HTML pages: always revalidate with server (ensures latest cache-busted URLs)
  const ct = c.res.headers.get('Content-Type') || ''
  if (ct.includes('text/html')) {
    c.header('Cache-Control', 'no-cache, must-revalidate')
  }
})

// 3. Global API rate limiting (KV-backed, per-IP sliding window)
const API_RATE_LIMIT = 60        // requests per window
const API_RATE_WINDOW_S = 60     // 60 second window
const GUESTBOOK_RATE_LIMIT = 5   // guestbook posts per window
const GUESTBOOK_RATE_WINDOW_S = 300 // 5 min window

app.use('/api/*', async (c, next) => {
  const ip = c.req.header('x-real-ip')
    || c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('cf-connecting-ip')
    || 'unknown'
  const path = c.req.path
  const method = c.req.method

  // Only rate-limit mutable operations aggressively
  // Skip rate limiting for static asset prefetches and GET requests
  if (method === 'GET' && !path.includes('/admin/')) {
    return next()
  }

  // Stricter rate limit for guestbook posts (prevent spam)
  if (path === '/api/sidebar/guestbook' && method === 'POST') {
    const key = `rl:guestbook:${ip}`
    const raw = await kvGet(c.env.KV, key)
    const count = raw ? parseInt(raw, 10) : 0
    if (count >= GUESTBOOK_RATE_LIMIT) {
      c.header('Retry-After', String(GUESTBOOK_RATE_WINDOW_S))
      return c.json({ error: 'Too many requests. Please try again later.' }, 429)
    }
    await kvPut(c.env.KV, key, String(count + 1), { expirationTtl: GUESTBOOK_RATE_WINDOW_S })
    return next()
  }

  // General POST rate limit
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    const key = `rl:api:${ip}`
    const raw = await kvGet(c.env.KV, key)
    const count = raw ? parseInt(raw, 10) : 0
    if (count >= API_RATE_LIMIT) {
      c.header('Retry-After', String(API_RATE_WINDOW_S))
      return c.json({ error: 'Rate limit exceeded. Please slow down.' }, 429)
    }
    await kvPut(c.env.KV, key, String(count + 1), { expirationTtl: API_RATE_WINDOW_S })
  }

  return next()
})

// 4. Anti-crawler: block aggressive bots + suspicious patterns
app.use('*', async (c, next) => {
  const ua = (c.req.header('User-Agent') || '').toLowerCase()
  const path = c.req.path
  if (path.startsWith('/api/') || path.startsWith('/admin') || path.startsWith('/static/')) return next()

  // Allow legitimate search engine bots
  const allowedBots = ['googlebot', 'bingbot', 'baiduspider', 'yandexbot', 'slurp', 'duckduckbot', 'sogou']
  if (allowedBots.some(b => ua.includes(b))) {
    return next()
  }

  // Block known scraping tools and bad bots
  const botPatterns = [
    'scrapy', 'python-requests', 'go-http-client', 'libwww-perl',
    'httpclient/', 'java/', 'ahrefsbot',
    'semrushbot', 'dotbot', 'mj12bot', 'bytespider',
    'petalbot',
  ]
  if (botPatterns.some(p => ua.includes(p))) {
    return c.text('Access Denied', 403)
  }

  // Block requests with no User-Agent on page routes (likely automated)
  if ((!ua || ua.length < 5) && !path.startsWith('/api/') && path !== '/' && !path.startsWith('/static/')) {
    return c.text('Access Denied', 403)
  }

  return next()
})

// 5. Path traversal protection
app.use('*', async (c, next) => {
  const path = c.req.path
  // Block path traversal attempts
  if (path.includes('..') || path.includes('\\') || path.includes('%2e%2e') || path.includes('%252e')) {
    return c.text('Forbidden', 403)
  }
  // Block access to hidden files (except well-known)
  if (path.match(/\/\.[^/]/) && !path.startsWith('/.well-known')) {
    return c.text('Forbidden', 403)
  }
  // Block common attack probes
  if (path.match(/\.(php|asp|aspx|jsp|cgi|env|git|svn|bak|old|sql|log|ini|conf|yml|yaml|toml|xml)$/i)) {
    return c.text('Not Found', 404)
  }
  return next()
})

// 6. Request size limiting (prevent oversized payloads)
app.use('/api/*', async (c, next) => {
  const contentLength = c.req.header('Content-Length')
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    // Max 1MB for API requests (excluding file uploads which have their own limits)
    if (size > 1048576 && !c.req.path.startsWith('/admin/api/files')) {
      return c.json({ error: 'Payload too large' }, 413)
    }
  }
  return next()
})

// 7. Renderer
app.use(renderer)

// ==================== Mount Route Modules ====================
app.route('/', pages)
app.route('/', auth)
app.route('/', adminRoutes)
app.route('/', shareRoutes)
app.route('/', fileRoutes)
app.route('/', trendingRoutes)
app.route('/', sidebarRoutes)

export default app
