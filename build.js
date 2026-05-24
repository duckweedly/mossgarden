const { readFileSync, writeFileSync, mkdirSync, readdirSync } = require('fs');
const { join } = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const siteUrl = 'https://xuean.wiki';
const siteTitle = '随想 · Random Thoughts';
const siteDescription = '关于设计、工程，和一些没想清楚的问题。不定期更新。';

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

  mkdirSync(join(__dirname, `docs/posts/${post.slug}`), { recursive: true });
  writeFileSync(join(__dirname, `docs/posts/${post.slug}/index.html`), html);
  console.log(`  → ${post.slug}`);
});

const indexPath = join(__dirname, 'docs/index.html');
let idx = readFileSync(indexPath, 'utf8');

const listHtml = posts.map(p =>
  `    <a class="post" href="posts/${p.slug}/">\n` +
  `      <span class="pt"><span class="ptag">${escapeHtml(p.tag)}</span><h3>${escapeHtml(p.title)}<span class="arr">→</span></h3></span>\n` +
  `      <span class="yr">${fmtShort(p.date)}</span>\n` +
  `    </a>`
).join('\n');

idx = idx
  .replace(
    /<!-- BEGIN_POSTS -->[\s\S]*?<!-- END_POSTS -->/,
    `<!-- BEGIN_POSTS -->\n${listHtml}\n    <!-- END_POSTS -->`
  )
  .replace(
    /<!-- POST_COUNT -->.*?<!-- \/POST_COUNT -->/,
    `<!-- POST_COUNT -->${posts.length} 篇<!-- /POST_COUNT -->`
  );

writeFileSync(indexPath, idx);
writeFileSync(join(__dirname, 'docs/feed.xml'), buildFeed(posts));
writeFileSync(join(__dirname, 'docs/sitemap.xml'), buildSitemap(posts));
writeFileSync(join(__dirname, 'docs/robots.txt'), buildRobots());
writeFileSync(join(__dirname, 'docs/404.html'), buildNotFoundPage());
console.log(`\n✓ built ${posts.length} posts`);

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

function buildNotFoundPage() {
  return `<!DOCTYPE html>
<html lang="zh" data-theme="day">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>页面没有长出来 — 随想</title>
<meta name="robots" content="noindex">
<script>
  (() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'day' || theme === 'night') document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
<style>
  :root[data-theme="day"]{--bg:#f4ecd8;--paper:#fbf6e9;--ink:#4a3f2f;--soft:#7a6c54;--moss:#5d6e34;--line:rgba(93,110,52,.18)}
  :root[data-theme="night"]{--bg:#141a13;--paper:#202a1d;--ink:#e8e4d4;--soft:#b0ac98;--moss:#a8c068;--line:rgba(143,168,90,.16)}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font-family:Georgia,'Times New Roman',serif;padding:28px}
  main{max-width:560px;background:var(--paper);border:1px solid var(--line);border-radius:24px;padding:42px 36px;text-align:center}
  .code{font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:var(--moss);margin-bottom:18px}
  h1{font-size:clamp(32px,8vw,56px);font-weight:400;letter-spacing:-.04em;line-height:1.05;margin:0 0 18px}
  p{font-size:17px;line-height:1.8;color:var(--soft);margin:0 0 28px}
  a{color:var(--moss);text-decoration:none;border-bottom:1px solid var(--line)}
</style>
</head>
<body>
<main>
  <div class="code">404</div>
  <h1>这页还没有长出来。</h1>
  <p>也许是旧链接，也许是一颗还没发芽的种子。</p>
  <a href="/">回到随想</a>
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
