/** lib/constants.ts — Default data & configuration constants */
import type { Profile, Website, Repo, Settings } from '../types'

export const DEFAULT_PROFILE: Profile = {
  name: 'Alex Chen',
  tagline: 'Builder · Dreamer · Explorer',
  avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=transparent',
  bio: '热爱构建美好的数字产品，用代码把想法变成现实。相信好的设计能让世界更有趣。',
  location: 'Shanghai, China',
  email: 'hello@example.com',
  status: '正在探索 WebAssembly 的无限可能',
  currentlyReading: '《Designing Data-Intensive Applications》',
  quote: 'The best way to predict the future is to invent it.',
  quoteAuthor: 'Alan Kay',
  socials: {
    github: 'https://github.com',
    twitter: 'https://twitter.com',
  },
}

export const DEFAULT_WEBSITES: Website[] = [
  { id: '1', title: 'Cloudflare Dashboard', description: '一个现代化的云服务管理面板，支持实时监控和数据可视化', url: 'https://dash.cloudflare.com', tags: 'Hono,TypeScript,D1', color: '#F6A623', icon: 'fa-solid fa-cloud' },
  { id: '2', title: 'AI Writing Studio', description: '基于 AI 的智能写作助手，让创作更高效', url: 'https://example.com', tags: 'React,OpenAI,TailwindCSS', color: '#7C5CFC', icon: 'fa-solid fa-wand-magic-sparkles' },
  { id: '3', title: 'Photo Gallery', description: '极简风格的在线相册，支持图片压缩和 CDN 加速', url: 'https://example.com', tags: 'Astro,R2,WASM', color: '#22C55E', icon: 'fa-solid fa-camera-retro' },
]

export const DEFAULT_REPOS: Repo[] = [
  { id: '1', name: 'hono-starter', description: '一套开箱即用的 Hono + Cloudflare Pages 项目模板', language: 'TypeScript', stars: 128, forks: 32, url: 'https://github.com' },
  { id: '2', name: 'bento-css', description: '纯 CSS 实现的 Bento Grid 布局库，零依赖', language: 'CSS', stars: 256, forks: 45, url: 'https://github.com' },
  { id: '3', name: 'mini-orm', description: '轻量级 D1 数据库 ORM，支持类型安全查询', language: 'TypeScript', stars: 89, forks: 12, url: 'https://github.com' },
  { id: '4', name: 'pixel-weather', description: '像素风格的天气小组件，可嵌入任何网页', language: 'JavaScript', stars: 67, forks: 8, url: 'https://github.com' },
]

export const DEFAULT_SETTINGS: Settings = {
  storageMode: 'kv',
  localServerUrl: '',
  localStoragePath: '/data/portal/files',
  externalUploadUrl: '',
  externalDownloadPrefix: '',
  maxFileSize: 25,
}

// Rate limiting
export const LOGIN_MAX_ATTEMPTS = 5
export const LOGIN_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export const SHARE_PASSWORD_MAX_ATTEMPTS = 10
export const SHARE_PASSWORD_WINDOW_S = 300 // 5 minutes

export const TRENDING_CACHE_TTL = 3600
export const TRENDING_RATE_LIMIT_WINDOW = 3600
export const TRENDING_RATE_LIMIT_MAX = 30
export const TRENDING_TOKEN_COOLDOWN = 600

// File server auth
export const FILE_SERVER_SECRET_HEADER = 'X-FileServer-Secret'
