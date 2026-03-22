/** downloads.tsx — 文件下载独立页面 */
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

export function downloadsPage(files: any[], lang: Lang = 'zh', isAdmin: boolean = false) {
  const totalSize = files.reduce((a: number, f: any) => a + (f.size || 0), 0)

  const content = (
    <main class="page-content">
      <div class="page-header-compact">
        <h1 class="page-header-title">
          <i class="fa-solid fa-cloud-arrow-down"></i>
          {t('home', 'downloadsTitle', lang)}
        </h1>
        <span class="page-header-count" id="dlCount">
          {lang === 'zh'
            ? `${files.length} 个文件 · ${formatSize(totalSize)}`
            : `${files.length} file${files.length !== 1 ? 's' : ''} · ${formatSize(totalSize)}`
          }
        </span>
      </div>

      {/* Search bar */}
      {files.length > 0 && (
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

      {files.length === 0 && (
        <div class="page-empty">
          <i class="fa-solid fa-folder-open"></i>
          <p>{lang === 'zh' ? '暂无文件' : 'No files yet'}</p>
        </div>
      )}

      <div class="downloads-list" id="dlList">
        {files.map((file: any, i: number) => {
          const name = file.displayName || file.originalName || file.key
          const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
          const searchData = [name, file.type || '', ext, file.isExternal ? 'external' : '', file.storageType || ''].join('|')
          return (
            <div class="card download-card" data-aos={i + 1} data-search={searchData} key={file.key}>
              <div class="card-inner download-row">
                <div class="download-icon">
                  <i class={fileIcon(file.type)}></i>
                </div>
                <div class="download-info">
                  <h3 class="download-name">{name}</h3>
                  <div class="download-meta">
                    <span class="download-size">{formatSize(file.size)}</span>
                    {file.isExternal && <span class="download-badge external">{lang === 'zh' ? '外部链接' : 'External'}</span>}
                    {file.storageType === 'local' && <span class="download-badge local">{lang === 'zh' ? '本地存储' : 'Local'}</span>}
                  </div>
                </div>
                <div class="download-actions">
                  {isAdmin && (
                    <button class="share-btn" data-filekey={file.key} data-filename={file.displayName || file.originalName || file.key} title={lang === 'zh' ? '分享' : 'Share'}>
                      <i class="fa-solid fa-share-nodes"></i>
                    </button>
                  )}
                  <a href={`/api/download/${file.key}`}
                     class="download-btn"
                     title={t('home', 'download', lang)}>
                    <i class="fa-solid fa-download"></i>
                    <span>{t('home', 'download', lang)}</span>
                  </a>
                </div>
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
                <label><i class="fa-solid fa-download"></i> {lang === 'zh' ? '最大下载次数（0=不限）' : 'Max Downloads (0=unlimited)'}</label>
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
