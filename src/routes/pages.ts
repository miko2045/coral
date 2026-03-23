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
      ? `${profile.name} 的全栈开发门户 — GitHub热门项目排行榜、开源项目推荐、软件资源下载、优质项目精选`
      : `${profile.name}'s Developer Portal — GitHub trending, open source picks, software downloads`,
    keywords: `${profile.name},GitHub,GitHub排行榜,GitHub热门项目,全栈开发,全栈开发者,软件库,软件下载,文件库,开源项目,开源项目推荐,好的项目,优质项目,项目推荐,项目导航,开发者工具,编程资源,程序员导航`,
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
      ? `精选好的项目 — ${sorted.length} 个优质网站项目展示，全栈开发作品集，值得收藏的好项目推荐`
      : `Best Projects — ${sorted.length} curated web projects, full-stack developer portfolio`,
    keywords: `好的项目,优质项目,项目推荐,项目展示,全栈开发,全栈开发者,网站推荐,网站导航,开发者作品集,web projects,portfolio,${profile.name}`,
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
      ? `GitHub开源项目推荐 — ${repos.length} 个优质仓库，发现GitHub上好的开源项目，值得Star的仓库推荐`
      : `GitHub Open Source Picks — ${repos.length} quality repos, discover the best open source projects`,
    keywords: `GitHub,GitHub项目,GitHub仓库,GitHub推荐,开源项目,开源项目推荐,好的项目,好的开源项目,全栈开发,代码分享,open source,repositories,${profile.name}`,
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
      ? `软件库文件下载中心 — ${sorted.length} 个免费资源，开发工具、实用软件、编程资源免费下载`
      : `Software Library — ${sorted.length} free resources, dev tools and programming files download`,
    keywords: `软件库,软件下载,文件库,文件下载,免费下载,免费软件,工具下载,开发工具,开发资源,编程资源,编程工具,实用软件,software download,free tools,${profile.name}`,
    canonical: '/downloads',
  })
})

// Google Search Console verification
pages.get('/google7683c8c49b0677e3.html', (c) => {
  return new Response('google-site-verification: google7683c8c49b0677e3.html', {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  })
})

// Baidu site verification
pages.get('/baidu_verify_codeva-JaoWqGeJlA.html', (c) => {
  return new Response('4f98a1f1d59e7e3a04cf9d8858cda653', {
    headers: { 'Content-Type': 'text/html; charset=UTF-8' },
  })
})

// Sitemap.xml for search engines
pages.get('/sitemap.xml', async (c) => {
  const siteUrl = 'https://likeok.online'
  const now = new Date().toISOString().split('T')[0]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${siteUrl}/projects</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${siteUrl}/github</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${siteUrl}/downloads</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${siteUrl}/trending</loc><lastmod>${now}</lastmod><changefreq>hourly</changefreq><priority>0.9</priority></url>
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
