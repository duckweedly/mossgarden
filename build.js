const { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } = require('fs');
const { join } = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const config = JSON.parse(readFileSync(join(__dirname, 'site.config.json'), 'utf8'));
const projects = JSON.parse(readFileSync(join(__dirname, 'src/projects.json'), 'utf8'));

const siteUrl = config.siteUrl.replace(/\/$/, '');
const siteTitle = config.title;
const siteDescription = config.description;

const posts = readdirSync(join(__dirname, 'src/posts'))
  .filter(f => f.endsWith('.md'))
  .map(file => {
    const raw = readFileSync(join(__dirname, 'src/posts', file), 'utf8');
    const { data, content } = matter(raw);
    const description = data.description || makeDescription(content);
    return {
      ...data,
      description,
      isoDate: fmtIso(data.date),
      url: `${siteUrl}/posts/${data.slug}/`,
      html: marked(content)
    };
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));

mkdirSync(join(__dirname, 'docs/assets'), { recursive: true });
copyFileSync(join(__dirname, 'src/assets/site.css'), join(__dirname, 'docs/assets/site.css'));
copyFileSync(join(__dirname, 'src/assets/site.js'), join(__dirname, 'docs/assets/site.js'));
writeFileSync(join(__dirname, 'docs/favicon.svg'), buildFavicon());
writeFileSync(join(__dirname, 'docs/apple-touch-icon.svg'), buildAppleTouchIcon());
writeFileSync(join(__dirname, 'docs/manifest.webmanifest'), buildManifest());

const postTpl = readFileSync(join(__dirname, 'templates/post.html'), 'utf8');

posts.forEach((post, i) => {
  const prev = posts[i + 1] || null;
  const next = posts[i - 1] || null;

  let html = postTpl
    .replace(/{{title}}/g, escapeHtml(post.title))
    .replace(/{{description}}/g, escapeHtml(post.description))
    .replace(/{{canonical_url}}/g, post.url)
    .replace(/{{iso_date}}/g, post.isoDate)
    .replace(/{{date}}/g, fmtDate(post.date))
    .replace(/{{tag}}/g, escapeHtml(post.tag))
    .replace(/{{content}}/g, post.html)
    .replace(/{{prev_url}}/g, prev ? `../${prev.slug}/` : '')
    .replace(/{{prev_title}}/g, prev ? escapeHtml(prev.title) : '')
    .replace(/{{next_url}}/g, next ? `../${next.slug}/` : '')
    .replace(/{{next_title}}/g, next ? escapeHtml(next.title) : '');

  if (!prev) html = html.replace(/<!-- IF_PREV -->[\s\S]*?<!-- \/IF_PREV -->/g, '');
  else html = html.replace(/<!-- IF_PREV -->/g, '').replace(/<!-- \/IF_PREV -->/g, '');

  if (!next) html = html.replace(/<!-- IF_NEXT -->[\s\S]*?<!-- \/IF_NEXT -->/g, '');
  else html = html.replace(/<!-- IF_NEXT -->/g, '').replace(/<!-- \/IF_NEXT -->/g, '');

  html = applyCommonConfig(html);
  html = applySharedAssets(html, '../../');

  mkdirSync(join(__dirname, `docs/posts/${post.slug}`), { recursive: true });
  writeFileSync(join(__dirname, `docs/posts/${post.slug}/index.html`), html);
  console.log(`  → ${post.slug}`);
});

const indexPath = join(__dirname, 'docs/index.html');
let idx = readFileSync(indexPath, 'utf8');

const listHtml = buildPostsList(posts);

idx = updateHomeMetadata(idx)
  .replace(
    /<!-- BEGIN_POSTS -->[\s\S]*?<!-- END_POSTS -->/,
    `<!-- BEGIN_POSTS -->\n${listHtml}\n      <!-- END_POSTS -->`
  )
  .replace(
    /<!-- POST_COUNT -->.*?<!-- \/POST_COUNT -->/,
    `<!-- POST_COUNT -->${posts.length} 篇<!-- /POST_COUNT -->`
  )
  .replace(
    /<!-- BEGIN_PROJECTS -->[\s\S]*?<!-- END_PROJECTS -->/,
    `<!-- BEGIN_PROJECTS --><!-- END_PROJECTS -->`
  );

idx = applySharedAssets(applyCommonConfig(idx), '');

writeFileSync(indexPath, idx);
writeStaticPages();
writeFileSync(join(__dirname, 'docs/feed.xml'), buildFeed(posts));
writeFileSync(join(__dirname, 'docs/sitemap.xml'), buildSitemap(posts));
writeFileSync(join(__dirname, 'docs/robots.txt'), buildRobots());
writeFileSync(join(__dirname, 'docs/404.html'), buildNotFoundPage());
console.log(`\n✓ built ${posts.length} posts`);

function updateHomeMetadata(html) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteTitle,
    url: `${siteUrl}/`,
    description: siteDescription
  };

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(siteTitle)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(siteDescription)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${siteUrl}/">`)
    .replace(/<link rel="alternate" type="application\/rss\+xml" title="[^"]*" href="feed.xml">/, `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.shortTitle)}" href="feed.xml">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(siteTitle)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(siteDescription)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${siteUrl}/">`)
    .replace(/<meta property="og:site_name" content="[^"]*">/, `<meta property="og:site_name" content="${escapeHtml(config.shortTitle)}">`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`);
}

function applyCommonConfig(html) {
  return html
    .replace(/<span class="brand-zh">[^<]*<\/span><span class="brand-en">[^<]*<\/span>/g, `<span class="brand-zh">${escapeHtml(config.shortTitle)}</span><span class="brand-en">${escapeHtml(config.englishTitle)}</span>`)
    .replace(/href="https:\/\/github\.com\/duckweedly"/g, `href="${escapeHtml(config.githubUrl)}"`)
    .replace(/<p class="cp">[^<]*<\/p>/g, `<p class="cp">${escapeHtml(config.copyright)}</p>`);
}

function applySharedAssets(html, prefix) {
  const assetLinks = [
    `<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="${prefix}apple-touch-icon.svg">`,
    `<link rel="manifest" href="${prefix}manifest.webmanifest">`,
    `<link rel="stylesheet" href="${prefix}assets/site.css">`
  ].join('\n');
  const runtime = `<script>\n  window.SITE_I18N = ${JSON.stringify(config.language, null, 2).replace(/\n/g, '\n  ')};\n</script>\n<script src="${prefix}assets/site.js" defer></script>`;

  html = html
    .replace(/\n<link rel="icon"[^>]*>/g, '')
    .replace(/\n<link rel="apple-touch-icon"[^>]*>/g, '')
    .replace(/\n<link rel="manifest"[^>]*>/g, '')
    .replace(/\n<link rel="stylesheet" href="[^"]*assets\/site\.css">/g, '')
    .replace(/\n<style>[\s\S]*?<\/style>\n/g, '\n');

  if (/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/.test(html)) {
    html = html.replace(/(<link href="https:\/\/fonts\.googleapis\.com[^>]+>)/, `$1\n${assetLinks}`);
  } else {
    html = html.replace('</head>', `${assetLinks}\n</head>`);
  }

  html = html.replace(/\n<script>\n\s*window\.SITE_I18N = [\s\S]*?;\n<\/script>\n<script src="[^"]*assets\/site\.js" defer><\/script>\n<\/body>/, `\n${runtime}\n</body>`);
  html = html.replace(/\n<script>\n\s*const root=document\.documentElement;[\s\S]*?<\/script>\n<\/body>/, `\n${runtime}\n</body>`);
  if (!html.includes('assets/site.js')) html = html.replace('</body>', `${runtime}\n</body>`);

  return html;
}

function buildProjectsSection(items) {
  const rows = items.map(project => {
    const details = project.details.map(item => `        <p>${escapeHtml(item)}</p>`).join('\n');
    const stack = project.stack.map(item => `<span>${escapeHtml(item)}</span>`).join('');
    return `      <article class="project-card">\n` +
      `        <div class="project-head"><span class="project-kind">${escapeHtml(project.kind)}</span><h3 class="project-name">${escapeHtml(project.title)}</h3></div>\n` +
      `        <p class="project-desc">${escapeHtml(project.description)}</p>\n` +
      `${details}\n` +
      `        <div class="stack">${stack}</div>\n` +
      `      </article>`;
  }).join('\n\n');

  return rows;
}

function buildPostsList(items) {
  const groups = new Map();
  items.forEach(post => {
    const year = new Date(post.date).getFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(post);
  });

  return Array.from(groups.entries()).map(([year, yearPosts]) => {
    const rows = yearPosts.map(post =>
      `      <div class="posts-line">\n` +
      `        <span class="posts-date">${fmtArchiveDate(post.date)}</span>\n` +
      `        <span class="posts-title"><a href="posts/${post.slug}/">${escapeHtml(post.title)}</a></span>\n` +
      `        <span class="posts-categories"><span class="posts-category">${escapeHtml(post.tag)}</span></span>\n` +
      `      </div>`
    ).join('\n');

    return `    <section class="posts-year" aria-labelledby="year-${year}">\n` +
      `      <h1 class="site-date-catalog" id="year-${year}">${year}</h1>\n` +
      `${rows}\n` +
      `    </section>`;
  }).join('\n\n');
}

function writeStaticPages() {
  const seriesItems = [
    {
      slug: 'ai-engineering',
      kicker: 'AI Engineering',
      title: '企业 AI、RAG、Agent 和交付系统',
      desc: '把模型能力放回真实业务链路里看：项目、知识、数据、流程和组织。',
      status: 'Series',
      files: [
        { title: '企业 AI 的第一步不是聊天框', meta: 'Project chain · Draft' },
        { title: 'RAG 如何接入真实交付事实', meta: 'Knowledge · Mock' },
        { title: 'Agent 什么时候该进业务流程', meta: 'Workflow · Mock' }
      ]
    },
    {
      slug: 'system-design',
      kicker: 'System Design',
      title: '系统设计与工程判断',
      desc: '记录架构边界、数据对象、权限、集成和可运维性的取舍。',
      status: 'Notes',
      files: [
        { title: '对象边界先于功能页面', meta: 'Architecture · Mock' },
        { title: '权限不是按钮显隐', meta: 'RBAC · Mock' }
      ]
    },
    {
      slug: 'design-taste',
      kicker: 'Design Taste',
      title: '产品、界面和审美练习',
      desc: '从具体界面、参考产品和真实使用感里打磨判断。',
      status: 'Study',
      files: [
        { title: '极简页面里的密度和留白', meta: 'UI · Mock' },
        { title: '设置页的信息架构练习', meta: 'Product · Mock' }
      ]
    }
  ];

  const projectItems = projects.map(project => ({
    kicker: project.kind,
    title: project.title,
    desc: project.description,
    status: project.stack[0] || 'Project'
  }));

  writePage('series', buildSeriesPage(seriesItems), '../');
  writePage('projects', buildProjectsPage(projectItems), '../');
  writePage('about', buildAboutPage(), '../');
  seriesItems.forEach(series => {
    writePage(`series/${series.slug}`, buildSeriesDetailPage(series, seriesItems), '../../');
  });
}

function writePage(slug, html, prefix) {
  mkdirSync(join(__dirname, `docs/${slug}`), { recursive: true });
  writeFileSync(join(__dirname, `docs/${slug}/index.html`), applySharedAssets(html, prefix));
}

function buildPageShell({ title, description, slug, prefix = '../', bodyClass = 'section-page-body', content }) {
  return `<!DOCTYPE html>
<html lang="zh" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} — ${escapeHtml(siteTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${siteUrl}/${slug}/">
<meta property="og:title" content="${escapeHtml(title)} — ${escapeHtml(siteTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${siteUrl}/${slug}/">
<meta property="og:site_name" content="${escapeHtml(config.shortTitle)}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1a1a" media="(prefers-color-scheme: dark)">
<script>
  (() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || theme === 'night') document.documentElement.setAttribute('data-theme', 'dark');
  })();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Bungee+Shade&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body class="${escapeHtml(bodyClass)}">
<header class="site-header">
  <div class="header-brand">
    <div class="header-title"><a href="${prefix}">Random Thoughts</a></div>
    <button class="theme-toggle theme-icon" id="theme-toggle" type="button" aria-label="切换主题">🌙</button>
  </div>
  <nav class="header-nav" aria-label="站点导航">
    <div class="nav-group nav-primary">
      <a class="header-item" href="${prefix}series/">Series</a>
      <a class="header-item" href="${prefix}projects/">Project</a>
      <a class="header-item" href="${prefix}about/">About</a>
    </div>
  </nav>
</header>

${content}

<footer class="site-footer">
  <p class="cp">${escapeHtml(config.copyright)}</p>
  <div class="socials">
    <a href="${escapeHtml(config.githubUrl)}" aria-label="GitHub">GitHub</a>
    <a href="${prefix}feed.xml" aria-label="RSS">RSS</a>
  </div>
</footer>
</body>
</html>
`;
}

function buildSeriesPage(items) {
  return buildPageShell({
    title: 'Series',
    description: '学习专栏列表。',
    slug: 'series',
    content: `<main class="site-wrap section-page" id="content">
  <h1 class="section-title">Series</h1>
  <div class="series-list">
${items.map(item => `    <a class="series-row" href="${item.slug}/">
      <span class="text-kicker">${escapeHtml(item.kicker)}</span>
      <span>
        <strong>${escapeHtml(item.title)}</strong>
        <em>${escapeHtml(item.desc)}</em>
      </span>
      <span class="text-status">${escapeHtml(item.status)}</span>
    </a>`).join('\n')}
  </div>
</main>`
  });
}

function buildSeriesDetailPage(series, allSeries) {
  return buildPageShell({
    title: series.title,
    description: series.desc,
    slug: `series/${series.slug}`,
    prefix: '../../',
    content: `<main class="series-detail site-wrap section-page" id="content">
  <aside class="series-toc" aria-label="系列目录">
    <div class="toc-title">Series</div>
${allSeries.map(item => `    <a href="../${item.slug}/"${item.slug === series.slug ? ' aria-current="page"' : ''}>${escapeHtml(item.kicker)}</a>`).join('\n')}
  </aside>
  <section class="series-files" aria-label="文件">
    <h1 class="section-title">${escapeHtml(series.kicker)}</h1>
    <p class="section-lead">${escapeHtml(series.desc)}</p>
${series.files.map(file => `    <article class="file-row">
      <h2>${escapeHtml(file.title)}</h2>
      <span>${escapeHtml(file.meta)}</span>
    </article>`).join('\n')}
  </section>
</main>`
  });
}

function buildProjectsPage(items) {
  return buildPageShell({
    title: 'Project',
    description: '自己做的项目。',
    slug: 'projects',
    content: `<main class="site-wrap section-page" id="content">
  <h1 class="section-title">Project</h1>
  <div class="project-grid">
${items.map(item => `    <article class="project-tile">
      <div class="project-kicker">${escapeHtml(item.kicker)}</div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.desc)}</p>
      <span>${escapeHtml(item.status)}</span>
    </article>`).join('\n')}
  </div>
</main>`
  });
}

function buildAboutPage() {
  return buildPageShell({
    title: 'About',
    description: '关于雪安。',
    slug: 'about',
    bodyClass: 'about-page-body',
    content: `<main class="site-wrap about-page" id="content">
  <div class="about-portrait" aria-hidden="true">雪安</div>
  <section class="about-copy">
    <p>Hi, folks, I'm Xuean.</p>
    <p>I live in Hangzhou and work on product, engineering, and AI delivery systems.</p>
    <p>I am also a <a href="../">Blogger</a>, <a href="../series/">Learner</a>, and <a href="../projects/">Maker</a>.</p>
    <p><a href="../projects/">Here</a> are some projects I have made.</p>
  </section>
</main>`
  });
}

function buildFeed(items) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${siteUrl}/</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-CN</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map(post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${post.url}</link>
      <guid>${post.url}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <content:encoded><![CDATA[${post.html}]]></content:encoded>
    </item>`).join('\n')}
  </channel>
</rss>
`;
}

function buildSitemap(items) {
  const urls = [
    { loc: `${siteUrl}/`, lastmod: items[0]?.isoDate || fmtIso(new Date()) },
    { loc: `${siteUrl}/series/`, lastmod: items[0]?.isoDate || fmtIso(new Date()) },
    { loc: `${siteUrl}/projects/`, lastmod: items[0]?.isoDate || fmtIso(new Date()) },
    { loc: `${siteUrl}/about/`, lastmod: items[0]?.isoDate || fmtIso(new Date()) },
    ...items.map(post => ({ loc: post.url, lastmod: post.isoDate }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>
`;
}

function buildRobots() {
  return `User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml
`;
}

function buildManifest() {
  return `${JSON.stringify({
    name: siteTitle,
    short_name: config.shortTitle,
    description: siteDescription,
    lang: 'zh-CN',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml', purpose: 'any' }
    ]
  }, null, 2)}\n`;
}

function buildFavicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#fff"/>
  <text x="32" y="42" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="700" fill="#000">R</text>
  <rect x="6" y="6" width="52" height="52" fill="none" stroke="#482936" stroke-width="3"/>
</svg>
`;
}

function buildAppleTouchIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#fff"/>
  <text x="90" y="117" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="700" fill="#000">R</text>
  <rect x="18" y="18" width="144" height="144" fill="none" stroke="#482936" stroke-width="8"/>
</svg>
`;
}

function buildNotFoundPage() {
  return `<!DOCTYPE html>
<html lang="zh" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>页面没有长出来 — ${escapeHtml(config.shortTitle)}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.svg">
<link rel="manifest" href="/manifest.webmanifest">
<script>
  (() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || theme === 'night') document.documentElement.setAttribute('data-theme', 'dark');
  })();
</script>
<style>
  :root{--bg:#fff;--ink:#000;--soft:#666;--border:#482936}
  :root[data-theme="dark"]{--bg:#1a1a1a;--ink:#e0e0e0;--soft:#aaa;--border:#8b5a7a}
  *{box-sizing:border-box}body{margin:0 20px;min-height:100vh;background:var(--bg);color:var(--ink);font-family:Georgia,'Times New Roman',serif}
  main{max-width:800px;margin:0 auto;padding-top:32px}
  main::after{content:"";display:block;width:100%;margin:10px 0 42px;border-width:2px;border-color:var(--border);border-style:solid none none}
  .code{font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:var(--soft);margin-bottom:18px}
  h1{font-size:2rem;font-weight:600;line-height:1.35;margin:0 0 18px}
  p{font-size:18px;line-height:1.8;color:var(--soft);margin:0 0 28px}
  a{color:var(--ink);text-decoration:none}a:hover{font-weight:600;text-decoration:underline}
</style>
</head>
<body>
<main>
  <div class="code">404</div>
  <h1>Not Found</h1>
  <p>这个链接暂时没有对应的页面。</p>
  <a href="/">回到${escapeHtml(config.shortTitle)}</a>
</main>
</body>
</html>
`;
}

function makeDescription(content) {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*_]{3,}$/gm, '')
    .replace(/[>*_#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

function fmtDate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y} 年 ${m} 月 ${day} 日`;
}

function fmtShort(d) {
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${m} / ${day}`;
}

function fmtArchiveDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
}

function fmtIso(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, '&apos;');
}
