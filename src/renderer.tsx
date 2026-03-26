import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title, lang, isAdmin, description, keywords, canonical, ogImage }) => {
  const htmlLang = lang === 'en' ? 'en' : 'zh-CN'
  const siteUrl = 'https://likeok.online'
  const pageTitle = title || 'My Portal'
  const pageDesc = description || '全栈开发者门户 — GitHub热门项目排行榜、开源项目推荐、软件资源下载、优质项目精选导航'
  const pageKeywords = keywords || 'GitHub,GitHub排行榜,GitHub热门项目,GitHub trending,全栈开发,全栈开发者,软件库,软件下载,文件库,文件下载,开源项目,开源项目推荐,好的项目,优质项目,项目推荐,项目导航,开发者工具,编程资源,程序员导航,代码分享,developer,portfolio,open source'
  const pageCanonical = canonical ? `${siteUrl}${canonical}` : siteUrl
  const pageOgImage = ogImage || `${siteUrl}/static/avatar.svg`

  // Determine if this is a specific page for breadcrumb
  const pagePath = canonical || '/'
  const isHomePage = pagePath === '/'

  return (
    <html lang={htmlLang}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />
        <title>{pageTitle}</title>

        {/* SEO Meta */}
        <meta name="description" content={pageDesc} />
        <meta name="keywords" content={pageKeywords} />
        <meta name="author" content="Alex Chen" />
        <meta name="robots" content={isAdmin ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'} />

        {/* Search Engine Verification */}
        <meta name="baidu-site-verification" content="codeva-JaoWqGeJlA" />
        <link rel="canonical" href={pageCanonical} />

        {/* Open Graph (Facebook, WeChat, etc.) */}
        <meta property="og:type" content={isHomePage ? 'website' : 'article'} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={pageCanonical} />
        <meta property="og:image" content={pageOgImage} />
        <meta property="og:site_name" content="LikeOK — 全栈开发者门户" />
        <meta property="og:locale" content={htmlLang === 'zh-CN' ? 'zh_CN' : 'en_US'} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={pageOgImage} />

        {/* Favicon */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌻</text></svg>" />

        {/* Resource Hints — prioritize critical resources */}
        <link rel="preconnect" href="https://fonts.loli.net" crossorigin="anonymous" />
        <link rel="dns-prefetch" href="https://gstatic.loli.net" />
        <link rel="dns-prefetch" href="https://api.github.com" />
        <link rel="preload" href="/static/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin="anonymous" />

        {/* Critical CSS */}
        <link href="/static/fontawesome.css" rel="stylesheet" />
        <link href="/static/style.css" rel="stylesheet" />
        {isAdmin && <link href="/static/admin.css" rel="stylesheet" />}

        {/* Inline theme init — prevents flash of wrong theme (FOUC) */}
        <script dangerouslySetInnerHTML={{__html: `(function(){var s=localStorage.getItem('portal-theme');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d){document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark only';document.querySelector('meta[name=color-scheme]').setAttribute('content','dark only')}else{document.documentElement.style.colorScheme='light only';document.querySelector('meta[name=color-scheme]').setAttribute('content','light only')}})()`}} />

        {/* Load Google Fonts asynchronously — only weights actually used */}
        <script dangerouslySetInnerHTML={{__html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.loli.net/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap';document.head.appendChild(l);})()`}} />

        {/* JSON-LD Structured Data — Enhanced with WebSite, BreadcrumbList */}
        {!isAdmin && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              'name': 'LikeOK — 全栈开发者门户',
              'url': siteUrl,
              'description': pageDesc,
              'inLanguage': ['zh-CN', 'en'],
              'potentialAction': {
                '@type': 'SearchAction',
                'target': `${siteUrl}/downloads?q={search_term_string}`,
                'query-input': 'required name=search_term_string'
              }
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Person',
              'name': 'LikeOK',
              'url': siteUrl,
              'sameAs': ['https://github.com/miko2045'],
              'jobTitle': '全栈开发者',
              'knowsAbout': ['GitHub', 'GitHub排行榜', '全栈开发', '开源项目', '软件开发', '项目推荐', '编程', '前端开发', '后端开发'],
              'description': pageDesc,
            },
            // Breadcrumb for non-home pages
            ...(!isHomePage ? [{
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              'itemListElement': [
                { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': siteUrl },
                { '@type': 'ListItem', 'position': 2, 'name': pageTitle, 'item': pageCanonical },
              ]
            }] : [])
          ])}} />
        )}
      </head>
      <body data-lang={lang || 'zh'}>
        {children}
        {isAdmin
          ? <script src="/static/admin.js" defer></script>
          : <script src="/static/app.js" defer></script>
        }
      </body>
    </html>
  )
})
