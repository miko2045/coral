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
  return c.render(adminPage('login', { lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang, isAdmin: true })
})

// Login POST
auth.post('/admin/login', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const ip = getClientIP(c)

  // Rate limiting (KV-backed)
  if (!await checkLoginRateLimit(c.env.KV, ip)) {
    return c.render(adminPage('login', { error: t('adminLogin', 'tooMany', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang, isAdmin: true })
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

  // Get/initialize stored password (fetch early for timing-safe comparison)
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

  // Verify username (use generic error to prevent enumeration)
  // Add constant-time comparison to prevent timing attacks
  const usernameMatch = username.length === storedUsername.length && 
    username.split('').every((ch, i) => ch === storedUsername[i])
  if (!usernameMatch) {
    // Still verify a dummy password to keep timing consistent
    await verifyPassword('dummy-password-check', storedPw)
    await recordLoginAttempt(c.env.KV, ip)
    return c.render(adminPage('login', { error: t('adminLogin', 'wrongPw', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang, isAdmin: true })
  }

  const valid = await verifyPassword(password, storedPw)
  if (!valid) {
    await recordLoginAttempt(c.env.KV, ip)
    return c.render(adminPage('login', { error: t('adminLogin', 'wrongPw', lang), lang }), { title: lang === 'zh' ? '后台登录' : 'Admin Login', lang, isAdmin: true })
  }

  // Check if using default credentials — force password change
  const isDefaultPassword = await verifyPassword('admin123', storedPw)
  const isDefaultUsername = storedUsername === 'admin'

  const sessionId = await createSession(c.env.KV, ip, c.req.header('User-Agent'))
  // Use __Host- prefix for production (requires Secure + Path=/)
  const isSecure = c.req.url.startsWith('https://') || c.req.header('X-Forwarded-Proto') === 'https'
  const cookieName = isSecure ? '__Host-portal_session' : 'portal_session'
  const cookieFlags = isSecure 
    ? `${cookieName}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=86400`
    : `portal_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`

  // If default credentials, redirect to admin with force-change flag
  const redirectUrl = (isDefaultPassword || isDefaultUsername) ? '/admin?forcePasswordChange=1' : '/admin'
  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl,
      'Set-Cookie': cookieFlags,
    },
  })
})

// Logout
auth.get('/admin/logout', async (c) => {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/__Host-portal_session=([^;]+)/) || cookie.match(/portal_session=([^;]+)/)
  if (match) await destroySession(c.env.KV, match[1])
  // Clear both cookie variants with full security flags
  return new Response(null, {
    status: 302,
    headers: [
      ['Location', '/admin/login'],
      ['Set-Cookie', 'portal_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'],
      ['Set-Cookie', '__Host-portal_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'],
      ['Clear-Site-Data', '"cookies"'],
    ],
  })
})

export default auth
