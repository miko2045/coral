# Portal — Personal Portal Website

## Project Overview
- **Name**: Portal (coral)
- **Goal**: A feature-rich personal portal/homepage with admin dashboard, file sharing, GitHub trending, and more
- **Tech Stack**: Hono + TypeScript + Cloudflare Pages + KV Storage
- **GitHub**: https://github.com/miko2045/coral

## Security Audit (2026-03-22)

### Vulnerabilities Found & Fixed (14 total)

#### 🔴 CRITICAL (4)
| # | Vulnerability | Status | Fix |
|---|---|---|---|
| 1 | **Open Redirect** in `/api/set-lang` via Referer hijack | ✅ Fixed | Same-origin validation, blocks `javascript:`/external URLs |
| 2 | **Stored XSS** in share page via unescaped `fileName` | ✅ Fixed | `escapeHtml()` for all HTML interpolation |
| 3 | **Toast XSS** in admin panel via `innerHTML` | ✅ Fixed | Switched to `textContent` + DOM API |
| 4 | **External URL redirect** allows `javascript:` protocol | ✅ Fixed | `isSafeRedirectUrl()` validates http/https only |

#### 🟡 HIGH (6)
| # | Vulnerability | Status | Fix |
|---|---|---|---|
| 5 | **No CSRF protection** on admin POST APIs | ✅ Fixed | `X-CSRF-Token` header required, validated via KV |
| 6 | **Unlimited concurrent sessions** | ✅ Fixed | Max 3 sessions, oldest auto-invalidated |
| 7 | **Fileserver CORS wildcard** (`*`) | ✅ Fixed | Restricted to localhost origins only |
| 8 | **Fileserver health leak** (exposes storage path) | ✅ Fixed | Health endpoint now requires auth |
| 9 | **File key path traversal** | ✅ Fixed | Strict regex `[a-zA-Z0-9_-]` validation |
| 10 | **Content-Disposition injection** | ✅ Fixed | RFC 5987 encoding for filenames |

#### 🟠 MEDIUM (4)
| # | Vulnerability | Status | Fix |
|---|---|---|---|
| 11 | **Public API exposes file keys** (enables direct download) | ✅ Fixed | `/api/data` only returns safe metadata |
| 12 | **Weak CSP** (missing directives) | ✅ Fixed | Added `object-src`, `base-uri`, `form-action`, `frame-ancestors` |
| 13 | **Missing Permissions-Policy** | ✅ Fixed | Restricts camera, microphone, geolocation, etc. |
| 14 | **Rate limit key collision** | ✅ Fixed | Namespaced prefix `trending_ratelimit:` |

### Additional Hardening
- **HSTS**: Upgraded to 63072000s with `preload`
- **Admin cache**: `no-store` prevents sensitive page caching
- **Cookie**: `__Host-` prefix on HTTPS, standard on HTTP
- **Fileserver**: Added `nosniff`, `X-Frame-Options`, filename sanitization

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
  - CSRF token protection on all admin POST APIs
  - KV-backed brute-force rate limiting (login + share passwords)
  - Session management with max 3 concurrent sessions
  - Safe JSON injection prevention (safeJsonStringify)
  - HTML escaping for all user-controlled output
  - File type validation (dangerous extension blocklist + MIME whitelist)
  - One-time download tokens for share links
  - Comprehensive security headers (CSP, HSTS, Permissions-Policy, etc.)
  - Anti-crawler middleware
  - Open redirect protection
  - File key path traversal prevention
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
  index.tsx          # Main entry (middleware + route mounting)
  types/index.ts     # Shared TypeScript types
  lib/
    auth.ts          # Auth, sessions, CSRF, rate limiting, password hashing
    constants.ts     # Default data, configuration constants
    kv.ts            # KV operations with in-memory fallback
    validation.ts    # Zod validation schemas
  routes/
    pages.ts         # Public pages (home, projects, github, downloads)
    auth.ts          # Login/logout/session
    admin.ts         # Admin dashboard + CRUD APIs (CSRF protected)
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

## Deployment

### VPS Deployment (Recommended)
```bash
# 1. Clone from GitHub
git clone https://github.com/miko2045/coral.git
cd coral

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Configure environment (optional)
# For file server mode:
export FILE_SERVER_SECRET="$(openssl rand -hex 32)"
export FILE_SERVER_PORT=8899
export FILE_STORAGE_PATH=/data/portal/files

# 5. Start with PM2
pm2 start ecosystem.config.cjs

# 6. Access
# Main app: http://localhost:3000
# File server: http://localhost:8899 (if enabled)

# 7. IMPORTANT: Change default password!
# Login at /admin/login (default: admin / admin123)
# Go to Settings > Change Password immediately
```

### Update Deployment
```bash
cd coral
git pull origin main
npm run build
pm2 restart all
```

### Reverse Proxy (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## API Endpoints
- `GET /` — Homepage
- `GET /projects` — Projects page
- `GET /github` — GitHub page
- `GET /downloads` — Downloads page
- `GET /trending` — Trending page
- `GET /api/data` — Public data (sanitized, no file keys)
- `GET /api/set-lang?lang=zh|en` — Switch language (open redirect protected)
- `GET /api/download/:key` — Download file (key validated)
- `GET /s/:id` — Share page
- `POST /s/:id` — Share password verify (rate limited)
- `GET /s/:id/download?t=TOKEN` — Token-verified download
- `GET /admin/login` — Admin login page
- `POST /admin/login` — Admin login (rate limited)
- `GET /admin` — Admin dashboard
- `POST /admin/api/*` — All admin APIs require session + CSRF token

## Data Architecture
- **Storage**: Cloudflare KV (primary), in-memory Map (fallback)
- **File Storage**: KV ArrayBuffer, Local file server proxy, or External links
- **Session**: KV-backed with 24h TTL, max 3 concurrent
- **CSRF**: KV-backed per-session tokens with 1h TTL
- **Rate Limiting**: KV-backed per-IP counters with TTL
- **Trending Cache**: KV-backed with 1h TTL

## User Guide
1. Visit the homepage to see your profile, projects, and navigation
2. Use `/admin/login` to access the admin panel (default: admin / admin123)
3. **⚠️ Change the default password immediately** in Settings > Security
4. Manage content through the admin sidebar tabs
5. Upload files via the Files tab, create share links from the Downloads page
6. Configure GitHub tokens in the Tokens tab for better trending data
7. Create announcements that display as banners on the homepage
8. Toggle theme between light, dark, and auto (system preference)
9. Switch language between Chinese and English via the header button

## Last Updated
2026-03-22 — Security audit complete, 14 vulnerabilities fixed
