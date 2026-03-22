/**
 * Local File Server — runs alongside wrangler pages dev on VPS
 * Handles file uploads and downloads for the portal's "local storage" mode
 * 
 * Usage: node fileserver.mjs
 * Default port: 8899
 * Default storage: /data/portal/files
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = process.env.FILE_SERVER_PORT || 8899;
const DEFAULT_STORAGE = process.env.FILE_STORAGE_PATH || '/data/portal/files';
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max

// Authentication: Shared secret between Cloudflare Worker and this server
// Set via environment variable or will be auto-generated on first run
const AUTH_SECRET = process.env.FILE_SERVER_SECRET || '';
const AUTH_HEADER = 'x-fileserver-secret';

// Verify auth if secret is configured
function checkAuth(req, res) {
  if (!AUTH_SECRET) return true; // No secret configured = open (legacy)
  const provided = req.headers[AUTH_HEADER];
  if (!provided || provided !== AUTH_SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing X-FileServer-Secret header' }));
    return false;
  }
  return true;
}

// Ensure storage directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Parse multipart form data (simplified)
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryStr = `--${boundary}`;
  const endStr = `--${boundary}--`;
  
  const text = buffer.toString('latin1');
  const segments = text.split(boundaryStr).filter(s => s.trim() && !s.startsWith('--'));
  
  for (const segment of segments) {
    if (segment.trim() === '--' || segment.trim() === '') continue;
    
    const headerEnd = segment.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    
    const headers = segment.substring(0, headerEnd);
    const bodyStr = segment.substring(headerEnd + 4);
    // Remove trailing \r\n
    const body = bodyStr.endsWith('\r\n') ? bodyStr.slice(0, -2) : bodyStr;
    
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    
    if (nameMatch) {
      const part = { name: nameMatch[1] };
      if (filenameMatch) {
        part.filename = filenameMatch[1];
        // Convert back to buffer for file data
        part.data = Buffer.from(body, 'latin1');
      } else {
        part.value = body.trim();
      }
      parts.push(part);
    }
  }
  return parts;
}

// Allowed origins for CORS (restrict to same machine only)
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
]);

const server = http.createServer(async (req, res) => {
  const origin = req.headers['origin'] || '';
  // CORS: only allow known origins, NOT wildcard
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${AUTH_HEADER}`);
  res.setHeader('Access-Control-Max-Age', '86400');
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // Health check (requires auth to prevent info leak)
  if (url.pathname === '/health') {
    if (!checkAuth(req, res)) return;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  
  // Upload file (requires auth)
  if (req.method === 'POST' && url.pathname === '/upload') {
    if (!checkAuth(req, res)) return;
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    
    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing multipart boundary' }));
      return;
    }
    
    const chunks = [];
    let totalSize = 0;
    
    req.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > MAX_FILE_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File too large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const parts = parseMultipart(buffer, boundaryMatch[1]);
        
        const filePart = parts.find(p => p.name === 'file');
        const pathPart = parts.find(p => p.name === 'path');
        const filenamePart = parts.find(p => p.name === 'filename');
        
        if (!filePart || !filePart.data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No file found' }));
          return;
        }
        
        const storagePath = pathPart?.value || DEFAULT_STORAGE;
        const rawFilename = filenamePart?.value || filePart.filename || `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        // Sanitize filename: remove path components and dangerous chars
        const filename = rawFilename.replace(/[/\\]/g, '_').replace(/\.\./g, '_');
        
        ensureDir(storagePath);
        
        const filePath = path.join(storagePath, filename);
        fs.writeFileSync(filePath, filePart.data);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, filename, path: filePath, size: filePart.data.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    
    return;
  }
  
  // Download file — serve files from storage path (requires auth)
  if (req.method === 'GET' && url.pathname.startsWith('/data/')) {
    if (!checkAuth(req, res)) return;
    const filePath = decodeURIComponent(url.pathname);
    
    // Security: prevent path traversal
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith('/data/')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    
    if (!fs.existsSync(resolved)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }
    
    const stat = fs.statSync(resolved);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': stat.size,
    });
    fs.createReadStream(resolved).pipe(res);
    return;
  }
  
  // List files (requires auth)
  if (req.method === 'GET' && url.pathname === '/list') {
    if (!checkAuth(req, res)) return;
    const dir = url.searchParams.get('path') || DEFAULT_STORAGE;
    try {
      ensureDir(dir);
      const files = fs.readdirSync(dir).map(name => {
        const stat = fs.statSync(path.join(dir, name));
        return { name, size: stat.size, modified: stat.mtime.toISOString() };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  // Delete file (requires auth)
  if (req.method === 'POST' && url.pathname === '/delete') {
    if (!checkAuth(req, res)) return;
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const { filename, path: storagePath } = JSON.parse(Buffer.concat(chunks).toString());
        
        // Validate filename: only allow safe characters
        if (!filename || /[/\\]/.test(filename) || filename.includes('..')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid filename' }));
          return;
        }
        
        const dir = storagePath || DEFAULT_STORAGE;
        const filePath = path.join(dir, filename);
        
        // Security: prevent path traversal
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(dir))) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden' }));
          return;
        }
        
        if (fs.existsSync(resolved)) {
          fs.unlinkSync(resolved);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[FileServer] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[FileServer] Storage path: ${DEFAULT_STORAGE}`);
  console.log(`[FileServer] Auth: ${AUTH_SECRET ? 'ENABLED (secret configured)' : 'DISABLED (no secret, set FILE_SERVER_SECRET env var)'}`);
  ensureDir(DEFAULT_STORAGE);
});
