/** routes/sidebar.ts — Sidebar widget APIs: visitor map, guestbook, random quote */
import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { kvGet, kvPut } from '../lib/kv'

const sidebar = new Hono<AppEnv>()

// ==================== VISITOR MAP (China Provinces) ====================
sidebar.get('/api/sidebar/visitors', async (c) => {
  const kv = c.env.KV
  const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || ''

  // Resolve province from IP
  let province = ''
  if (ip && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
    province = await resolveProvinceFromIP(ip).catch(() => '')
  }
  if (!province) {
    province = '未知'
  }

  // Get existing visitor data
  const raw = await kvGet(kv, 'sidebar:visitors-v2')
  const data: { provinces: Record<string, number>; total: number } = raw
    ? JSON.parse(raw)
    : { provinces: {}, total: 0 }

  // Increment
  data.provinces[province] = (data.provinces[province] || 0) + 1
  data.total = (data.total || 0) + 1

  // Save
  await kvPut(kv, 'sidebar:visitors-v2', JSON.stringify(data))

  return c.json(data)
})

// ==================== GUESTBOOK ====================
sidebar.get('/api/sidebar/guestbook', async (c) => {
  const raw = await kvGet(c.env.KV, 'sidebar:guestbook')
  const messages: any[] = raw ? JSON.parse(raw) : []
  return c.json({ messages: messages.slice(-50) })
})

sidebar.post('/api/sidebar/guestbook', async (c) => {
  const { text, emoji } = await c.req.json<{ text: string; emoji?: string }>()

  if (!text || text.trim().length === 0) {
    return c.json({ error: 'Message cannot be empty' }, 400)
  }
  if (text.length > 60) {
    return c.json({ error: 'Message too long (max 60 chars)' }, 400)
  }

  const ip = c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown'
  const ipHash = await hashIP(ip)
  const rlKey = `sidebar:guestbook-rl:${ipHash}`
  const lastPost = await kvGet(c.env.KV, rlKey)
  if (lastPost) {
    return c.json({ error: 'Please wait a few minutes before posting again' }, 429)
  }

  const raw = await kvGet(c.env.KV, 'sidebar:guestbook')
  const messages: any[] = raw ? JSON.parse(raw) : []

  // Also get province for the message
  let province = ''
  if (ip && ip !== 'unknown') {
    province = await resolveProvinceFromIP(ip).catch(() => '')
  }

  const msg = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.trim().slice(0, 60),
    emoji: (emoji || '😊').slice(0, 2),
    time: Date.now(),
    province: province || '未知',
  }

  messages.push(msg)
  const trimmed = messages.slice(-200)
  await kvPut(c.env.KV, 'sidebar:guestbook', JSON.stringify(trimmed))
  await kvPut(c.env.KV, rlKey, '1', { expirationTtl: 300 })

  return c.json({ ok: true, message: msg })
})

// ==================== RANDOM QUOTE ====================
const QUOTES = [
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
  { text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson' },
  { text: 'The only way to learn a new programming language is by writing programs in it.', author: 'Dennis Ritchie' },
  { text: 'It\'s not a bug — it\'s an undocumented feature.', author: 'Anonymous' },
  { text: 'In order to be irreplaceable, one must always be different.', author: 'Coco Chanel' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'The computer was born to solve problems that did not exist before.', author: 'Bill Gates' },
  { text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Debugging is twice as hard as writing the code in the first place.', author: 'Brian Kernighan' },
  { text: '生活不止眼前的 bug，还有远方的 feature。', author: '匿名程序员' },
  { text: '世上无难事，只要肯放弃。', author: '互联网智慧' },
  { text: '代码写得好，头发掉得少。', author: '程序员格言' },
  { text: '不要重复造轮子，除非你想学习轮子是怎么造的。', author: '开源社区' },
  { text: '最好的代码是不存在的代码。', author: 'Jeff Atwood' },
]

sidebar.get('/api/sidebar/quote', (c) => {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  return c.json(quote)
})

// ==================== Helpers ====================
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip + 'sidebar-salt-2024')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Resolve province from IP via ip-api.com (returns Chinese province name) */
const ipProvinceCache = new Map<string, { prov: string; ts: number }>()
async function resolveProvinceFromIP(ip: string): Promise<string> {
  const cached = ipProvinceCache.get(ip)
  if (cached && Date.now() - cached.ts < 3600000) return cached.prov

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=regionName,country&lang=zh-CN`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (res.ok) {
      const data = await res.json() as { regionName?: string; country?: string }
      // ip-api returns regionName in Chinese when lang=zh-CN (e.g. "广东")
      let prov = data.regionName || ''
      // Normalize: remove trailing "省"/"市"/"自治区" etc for cleaner display
      prov = prov.replace(/(省|市|自治区|特别行政区|壮族自治区|回族自治区|维吾尔自治区)$/, '')
      if (!prov) prov = data.country || '未知'

      ipProvinceCache.set(ip, { prov, ts: Date.now() })
      if (ipProvinceCache.size > 500) {
        const oldest = [...ipProvinceCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
        if (oldest) ipProvinceCache.delete(oldest[0])
      }
      return prov
    }
  } catch {}
  return '未知'
}

export default sidebar
