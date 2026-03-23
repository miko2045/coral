/** routes/pages.ts — Public page routes (home, projects, github, downloads) */
import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { parseLang, t } from '../i18n'
import { getData } from '../lib/kv'
import { checkAuth } from '../lib/auth'
import { DEFAULT_PROFILE, DEFAULT_WEBSITES, DEFAULT_REPOS, DEFAULT_SETTINGS } from '../lib/constants'
import { homePage } from '../home'
import { projectsPage } from '../projects'
import { githubPage } from '../github'
import { downloadsPage } from '../downloads'
import type { Announcement } from '../types'

const pages = new Hono<AppEnv>()

// Home
pages.get('/', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const [profile, websites, repos, files, announcements] = await Promise.all([
    getData(c.env.KV, 'profile', DEFAULT_PROFILE),
    getData(c.env.KV, 'websites', DEFAULT_WEBSITES),
    getData(c.env.KV, 'repos', DEFAULT_REPOS),
    getData(c.env.KV, 'files', []),
    getData<Announcement[]>(c.env.KV, 'announcements', []),
  ])
  const activeAnnouncements = announcements.filter(a => a.enabled && (!a.expiresAt || Date.now() < a.expiresAt))
  return c.render(homePage(profile, websites, repos, files, lang, activeAnnouncements), {
    title: `${profile.name} — ${profile.tagline || 'Portal'}`,
    lang,
    description: lang === 'zh'
      ? `${profile.name} 的个人门户 — ${profile.tagline}。${profile.bio}`
      : `${profile.name}'s Portal — ${profile.tagline}. Projects, GitHub repos, downloads and more.`,
    keywords: `${profile.name},个人网站,开发者,项目展示,GitHub,portfolio,developer`,
    canonical: '/',
  })
})

// Projects
pages.get('/projects', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const [websites, profile] = await Promise.all([
    getData(c.env.KV, 'websites', DEFAULT_WEBSITES),
    getData(c.env.KV, 'profile', DEFAULT_PROFILE),
  ])
  // Sort: pinned first, then by order
  const sorted = [...websites].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (a.order || 0) - (b.order || 0)
  })
  return c.render(projectsPage(sorted, lang), {
    title: `${t('home', 'webProjects', lang)} — ${profile.name}`,
    lang,
    description: lang === 'zh'
      ? `${profile.name} 的网站项目展示 — 查看 ${sorted.length} 个精选网站项目`
      : `${profile.name}'s web projects — Explore ${sorted.length} curated websites`,
    keywords: `${profile.name},项目,网站,web projects,portfolio`,
    canonical: '/projects',
  })
})

// GitHub
pages.get('/github', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const [repos, profile] = await Promise.all([
    getData(c.env.KV, 'repos', DEFAULT_REPOS),
    getData(c.env.KV, 'profile', DEFAULT_PROFILE),
  ])
  return c.render(githubPage(repos, lang), {
    title: `${t('home', 'githubProjects', lang)} — ${profile.name}`,
    lang,
    description: lang === 'zh'
      ? `${profile.name} 的 GitHub 开源项目 — ${repos.length} 个仓库`
      : `${profile.name}'s GitHub repos — ${repos.length} repositories`,
    keywords: `${profile.name},GitHub,开源,仓库,open source,repositories`,
    canonical: '/github',
  })
})

// Downloads
pages.get('/downloads', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const [files, profile, isAdmin] = await Promise.all([
    getData(c.env.KV, 'files', []),
    getData(c.env.KV, 'profile', DEFAULT_PROFILE),
    checkAuth(c),
  ])
  // Sort: pinned first, then by order
  const sorted = [...files].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (a.order || 0) - (b.order || 0)
  })
  return c.render(downloadsPage(sorted, lang, isAdmin), {
    title: `${t('home', 'downloadsTitle', lang)} — ${profile.name}`,
    lang,
    description: lang === 'zh'
      ? `${profile.name} 的文件下载中心 — ${sorted.length} 个可下载文件`
      : `${profile.name}'s downloads — ${sorted.length} files available`,
    keywords: `${profile.name},下载,文件,downloads,files`,
    canonical: '/downloads',
  })
})

// Sitemap.xml for search engines
pages.get('/sitemap.xml', async (c) => {
  const siteUrl = 'https://likeok.online'
  const now = new Date().toISOString().split('T')[0]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${siteUrl}/projects</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${siteUrl}/github</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${siteUrl}/downloads</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${siteUrl}/trending</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>
</urlset>`
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=UTF-8', 'Cache-Control': 'public, max-age=3600' },
  })
})

// robots.txt (app-level, supplements Cloudflare-managed robots.txt)
pages.get('/robots.txt', (c) => {
  const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /s/

Sitemap: https://likeok.online/sitemap.xml
`
  return new Response(txt, {
    headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
  })
})

// Public data API (sanitized — no sensitive file keys exposed)
pages.get('/api/data', async (c) => {
  const [profile, websites, repos, files] = await Promise.all([
    getData(c.env.KV, 'profile', DEFAULT_PROFILE),
    getData(c.env.KV, 'websites', DEFAULT_WEBSITES),
    getData(c.env.KV, 'repos', DEFAULT_REPOS),
    getData(c.env.KV, 'files', []),
  ])
  // Don't expose file keys in public API (keys allow direct download)
  const safeFiles = files.map((f: any) => ({
    displayName: f.displayName,
    size: f.size,
    type: f.type,
    uploadedAt: f.uploadedAt,
  }))
  return c.json({ profile, websites, repos, files: safeFiles })
})

// Language switch (with open redirect protection)
pages.get('/api/set-lang', (c) => {
  const lang = c.req.query('lang') === 'en' ? 'en' : 'zh'
  // Validate Referer to prevent open redirect — only allow same-origin relative paths
  let redirect = '/'
  const referer = c.req.header('Referer') || ''
  if (referer) {
    try {
      const refUrl = new URL(referer)
      const reqUrl = new URL(c.req.url)
      // Only allow same-origin redirects
      if (refUrl.origin === reqUrl.origin) {
        redirect = refUrl.pathname + refUrl.search
      }
    } catch {
      // Invalid URL — use default
    }
  }
  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirect,
      'Set-Cookie': `portal_lang=${lang}; Path=/; SameSite=Lax; Max-Age=${365 * 24 * 3600}`,
    },
  })
})

export default pages
