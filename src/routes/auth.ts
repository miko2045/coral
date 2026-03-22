/** routes/auth.ts — Login, logout, session management */
import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { parseLang, t } from '../i18n'
import { kvGet, kvPut } from '../lib/kv'
import { hashPassword, verifyPassword, checkLoginRateLimit, recordLoginAttempt, checkAuth, createSession, destroySession, getClientIP } from '../lib/auth'
import { adminPage } from '../admin'

const auth = new Hono<AppEnv>()

// Login page
auth.get('/admin/login', (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  return c.render(adminPage('login', { lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
})

// Login POST
auth.post('/admin/login', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const ip = getClientIP(c)

  // Rate limiting (KV-backed)
  if (!await checkLoginRateLimit(c.env.KV, ip)) {
    return c.render(adminPage('login', { error: t('adminLogin', 'tooMany', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }

  const body = await c.req.parseBody()
  // NOTE: Do NOT sanitize passwords — that breaks passwords containing <>&"' characters
  const username = ((body.username as string) || '').trim()
  const password = (body.password as string) || ''

  // Get stored username
  let storedUsername = await kvGet(c.env.KV, 'admin_username')
  if (!storedUsername) {
    storedUsername = 'admin'
    await kvPut(c.env.KV, 'admin_username', storedUsername)
  }

  // Verify username (constant-time-ish generic error to prevent enumeration)
  if (username !== storedUsername) {
    await recordLoginAttempt(c.env.KV, ip)
    return c.render(adminPage('login', { error: t('adminLogin', 'wrongPw', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }

  // Get/initialize stored password
  let storedPw = await kvGet(c.env.KV, 'admin_password')
  if (!storedPw) {
    const hashed = await hashPassword('admin123')
    await kvPut(c.env.KV, 'admin_password', hashed)
    storedPw = hashed
  }
  // Migrate legacy plaintext
  if (storedPw && !storedPw.startsWith('pbkdf2:')) {
    const hashed = await hashPassword(storedPw)
    await kvPut(c.env.KV, 'admin_password', hashed)
    storedPw = hashed
  }

  const valid = await verifyPassword(password, storedPw)
  if (!valid) {
    await recordLoginAttempt(c.env.KV, ip)
    return c.render(adminPage('login', { error: t('adminLogin', 'wrongPw', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang })
  }

  const sessionId = await createSession(c.env.KV, ip, c.req.header('User-Agent'))
  // Use __Host- prefix for production (requires Secure + Path=/)
  const isSecure = c.req.url.startsWith('https://') || c.req.header('X-Forwarded-Proto') === 'https'
  const cookieName = isSecure ? '__Host-portal_session' : 'portal_session'
  const cookieFlags = isSecure 
    ? `${cookieName}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`
    : `portal_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/admin',
      'Set-Cookie': cookieFlags,
    },
  })
})

// Logout
auth.get('/admin/logout', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/__Host-portal_session=([^;]+)/) || cookie.match(/portal_session=([^;]+)/)
  if (match) await destroySession(c.env.KV, match[1])
  // Clear both cookie variants
  return new Response(null, {
    status: 302,
    headers: [
      ['Location', '/admin/login'],
      ['Set-Cookie', 'portal_session=; Path=/; Max-Age=0'],
      ['Set-Cookie', '__Host-portal_session=; Path=/; Secure; Max-Age=0'],
    ],
  })
})

export default auth
