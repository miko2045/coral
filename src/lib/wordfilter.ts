/**
 * wordfilter.ts — Comprehensive profanity / sensitive word filter + anti-injection
 *
 * Features:
 * - 400+ blocked terms across 10 categories (ZH + EN)
 * - Pinyin variant detection (caonima, nmsl, etc.)
 * - Symbol evasion resistance (f.u.c.k, sh!t, @$$, etc.)
 * - Zero-width / invisible char stripping
 * - URL / link detection (50+ TLDs)
 * - Spam pattern detection (repeated chars, symbol flood, pure numbers)
 * - XSS / injection defense (HTML, JS, SQL, template literals)
 * - JSON prototype pollution prevention
 *
 * v2 — Fixed false-positive issue: short patterns no longer match inside English words.
 *      Uses word-boundary matching for short EN patterns and CJK-context matching
 *      for pinyin abbreviations.
 */

// ============================================================
//  1. BLOCKED WORD DATABASE — 10 categories
// ============================================================

// --- Chinese terms: always substring-matched (CJK context) ---
const ZH_BLOCKED: string[] = [
  // ── Political sensitive (政治敏感) ~80 terms ──
  '习近平', '习主席', '习总', '习大大', '习帝', '习包子', '包帝',
  '小熊维尼', '维尼熊', '维尼', '噗噗熊',
  '刁近平', '刁大大', '刁包', '翠翠', '庆丰帝', '庆丰包子',
  '李克强', '李强', '王岐山', '温家宝', '胡锦涛', '江泽民', '江蛤', '蛤蟆', '膜蛤', '长者',
  '邓小平', '毛泽东', '毛主席', '腊肉', '毛腊肉',
  '共产党', '共匪', '中共', '土共', '赤匪', '赤化',
  '六四', '天安门事件', '六四事件', '坦克人', '五月三十五',
  '法轮功', '法轮大法', '李洪志',
  '达赖喇嘛', '达赖', '藏独', '疆独', '台独', '港独', '东突',
  '民运', '民主运动', '反共', '反华', '颠覆政权', '颠覆国家',
  '独裁', '专制', '极权', '集权', '威权',
  '翻墙', '梯子', '科学上网', '翻牆',
  '文革', '文化大革命', '大跃进', '大饥荒', '反右', '三年自然灾害',
  '刘晓波', '零八宪章', '艾未未', '王丹', '吾尔开希', '柴玲', '王军涛',
  '退党', '三退', '九评', '天灭中共',
  '赵家人', '河蟹', '被和谐',

  // ── Pornographic (色情) ~90 terms ──
  '操你妈', '操你', '操逼', '操B', '日你妈', '日你', '日逼', '日B',
  '肏', '艹你', '艹逼', '草你妈', '草你', '草泥马',
  '鸡巴', '几把', '鸡鸡', '牛子', '屌', '叼',
  '阴茎', '阴道', '阴唇', '阴蒂', '阴部', '阴毛',
  '做爱', '性交', '口交', '肛交', '手淫', '自慰', '打飞机', '打炮', '撸管',
  '高潮', '潮吹', '颜射', '内射', '中出', '无码', '有码', '骑乘',
  '色情', '黄片', '毛片', '苍井空', '小泽玛利亚',
  '援交', '约炮', '一夜情', '包夜', '找小姐', '嫖', '嫖娼', '卖淫',
  '裸聊', '裸体', '露点', '走光', '裸照', '自拍门',
  '淫荡', '淫乱', '淫秽', '淫水', '骚逼', '骚货', '浪叫', '浪货',
  '乱伦', '人兽', '恋童', '幼女', '幼交', '萝莉控', '正太控',
  '强奸', '强暴', '轮奸', '迷奸', '迷药', '春药', '催情', '迷幻',
  '阳具', '自慰器', '飞机杯', '充气娃娃', '情趣用品', '跳蛋', '按摩棒',
  '调教', '捆绑', '虐恋',
  '肉棒', '肉穴', '菊穴', '后庭', '后入', '深喉', '足交', '胸推',
  '群交', '多人运动', '换妻', '绿帽',
  '黄色网站', '成人网站', '激情视频', '视频裸聊',

  // ── Violence / Terrorism (暴力/恐怖) ~40 terms ──
  '杀人', '砍人', '捅人', '弑', '屠杀', '血洗', '灭门',
  '炸弹', '炸药', '爆炸物', '火药', '硝酸铵', '雷管',
  '枪支', '手枪', '步枪', '冲锋枪', '子弹', '军火', '买枪', '卖枪',
  '恐怖袭击', '恐怖分子', '圣战', '基地组织',
  '自杀', '自残', '割腕', '跳楼', '上吊', '烧炭', '服毒', '割喉',
  '虐待', '酷刑', '活摘', '器官买卖', '活埋',
  '报复社会', '同归于尽', '拉人垫背', '无差别攻击',

  // ── Abuse / Insults (辱骂/侮辱) ~80 terms ──
  '傻逼', '煞笔', '傻B', '沙比', '傻比', '傻叉', '傻吊',
  '妈的', '他妈的', '你妈的', '你妈逼', '你麻痹',
  '卧槽', '我操', '我靠', '我艹', '尼玛', '泥马', '你妈',
  '狗日的', '王八蛋', '王八羔子', '混蛋', '畜生', '畜牲',
  '贱人', '贱货', '贱逼', '贱种',
  '废物', '脑残', '智障', '弱智', '白痴', '蠢货', '蠢逼', '蠢猪',
  '去死', '去死吧', '滚蛋', '滚犊子', '滚你妈', '你全家',
  '断子绝孙', '死全家', '全家死光', '不得好死', '下地狱', '全家暴毙',
  '婊子', '妓女', '鸡婆', '绿茶婊', '心机婊', '白莲花',
  '人渣', '败类', '狗东西', '猪狗不如', '狗娘养的',
  '屁眼', '二逼', '脑子有病', '神经病', '变态',
  '吃屎', '放屎',
  '小日本', '日本鬼子', '鬼子', '棒子', '高丽棒子',
  '黑鬼', '白皮猪', '阿三', '老毛子',
  '支那', '支那人', '东亚病夫', '劣等民族',
  '死妈', '丧妈', '妈死了', '爹死了', '爸死了',

  // ── Scam / Gambling (诈骗/赌博) ~40 terms ──
  '赌博', '赌场', '赌球', '赌马', '博彩', '菠菜', '彩票预测', '时时彩',
  '六合彩', '竞猜', '包赢', '包赚', '必赢', '必赚',
  '地下赌场', '网络赌博', '线上赌场', '百家乐', '老虎机', '轮盘',
  '代孕', '卖肾', '枪支买卖', '黑市',
  '洗钱', '地下钱庄', '跑分', '骗局',
  '传销', '资金盘', '杀猪盘', '高返利', '拉人头',
  '假币', '伪钞', '办证', '假证', '办假',

  // ── Drugs (毒品) ~35 terms ──
  '大麻', '冰毒', '海洛因', '可卡因', '摇头丸', '吸毒', '贩毒',
  '麻古', '安非他命', '鸦片', '吗啡', '杜冷丁', '美沙酮',
  '冰壶', '飞叶子', '嗑药', '毒品',
  '笑气', '上头电子烟', '合成大麻素', '致幻蘑菇', '迷幻药',
  '氯胺酮', '芬太尼', '甲基苯丙胺', '三唑仑', '蓝精灵',
  '制毒', '贩卖毒品', '运毒', '种大麻', '麻叶',

  // ── Spam / Ads (垃圾广告) ~40 terms ──
  '加微信', '加qq', '加我', '私聊', '代开发票', '代办',
  '刷单', '兼职日赚', '在家赚钱', '月入过万', '日入千元',
  '免费领取', '扫码领', '点击领取', '限时免费',
  '网赚', '暴利项目', '稳赚不赔', '零投资', '高回报',
  '低价出售', '特价优惠', '清仓甩卖',
  '内部消息', '独家爆料', '猛料',
  '信用卡套现', '花呗套现', '借呗', '网贷', '高利贷', '裸贷',
  '色粉', '引流', '拉群', '建群',
  '代刷', '代练', '外挂', '开挂',
  '复制粘贴', '转发赚钱',

  // ── Internet slang / coded (网络黑话/暗语) ~25 terms ──
  '你🐴', '🐴的', '🐶日的',
  '弔', '㚻', '尻',
  '寸止', '本番', '痴女', '巨根', '潮喷',
  '福利姬', '萝莉', '白虎', '粉嫩',
  '站街', '楼凤', '外围', '商务模特',
]

// --- Pinyin abbreviations: standalone match only (not substring) ---
// These short strings should only match if the entire input IS the pinyin,
// or if they appear as standalone tokens surrounded by non-alphanumeric chars.
const PINYIN_BLOCKED: string[] = [
  'caonima', 'cnm', 'nmsl', 'nmsle', 'nmb', 'rnm', 'mdzz',
  'wqnmlgb', 'wcnm', 'qnmlgb', 'wdnmd', 'dllm', 'mlgb',
  'shabi', 'tmd', 'cnmb',
  'gcd', 'ccp', 'cpc',
  '8964',
  'wtf', 'stfu', 'lmao',
]

// --- English terms: word-boundary matching for short ones ---
const EN_BLOCKED: string[] = [
  // ── Severe profanity ~40 terms ──
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckoff', 'motherfucker',
  'fck', 'fuk', 'phuck', 'phuk', 'fux',
  'shit', 'bullshit', 'shitty', 'horseshit', 'dipshit', 'shithead', 'apeshit',
  'bitch', 'bitches', 'biatch', 'biotch', 'sonofabitch',
  'cunt', 'cunts',
  'dick', 'dickhead', 'cock', 'cocksucker', 'knobhead',
  'asshole', 'arsehole', 'jackass', 'dumbass', 'fatass', 'smartass',
  'bastard', 'wanker', 'twat', 'prick', 'tosser', 'bellend',
  'whore', 'slut', 'hoe', 'skank', 'thot',
  'damn', 'goddamn', 'dammit',
  'piss', 'pissoff', 'pissy',
  'stfu', 'gtfo', 'lmfao', 'omfg',

  // ── Racial / Hate speech ~30 terms ──
  'nigger', 'nigga', 'negro',
  'chink', 'chinky', 'gook', 'spic', 'kike', 'wetback', 'beaner',
  'cracker', 'honky', 'gringo', 'wop', 'dago', 'raghead', 'towelhead',
  'faggot', 'fag', 'dyke', 'tranny', 'shemale',
  'retard', 'retarded', 'spaz', 'spastic', 'mongoloid',
  'white supremacy', 'white power', 'heil hitler', 'nazi', 'neonazi',
  'kkk', 'ku klux klan', 'sieg heil',
  'holocaust denial', 'race war',

  // ── Sexual ~50 terms ──
  'porn', 'porno', 'pornography', 'pornhub', 'xvideos', 'xhamster',
  'hentai', 'xxx', 'nsfw', 'rule34',
  'blowjob', 'handjob', 'rimjob', 'footjob', 'titjob', 'titfuck',
  'cumshot', 'creampie', 'bukkake', 'gangbang',
  'anal', 'orgasm', 'erection', 'boner',
  'dildo', 'vibrator', 'fleshlight', 'buttplug',
  'masturbate', 'masturbation', 'jerkoff', 'fap', 'wank',
  'rape', 'rapist', 'molest', 'molestation',
  'pedophile', 'paedophile', 'pedo', 'grooming',
  'incest', 'bestiality', 'necrophilia', 'zoophilia',
  'nude', 'naked', 'titties', 'boobs', 'tits', 'pussy', 'vagina', 'penis',
  'escort', 'prostitute', 'hooker', 'brothel', 'callgirl',
  'onlyfans', 'camgirl', 'sexcam', 'livejasmin',
  'deepthroat', 'doggystyle',
  'bondage', 'bdsm', 'dominatrix', 'sadomasochism',

  // ── Violence ~30 terms ──
  'kill yourself', 'killyourself', 'kys', 'go die', 'go kill',
  'suicide', 'suicidal', 'self harm', 'selfharm',
  'bomb', 'bomber', 'bombing', 'terrorist', 'terrorism', 'jihad', 'jihadist',
  'genocide', 'massacre', 'slaughter', 'ethnic cleansing',
  'mass shooting', 'school shooting',
  'murder', 'homicide', 'assassinate', 'assassination',
  'beheading', 'dismember', 'torture', 'mutilate',
  'anthrax', 'bioweapon', 'chemical weapon',

  // ── Drugs ~25 terms ──
  'cocaine', 'heroin', 'meth', 'methamphetamine', 'crackhead',
  'marijuana', 'cannabis', 'ecstasy', 'mdma', 'lsd',
  'ketamine', 'fentanyl', 'oxycontin', 'xanax',
  'drug dealer', 'drug trafficking', 'drug lord',
  'overdose',
  'shrooms', 'dmt',

  // ── Scam / Spam ~30 terms ──
  'free money', 'make money fast', 'get rich quick', 'earn from home',
  'click here', 'act now', 'limited offer', 'dont miss out',
  'casino', 'gambling', 'sportsbet', 'pokerstars',
  'crypto pump', 'bitcoin doubler', 'send bitcoin', 'crypto airdrop',
  'forex signal', 'binary options', 'pyramid scheme',
  'nigerian prince', 'lottery winner', 'you have won',
  'passive income guaranteed',
  'diet pills', 'weight loss miracle', 'enlargement',
  'buy followers', 'buy likes', 'instagram growth',

  // ── VPN / proxy (English variants) ──
  'vpn', 'v2ray', 'shadowsock', 'ssr', 'trojan proxy',
  'falun', 'falundafa',
  'isis', 'taliban',
  'tnt',
]

// ============================================================
//  2. NORMALIZE — defeat evasion tactics
// ============================================================

/**
 * Light normalization: lowercase + fullwidth→ASCII + cyrillic→latin + strip invisible chars.
 * Does NOT strip spaces or punctuation — those are handled per-strategy.
 */
function normLight(text: string): string {
  return text
    .toLowerCase()
    // Fullwidth → ASCII (Ａ→a, ０→0, etc.)
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    // Cyrillic look-alikes → Latin
    .replace(/а/g, 'a').replace(/е/g, 'e').replace(/о/g, 'o')
    .replace(/р/g, 'p').replace(/с/g, 'c').replace(/х/g, 'x')
    // Strip zero-width chars, combining marks, variation selectors
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u0300-\u036F\uFE00-\uFE0F\u00AD]/g, '')
    // Strip emoji skin tones and regional indicators
    .replace(/[\u{1F3FB}-\u{1F3FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
}

/**
 * Aggressive normalization for evasion-resistant matching:
 * additionally strips all separators and performs leet-speak replacement.
 */
function normAggressive(text: string): string {
  return normLight(text)
    // Number/symbol substitutions (leet speak)
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/\$/g, 's').replace(/@/g, 'a').replace(/!/g, 'i')
    .replace(/\+/g, 't').replace(/8/g, 'b')
    // Strip separators (periods, dashes, underscores, etc.)
    .replace(/[.*_\-~`|\\\/,;:'"(){}\[\]<>^#%&=?+\s]+/g, '')
}

// ============================================================
//  3. BUILD LOOKUP STRUCTURES
// ============================================================

// Chinese blocked: always substring-matched against aggressive-normalized text
const zhPatterns: string[] = []
const zhSeen = new Set<string>()
for (const w of ZH_BLOCKED) {
  const n = normAggressive(w)
  if (n.length <= 1 || zhSeen.has(n)) continue
  zhSeen.add(n)
  zhPatterns.push(n)
}
zhPatterns.sort((a, b) => b.length - a.length) // longest first

// Pinyin abbreviations: match as whole tokens only
const pinyinSet = new Set<string>()
for (const w of PINYIN_BLOCKED) {
  pinyinSet.add(normLight(w))
}

// English blocked: word-boundary regex matching
interface EnPattern {
  original: string
  regex: RegExp
}
const enPatterns: EnPattern[] = []
const enSeen = new Set<string>()
for (const w of EN_BLOCKED) {
  const n = normLight(w)
  if (n.length <= 1 || enSeen.has(n)) continue
  enSeen.add(n)
  // Escape special regex characters
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Word boundary: if pattern contains space (multi-word), just use as-is
  // For single words, require word boundary on both sides
  const boundaryPattern = n.includes(' ')
    ? escaped.replace(/ +/g, '\\s+')
    : `(?:^|[^a-z])${escaped}(?:$|[^a-z])`
  try {
    enPatterns.push({ original: n, regex: new RegExp(boundaryPattern) })
  } catch {
    // If regex creation fails, skip
  }
}

// For evasion-resistant English matching (f.u.c.k → fuck):
// Use aggressive normalization + substring match, but ONLY for patterns ≥ 4 chars
const enAggressivePatterns: string[] = []
for (const w of EN_BLOCKED) {
  const n = normAggressive(w)
  if (n.length < 4 || zhSeen.has(n)) continue // skip short ones to avoid false positives
  if (!enAggressivePatterns.includes(n)) {
    enAggressivePatterns.push(n)
  }
}
enAggressivePatterns.sort((a, b) => b.length - a.length)

// ============================================================
//  4. URL / LINK detection
// ============================================================

const URL_PATTERN = /https?:\/\/|www\.|ftp:\/\/|\/\/[a-z]/i
const TLD_PATTERN = /\.(com|cn|net|org|io|xyz|top|vip|cc|info|me|co|dev|app|site|online|store|shop|club|fun|live|pro|tech|space|link|work|one|moe|icu|bid|win|loan|date|men|download|racing|review|stream|click|gdn|accountant|science|party|trade|faith|cricket|webcam|pw|buzz|tk|ml|ga|cf|gq)\b/i
const SHORT_URL = /t\.me|bit\.ly|tinyurl|goo\.gl|is\.gd|v\.gd|rb\.gy|cutt\.ly|短链|网址|链接/i

// ============================================================
//  5. INJECTION / XSS PATTERNS
// ============================================================

const INJECTION_PATTERNS: RegExp[] = [
  // HTML / XSS
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(?:error|load|click|mouse|focus|blur|key|submit|change|input|touch)\s*=/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /<\s*(?:img|svg|iframe|object|embed|form|link|meta|style|base|body|html|head|marquee|applet|video|audio|source|input|button|textarea|select)\b/i,
  /\bexpression\s*\(/i,
  /\beval\s*\(/i,
  /document\s*\.\s*(?:cookie|domain|write|location|referrer)/i,
  /window\s*\.\s*(?:location|open|eval)/i,
  /\balert\s*\(/i,
  /\bprompt\s*\(/i,
  /\bconfirm\s*\(/i,
  // SQL injection
  /(?:union\s+select|select\s+.*\s+from|insert\s+into|update\s+.*\s+set|delete\s+from|drop\s+table|alter\s+table)/i,
  /(?:or|and)\s+\d+\s*=\s*\d+/i,
  /'\s*(?:or|and)\s+'/i,
  /;\s*(?:drop|delete|update|insert|alter|create|exec)\b/i,
  /(?:--|#|\/\*)\s*$/,
  // Template literal injection
  /\$\{.*\}/,
  /\{\{.*\}\}/,
  // Path traversal
  /\.\.\//,
  /\.\.%2f/i,
  // Command injection
  /[;&|`]\s*(?:cat|ls|rm|wget|curl|bash|sh|python|node|exec|eval)\b/i,
]

// ============================================================
//  6. MAIN EXPORTS
// ============================================================

export interface FilterResult {
  blocked: boolean
  reason?: string
  matchedWord?: string
}

/**
 * Check if text contains blocked content.
 */
export function checkText(rawText: string): FilterResult {
  if (!rawText || typeof rawText !== 'string') return { blocked: false }

  // ① Injection / XSS — check raw text
  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(rawText)) {
      return { blocked: true, reason: 'injection', matchedWord: 'code injection' }
    }
  }

  // ② URLs / links — check raw text
  if (URL_PATTERN.test(rawText) || TLD_PATTERN.test(rawText) || SHORT_URL.test(rawText)) {
    return { blocked: true, reason: 'link', matchedWord: 'URL/link' }
  }

  // ③ Chinese blocked words — substring match on aggressive-normalized text
  const aggNorm = normAggressive(rawText)
  for (const pattern of zhPatterns) {
    if (aggNorm.includes(pattern)) {
      return { blocked: true, reason: 'blocked_word', matchedWord: pattern }
    }
  }

  // ④ Pinyin abbreviations — whole-token match
  //    Split input by non-alphanumeric boundaries and check each token
  const lightNorm = normLight(rawText)
  const tokens = lightNorm.split(/[^a-z0-9]+/).filter(t => t.length > 0)
  for (const token of tokens) {
    if (pinyinSet.has(token)) {
      return { blocked: true, reason: 'blocked_word', matchedWord: token }
    }
  }
  // Also check the entire text without spaces (for concatenated pinyin like "caonima")
  const noSpaces = lightNorm.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '')
  for (const py of pinyinSet) {
    if (py.length >= 4 && noSpaces.includes(py)) {
      return { blocked: true, reason: 'blocked_word', matchedWord: py }
    }
  }

  // ⑤ English blocked words — word-boundary match on light-normalized text
  for (const ep of enPatterns) {
    if (ep.regex.test(lightNorm)) {
      return { blocked: true, reason: 'blocked_word', matchedWord: ep.original }
    }
  }

  // ⑥ English evasion-resistant (f.u.c.k → fuck) — aggressive normalize, ≥4 chars only
  for (const pattern of enAggressivePatterns) {
    if (aggNorm.includes(pattern)) {
      return { blocked: true, reason: 'blocked_word', matchedWord: pattern }
    }
  }

  // ⑦ Repeated char spam (8+ identical consecutive chars)
  if (/(.)\1{7,}/.test(rawText)) {
    return { blocked: true, reason: 'spam_repeat', matchedWord: 'repeated chars' }
  }

  // ⑧ Pure-number messages (phone numbers, QQ numbers, etc.)
  if (/^\d{5,}$/.test(rawText.replace(/[\s\-+()]/g, ''))) {
    return { blocked: true, reason: 'spam_number', matchedWord: 'pure number string' }
  }

  // ⑨ Excessive special chars / symbol spam (>65% non-text in messages >5 chars)
  const textChars = rawText.replace(/[^\w\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s]/g, '').length
  if (rawText.length > 5 && textChars / rawText.length < 0.35) {
    return { blocked: true, reason: 'spam_symbols', matchedWord: 'symbol spam' }
  }

  return { blocked: false }
}

/**
 * Quick boolean check — convenience wrapper.
 */
export function isBlocked(text: string): boolean {
  return checkText(text).blocked
}

/**
 * Deep-sanitize a string for safe storage and display.
 * Strips: HTML tags, control chars, zero-width chars, excessive whitespace, HTML entities.
 * This is defense-in-depth on top of the frontend escHtml().
 */
export function sanitizeText(raw: string, maxLen = 60): string {
  return raw
    .trim()
    // Strip HTML tags (including malformed ones)
    .replace(/<[^>]*>?/g, '')
    // Strip HTML entities that could be used for evasion
    .replace(/&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, '')
    // Strip control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip zero-width and invisible chars
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\u034F\u061C\u180E]/g, '')
    // Collapse excessive whitespace
    .replace(/\s{3,}/g, '  ')
    // Enforce max length
    .slice(0, maxLen)
}

/**
 * Validate that an object parsed from JSON doesn't contain prototype pollution keys.
 */
export function isSafeJSON(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return true
  const dangerous = ['__proto__', 'constructor', 'prototype']
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (dangerous.includes(key)) return false
  }
  return true
}
