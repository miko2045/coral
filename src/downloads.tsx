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

export function downloadsPage(files: any[], lang: Lang = 'zh') {
  const totalSize = files.reduce((a: number, f: any) => a + (f.size || 0), 0)

  const content = (
    <main class="page-content">
      <div class="page-hero">
        <h1 class="page-title">
          <i class="fa-solid fa-cloud-arrow-down"></i>
          {t('home', 'downloadsTitle', lang)}
        </h1>
        <p class="page-subtitle">
          {lang === 'zh'
            ? `${files.length} 个文件 · ${formatSize(totalSize)}`
            : `${files.length} file${files.length !== 1 ? 's' : ''} · ${formatSize(totalSize)}`
          }
        </p>
      </div>

      {files.length === 0 && (
        <div class="page-empty">
          <i class="fa-solid fa-folder-open"></i>
          <p>{lang === 'zh' ? '暂无文件' : 'No files yet'}</p>
        </div>
      )}

      <div class="downloads-list">
        {files.map((file: any, i: number) => (
          <div class="card download-card" data-aos={i + 1} key={file.key}>
            <div class="card-inner download-row">
              <div class="download-icon">
                <i class={fileIcon(file.type)}></i>
              </div>
              <div class="download-info">
                <h3 class="download-name">{file.displayName || file.originalName || file.key}</h3>
                <div class="download-meta">
                  <span class="download-size">{formatSize(file.size)}</span>
                  {file.isExternal && <span class="download-badge external">{lang === 'zh' ? '外部链接' : 'External'}</span>}
                  {file.storageType === 'local' && <span class="download-badge local">{lang === 'zh' ? '本地存储' : 'Local'}</span>}
                </div>
              </div>
              <a href={`/api/download/${file.key}`}
                 class="download-btn"
                 title={t('home', 'download', lang)}>
                <i class="fa-solid fa-download"></i>
                <span>{t('home', 'download', lang)}</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  )

  return pageLayout({ lang, activePage: 'downloads', children: content })
}
