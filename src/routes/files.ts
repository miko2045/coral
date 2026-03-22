/** routes/files.ts — File download API */
import { Hono } from 'hono'
import type { AppEnv, FileMeta } from '../types'
import { kvGet, kvGetBuffer, getData } from '../lib/kv'
import { DEFAULT_SETTINGS, FILE_SERVER_SECRET_HEADER } from '../lib/constants'

const files = new Hono<AppEnv>()

files.get('/api/download/:key', async (c) => {
  const key = c.req.param('key')
  const allFiles: FileMeta[] = await getData(c.env.KV, 'files', [])
  const fileMeta = allFiles.find(f => f.key === key)
  if (!fileMeta) return c.json({ error: 'File not found' }, 404)

  const settings = await getData(c.env.KV, 'settings', DEFAULT_SETTINGS)

  // External link mode
  if (fileMeta.isExternal && fileMeta.externalUrl) {
    return c.redirect(fileMeta.externalUrl)
  }

  // Local storage mode: proxy to local file server
  if (fileMeta.storageType === 'local' && settings.localServerUrl) {
    const serverUrl = settings.localServerUrl.replace(/\/$/, '')
    const storagePath = (settings.localStoragePath || '/data/portal/files').replace(/\/$/, '')
    const fileUrl = `${serverUrl}${storagePath}/${fileMeta.storedName || key}`
    try {
      const secret = await kvGet(c.env.KV, 'fileserver_secret') || ''
      const resp = await fetch(fileUrl, {
        headers: secret ? { [FILE_SERVER_SECRET_HEADER]: secret } : {},
      })
      if (!resp.ok) return c.json({ error: 'File not found on local server' }, 404)
      const headers = new Headers()
      headers.set('Content-Type', fileMeta.type || 'application/octet-stream')
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName || key)}"`)
      return new Response(resp.body, { headers })
    } catch {
      return c.json({ error: 'Local server unreachable' }, 502)
    }
  }

  // KV storage mode — read as ArrayBuffer (no base64 overhead)
  const buf = await kvGetBuffer(c.env.KV, `file:${key}`)
  if (!buf) {
    // Fallback: try legacy base64 format
    const b64 = await kvGet(c.env.KV, `file:${key}`)
    if (!b64) return c.json({ error: 'File data not found' }, 404)
    const binary = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))
    const headers = new Headers()
    headers.set('Content-Type', fileMeta.type || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName || key)}"`)
    headers.set('Content-Length', String(binary.length))
    return new Response(binary, { headers })
  }

  const headers = new Headers()
  headers.set('Content-Type', fileMeta.type || 'application/octet-stream')
  headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName || key)}"`)
  headers.set('Content-Length', String(buf.byteLength))
  return new Response(buf, { headers })
})

export default files
