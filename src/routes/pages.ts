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
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  const announcements: Announcement[] = await getData(c.env.KV, 'announcements', [])
  const activeAnnouncements = announcements.filter(a => a.enabled && (!a.expiresAt || Date.now() < a.expiresAt))
  return c.render(homePage(profile, websites, repos, files, lang, activeAnnouncements), { title: `${profile.name} — Portal`, lang })
})

// Projects
pages.get('/projects', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  return c.render(projectsPage(websites, lang), { title: `${t('home', 'webProjects', lang)} — ${profile.name}`, lang })
})

// GitHub
pages.get('/github', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  return c.render(githubPage(repos, lang), { title: `${t('home', 'githubProjects', lang)} — ${profile.name}`, lang })
})

// Downloads
pages.get('/downloads', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const files = await getData(c.env.KV, 'files', [])
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const isAdmin = await checkAuth(c)
  return c.render(downloadsPage(files, lang, isAdmin), { title: `${t('home', 'downloadsTitle', lang)} — ${profile.name}`, lang })
})

// Public data API
pages.get('/api/data', async (c) => {
  const profile = await getData(c.env.KV, 'profile', DEFAULT_PROFILE)
  const websites = await getData(c.env.KV, 'websites', DEFAULT_WEBSITES)
  const repos = await getData(c.env.KV, 'repos', DEFAULT_REPOS)
  const files = await getData(c.env.KV, 'files', [])
  return c.json({ profile, websites, repos, files })
})

// Language switch
pages.get('/api/set-lang', (c) => {
  const lang = c.req.query('lang') === 'en' ? 'en' : 'zh'
  const referer = c.req.header('Referer') || '/'
  return new Response(null, {
    status: 302,
    headers: {
      'Location': referer,
      'Set-Cookie': `portal_lang=${lang}; Path=/; SameSite=Lax; Max-Age=${365 * 24 * 3600}`,
    },
  })
})

export default pages
