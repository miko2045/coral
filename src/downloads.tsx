/** downloads.tsx — 文件下载独立页面 */
import type { Lang } from './i18n'
import { t } from './i18n'
import { pageLayout } from './layout'

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const iconForType = (type: string) => {
  if (type.includes('pdf')) return 'fa-solid fa-file-pdf'
  if (type.includes('zip') || type.includes('rar') || type.includes('7z') || type.includes('tar')) return 'fa-solid fa-file-zipper'
  if (type.includes('image')) return 'fa-solid fa-file-image'
  if (type.includes('video')) return 'fa-solid fa-file-video'
  if (type.includes('audio')) return 'fa-solid fa-file-audio'
  if (type.includes('word') || type.includes('doc')) return 'fa-solid fa-file-word'
  if (type.includes('sheet') || type.includes('excel') || type.includes('xls')) return 'fa-solid fa-file-excel'
  if (type.includes('presentation') || type.includes('ppt')) return 'fa-solid fa-file-powerpoint'
  return 'fa-solid fa-file'
}

const colorForType = (type: string) => {
  if (type.includes('pdf')) return '#EF4444'
  if (type.includes('zip') || type.includes('rar')) return '#F59E0B'
  if (type.includes('image')) return '#22C55E'
  if (type.includes('video')) return '#8B5CF6'
  return '#6B7280'
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
          {files.length} {t('home', 'files', lang)} · {formatSize(totalSize)}
        </p>
      </div>

      {files.length === 0 ? (
        <div class="page-empty">
          <i class="fa-solid fa-folder-open"></i>
          <p>{lang === 'zh' ? '暂无文件' : 'No files yet'}</p>
        </div>
      ) : (
        <div class="downloads-list">
          {files.map((file: any, i: number) => (
            <div class="card card-download" data-aos={i + 1} key={file.key}>
              <div class="card-inner">
                <div class="download-icon" style={`--accent: ${colorForType(file.type || '')}`}>
                  <i class={iconForType(file.type || '')}></i>
                </div>
                <div class="download-info">
                  <h3 class="download-name">{file.displayName}</h3>
                  <p class="download-meta">
                    {file.originalName} · {formatSize(file.size)}
                    {file.isExternal ? ` · ${lang === 'zh' ? '外部' : 'External'}` : file.storageType === 'local' ? ` · ${lang === 'zh' ? '本地' : 'Local'}` : ' · KV'}
                  </p>
                </div>
                <a href={file.isExternal && file.externalUrl ? file.externalUrl : `/api/download/${file.key}`}
                   class="download-btn" download target={file.isExternal ? '_blank' : undefined}>
                  <i class="fa-solid fa-download"></i>
                  <span>{t('home', 'download', lang)}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )

  return pageLayout({ lang, activePage: 'downloads', children: content })
}
