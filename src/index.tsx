/** index.tsx — Main application entry point (modular architecture) */
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { renderer } from './renderer'
import type { AppEnv } from './types'

// Route modules
import pages from './routes/pages'
import auth from './routes/auth'
import adminRoutes from './routes/admin'
import shareRoutes from './routes/share'
import fileRoutes from './routes/files'
import trendingRoutes from './routes/trending'

const app = new Hono<AppEnv>()

// ==================== Global Error Handler ====================
app.onError((err, c) => {
  console.error('[Error]', err.message, err.stack)
  if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/admin/api/')) {
    return c.json({ error: 'Internal server error' }, 500)
  }
  return c.html(`<!DOCTYPE html><html><body style="font-family:system-ui;padding:40px;text-align:center">
    <h1>500</h1><p>Something went wrong. Please try again later.</p>
    <a href="/" style="color:#E8A838">Go Home</a></body></html>`, 500)
})

// ==================== Security Middleware ====================

// 1. Security Headers (CSP, XSS, anti-clickjacking)
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.loli.net"],
    fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://gstatic.loli.net", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "https:", "data:"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  },
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
}))

// 2. Additional security headers
app.use('*', async (c, next) => {
  await next()
  // Permissions-Policy: restrict browser features
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()')
  // Strengthen HSTS
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  // Prevent caching of sensitive pages
  if (c.req.path.startsWith('/admin')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    c.header('Pragma', 'no-cache')
  }
})

// 2. Anti-crawler: block aggressive bots on non-API routes
app.use('*', async (c, next) => {
  const ua = (c.req.header('User-Agent') || '').toLowerCase()
  const path = c.req.path
  if (path.startsWith('/api/') || path.startsWith('/admin') || path.startsWith('/static/')) return next()
  const botPatterns = ['scrapy', 'python-requests', 'go-http-client', 'libwww-perl', 'httpclient/']
  if (botPatterns.some(p => ua.includes(p))) return c.text('Access Denied', 403)
  return next()
})

// 3. Renderer
app.use(renderer)

// ==================== Mount Route Modules ====================
app.route('/', pages)
app.route('/', auth)
app.route('/', adminRoutes)
app.route('/', shareRoutes)
app.route('/', fileRoutes)
app.route('/', trendingRoutes)

export default app
