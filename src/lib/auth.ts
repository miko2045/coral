/** lib/auth.ts — Authentication, password hashing, session management, rate limiting */
import { kvGet, kvPut, kvDelete } from './kv'
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, SHARE_PASSWORD_MAX_ATTEMPTS, SHARE_PASSWORD_WINDOW_S } from './constants'
import type { SessionData, RateLimitEntry } from '../types'

// ==================== Password Hashing (PBKDF2) ====================

export async function hashPassword(password: string, salt?: string): Promise<string> {
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

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) {
    // Legacy plaintext comparison (for migration)
    return password === stored
  }
  const [, salt] = stored.split(':')
  const rehash = await hashPassword(password, salt)
  return rehash === stored
}

// ==================== HTML Sanitization (output only, NOT for passwords) ====================

export function sanitizeHtml(str: string): string {
  return str.replace(/[<>"'&]/g, (ch) => {
    const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }
    return map[ch] || ch
  })
}

/** Safe JSON stringification for embedding in HTML <script> tags — prevents </script> injection */
export function safeJsonStringify(data: any): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

// ==================== Login Rate Limiting (KV-backed, survives restarts) ====================

export async function checkLoginRateLimit(kv: KVNamespace | undefined, ip: string): Promise<boolean> {
  const key = `login_limit:${ip}`
  const raw = await kvGet(kv, key)
  if (!raw) return true
  try {
    const entry: RateLimitEntry = JSON.parse(raw)
    const now = Date.now()
    if (now - entry.windowStart > LOGIN_WINDOW_MS) return true
    return entry.count < LOGIN_MAX_ATTEMPTS
  } catch { return true }
}

export async function recordLoginAttempt(kv: KVNamespace | undefined, ip: string): Promise<void> {
  const key = `login_limit:${ip}`
  const now = Date.now()
  const raw = await kvGet(kv, key)
  let entry: RateLimitEntry = { count: 1, windowStart: now }
  if (raw) {
    try {
      const existing: RateLimitEntry = JSON.parse(raw)
      if (now - existing.windowStart < LOGIN_WINDOW_MS) {
        entry = { count: existing.count + 1, windowStart: existing.windowStart }
      }
    } catch { /* use new entry */ }
  }
  await kvPut(kv, key, JSON.stringify(entry), { expirationTtl: Math.ceil(LOGIN_WINDOW_MS / 1000) })
}

// ==================== Share Password Rate Limiting ====================

export async function checkSharePasswordLimit(kv: KVNamespace | undefined, ip: string, shareId: string): Promise<boolean> {
  const key = `share_pw_limit:${ip}:${shareId}`
  const raw = await kvGet(kv, key)
  if (!raw) return true
  try {
    const entry: RateLimitEntry = JSON.parse(raw)
    const now = Math.floor(Date.now() / 1000)
    if (now - entry.windowStart > SHARE_PASSWORD_WINDOW_S) return true
    return entry.count < SHARE_PASSWORD_MAX_ATTEMPTS
  } catch { return true }
}

export async function recordSharePasswordAttempt(kv: KVNamespace | undefined, ip: string, shareId: string): Promise<void> {
  const key = `share_pw_limit:${ip}:${shareId}`
  const now = Math.floor(Date.now() / 1000)
  const raw = await kvGet(kv, key)
  let entry: RateLimitEntry = { count: 1, windowStart: now }
  if (raw) {
    try {
      const existing: RateLimitEntry = JSON.parse(raw)
      if (now - existing.windowStart < SHARE_PASSWORD_WINDOW_S) {
        entry = { count: existing.count + 1, windowStart: existing.windowStart }
      }
    } catch { /* use new entry */ }
  }
  await kvPut(kv, key, JSON.stringify(entry), { expirationTtl: SHARE_PASSWORD_WINDOW_S })
}

// ==================== Session Management ====================

export async function checkAuth(c: any): Promise<boolean> {
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

export async function createSession(kv: KVNamespace | undefined, ip: string, userAgent?: string): Promise<string> {
  const sessionId = crypto.randomUUID()
  const data: SessionData = { ip, createdAt: Date.now(), userAgent }
  await kvPut(kv, 'session:' + sessionId, JSON.stringify(data), { expirationTtl: 86400 })
  return sessionId
}

export async function destroySession(kv: KVNamespace | undefined, sessionId: string): Promise<void> {
  await kvDelete(kv, 'session:' + sessionId)
}

// ==================== Generate Download Token (one-time, short-lived) ====================

export async function generateDownloadToken(kv: KVNamespace | undefined, shareId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '')
  await kvPut(kv, `dl_token:${token}`, shareId, { expirationTtl: 300 }) // 5 minutes
  return token
}

export async function validateDownloadToken(kv: KVNamespace | undefined, token: string): Promise<string | null> {
  const shareId = await kvGet(kv, `dl_token:${token}`)
  if (shareId) {
    await kvDelete(kv, `dl_token:${token}`) // One-time use
  }
  return shareId
}

// ==================== Utility ====================

export function getClientIP(c: any): string {
  return c.req.header('CF-Connecting-IP')
    || c.req.header('X-Real-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    || '0.0.0.0'
}

/** Generate a cryptographically secure share ID (16 bytes = 32 hex chars) */
export function generateShareId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Generate file server auth secret */
export function generateFileServerSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
