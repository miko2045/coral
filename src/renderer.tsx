import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title, lang, isAdmin, description, keywords, canonical, ogImage }) => {
  const htmlLang = lang === 'en' ? 'en' : 'zh-CN'
  const siteUrl = 'https://likeok.online'
  const pageTitle = title || 'My Portal'
  const pageDesc = description || '个人门户网站 — 项目展示、GitHub 仓库、文件分享、技术博客'
  const pageKeywords = keywords || '个人网站,开发者,项目展示,GitHub,文件分享,技术博客,portfolio'
  const pageCanonical = canonical ? `${siteUrl}${canonical}` : siteUrl
  const pageOgImage = ogImage || `${siteUrl}/static/avatar.svg`
  return (
    <html lang={htmlLang} style="color-scheme: light only">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="color-scheme" content="light only" />
        <title>{pageTitle}</title>
        {/* SEO Meta */}
        <meta name="description" content={pageDesc} />
        <meta name="keywords" content={pageKeywords} />
        <meta name="author" content="Alex Chen" />
        <meta name="robots" content={isAdmin ? 'noindex, nofollow' : 'index, follow'} />
        {/* Search Engine Verification */}
        <meta name="baidu-site-verification" content="codeva-JaoWqGeJlA" />
        <link rel="canonical" href={pageCanonical} />
        {/* Open Graph (Facebook, WeChat, etc.) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={pageCanonical} />
        <meta property="og:image" content={pageOgImage} />
        <meta property="og:site_name" content="Alex Chen Portal" />
        <meta property="og:locale" content={htmlLang === 'zh-CN' ? 'zh_CN' : 'en_US'} />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={pageOgImage} />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌻</text></svg>" />
        <link rel="preconnect" href="https://fonts.loli.net" crossorigin="anonymous" />
        <link rel="dns-prefetch" href="https://gstatic.loli.net" />
        <link rel="preload" href="/static/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <link href="/static/fontawesome.css" rel="stylesheet" />
        <link href="/static/style.css" rel="stylesheet" />
        {isAdmin && <link href="/static/admin.css" rel="stylesheet" />}
        {/* Load Google Fonts asynchronously — only weights actually used */}
        <script dangerouslySetInnerHTML={{__html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.loli.net/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap';document.head.appendChild(l);})()`}} />
        {/* JSON-LD Structured Data */}
        {!isAdmin && <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Person',
          'name': 'Alex Chen',
          'url': siteUrl,
          'sameAs': ['https://github.com/miko2045'],
          'jobTitle': 'Developer',
          'description': pageDesc,
        })}} />}
      </head>
      <body data-lang={lang || 'zh'}>
        {children}
        {isAdmin ? <script src="/static/admin.js"></script> : <script src="/static/app.js"></script>}
      </body>
    </html>
  )
})
