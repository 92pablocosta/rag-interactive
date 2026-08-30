'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const labDir = path.join(root, 'lab');
const labHtml = fs.readFileSync(path.join(labDir, 'index.html'), 'utf8');
const labJs = fs.readFileSync(path.join(labDir, 'lab.js'), 'utf8');
const rootHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('the Lab carries the RAG Interactive branding and hides versioning', () => {
  assert.match(labHtml, /RAG Interactive/);
  assert.match(labHtml, /<html lang="en">/);
  assert.match(labHtml, /<title>Lab \| RAG Interactive<\/title>/);
  assert.doesNotMatch(labHtml, /v1\.0|RAG Lab v1|Learn RAG \(v2\)/);
  assert.doesNotMatch(labHtml, /logo-badge/);
});

test('the Lab shares the product design system and core logic', () => {
  assert.match(labHtml, /href="\.\.\/styles\.css"/);
  assert.match(labHtml, /href="lab\.css"/);
  assert.match(labHtml, /src="\.\.\/rag-core\.js"/);
  assert.match(labHtml, /src="lab\.js"/);
  assert.match(labHtml, /brand-assets\/logo\/lockup\.svg/);
  assert.match(labHtml, /class="lab-intro"/);
  for (const icon of ['document', 'search', 'answer']) {
    assert.match(labHtml, new RegExp(`brand-assets/icons/${icon}\\.svg`));
  }
});

test('Learn and Lab link to each other using product terminology', () => {
  const labNavMatches = labHtml.match(/href="(\.\.\/index\.html|index\.html)"/g) || [];
  assert.ok(labNavMatches.includes('href="../index.html"'));
  assert.ok(labNavMatches.includes('href="index.html"'));
  assert.doesNotMatch(labHtml, /Voltar|Back to Learn RAG/);
  assert.doesNotMatch(rootHtml, /href="v1\/index\.html"/);
  assert.ok(rootHtml.includes('href="lab/index.html"'));
});

test('the Lab renders user-controlled text safely without innerHTML', () => {
  assert.doesNotMatch(labJs, /innerHTML/);
  assert.match(labJs, /\.textContent\s*=/);
  assert.match(labJs, /createElement/);
});

test('the Lab uses real cosine similarity over simulated vectors', () => {
  assert.match(labJs, /cosineSimilarity/);
  assert.match(labJs, /computeEducationalVector/);
  assert.doesNotMatch(labJs, /Cosine Distance Sim/);
  assert.doesNotMatch(labHtml, /Cosine Distance Sim/);
});

test('the Lab refuses when the retrieved context has insufficient evidence', () => {
  assert.match(labJs, /does not contain enough evidence to answer this question/);
  assert.match(labJs, /findEvidenceForQuery/);
  assert.match(labJs, /resolveEvidenceSupport/);
});

test('the Lab page contains no visible Portuguese user-facing strings', () => {
  const portuguesePattern = /\bQuanto\b|\bPainel\b|\bGerados\b|\bMontado\b|\bResposta\b|\bPergunta\b|\bVoltar\b|\bClínica\b|\bOdontológico\b|\bTamanho\b|\bCustomizado\b|\bExecutar\b|\bDocumento\b|\bChunk\s+Gerado\b/i;
  assert.doesNotMatch(labHtml, portuguesePattern);
  assert.doesNotMatch(labJs, portuguesePattern);
});

test('the Learn page carries a discreet authorship and source attribution', () => {
  assert.match(rootHtml, /https:\/\/github\.com\/92pablocosta\/rag-interactive/);
  assert.match(rootHtml, /footer-attribution/);
});

test('Lab keeps unique IDs and all static JavaScript DOM references resolve', () => {
  const ids = [...labHtml.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate Lab IDs found');
  const staticRefs = [...labJs.matchAll(/getElementById\('([^']+)'\)/g)].map(match => match[1]);
  for (const id of new Set(staticRefs)) {
    assert.ok(ids.includes(id), `missing Lab DOM target: ${id}`);
  }
});
