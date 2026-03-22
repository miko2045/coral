/** routes/share.ts — File sharing system (create, view, download with token verification) */
import { Hono } from 'hono'
import type { AppEnv, ShareLink, FileMeta } from '../types'
import { parseLang } from '../i18n'
import { kvGet, kvPut, getData } from '../lib/kv'
import { checkAuth, hashPassword, verifyPassword, generateShareId, generateDownloadToken, validateDownloadToken, getClientIP, checkSharePasswordLimit, recordSharePasswordAttempt } from '../lib/auth'
import { validate, ShareCreateSchema } from '../lib/validation'
import { DEFAULT_SETTINGS } from '../lib/constants'
import { escapeHtml } from '../lib/auth'
import type { Lang } from '../i18n'

const share = new Hono<AppEnv>()

// Create share link (admin only)
share.post('/admin/api/share', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)

  const data = await c.req.json()
  const result = validate(ShareCreateSchema, data)
  if (!result.success) return c.json({ error: result.error }, 400)

  const { fileKey, password, expiresIn, maxDownloads } = result.data

  // Verify file exists
  const files: FileMeta[] = await getData(c.env.KV, 'files', [])
  const file = files.find(f => f.key === fileKey)
  if (!file) return c.json({ error: 'File not found' }, 404)

  const shareId = generateShareId() // 32 hex chars, cryptographically secure
  const shareData: ShareLink = {
    id: shareId,
    fileKey,
    fileName: file.displayName || file.originalName || fileKey,
    downloads: 0,
    createdAt: Date.now(),
  }

  if (password && password.trim()) {
    shareData.password = await hashPassword(password.trim())
  }
  if (expiresIn && expiresIn > 0) {
    shareData.expiresAt = Date.now() + expiresIn * 1000
  }
  if (maxDownloads && maxDownloads > 0) {
    shareData.maxDownloads = maxDownloads
  }

  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  shares.push(shareData)
  await kvPut(c.env.KV, 'shares', JSON.stringify(shares))

  // Also clean up expired shares while we're at it
  const now = Date.now()
  const cleanShares = shares.filter(s => {
    if (s.expiresAt && now > s.expiresAt) return false
    return true
  })
  if (cleanShares.length !== shares.length) {
    await kvPut(c.env.KV, 'shares', JSON.stringify(cleanShares))
  }

  return c.json({ ok: true, shareId, shareUrl: `/s/${shareId}`, share: shareData })
})

// List shares (admin only)
share.get('/admin/api/shares', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  return c.json({ shares })
})

// Delete share (admin only)
share.post('/admin/api/share/delete', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401)
  const { shareId } = await c.req.json()
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const newShares = shares.filter(s => s.id !== shareId)
  await kvPut(c.env.KV, 'shares', JSON.stringify(newShares))
  return c.json({ ok: true })
})

// Public share page (GET)
share.get('/s/:id', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const shareId = c.req.param('id')
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const shareData = shares.find(s => s.id === shareId)

  if (!shareData) return c.html(sharePageHtml(lang, { error: 'notfound' }))

  if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
    return c.html(sharePageHtml(lang, { error: 'expired' }))
  }
  if (shareData.maxDownloads && shareData.downloads >= shareData.maxDownloads) {
    return c.html(sharePageHtml(lang, { error: 'maxdownloads' }))
  }

  if (shareData.password) {
    return c.html(sharePageHtml(lang, { share: shareData, needPassword: true }))
  }

  // No password — generate download token and show download page
  const dlToken = await generateDownloadToken(c.env.KV, shareId)
  return c.html(sharePageHtml(lang, { share: shareData, canDownload: true, downloadToken: dlToken }))
})

// Share password verify (POST)
share.post('/s/:id', async (c) => {
  const lang = parseLang(c.req.header('Cookie'))
  const shareId = c.req.param('id')
  const ip = getClientIP(c)
  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const shareData = shares.find(s => s.id === shareId)

  if (!shareData) return c.html(sharePageHtml(lang, { error: 'notfound' }))
  if (shareData.expiresAt && Date.now() > shareData.expiresAt) return c.html(sharePageHtml(lang, { error: 'expired' }))
  if (shareData.maxDownloads && shareData.downloads >= shareData.maxDownloads) return c.html(sharePageHtml(lang, { error: 'maxdownloads' }))

  // Rate limit on password attempts
  if (!await checkSharePasswordLimit(c.env.KV, ip, shareId)) {
    return c.html(sharePageHtml(lang, { share: shareData, needPassword: true, rateLimited: true }))
  }

  if (shareData.password) {
    const body = await c.req.parseBody()
    const inputPw = (body.password as string) || ''
    const valid = await verifyPassword(inputPw, shareData.password)
    if (!valid) {
      await recordSharePasswordAttempt(c.env.KV, ip, shareId)
      return c.html(sharePageHtml(lang, { share: shareData, needPassword: true, passwordError: true }))
    }
  }

  // Password correct — generate download token
  const dlToken = await generateDownloadToken(c.env.KV, shareId)
  return c.html(sharePageHtml(lang, { share: shareData, canDownload: true, downloadToken: dlToken }))
})

// Actual download (token-verified)
share.get('/s/:id/download', async (c) => {
  const shareId = c.req.param('id')
  const token = c.req.query('t')

  if (!token) return c.text('Missing download token', 403)

  // Validate one-time download token
  const validShareId = await validateDownloadToken(c.env.KV, token)
  if (!validShareId || validShareId !== shareId) {
    return c.text('Invalid or expired download token. Please go back and try again.', 403)
  }

  const shares: ShareLink[] = JSON.parse(await kvGet(c.env.KV, 'shares') || '[]')
  const shareIdx = shares.findIndex(s => s.id === shareId)
  const shareData = shareIdx >= 0 ? shares[shareIdx] : null

  if (!shareData) return c.text('Share not found', 404)
  if (shareData.expiresAt && Date.now() > shareData.expiresAt) return c.text('Share expired', 410)
  if (shareData.maxDownloads && shareData.downloads >= shareData.maxDownloads) return c.text('Download limit reached', 410)

  // Increment download count
  shareData.downloads++
  shares[shareIdx] = shareData
  await kvPut(c.env.KV, 'shares', JSON.stringify(shares))

  return c.redirect(`/api/download/${shareData.fileKey}`)
})

/** Share page HTML */
function sharePageHtml(lang: Lang, opts: {
  error?: string
  share?: ShareLink
  needPassword?: boolean
  passwordError?: boolean
  rateLimited?: boolean
  canDownload?: boolean
  downloadToken?: string
}) {
  const zh = lang === 'zh'
  let title = zh ? '文件分享' : 'File Share'
  let body = ''

  if (opts.error === 'notfound') {
    body = `<div class="share-error">
      <i class="fa-solid fa-circle-xmark"></i>
      <h2>${zh ? '分享链接不存在' : 'Share link not found'}</h2>
      <p>${zh ? '该链接可能已被删除或从未存在' : 'This link may have been deleted or never existed'}</p>
    </div>`
  } else if (opts.error === 'expired') {
    body = `<div class="share-error">
      <i class="fa-solid fa-clock"></i>
      <h2>${zh ? '分享已过期' : 'Share has expired'}</h2>
      <p>${zh ? '该分享链接已超过有效期' : 'This share link has exceeded its validity period'}</p>
    </div>`
  } else if (opts.error === 'maxdownloads') {
    body = `<div class="share-error">
      <i class="fa-solid fa-ban"></i>
      <h2>${zh ? '下载次数已达上限' : 'Download limit reached'}</h2>
      <p>${zh ? '该文件的下载次数已用完' : 'The download count for this file has been exhausted'}</p>
    </div>`
  } else if (opts.needPassword) {
    const errorHtml = opts.passwordError ? `<div class="share-pw-error">${zh ? '密码错误，请重试' : 'Incorrect password, please try again'}</div>` : ''
    const rateLimitHtml = opts.rateLimited ? `<div class="share-pw-error">${zh ? '尝试次数过多，请稍后再试' : 'Too many attempts, please try again later'}</div>` : ''
    body = `<div class="share-password">
      <i class="fa-solid fa-lock"></i>
      <h2>${zh ? '此文件需要密码访问' : 'This file requires a password'}</h2>
      <p class="share-filename"><i class="fa-solid fa-file"></i> ${escapeHtml(opts.share!.fileName)}</p>
      ${errorHtml}${rateLimitHtml}
      <form method="POST" class="share-pw-form">
        <input type="password" name="password" placeholder="${zh ? '输入访问密码' : 'Enter access password'}" autofocus required ${opts.rateLimited ? 'disabled' : ''} />
        <button type="submit" ${opts.rateLimited ? 'disabled' : ''}><i class="fa-solid fa-unlock"></i> ${zh ? '验证' : 'Verify'}</button>
      </form>
    </div>`
  } else if (opts.canDownload) {
    const s = opts.share!
    const remaining = s.maxDownloads ? `${s.maxDownloads - s.downloads}` : '∞'
    const expiresText = s.expiresAt
      ? new Date(s.expiresAt).toLocaleString(zh ? 'zh-CN' : 'en-US')
      : (zh ? '永不过期' : 'Never')
    body = `<div class="share-download">
      <i class="fa-solid fa-file-arrow-down"></i>
      <h2>${escapeHtml(s.fileName)}</h2>
      <div class="share-meta">
        <span><i class="fa-solid fa-download"></i> ${zh ? '剩余下载次数' : 'Remaining'}: ${remaining}</span>
        <span><i class="fa-solid fa-clock"></i> ${zh ? '过期时间' : 'Expires'}: ${expiresText}</span>
      </div>
      <a href="/s/${s.id}/download?t=${opts.downloadToken}" class="share-dl-btn">
        <i class="fa-solid fa-download"></i> ${zh ? '下载文件' : 'Download File'}
      </a>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="${zh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="/static/fontawesome.css" rel="stylesheet">
  <link href="/static/style.css" rel="stylesheet">
  <style>
    .share-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg-primary,var(--bg))}
    .share-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:48px;max-width:440px;width:100%;text-align:center;box-shadow:var(--shadow-lg)}
    .share-card i.fa-solid{font-size:3rem;margin-bottom:16px;color:var(--accent)}
    .share-card h2{margin:0 0 12px;color:var(--text-primary);font-size:1.3rem;word-break:break-all}
    .share-card p{color:var(--text-secondary);margin:0 0 20px;font-size:.9rem}
    .share-error i{color:#EF4444!important}
    .share-filename{font-weight:600;color:var(--text-primary)!important}
    .share-pw-error{background:rgba(239,68,68,.1);color:#EF4444;padding:8px 16px;border-radius:8px;margin-bottom:16px;font-size:.85rem}
    .share-pw-form{display:flex;flex-direction:column;gap:12px}
    .share-pw-form input{padding:12px 16px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text-primary);font-size:1rem;outline:none;transition:border-color .2s}
    .share-pw-form input:focus{border-color:var(--accent)}
    .share-pw-form input:disabled{opacity:.5}
    .share-pw-form button{padding:12px;border:none;border-radius:10px;background:var(--accent);color:white;font-size:1rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s}
    .share-pw-form button:hover{opacity:.9}
    .share-pw-form button:disabled{opacity:.5;cursor:not-allowed}
    .share-meta{display:flex;flex-direction:column;gap:6px;margin:16px 0 24px;font-size:.85rem;color:var(--text-secondary)}
    .share-meta span{display:flex;align-items:center;justify-content:center;gap:6px}
    .share-dl-btn{display:inline-flex;align-items:center;gap:10px;padding:14px 32px;background:var(--accent);color:white;text-decoration:none;border-radius:12px;font-size:1.05rem;font-weight:600;transition:opacity .2s,transform .1s}
    .share-dl-btn:hover{opacity:.9;transform:translateY(-1px)}
    .share-dl-btn:active{transform:scale(.98)}
  </style>
  <script>
    const t=localStorage.getItem('portal-theme')||(window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
    document.documentElement.setAttribute('data-theme',t);
  </script>
</head>
<body>
  <div class="share-page"><div class="share-card">${body}</div></div>
</body>
</html>`
}

export default share
