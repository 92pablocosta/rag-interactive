'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const siteRoot = 'https://www.rag-interactive.com';
const learnHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const labHtml = fs.readFileSync(path.join(root, 'lab', 'index.html'), 'utf8');

test('the canonical domain is www.rag-interactive.com and no legacy deployment references remain', () => {
  assert.doesNotMatch(learnHtml, /rag-interactive\.vercel\.app/);
  assert.doesNotMatch(labHtml, /rag-interactive\.vercel\.app/);
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.doesNotMatch(readme, /rag-interactive\.vercel\.app\]/);
  assert.doesNotMatch(readme, /\[[^\]]*\]\(https:\/\/rag-interactive\.vercel\.app/);
  for (const content of [learnHtml, labHtml, readme]) {
    assert.doesNotMatch(content, /\/v1\//, 'obsolete /v1/ reference found');
  }
  assert.match(learnHtml, /rel="canonical"\s+href="https:\/\/www\.rag-interactive\.com\/"/);
  assert.match(labHtml, /rel="canonical"\s+href="https:\/\/www\.rag-interactive\.com\/lab\/"/);
});

test('the Learn page publishes title, description, Open Graph, and Twitter metadata', () => {
  assert.match(learnHtml, /<title>Learn RAG from the inside out \| RAG Interactive<\/title>/);
  assert.match(learnHtml, /name="description"\s+content="Learn the Basic RAG pipeline visually/);
  for (const prop of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url']) {
    assert.match(learnHtml, new RegExp(`property="${prop}"\\s+content="[^"]+"`), `missing ${prop}`);
  }
  assert.match(learnHtml, /property="og:type"\s+content="website"/);
  assert.match(learnHtml, /property="og:url"\s+content="https:\/\/www\.rag-interactive\.com\/"/);
  assert.match(learnHtml, /name="twitter:card"\s+content="summary"/);
});

test('the Lab page publishes title, description, Open Graph, and Twitter metadata', () => {
  assert.match(labHtml, /<title>Lab \| RAG Interactive<\/title>/);
  assert.match(labHtml, /name="description"\s+content="Experiment with RAG in the RAG Interactive Lab/);
  for (const prop of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url']) {
    assert.match(labHtml, new RegExp(`property="${prop}"\\s+content="[^"]+"`), `missing ${prop}`);
  }
  assert.match(labHtml, /property="og:type"\s+content="website"/);
  assert.match(labHtml, /property="og:url"\s+content="https:\/\/www\.rag-interactive\.com\/lab\/"/);
  assert.match(labHtml, /name="twitter:card"\s+content="summary"/);
});

test('no fabricated social preview image is published', () => {
  assert.doesNotMatch(learnHtml, /og:image/);
  assert.doesNotMatch(labHtml, /og:image/);
});

test('favicon references resolve from both pages', () => {
  assert.ok(fs.existsSync(path.join(root, 'favicon.svg')), 'favicon.svg must exist at the site root');
  assert.match(learnHtml, /rel="icon"\s+type="image\/svg\+xml"\s+href="favicon\.svg"/);
  assert.match(labHtml, /rel="icon"\s+type="image\/svg\+xml"\s+href="\.\.\/favicon\.svg"/);
});

test('robots.txt exists and references the sitemap', () => {
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\/\s*$/m);
  assert.match(robots, /Sitemap:\s*https:\/\/www\.rag-interactive\.com\/sitemap\.xml/);
});

test('sitemap.xml lists only the real public pages', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /<loc>https:\/\/www\.rag-interactive\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/www\.rag-interactive\.com\/lab\/<\/loc>/);
  assert.doesNotMatch(sitemap, /\/build\/|\/learn\/|\/roadmap\/|vercel\.app/);
});

test('every internal link and asset reference resolves to a real file', () => {
  for (const [file, html] of [['index.html', learnHtml], ['lab/index.html', labHtml]]) {
    const base = path.dirname(path.join(root, file));
    for (const match of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|tel:)/.test(target)) continue;
      if (target.startsWith('#')) continue;
      const resolved = path.resolve(base, target.split('#')[0].split('?')[0]);
      assert.ok(fs.existsSync(resolved), `${file} references missing file: ${target}`);
    }
  }
});