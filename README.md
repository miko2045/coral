# Portal — Personal Portal Website

## Project Overview
- **Name**: Portal (coral)
- **Goal**: A feature-rich personal portal/homepage with admin dashboard, file sharing, GitHub trending, and more
- **Tech Stack**: Hono + TypeScript + Cloudflare Pages + KV Storage

## Features

### Completed Features
- **Homepage**: Profile display, stats, navigation cards, quotes, side decorations
- **Projects Page**: Website project gallery with tags and icons
- **GitHub Page**: Repository showcase with language badges
- **Downloads Page**: File browser with search, admin-only share button
- **Trending Page**: GitHub trending leaderboard with token pool, scrape fallback, rate limiting
- **Admin Dashboard**: Full management panel with sidebar navigation
  - Profile editing (name, tagline, avatar, bio, socials)
  - Website CRUD
  - Repository CRUD
  - File management (upload, external links, delete with cascade)
  - Share link management (list, delete)
  - Announcement system (create, toggle, delete, auto-expiry)
  - GitHub token pool management
  - Storage settings (KV / Local / External modes)
  - Security settings (password change, username change)
- **File Sharing**: Password-protected shares, expiration, download limits, one-time download tokens
- **Announcement System**: Homepage banners with types (info/warning/success), dismissible, auto-expiry
- **Dark Mode**: 3-state toggle (light / dark / auto with system preference detection)
- **i18n**: Complete Chinese/English bilingual support
- **Security**:
  - PBKDF2 password hashing (100k iterations, SHA-256)
  - KV-backed brute-force rate limiting (login + share passwords)
  - Safe JSON injection prevention (safeJsonStringify)
  - File type validation (dangerous extension blocklist + MIME whitelist)
  - One-time download tokens for share links
  - Session management with HttpOnly cookies
  - Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
  - Anti-crawler middleware
- **Storage**:
  - KV ArrayBuffer storage (no base64 bloat)
  - Local file server proxy mode
  - External link mode
  - File server auth with X-FileServer-Secret header
- **SPA Router**: Smooth page transitions with prefetching
- **Zod Validation**: All admin API inputs validated with Zod schemas

### Architecture
```
src/
  index.tsx          # Main entry (66 lines, middleware + route mounting)
  types/index.ts     # Shared TypeScript types
  lib/
    auth.ts          # Auth, sessions, rate limiting, password hashing
    constants.ts     # Default data, configuration constants
    kv.ts            # KV operations with in-memory fallback
    validation.ts    # Zod validation schemas
  routes/
    pages.ts         # Public pages (home, projects, github, downloads)
    auth.ts          # Login/logout/session
    admin.ts         # Admin dashboard + CRUD APIs
    share.ts         # File sharing system
    files.ts         # File download API
    trending.ts      # GitHub trending with token pool
  home.tsx           # Homepage component
  projects.tsx       # Projects page component
  github.tsx         # GitHub page component
  downloads.tsx      # Downloads page component
  trending.tsx       # Trending page component
  admin.tsx          # Admin panel component
  layout.tsx         # Page layout wrapper
  i18n.ts            # Translation dictionary
public/static/
  app.js             # Frontend SPA logic
  admin.js           # Admin panel logic
  style.css          # Main styles
  admin.css          # Admin styles
  fontawesome.css    # FontAwesome icons
fileserver.mjs       # Local file server (Node.js, for VPS)
```

## URLs
- **API Endpoints**:
  - `GET /` — Homepage
  - `GET /projects` — Projects page
  - `GET /github` — GitHub page
  - `GET /downloads` — Downloads page
  - `GET /trending` — Trending page
  - `GET /api/data` — Public data (profile, websites, repos, files)
  - `GET /api/set-lang?lang=zh|en` — Switch language
  - `GET /api/download/:key` — Download file
  - `GET /api/trending?tab=hot|rising&lang_filter=&refresh=0|1` — Trending API
  - `GET /s/:id` — Share page
  - `POST /s/:id` — Share password verify
  - `GET /s/:id/download?t=TOKEN` — Token-verified download
  - `GET /admin/login` — Admin login page
  - `POST /admin/login` — Admin login
  - `GET /admin` — Admin dashboard
  - `POST /admin/api/profile` — Update profile
  - `POST /admin/api/websites` — Update websites
  - `POST /admin/api/repos` — Update repos
  - `POST /admin/api/upload` — Upload file
  - `POST /admin/api/add-link` — Add external link
  - `POST /admin/api/delete-file` — Delete file (cascade to shares)
  - `POST /admin/api/settings` — Update settings
  - `POST /admin/api/password` — Change password
  - `POST /admin/api/username` — Change username
  - `POST /admin/api/share` — Create share link
  - `GET /admin/api/shares` — List shares
  - `POST /admin/api/share/delete` — Delete share
  - `GET /admin/api/announcements` — List announcements
  - `POST /admin/api/announcements` — Create announcement
  - `POST /admin/api/announcements/delete` — Delete announcement
  - `POST /admin/api/announcements/toggle` — Toggle announcement
  - `GET /admin/api/github-tokens` — Token pool status
  - `POST /admin/api/github-tokens` — Replace tokens
  - `POST /admin/api/github-tokens/add` — Add tokens
  - `POST /admin/api/github-tokens/remove` — Remove tokens

## Data Architecture
- **Storage**: Cloudflare KV (primary), in-memory Map (fallback)
- **File Storage**: KV ArrayBuffer, Local file server proxy, or External links
- **Session**: KV-backed with 24h TTL
- **Rate Limiting**: KV-backed per-IP counters with TTL
- **Trending Cache**: KV-backed with 1h TTL

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Active
- **Dev Command**: `npm run build && pm2 start ecosystem.config.cjs`
- **Deploy Command**: `npm run deploy`
- **Last Updated**: 2026-03-22

## User Guide
1. Visit the homepage to see your profile, projects, and navigation
2. Use `/admin/login` to access the admin panel (default: admin / admin123)
3. **Change the default password immediately** in Settings > Security
4. Manage content through the admin sidebar tabs
5. Upload files via the Files tab, create share links from the Downloads page
6. Configure GitHub tokens in the Tokens tab for better trending data
7. Create announcements that display as banners on the homepage
8. Toggle theme between light, dark, and auto (system preference)
9. Switch language between Chinese and English via the header button

## Development
```bash
npm install
npm run build
pm2 start ecosystem.config.cjs
# Access at http://localhost:3000
```

## File Server (for VPS local storage mode)
```bash
# Set auth secret for security
export FILE_SERVER_SECRET="your-secure-random-string"
node fileserver.mjs
# Then configure the same secret in your Cloudflare Worker's KV as 'fileserver_secret'
```
