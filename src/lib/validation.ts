/** lib/validation.ts — Input validation with Zod */
import { z } from 'zod'

// Profile
export const ProfileSchema = z.object({
  name: z.string().min(1).max(100),
  tagline: z.string().max(200).default(''),
  avatar: z.string().url().or(z.string().max(500)).default(''),
  bio: z.string().max(1000).default(''),
  location: z.string().max(100).default(''),
  email: z.string().email().or(z.string().max(0)).default(''),
  status: z.string().max(200).default(''),
  currentlyReading: z.string().max(200).default(''),
  quote: z.string().max(500).default(''),
  quoteAuthor: z.string().max(100).default(''),
  socials: z.object({
    github: z.string().max(500).default(''),
    twitter: z.string().max(500).default(''),
  }).default({}),
})

// Website
export const WebsiteSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  url: z.string().url().or(z.string().max(500)),
  tags: z.string().max(200).default(''),
  color: z.string().max(20).default('#6366F1'),
  icon: z.string().max(50).default('fa-solid fa-globe'),
  pinned: z.boolean().default(false),
  order: z.number().min(0).default(0),
})

export const WebsitesArraySchema = z.array(WebsiteSchema).max(100)

// Repo
export const RepoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  language: z.string().max(50).default(''),
  stars: z.number().min(0).default(0),
  forks: z.number().min(0).default(0),
  url: z.string().max(500).default(''),
})

export const ReposArraySchema = z.array(RepoSchema).max(200)

// Settings
export const SettingsSchema = z.object({
  storageMode: z.enum(['kv', 'local', 'external']).default('kv'),
  localServerUrl: z.string().max(500).default(''),
  localStoragePath: z.string().max(500).default('/data/portal/files'),
  externalUploadUrl: z.string().max(500).default(''),
  externalDownloadPrefix: z.string().max(500).default(''),
  maxFileSize: z.number().min(1).max(500).default(25),
})

// Password change
export const PasswordChangeSchema = z.object({
  oldPassword: z.string().min(1).max(200),
  newPassword: z.string().min(6).max(200),
})

// Username change
export const UsernameChangeSchema = z.object({
  newUsername: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, 'Invalid characters in username'),
})

// Share creation
export const ShareCreateSchema = z.object({
  fileKey: z.string().min(1),
  password: z.string().max(100).optional(),
  expiresIn: z.number().min(0).max(30 * 24 * 3600).optional(), // max 30 days
  maxDownloads: z.number().min(0).max(10000).optional(),
})

// External link
export const ExternalLinkSchema = z.object({
  displayName: z.string().min(1).max(200),
  originalName: z.string().max(200).default(''),
  externalUrl: z.string().url(),
  size: z.number().min(0).default(0),
  type: z.string().max(100).default('application/octet-stream'),
})

// Announcement
export const AnnouncementSchema = z.object({
  content: z.string().min(1).max(500),
  type: z.enum(['info', 'warning', 'success']).default('info'),
  enabled: z.boolean().default(true),
  expiresAt: z.number().optional(),
})

// File rename
export const FileRenameSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().min(1).max(200),
})

// GitHub tokens
export const TokensSchema = z.object({
  tokens: z.array(z.string().min(1).max(500)).max(50),
})

// Generic validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstError = result.error.errors[0]
  return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` }
}
