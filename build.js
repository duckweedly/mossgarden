const { readFileSync, writeFileSync, mkdirSync, readdirSync } = require('fs');
const { join } = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const posts = readdirSync(join(__dirname, 'src/posts'))
  .filter(f => f.endsWith('.md'))
  .map(file => {
    const raw = readFileSync(join(__dirname, 'src/posts', file), 'utf8');
    const { data, content } = matter(raw);
    return { ...data, html: marked(content) };
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date));

const postTpl = readFileSync(join(__dirname, 'templates/post.html'), 'utf8');

posts.forEach((post, i) => {
  const prev = posts[i + 1] || null;
  const next = posts[i - 1] || null;

  let html = postTpl
    .replace(/{{title}}/g, post.title)
    .replace(/{{date}}/g, fmtDate(post.date))
    .replace(/{{tag}}/g, post.tag)
    .replace(/{{content}}/g, post.html)
    .replace(/{{prev_url}}/g, prev ? `../${prev.slug}/` : '')
    .replace(/{{prev_title}}/g, prev ? prev.title : '')
    .replace(/{{next_url}}/g, next ? `../${next.slug}/` : '')
    .replace(/{{next_title}}/g, next ? next.title : '');

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
  `      <span class="pt"><span class="ptag">${p.tag}</span><h3>${p.title}<span class="arr">→</span></h3></span>\n` +
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
console.log(`\n✓ built ${posts.length} posts`);

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
