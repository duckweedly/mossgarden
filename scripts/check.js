const { existsSync, readFileSync, readdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const docs = join(root, 'docs');
const failures = [];

function requireFile(path) {
  if (!existsSync(join(root, path))) failures.push(`missing ${path}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

requireFile('site.config.json');
requireFile('src/projects.json');
requireFile('docs/assets/site.css');
requireFile('docs/assets/site.js');
requireFile('docs/favicon.svg');
requireFile('docs/apple-touch-icon.svg');
requireFile('docs/manifest.webmanifest');
requireFile('docs/CNAME');
requireFile('docs/feed.xml');
requireFile('docs/sitemap.xml');
requireFile('docs/robots.txt');
requireFile('docs/series/index.html');
requireFile('docs/series/ai-engineering/index.html');
requireFile('docs/projects/index.html');
requireFile('docs/about/index.html');

if (existsSync(join(root, 'docs/CNAME'))) {
  expect(read('docs/CNAME').trim() === 'xuean.wiki', 'docs/CNAME must point to xuean.wiki');
}

if (existsSync(join(root, 'docs/index.html'))) {
  const home = read('docs/index.html');
  expect(home.includes('随想') && home.includes('Random Thoughts'), 'home must use current brand');
  expect(!home.includes('苔庭') && !home.includes('Mossgarden'), 'home must not include old brand');
  expect(!home.includes('href="#"'), 'home must not contain placeholder hash links');
  expect(home.includes('rel="manifest"'), 'home must link manifest');
  expect(home.includes('rel="icon"'), 'home must link favicon');
  expect(home.includes('rel="stylesheet" href="assets/site.css"'), 'home must use extracted stylesheet');
  expect(home.includes('src="assets/site.js"'), 'home must use extracted runtime script');
  expect(home.includes('<div class="header-title"><a href="./">Random Thoughts</a></div>'), 'home title must match yinyang demo text');
  expect(!home.includes('100% human native.'), 'home must not include the removed subtitle copy');
  expect(home.includes('theme-icon'), 'home must use moon theme icon control');
  expect(home.includes('class="nav-group nav-primary"'), 'home must include primary nav row');
  expect(!home.includes('class="nav-group nav-secondary"'), 'home must not include the removed secondary nav row');
  expect(home.includes('href="series/"'), 'home Series nav must link to the Series page');
  expect(home.includes('href="projects/"'), 'home Project nav must link to the Project page');
  expect(home.includes('href="about/"'), 'home About nav must link to the About page');
  expect(!home.includes('关于设计、工程，和一些没想清楚的问题。'), 'home must remove the intro sentence');
  expect(home.includes('class="site-date-catalog"'), 'home must include year archive headings');
  expect(home.includes('class="posts-line"'), 'home must include yinyang-style post rows');
  expect(home.includes('class="posts-category"'), 'home must include bordered category labels');
  expect(!home.includes('id="panel"'), 'home must not include the old preview panel');
}

for (const page of ['series', 'projects', 'about']) {
  if (existsSync(join(root, `docs/${page}/index.html`))) {
    const html = read(`docs/${page}/index.html`);
    expect(html.includes('Random Thoughts'), `${page} page must use the shared header`);
    expect(html.includes(`href="../"`), `${page} page must link back home`);
    expect(html.includes('rel="stylesheet" href="../assets/site.css"'), `${page} page must use shared stylesheet`);
    expect(!html.includes('100% human native.'), `${page} page must not include removed subtitle copy`);
    expect(!html.includes('nav-secondary'), `${page} page must not include removed secondary nav row`);
  }
}

if (existsSync(join(root, 'docs/series/index.html'))) {
  const html = read('docs/series/index.html');
  expect(html.includes('class="series-list"'), 'series page must render a series list');
  expect(html.includes('href="ai-engineering/"'), 'series page must link to a series detail page');
}

if (existsSync(join(root, 'docs/series/ai-engineering/index.html'))) {
  const html = read('docs/series/ai-engineering/index.html');
  expect(html.includes('series-detail'), 'series detail must use a split layout');
  expect(html.includes('class="series-toc"'), 'series detail must include a left catalog');
  expect(html.includes('class="series-files"'), 'series detail must include right-side files');
}

if (existsSync(join(root, 'docs/projects/index.html'))) {
  const html = read('docs/projects/index.html');
  expect(html.includes('class="project-grid"'), 'projects page must render a card grid');
  expect(html.includes('class="project-tile"'), 'projects page must render rounded project cards');
}

if (existsSync(join(root, 'docs/about/index.html'))) {
  const html = read('docs/about/index.html');
  expect(html.includes('class="about-portrait"'), 'about page must include a portrait area');
  expect(html.includes('class="about-copy"'), 'about page must include personal copy');
  expect(html.includes('Hi, folks'), 'about page must follow the reference intro style');
}

for (const file of walk(docs).filter(path => path.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  expect(!html.includes('苔庭') && !html.includes('Mossgarden'), `${file} contains old brand`);
  expect(!html.includes('href="#"'), `${file} contains placeholder hash link`);
  expect(!/{{[a-z_]+}}/i.test(html), `${file} contains unresolved template token`);
}

if (existsSync(join(root, 'docs/feed.xml'))) {
  const feed = read('docs/feed.xml');
  expect(feed.includes('<rss') && feed.includes('</rss>'), 'feed.xml must contain rss root');
  expect(feed.includes('<content:encoded>'), 'feed.xml must include full content');
}

if (existsSync(join(root, 'docs/sitemap.xml'))) {
  const sitemap = read('docs/sitemap.xml');
  expect(sitemap.includes('<urlset') && sitemap.includes('</urlset>'), 'sitemap.xml must contain urlset root');
  expect(sitemap.includes('https://xuean.wiki/'), 'sitemap.xml must include site URL');
}

if (existsSync(join(root, 'docs/manifest.webmanifest'))) {
  const manifest = JSON.parse(read('docs/manifest.webmanifest'));
  expect(manifest.name === '随想 · Random Thoughts', 'manifest name must match brand');
  expect(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest must include icons');
}

if (existsSync(join(root, 'docs/assets/site.css'))) {
  const css = read('docs/assets/site.css');
  expect(css.includes('--bg-color'), 'theme must include yinyang background token');
  expect(css.includes('Bungee Shade'), 'theme must include yinyang title font');
  expect(css.includes('.site-header {'), 'theme must style yinyang header');
  expect(css.includes('color: var(--link-color);'), 'primary nav color must follow theme link color');
  expect(css.includes('grid-template-columns: 140px minmax(0, 1fr) 150px'), 'posts must use wide yinyang list columns');
  expect(css.includes('.posts-category'), 'home must style bordered category labels');
  expect(css.includes('min-width: 138px'), 'category labels must use fixed yinyang width');
  expect(css.includes('font-size: clamp(46px, 5.3vw, 68px)'), 'home title must use large yinyang scale');
  expect(css.includes('.posts-line'), 'home must style yinyang post rows');
  expect(css.includes('.article-shell'), 'article pages must use the new reading shell');
  expect(css.includes('.series-detail'), 'theme must style split series detail pages');
  expect(css.includes('.project-tile'), 'theme must style rounded project cards');
  expect(css.includes('.about-portrait'), 'theme must style the about portrait');
  expect(css.includes('@media (max-width: 640px)'), 'layout must include responsive archive behavior');
}

if (existsSync(join(root, 'docs/assets/site.js'))) {
  const js = read('docs/assets/site.js');
  expect(js.includes('setTheme'), 'runtime must keep theme toggle working');
  expect(!js.includes('openPanel'), 'runtime must not include old preview panel behavior');
  expect(!js.includes('routeQuery'), 'runtime must not include old composer routing');
}

if (failures.length) {
  console.error(failures.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('site check ok');
