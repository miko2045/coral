/** downloads.tsx — 文件下载独立页面 (超高级感) */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

function fileIcon(type: string): string {
  if (!type) return 'fa-solid fa-file'
  if (type.startsWith('image/')) return 'fa-solid fa-file-image'
  if (type.startsWith('video/')) return 'fa-solid fa-file-video'
  if (type.startsWith('audio/')) return 'fa-solid fa-file-audio'
  if (type.includes('pdf')) return 'fa-solid fa-file-pdf'
  if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('gz')) return 'fa-solid fa-file-zipper'
  if (type.includes('text')) return 'fa-solid fa-file-lines'
  if (type.includes('word') || type.includes('document')) return 'fa-solid fa-file-word'
  if (type.includes('sheet') || type.includes('excel')) return 'fa-solid fa-file-excel'
  if (type.includes('presentation') || type.includes('powerpoint')) return 'fa-solid fa-file-powerpoint'
  return 'fa-solid fa-file'
}

function fileColor(type: string): string {
  if (!type) return '#6366F1'
  if (type.startsWith('image/')) return '#7C5CFC'
  if (type.startsWith('video/')) return '#EF4444'
  if (type.startsWith('audio/')) return '#22C55E'
  if (type.includes('pdf')) return '#EF4444'
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return '#F59E0B'
  if (type.includes('word') || type.includes('document')) return '#3B82F6'
  if (type.includes('sheet') || type.includes('excel')) return '#22C55E'
  return '#6366F1'
}

export function downloadsPage(files: any[], lang: Lang = 'zh', isAdmin: boolean = false) {
  // Sort: pinned first, then by order/upload time
  const sorted = [...files].sort((a: any, b: any) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return (a.order || 0) - (b.order || 0)
  })
  const totalSize = sorted.reduce((a: number, f: any) => a + (f.size || 0), 0)

  const content = (
    <main class="page-content">
      <div class="page-header-compact">
        <a href="/" class="page-back-btn" aria-label={lang === 'zh' ? '返回' : 'Back'}>
          <i class="fa-solid fa-arrow-left"></i>
        </a>
        <h1 class="page-header-title">
          <i class="fa-solid fa-cloud-arrow-down"></i>
          {t('home', 'downloadsTitle', lang)}
        </h1>
        <span class="page-header-count" id="dlCount">
          {lang === 'zh'
            ? `${sorted.length} 个文件 · ${formatSize(totalSize)}`
            : `${sorted.length} file${sorted.length !== 1 ? 's' : ''} · ${formatSize(totalSize)}`
          }
        </span>
      </div>

      {/* Search bar */}
      {sorted.length > 0 && (
        <div class="dl-search-wrap">
          <div class="dl-search-box">
            <i class="fa-solid fa-magnifying-glass dl-search-icon"></i>
            <input
              type="text"
              id="dlSearch"
              class="dl-search-input"
              placeholder={lang === 'zh' ? '搜索文件名、类型...' : 'Search files by name, type...'}
              autocomplete="off"
            />
            <button type="button" id="dlSearchClear" class="dl-search-clear" aria-label="Clear">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div id="dlSearchHint" class="dl-search-hint"></div>
        </div>
      )}

      {sorted.length === 0 && (
        <div class="page-empty">
          <div class="page-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
          <p class="page-empty-title">{lang === 'zh' ? '暂无文件' : 'No files yet'}</p>
          <p class="page-empty-sub">{lang === 'zh' ? '稍后上传精彩资源' : 'Resources coming soon'}</p>
        </div>
      )}

      <div class="dl-list" id="dlList">
        {sorted.map((file: any, i: number) => {
          const name = file.displayName || file.originalName || file.key
          const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
          const searchData = [name, file.type || '', ext, file.isExternal ? 'external' : '', file.storageType || ''].join('|')
          const color = fileColor(file.type)
          return (
            <div class={`dl-item${file.pinned ? ' dl-item-pinned' : ''}`} data-aos={i + 1} data-search={searchData} style={`animation-delay:${Math.min(i * 0.04, 0.3)}s; --file-color:${color}`} key={file.key}>
              <div class="dl-item-icon">
                <i class={fileIcon(file.type)}></i>
              </div>
              <div class="dl-item-info">
                <h3 class="dl-item-name">
                  {file.pinned && <span class="dl-pin-badge"><i class="fa-solid fa-thumbtack"></i></span>}
                  {name}
                </h3>
                <div class="dl-item-meta">
                  <span class="dl-item-size">{formatSize(file.size)}</span>
                  {file.isExternal && <span class="dl-item-badge dl-badge-ext">{lang === 'zh' ? '外部' : 'External'}</span>}
                  {file.storageType === 'local' && <span class="dl-item-badge dl-badge-local">{lang === 'zh' ? '本地' : 'Local'}</span>}
                </div>
              </div>
              <div class="dl-item-actions">
                {isAdmin && (
                  <button class="share-btn" data-filekey={file.key} data-filename={file.displayName || file.originalName || file.key} title={lang === 'zh' ? '分享' : 'Share'}>
                    <i class="fa-solid fa-share-nodes"></i>
                  </button>
                )}
                <a href={`/api/download/${file.key}`}
                   class="dl-download-btn"
                   title={t('home', 'download', lang)}>
                  <i class="fa-solid fa-download"></i>
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* No results placeholder (hidden by default) */}
      <div id="dlNoResults" class="dl-no-results" style="display:none">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>{lang === 'zh' ? '没有找到匹配的文件' : 'No matching files found'}</p>
      </div>

      {/* Share Modal (only for admin) */}
      {isAdmin && (
        <div id="shareModal" class="share-modal-overlay" style="display:none">
          <div class="share-modal">
            <div class="share-modal-header">
              <h3><i class="fa-solid fa-share-nodes"></i> {lang === 'zh' ? '创建分享链接' : 'Create Share Link'}</h3>
              <button id="shareModalClose" class="share-modal-close"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="share-modal-body">
              <p class="share-modal-filename" id="shareFileName"></p>
              <div class="share-form-field">
                <label><i class="fa-solid fa-lock"></i> {lang === 'zh' ? '访问密码（可选）' : 'Access Password (optional)'}</label>
                <input type="text" id="sharePassword" placeholder={lang === 'zh' ? '留空则无需密码' : 'Leave empty for no password'} />
              </div>
              <div class="share-form-field">
                <label><i class="fa-solid fa-clock"></i> {lang === 'zh' ? '有效期' : 'Expiration'}</label>
                <select id="shareExpires">
                  <option value="0">{lang === 'zh' ? '永不过期' : 'Never'}</option>
                  <option value="3600">{lang === 'zh' ? '1小时' : '1 hour'}</option>
                  <option value="86400">{lang === 'zh' ? '1天' : '1 day'}</option>
                  <option value="604800">{lang === 'zh' ? '7天' : '7 days'}</option>
                  <option value="2592000">{lang === 'zh' ? '30天' : '30 days'}</option>
                </select>
              </div>
              <div class="share-form-field">
                <label><i class="fa-solid fa-download"></i> {lang === 'zh' ? '最大下载次数（0=无限）' : 'Max Downloads (0=unlimited)'}</label>
                <input type="number" id="shareMaxDownloads" min="0" value="0" />
              </div>
            </div>
            <div class="share-modal-footer">
              <button id="shareCreateBtn" class="share-create-btn">
                <i class="fa-solid fa-link"></i> {lang === 'zh' ? '生成分享链接' : 'Generate Share Link'}
              </button>
            </div>
            {/* Result area */}
            <div id="shareResult" class="share-result" style="display:none">
              <label>{lang === 'zh' ? '分享链接' : 'Share Link'}</label>
              <div class="share-result-row">
                <input type="text" id="shareUrl" readonly />
                <button id="shareCopyBtn" class="share-copy-btn"><i class="fa-solid fa-copy"></i></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )

  return pageLayout({ lang, activePage: 'downloads', children: content })
}
