/** i18n.ts — Translation data for Chinese/English */

export type Lang = 'zh' | 'en'

export const translations = {
  // === Header / Nav ===
  nav: {
    projects: { zh: '项目', en: 'Projects' },
    github: { zh: 'GitHub', en: 'GitHub' },
    downloads: { zh: '下载', en: 'Downloads' },
    trending: { zh: '排行榜', en: 'Trending' },
    home: { zh: '首页', en: 'Home' },
  },

  // === Home Page ===
  home: {
    quickStats: { zh: '数据概览', en: 'Quick Stats' },
    websites: { zh: '网站', en: 'Websites' },
    repos: { zh: '仓库', en: 'Repos' },
    stars: { zh: '星标', en: 'Stars' },
    files: { zh: '文件', en: 'Files' },
    webProjects: { zh: '网站项目', en: 'Web Projects' },
    githubProjects: { zh: 'GitHub 项目', en: 'GitHub Projects' },
    downloadsTitle: { zh: '文件下载', en: 'Downloads' },
    download: { zh: '下载', en: 'Download' },
    builtWith: { zh: '用', en: 'Built with' },
    and: { zh: '和', en: '&' },
    deployedOn: { zh: '部署于 Cloudflare Pages', en: 'Deployed on Cloudflare Pages' },
  },

  // === Admin Login ===
  adminLogin: {
    title: { zh: '后台管理', en: 'Portal Admin' },
    subtitle: { zh: '输入密码以管理您的门户', en: 'Enter your password to manage your portal' },
    password: { zh: '密码', en: 'Password' },
    placeholder: { zh: '输入管理员密码', en: 'Enter admin password' },
    signIn: { zh: '登 录', en: 'Sign In' },
    hint: { zh: '默认密码: admin123', en: 'Default password: admin123' },
    wrongPw: { zh: '密码错误', en: 'Incorrect password' },
  },

  // === Admin Dashboard ===
  admin: {
    sidebarTitle: { zh: '管理后台', en: 'Admin' },
    profile: { zh: '个人信息', en: 'Profile' },
    websitesTab: { zh: '网站', en: 'Websites' },
    githubTab: { zh: 'GitHub', en: 'GitHub' },
    filesTab: { zh: '文件', en: 'Files' },
    settingsTab: { zh: '设置', en: 'Settings' },
    viewSite: { zh: '查看站点', en: 'View Site' },
    logout: { zh: '退出', en: 'Logout' },

    // Profile section
    personalInfo: { zh: '个人信息', en: 'Personal Info' },
    save: { zh: '保存', en: 'Save' },
    name: { zh: '名称', en: 'Name' },
    tagline: { zh: '标语', en: 'Tagline' },
    avatarUrl: { zh: '头像 URL', en: 'Avatar URL' },
    bio: { zh: '简介', en: 'Bio' },
    location: { zh: '位置', en: 'Location' },
    email: { zh: '邮箱', en: 'Email' },
    status: { zh: '状态', en: 'Status' },
    currentlyReading: { zh: '在读', en: 'Currently Reading' },
    quote: { zh: '座右铭', en: 'Quote' },
    quoteAuthor: { zh: '作者', en: 'Quote Author' },
    githubUrl: { zh: 'GitHub URL', en: 'GitHub URL' },
    twitterUrl: { zh: 'Twitter URL', en: 'Twitter URL' },

    // Websites section
    webProjectsTitle: { zh: '网站项目', en: 'Web Projects' },
    add: { zh: '添加', en: 'Add' },
    edit: { zh: '编辑', en: 'Edit' },
    delete: { zh: '删除', en: 'Delete' },

    // Repos section
    githubProjectsTitle: { zh: 'GitHub 项目', en: 'GitHub Projects' },

    // Files section
    fileManager: { zh: '文件管理', en: 'File Manager' },
    addLink: { zh: '添加链接', en: 'Add Link' },
    dragDrop: { zh: '拖放文件到此处或', en: 'Drag & drop files here or' },
    browse: { zh: '浏览', en: 'browse' },
    maxFileHint: { zh: '每个文件最大', en: 'Max' },
    storedIn: { zh: '存储在 KV', en: 'Stored in KV' },
    storedInLocal: { zh: '文件将上传到本地文件服务器 · 无大小限制', en: 'Files uploaded to local server · No size limit' },
    externalHint: { zh: '外部链接模式 — 点击', en: 'External link mode — click' },
    externalHintEnd: { zh: '添加文件下载链接', en: 'to add a file download URL' },
    uploading: { zh: '上传中...', en: 'Uploading...' },
    external: { zh: '外部', en: 'External' },

    // Settings section
    settingsTitle: { zh: '设置', en: 'Settings' },
    storage: { zh: '存储', en: 'Storage' },
    storageDesc: { zh: '选择上传文件的存储方式', en: 'Choose how uploaded files are stored' },
    kvStorage: { zh: 'KV 存储', en: 'KV Storage' },
    kvDesc: { zh: '文件以 base64 格式存储在 Cloudflare KV 中。简单无需额外配置。单文件最大 25MB。', en: 'Files stored as base64 in Cloudflare KV. Simple, no extra config. Max 25MB/file.' },
    localStorage: { zh: '本地存储', en: 'Local Storage' },
    localDesc: { zh: '文件上传到您的本地文件服务器。需配置服务器地址和存储路径。无大小限制。', en: 'Files uploaded to your local file server. Requires server URL and storage path. No size limit.' },
    localServerUrl: { zh: '服务器地址', en: 'Server URL' },
    localServerUrlHint: { zh: '文件服务器的 HTTP 地址，例如 http://192.168.1.100:8080', en: 'HTTP address of your file server, e.g. http://192.168.1.100:8080' },
    localStoragePath: { zh: '存储路径', en: 'Storage Path' },
    localStoragePathHint: { zh: '服务器上的存储目录路径，例如 /data/portal/files', en: 'Directory path on server, e.g. /data/portal/files' },
    localStorageInfo: { zh: '本地存储', en: 'Local' },
    localUploadHint: { zh: '文件将上传到您配置的本地文件服务器', en: 'Files will be uploaded to your configured local file server' },
    externalLinks: { zh: '外部链接', en: 'External Links' },
    externalDesc: { zh: '添加任何外部服务的下载链接 (Google Drive, S3 等)。无大小限制。', en: 'Add download URLs from any external service (Google Drive, S3, etc). No size limit.' },
    saveStorage: { zh: '保存存储设置', en: 'Save Storage Settings' },
    storageStatus: { zh: '存储状态', en: 'Storage Status' },
    currentMode: { zh: '当前模式', en: 'Current Mode' },
    serverAddress: { zh: '服务器地址', en: 'Server Address' },
    storagePath: { zh: '存储路径', en: 'Storage Path' },
    fileCount: { zh: '文件数量', en: 'File Count' },
    totalSize: { zh: '总大小', en: 'Total Size' },
    changePassword: { zh: '修改密码', en: 'Change Password' },
    currentPw: { zh: '当前密码', en: 'Current Password' },
    newPw: { zh: '新密码', en: 'New Password' },
    updatePw: { zh: '更新密码', en: 'Update Password' },

    // GitHub Token Management
    githubTokens: { zh: 'GitHub Tokens', en: 'GitHub Tokens' },
    githubTokensDesc: { zh: '配置 GitHub API Token 池，实现自动轮询与故障切换，避免单一 Token 被限流', en: 'Configure GitHub API token pool with auto-rotation and failover to prevent rate limiting' },
    tokenPool: { zh: 'Token 池', en: 'Token Pool' },
    addToken: { zh: '添加 Token', en: 'Add Token' },
    tokenPlaceholder: { zh: '输入 GitHub Personal Access Token (ghp_...)', en: 'Enter GitHub Personal Access Token (ghp_...)' },
    saveTokens: { zh: '保存 Token 配置', en: 'Save Token Config' },
    tokenStatus: { zh: 'Token 状态', en: 'Token Status' },
    tokenActive: { zh: '可用', en: 'Active' },
    tokenCooldown: { zh: '冷却中', en: 'Cooldown' },
    tokenCooldownUntil: { zh: '冷却至', en: 'Until' },
    noTokens: { zh: '未配置任何 Token — 使用公开 API (60次/小时)', en: 'No tokens configured — using public API (60 req/hour)' },
    tokenCount: { zh: '个 Token', en: ' token(s)' },
    activeTokens: { zh: '可用', en: 'active' },
    rateLimitConfig: { zh: '频率限制配置', en: 'Rate Limit Config' },
    perIpLimit: { zh: '每 IP 每小时刷新上限', en: 'Per-IP refresh limit per hour' },
    cacheDuration: { zh: '数据缓存时长', en: 'Cache duration' },
    tokenCooldownTime: { zh: 'Token 冷却时间', en: 'Token cooldown time' },
    minutes: { zh: '分钟', en: 'minutes' },
    seconds: { zh: '秒', en: 'seconds' },
    hour: { zh: '小时', en: 'hour' },
    tokenHowItWorks: { zh: '工作原理', en: 'How It Works' },
    tokenHowDesc1: { zh: '多个 Token 自动轮询使用，均匀分摊请求', en: 'Multiple tokens rotate automatically to distribute requests evenly' },
    tokenHowDesc2: { zh: '当一个 Token 被限流时，自动切换到下一个可用 Token', en: 'When a token is rate-limited, automatically switches to the next available one' },
    tokenHowDesc3: { zh: '所有 Token 不可用时自动降级为公开 API（60次/小时）', en: 'Falls back to public API (60 req/hour) when all tokens are exhausted' },
    tokenHowDesc4: { zh: '每个访客每小时最多刷新 30 次，防止恶意消耗', en: 'Each visitor is limited to 30 refreshes/hour to prevent abuse' },
    tokensSaved: { zh: 'Token 配置已保存!', en: 'Token config saved!' },
    tokenRemove: { zh: '移除', en: 'Remove' },

    // Modal
    cancel: { zh: '取消', en: 'Cancel' },

    // Website form
    title: { zh: '标题', en: 'Title' },
    url: { zh: 'URL', en: 'URL' },
    description: { zh: '描述', en: 'Description' },
    tags: { zh: '标签(逗号分隔)', en: 'Tags (comma sep.)' },
    color: { zh: '颜色', en: 'Color' },
    icon: { zh: '图标', en: 'Icon' },

    // Repo form
    repoName: { zh: '名称', en: 'Name' },
    language: { zh: '语言', en: 'Language' },

    // Link form
    displayName: { zh: '显示名称', en: 'Display Name' },
    downloadUrl: { zh: '下载链接', en: 'Download URL' },
    fileName: { zh: '文件名', en: 'File Name' },
    fileSize: { zh: '文件大小(字节)', en: 'File Size (bytes)' },
    mimeType: { zh: 'MIME 类型', en: 'MIME Type' },
  },

  // === Toast messages ===
  toast: {
    profileSaved: { zh: '个人信息已保存!', en: 'Profile saved!' },
    websitesSaved: { zh: '网站已保存!', en: 'Websites saved!' },
    reposSaved: { zh: '仓库已保存!', en: 'Repos saved!' },
    uploaded: { zh: '上传成功!', en: 'uploaded!' },
    uploadFailed: { zh: '上传失败', en: 'Upload failed' },
    linkAdded: { zh: '链接已添加!', en: 'Link added!' },
    fileDeleted: { zh: '文件已删除!', en: 'File deleted!' },
    settingsSaved: { zh: '设置已保存! 刷新中...', en: 'Settings saved! Refreshing...' },
    pwUpdated: { zh: '密码已更新!', en: 'Password updated!' },
    fillBoth: { zh: '请填写两个字段', en: 'Please fill both fields' },
    deleteWebsite: { zh: '确定删除此网站?', en: 'Delete this website?' },
    deleteRepo: { zh: '确定删除此仓库?', en: 'Delete this repo?' },
    deleteFile: { zh: '确定删除此文件?', en: 'Delete this file?' },
    preparing: { zh: '准备中...', en: 'Preparing...' },
    ready: { zh: '完成!', en: 'Ready!' },
  },

  // === Trending Page ===
  trending: {
    title: { zh: 'GitHub 项目排行榜', en: 'GitHub Trending' },
    subtitle: { zh: '发现全球最热门和增长最快的开源项目', en: 'Discover the most popular and fastest-growing open source projects worldwide' },
    hotTab: { zh: '热门榜', en: 'Most Stars' },
    risingTab: { zh: '飙升榜', en: 'Rising' },
    language: { zh: '语言', en: 'Language' },
    allLangs: { zh: '全部', en: 'All' },
    noResults: { zh: '未找到符合条件的项目', en: 'No projects found matching the criteria' },
    noDesc: { zh: '暂无描述', en: 'No description' },
    dataFrom: { zh: '数据更新于', en: 'Data updated' },
    poweredBy: { zh: '数据来源: GitHub Search API · 每小时更新', en: 'Powered by GitHub Search API · Updated hourly' },
    backHome: { zh: '返回首页', en: 'Back to Home' },
    cached: { zh: '缓存', en: 'Cached' },
    noToken: { zh: '公开API', en: 'Public API' },
    limited: { zh: '已限流', en: 'Rate Limited' },
    refresh: { zh: '刷新', en: 'Refresh' },
    forceRefresh: { zh: '强制刷新数据', en: 'Force refresh data' },
    refreshQuota: { zh: '刷新配额', en: 'Refresh quota' },
    limitReached: { zh: '刷新次数已用尽，请稍后再试', en: 'Refresh limit reached, please try again later' },
    rateLimitMsg: { zh: '您的刷新次数已用尽 (每小时 30 次)，数据将使用缓存。请稍后再试。', en: 'Your refresh quota is exhausted (30/hour). Cached data is shown. Please try again later.' },
  },

  // Misc
  misc: {
    addWebsite: { zh: '添加网站', en: 'Add Website' },
    editWebsite: { zh: '编辑网站', en: 'Edit Website' },
    addRepo: { zh: '添加仓库', en: 'Add Repo' },
    editRepo: { zh: '编辑仓库', en: 'Edit Repo' },
    addExtLink: { zh: '添加外部链接', en: 'Add External Link' },
  },
}

/** Helper: get translation by lang */
export function t(section: string, key: string, lang: Lang): string {
  const sec = (translations as any)[section]
  if (!sec) return key
  const item = sec[key]
  if (!item) return key
  return item[lang] || item['en'] || key
}

/** Parse lang from cookie string */
export function parseLang(cookieStr: string | undefined): Lang {
  if (!cookieStr) return 'zh'
  const match = cookieStr.match(/portal_lang=(zh|en)/)
  return (match ? match[1] : 'zh') as Lang
}
