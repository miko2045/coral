import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children, title, lang }) => {
  const htmlLang = lang === 'en' ? 'en' : 'zh-CN'
  return (
    <html lang={htmlLang}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title || 'My Portal'}</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌻</text></svg>" />
        <link rel="preconnect" href="https://fonts.loli.net" crossorigin="anonymous" />
        <link href="/static/fontawesome.css" rel="stylesheet" />
        <link href="/static/style.css" rel="stylesheet" />
        <link href="/static/admin.css" rel="stylesheet" />
        {/* Load Google Fonts asynchronously to prevent render-blocking */}
        <script dangerouslySetInnerHTML={{__html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.loli.net/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';document.head.appendChild(l);})()`}} />
      </head>
      <body data-lang={lang || 'zh'}>
        {children}
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})
