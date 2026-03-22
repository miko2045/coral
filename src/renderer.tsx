import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title, lang, isAdmin }) => {
  const htmlLang = lang === 'en' ? 'en' : 'zh-CN'
  return (
    <html lang={htmlLang} style="color-scheme: light only">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light only" />
        <title>{title || 'My Portal'}</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌻</text></svg>" />
        <link rel="preconnect" href="https://fonts.loli.net" crossorigin="anonymous" />
        <link rel="dns-prefetch" href="https://gstatic.loli.net" />
        <link rel="preload" href="/static/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <link href="/static/fontawesome.css" rel="stylesheet" />
        <link href="/static/style.css" rel="stylesheet" />
        {isAdmin && <link href="/static/admin.css" rel="stylesheet" />}
        {/* Load Google Fonts asynchronously — only weights actually used */}
        <script dangerouslySetInnerHTML={{__html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.loli.net/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap';document.head.appendChild(l);})()`}} />
      </head>
      <body data-lang={lang || 'zh'}>
        {children}
        {isAdmin ? <script src="/static/admin.js"></script> : <script src="/static/app.js"></script>}
      </body>
    </html>
  )
})
