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
  expect(home.includes('class="hero-prompt"'), 'home must include conversational prompt buttons');
  expect(home.includes('id="panel"'), 'home must include the preview panel');
  expect(home.includes('id="writing-template"'), 'home must include the writing panel template');
  expect(home.includes('id="projects-template"'), 'home must include the projects panel template');
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
  expect(css.includes('--bg-panel'), 'theme must include a panel surface token');
  expect(css.includes('.hero-prompt'), 'home must style conversational prompt rows');
  expect(css.includes('.input-bar'), 'home must style the composer input');
  expect(css.includes('.panel.open'), 'preview panel must have an open state');
  expect(css.includes('.feed-item'), 'writing feed items must be styled');
  expect(css.includes('.project-card'), 'project panel cards must be styled');
  expect(css.includes('.article-shell'), 'article pages must use the new reading shell');
  expect(css.includes('@media (max-width: 980px)'), 'layout must include responsive panel behavior');
}

if (existsSync(join(root, 'docs/assets/site.js'))) {
  const js = read('docs/assets/site.js');
  expect(js.includes('openPanel'), 'runtime must open the preview panel');
  expect(js.includes('routeQuery'), 'runtime must route composer prompts');
  expect(js.includes('data-sprout'), 'runtime must hydrate sprout marks');
}

if (failures.length) {
  console.error(failures.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('site check ok');
