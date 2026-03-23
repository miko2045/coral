/** lib/constants.ts — Default data & configuration constants */
import type { Profile, Website, Repo, Settings } from '../types'

export const DEFAULT_PROFILE: Profile = {
  name: 'Alex Chen',
  tagline: 'Builder · Dreamer · Explorer',
  avatar: '/static/avatar.svg',
  bio: '热爱构建美好的数字产品，用代码把想法变成现实。相信好的设计能让世界更有趣。',
  location: 'Shanghai, China',
  email: 'hello@example.com',
  status: '正在探索 WebAssembly 的无限可能',
  currentlyReading: '《Designing Data-Intensive Applications》',
  quote: 'The best way to predict the future is to invent it.',
  quoteAuthor: 'Alan Kay',
  socials: {
    github: 'https://github.com/miko2045',
    twitter: 'https://twitter.com',
  },
}

export const DEFAULT_WEBSITES: Website[] = [
  { id: '1', title: 'Cloudflare Dashboard', description: '一个现代化的云服务管理面板，支持实时监控和数据可视化', url: 'https://dash.cloudflare.com', tags: 'Hono,TypeScript,D1', color: '#F6A623', icon: 'fa-solid fa-cloud' },
  { id: '2', title: 'AI Writing Studio', description: '基于 AI 的智能写作助手，让创作更高效', url: 'https://example.com', tags: 'React,OpenAI,TailwindCSS', color: '#7C5CFC', icon: 'fa-solid fa-wand-magic-sparkles' },
  { id: '3', title: 'Photo Gallery', description: '极简风格的在线相册，支持图片压缩和 CDN 加速', url: 'https://example.com', tags: 'Astro,R2,WASM', color: '#22C55E', icon: 'fa-solid fa-camera-retro' },
]

export const DEFAULT_REPOS: Repo[] = [
  { id: '1', name: 'coral', description: '个人门户网站 — Hono + Cloudflare Pages 全栈项目', language: 'TypeScript', stars: 0, forks: 0, url: 'https://github.com/miko2045/coral' },
  { id: '2', name: 'Micro-Lab', description: '⚡ 微交互实验室 — Apple 风格 60fps 微交互组件展示，6层纵深安全防护', language: 'TypeScript', stars: 0, forks: 0, url: 'https://github.com/miko2045/Micro-Lab' },
  { id: '3', name: 'NIST', description: '后量子密码学迁移工具包 — 自动扫描脆弱加密算法，一键迁移到 NIST 后量子密码标准', language: 'JavaScript', stars: 1, forks: 0, url: 'https://github.com/miko2045/NIST' },
  { id: '4', name: 'Student-verification', description: '学生身份验证系统', language: 'JavaScript', stars: 1, forks: 0, url: 'https://github.com/miko2045/Student-verification' },
  { id: '5', name: 'void', description: 'Void 项目', language: 'JavaScript', stars: 1, forks: 0, url: 'https://github.com/miko2045/void' },
  { id: '6', name: 'gitea', description: '轻量级 Git 代码托管服务', language: 'TypeScript', stars: 0, forks: 0, url: 'https://github.com/miko2045/gitea' },
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

export const TRENDING_CACHE_TTL = 7200
export const TRENDING_RATE_LIMIT_WINDOW = 3600
export const TRENDING_RATE_LIMIT_MAX = 30
export const TRENDING_TOKEN_COOLDOWN = 600

// File server auth
export const FILE_SERVER_SECRET_HEADER = 'X-FileServer-Secret'
