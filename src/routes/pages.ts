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
  return c.render(homePage(profile, websites, repos, files, lang, activeAnnouncements), { title: `${profile.name} — Portal`, lang })
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
  return c.render(projectsPage(sorted, lang), { title: `${t('home', 'webProjects', lang)} — ${profile.name}`, lang })
})

// GitHub
pages.get('/github', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const [repos, profile] = await Promise.all([
    getData(c.env.KV, 'repos', DEFAULT_REPOS),
    getData(c.env.KV, 'profile', DEFAULT_PROFILE),
  ])
  return c.render(githubPage(repos, lang), { title: `${t('home', 'githubProjects', lang)} — ${profile.name}`, lang })
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
  return c.render(downloadsPage(sorted, lang, isAdmin), { title: `${t('home', 'downloadsTitle', lang)} — ${profile.name}`, lang })
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
