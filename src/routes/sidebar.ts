/** routes/sidebar.ts — Sidebar widget APIs: visitor map, guestbook, random quote */
import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { kvGet, kvPut } from '../lib/kv'

const sidebar = new Hono<AppEnv>()

// ==================== VISITOR MAP (China Provinces) ====================
// Valid province names for data cleanup
const validProvs = new Set([
  '北京','天津','上海','重庆','河北','山西','辽宁','吉林','黑龙江',
  '江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南',
  '广东','海南','四川','贵州','云南','陕西','甘肃','青海','台湾',
  '内蒙古','广西','西藏','宁夏','新疆','香港','澳门','海外',
])

/** Helper: get visitor data from KV, clean invalid keys */
async function getVisitorData(kv: KVNamespace) {
  const raw = await kvGet(kv, 'sidebar:visitors-v2')
  const data: { provinces: Record<string, number>; total: number } = raw
    ? JSON.parse(raw)
    : { provinces: {}, total: 0 }

  // Clean up invalid province keys
  let cleaned = false
  for (const key of Object.keys(data.provinces)) {
    if (!validProvs.has(key)) {
      delete data.provinces[key]
      cleaned = true
    }
  }
  if (cleaned) {
    data.total = Object.values(data.provinces).reduce((s, n) => s + n, 0)
    await kvPut(kv, 'sidebar:visitors-v2', JSON.stringify(data))
  }
  return data
}

/** GET /api/sidebar/visitors — read-only, returns current visitor data */
sidebar.get('/api/sidebar/visitors', async (c) => {
  const data = await getVisitorData(c.env.KV)
  return c.json(data)
})

/** POST /api/sidebar/visitors/track — record a visit (called once per page load) */
sidebar.post('/api/sidebar/visitors/track', async (c) => {
  const kv = c.env.KV
  const ip = c.req.header('x-real-ip')
    || c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('cf-connecting-ip')
    || ''

  // Deduplicate: use IP hash to prevent counting same visitor multiple times
  // If IP is empty/unknown, skip deduplication (count every request)
  if (ip) {
    const ipHash = await hashIP(ip)
    const dedupeKey = `sidebar:visitor-seen:${ipHash}`
    const alreadySeen = await kvGet(kv, dedupeKey)
    if (alreadySeen) {
      // Already counted this IP recently, just return current data
      const data = await getVisitorData(kv)
      return c.json(data)
    }
    // Mark this IP as seen for 10 minutes
    await kvPut(kv, dedupeKey, '1', { expirationTtl: 600 })
  }

  // Resolve province from IP
  let province = ''
  if (ip && ip !== '127.0.0.1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
    province = await resolveProvinceFromIP(ip)
  }
  if (!province) {
    province = '未知'
  }

  // Get existing visitor data
  const data = await getVisitorData(kv)

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
    province = await resolveProvinceFromIP(ip)
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

/** Resolve province from IP via multiple APIs (with fallback) */
const ipProvinceCache = new Map<string, { prov: string; ts: number }>()
async function resolveProvinceFromIP(ip: string): Promise<string> {
  const cached = ipProvinceCache.get(ip)
  if (cached && Date.now() - cached.ts < 3600000) return cached.prov

  let prov = ''

  // Try Baidu opendata API first (works from Chinese servers, no key needed)
  try {
    const res = await fetch(
      `https://opendata.baidu.com/api.php?query=${ip}&co=&resource_id=6006&oe=utf8`,
      { signal: AbortSignal.timeout(3000) }
    )
    if (res.ok) {
      const json = await res.json() as any
      const location: string = json?.data?.[0]?.location || ''
      prov = extractProvince(location)
    }
  } catch {}

  // Fallback: try 太平洋网 IP API (works well from Chinese servers)
  if (!prov) {
    try {
      const res = await fetch(
        `https://whois.pconline.com.cn/ipJson.jsp?ip=${ip}&json=true`,
        { signal: AbortSignal.timeout(3000) }
      )
      if (res.ok) {
        // Response is GBK-encoded, but province names are in ASCII-compatible range
        const text = await res.text()
        try {
          const json = JSON.parse(text) as any
          const pro: string = json?.pro || '' // e.g. "湖北省"
          const addr: string = json?.addr || '' // e.g. "湖北省武汉市"
          if (pro) {
            prov = extractProvince(pro)
          }
          if (!prov && addr) {
            prov = extractProvince(addr)
          }
          // If API returned data but no province (foreign IP), check addr
          if (!prov && addr && !addr.includes('中国') && addr.length > 0) {
            prov = '海外'
          }
        } catch {
          // JSON parse failed, try regex extraction from text
          const proMatch = text.match(/"pro"\s*:\s*"([^"]+)"/)
          if (proMatch) {
            prov = extractProvince(proMatch[1])
          }
        }
      }
    } catch {}
  }

  // Fallback 2: try ip-api.com (works from overseas servers)
  if (!prov) {
    try {
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,regionName&lang=zh-CN`,
        { signal: AbortSignal.timeout(3000) }
      )
      if (res.ok) {
        const json = await res.json() as any
        if (json?.status === 'success') {
          if (json.country === '中国') {
            prov = extractProvince(json.regionName || '')
            if (!prov) prov = extractProvince((json.regionName || '') + '省')
          } else {
            prov = '海外'
          }
        }
      }
    } catch {}
  }

  if (prov) {
    ipProvinceCache.set(ip, { prov, ts: Date.now() })
    if (ipProvinceCache.size > 500) {
      const oldest = [...ipProvinceCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      if (oldest) ipProvinceCache.delete(oldest[0])
    }
  }
  return prov || '未知'
}

/** Extract province name from location string (Baidu / pconline / ip-api) */
function extractProvince(location: string): string {
  if (!location) return ''
  // Strip common carrier names to avoid false positives
  // e.g. "中国 移动", "中国 联通", "中国 电信", "中国 铁通"
  const carriers = ['移动', '联通', '电信', '铁通', '长城宽带', '鹏博士']
  let cleaned = location.trim()
  // If location is ONLY "中国" + carrier (no province info), return empty
  for (const c of carriers) {
    if (cleaned === `中国 ${c}` || cleaned === `中国${c}`) return ''
  }
  
  // Direct municipality matches
  const municipalities = ['北京', '天津', '上海', '重庆']
  for (const m of municipalities) {
    if (cleaned.includes(m)) return m
  }
  // Match "XX省" pattern (allow anywhere in string, not just start)
  const provMatch = cleaned.match(/([\u4e00-\u9fff]{2,3}?)省/)
  if (provMatch) return provMatch[1]
  // Match autonomous regions (allow anywhere)
  const autoMatch = cleaned.match(/(内蒙古|广西|西藏|宁夏|新疆)/)
  if (autoMatch) return autoMatch[1]
  // Match SARs
  if (cleaned.includes('香港')) return '香港'
  if (cleaned.includes('澳门')) return '澳门'
  if (cleaned.includes('台湾')) return '台湾'
  // "中国" without province detail — treat as unknown domestic (let fallback handle)
  if (cleaned.includes('中国')) return ''
  // Anything else is foreign (e.g. "美国", "日本", "澳大利亚") → "海外"
  if (cleaned.length > 0) return '海外'
  return ''
}

export default sidebar
