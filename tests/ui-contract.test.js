'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

test('RAG Interactive is the platform brand and the partial language switcher is absent', () => {
  assert.match(html, /RAG Interactive/);
  assert.doesNotMatch(html, /RAG LAB Educational Platform|class="lang-switcher"/);
  assert.match(html, /<html lang="en">/);
});

test('the supplied RI identity and six-stage icon family define the Learn visual system', () => {
  assert.match(html, /brand-assets\/logo\/lockup\.svg/);
  assert.match(html, /class="pipeline-overview"/);
  for (const icon of ['document', 'chunks', 'embeddings', 'search', 'context', 'answer']) {
    assert.match(html, new RegExp(`brand-assets/icons/${icon}\\.svg`), `missing ${icon} stage icon`);
  }
  for (const token of ['--accent-blue', '--content-width', '--radius-sm', '--shadow-panel', '--grid-line']) {
    assert.ok(css.includes(token), `missing shared visual token: ${token}`);
  }
});

test('interface graphics do not use emoji glyphs', () => {
  const emojiGlyphs = /[▶⏭↺✓✕◆🚀✨💡📄🧩🔍🤖]/u;
  assert.doesNotMatch(html, emojiGlyphs);
  assert.doesNotMatch(script, emojiGlyphs);
  assert.doesNotMatch(css, emojiGlyphs);
});

test('the Basic RAG narrative keeps all five learning phases', () => {
  for (const phase of ['Foundations', 'Indexing', 'Retrieval', 'Augment &amp; Generate', 'Connect']) {
    assert.match(html, new RegExp(`>${phase}<`));
  }
  assert.doesNotMatch(html, /Hybrid Search|RRF Fusion|Cross-Encoder|Ragas Metrics/);
});

test('evidence identity and conceptual Python annotations span the pipeline', () => {
  assert.ok((html.match(/Evidence A/g) || []).length >= 10);
  for (const snippet of [
    'split_text',
    'chunk_embeddings',
    'query_embedding',
    'similarity_search',
    'context</span> =',
    'build_prompt',
    'generate'
  ]) {
    assert.ok(html.includes(snippet), `missing Python annotation: ${snippet}`);
  }
});

test('accessibility and reduced-motion contracts are present', () => {
  assert.match(css, /\.hidden\s*\{[\s\S]*?display:\s*none\s*!important/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(html, /aria-live="polite"/);
  assert.match(script, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(script, /aria-pressed/);
});

test('responsive orientation contracts cover requested widths', () => {
  for (const width of ['1320px', '1200px', '900px', '700px', '430px']) {
    assert.ok(css.includes(width), `missing responsive rule near ${width}`);
  }
  assert.match(html, /class="mobile-progress"/);
  assert.match(html, /Scroll horizontally inside a pipeline row/);
  assert.match(html, /Scroll horizontally to inspect the full projection/);
});

test('the Learn content wrapper does not expand beyond the viewport on small screens', () => {
  assert.match(css, /\.content-wrapper\s*\{[\s\S]*?width:\s*100%/);
});

test('Learn keeps unique IDs and all static JavaScript DOM references resolve', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate Learn IDs found');
  const staticRefs = [...script.matchAll(/getElementById\('([^']+)'\)/g)].map(match => match[1]);
  for (const id of new Set(staticRefs)) {
    assert.ok(ids.includes(id), `missing Learn DOM target: ${id}`);
  }
});
