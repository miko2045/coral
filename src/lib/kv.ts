/** lib/kv.ts — KV operations with in-memory fallback */

const memStore = new Map<string, string>()

/** KV get: KV first, fallback to memory */
export async function kvGet(kv: KVNamespace | undefined, key: string): Promise<string | null> {
  if (kv) {
    try { return await kv.get(key) } catch { /* fall through */ }
  }
  return memStore.get(key) || null
}

/** KV get as ArrayBuffer (for binary file storage) */
export async function kvGetBuffer(kv: KVNamespace | undefined, key: string): Promise<ArrayBuffer | null> {
  if (kv) {
    try { return await kv.get(key, 'arrayBuffer') } catch { /* fall through */ }
  }
  // Memory fallback: decode base64 to buffer
  const b64 = memStore.get(key)
  if (b64) {
    const binary = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))
    return binary.buffer
  }
  return null
}

/** KV put string */
export async function kvPut(kv: KVNamespace | undefined, key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
  if (kv) {
    try { await kv.put(key, value, opts); return } catch { /* fall through */ }
  }
  memStore.set(key, value)
  if (opts?.expirationTtl) {
    setTimeout(() => memStore.delete(key), opts.expirationTtl * 1000)
  }
}

/** KV put ArrayBuffer (for binary file storage — no base64 bloat) */
export async function kvPutBuffer(kv: KVNamespace | undefined, key: string, value: ArrayBuffer): Promise<void> {
  if (kv) {
    try { await kv.put(key, value); return } catch { /* fall through */ }
  }
  // Memory fallback: store as base64
  const bytes = new Uint8Array(value)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  memStore.set(key, btoa(binary))
}

/** KV delete */
export async function kvDelete(kv: KVNamespace | undefined, key: string): Promise<void> {
  if (kv) {
    try { await kv.delete(key); return } catch { /* fall through */ }
  }
  memStore.delete(key)
}

/** Get JSON from KV with fallback default. Auto-initializes if missing. */
export async function getData<T>(kv: KVNamespace | undefined, key: string, fallback: T): Promise<T> {
  const val = await kvGet(kv, key)
  if (val) {
    try { return JSON.parse(val) as T } catch { return fallback }
  }
  await kvPut(kv, key, JSON.stringify(fallback))
  return fallback
}
