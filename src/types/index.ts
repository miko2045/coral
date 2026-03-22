/** types/index.ts — Shared type definitions */

export type Bindings = {
  KV: KVNamespace
  GITHUB_TOKENS?: string
  GITHUB_APP_ID?: string
  GITHUB_APP_PRIVATE_KEY?: string
  GITHUB_APP_INSTALLATION_ID?: string
}

export type AppEnv = { Bindings: Bindings }

export interface Profile {
  name: string
  tagline: string
  avatar: string
  bio: string
  location: string
  email: string
  status: string
  currentlyReading: string
  quote: string
  quoteAuthor: string
  socials: {
    github?: string
    twitter?: string
  }
}

export interface Website {
  id: string
  title: string
  description: string
  url: string
  tags: string
  color: string
  icon: string
}

export interface Repo {
  id: string
  name: string
  description: string
  language: string
  stars: number
  forks: number
  url: string
}

export interface FileMeta {
  key: string
  displayName: string
  originalName: string
  storedName?: string
  size: number
  type: string
  uploadedAt: string
  storageType?: 'kv' | 'local'
  isExternal?: boolean
  externalUrl?: string
}

export interface ShareLink {
  id: string
  fileKey: string
  fileName: string
  password?: string // PBKDF2 hashed
  expiresAt?: number // timestamp ms
  maxDownloads?: number
  downloads: number
  createdAt: number
}

export interface Settings {
  storageMode: 'kv' | 'local' | 'external'
  localServerUrl: string
  localStoragePath: string
  externalUploadUrl: string
  externalDownloadPrefix: string
  maxFileSize: number
}

export interface Announcement {
  id: string
  content: string
  type: 'info' | 'warning' | 'success'
  enabled: boolean
  createdAt: number
  expiresAt?: number // optional auto-expire
}

export interface SessionData {
  ip: string
  createdAt: number
  userAgent?: string
}

export interface RateLimitEntry {
  count: number
  windowStart: number
}

export interface TokenConfig {
  envTokens?: string
  appId?: string
  privateKey?: string
  installationId?: string
}

export interface CachedData {
  repos: any[]
  timestamp: string
  apiStatus: string
}

// File upload: dangerous extensions blacklist
export const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif', 'hta',
  'cpl', 'inf', 'reg', 'rgs', 'ws', 'wsf', 'wsc', 'wsh',
  'ps1', 'ps1xml', 'ps2', 'ps2xml', 'psc1', 'psc2',
  'vbs', 'vbe', 'js', 'jse', 'shs', 'shb', 'lnk',
])

// Allowed MIME type prefixes for upload
export const ALLOWED_MIME_PREFIXES = [
  'image/', 'video/', 'audio/', 'text/', 'font/',
  'application/pdf', 'application/zip', 'application/gzip',
  'application/x-tar', 'application/x-rar', 'application/x-7z',
  'application/json', 'application/xml',
  'application/msword', 'application/vnd.ms',
  'application/vnd.openxmlformats',
  'application/octet-stream', // generic binary fallback
]
