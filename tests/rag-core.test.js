'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createChunks,
  hasCompleteCoverage,
  findEvidenceForQuery,
  computeEducationalVector,
  cosineSimilarity,
  locateEvidence,
  resolveEvidenceSupport,
  estimateTokens
} = require('../rag-core.js');

const documentText = `DentCare Clinic is open from Monday to Friday, from 8 AM to 6 PM.
The initial dental consultation costs R$ 250.
Dr. Ana is an orthodontics specialist and works on Tuesdays and Thursdays.
Dr. Carlos performs root canal treatments and endodontics procedures.
Cancellations must be made at least 24 hours in advance.
The clinic accepts payments via PIX, credit card, and debit card.`;

const evidenceCatalog = [
  { id: 'evidence-a', text: 'The initial dental consultation costs R$ 250.', queryTerms: ['cost', 'price', 'much'] },
  { id: 'evidence-b', text: 'Dr. Ana is an orthodontics specialist and works on Tuesdays and Thursdays.', queryTerms: ['orthodont', 'ana'] },
  { id: 'evidence-c', text: 'The clinic accepts payments via PIX, credit card, and debit card.', queryTerms: ['payment', 'pix', 'card'] },
  { id: 'evidence-d', text: 'Cancellations must be made at least 24 hours in advance.', queryTerms: ['cancel', '24 hour'] },
  { id: 'evidence-e', text: 'Dr. Carlos performs root canal treatments and endodontics procedures.', queryTerms: ['canal', 'carlos', 'endodont'] }
];

const configurations = [
  { name: 'Tiny preset', size: 60, overlap: 10 },
  { name: 'Balanced preset', size: 140, overlap: 30 },
  { name: 'Large preset', size: 260, overlap: 50 },
  { name: 'Minimum sliders', size: 40, overlap: 0 },
  { name: 'Minimum size with maximum requested overlap', size: 40, overlap: 100 },
  { name: 'Maximum size with minimum overlap', size: 300, overlap: 0 },
  { name: 'Maximum sliders', size: 300, overlap: 100 }
];

function reconstructWithoutDuplicatedOverlap(chunks) {
  if (chunks.length === 0) return '';
  return chunks.slice(1).reduce((result, chunk) => (
    result + chunk.text.slice(chunk.overlapWithPrevious)
  ), chunks[0].text);
}

function rankChunks(chunks, query) {
  const queryVector = computeEducationalVector(query);
  return chunks
    .map(chunk => ({
      ...chunk,
      vector: computeEducationalVector(chunk.text),
      score: cosineSimilarity(queryVector, computeEducationalVector(chunk.text))
    }))
    .sort((first, second) => second.score - first.score || first.id - second.id);
}

test('all required chunk configurations preserve every document character', async t => {
  for (const configuration of configurations) {
    await t.test(configuration.name, () => {
      const chunks = createChunks(documentText, configuration.size, configuration.overlap);
      assert.equal(hasCompleteCoverage(documentText, chunks), true);
      assert.equal(reconstructWithoutDuplicatedOverlap(chunks), documentText);
      assert.equal(chunks[0].startOffset, 0);
      assert.equal(chunks.at(-1).endOffset, documentText.length);

      chunks.forEach((chunk, index) => {
        assert.equal(chunk.text, documentText.slice(chunk.startOffset, chunk.endOffset));
        assert.ok(chunk.text.length <= configuration.size);
        if (index < chunks.length - 1) {
          const next = chunks[index + 1];
          assert.equal(chunk.overlapWithNext, chunk.endOffset - next.startOffset);
          assert.equal(next.overlapWithPrevious, chunk.overlapWithNext);
          assert.ok(next.startOffset <= chunk.endOffset);
        }
      });
    });
  }
});

test('Evidence A keeps its identity while its current chunk changes', () => {
  const evidenceA = evidenceCatalog[0];
  const balanced = createChunks(documentText, 140, 30);
  const large = createChunks(documentText, 260, 50);
  const fragmented = createChunks(documentText, 40, 0);

  const balancedLocation = locateEvidence(documentText, evidenceA, balanced);
  const largeLocation = locateEvidence(documentText, evidenceA, large);
  const fragmentedLocation = locateEvidence(documentText, evidenceA, fragmented);

  assert.equal(balancedLocation.containingChunks.length > 0, true);
  assert.equal(largeLocation.containingChunks.length > 0, true);
  assert.notEqual(balancedLocation.containingChunks[0].id, undefined);
  assert.notEqual(largeLocation.containingChunks[0].id, undefined);
  assert.equal(fragmentedLocation.containingChunks.length, 0);
  assert.ok(fragmentedLocation.intersectingChunks.length >= 2);
});

test('evidence support always returns a real retrieved chunk or null', async t => {
  const queryByEvidence = {
    'evidence-a': 'How much does a consultation cost?',
    'evidence-b': 'Who handles orthodontics?',
    'evidence-c': 'What payment methods are accepted?',
    'evidence-d': 'When can I cancel?',
    'evidence-e': 'Who performs root canal treatment?'
  };

  for (const configuration of configurations) {
    await t.test(configuration.name, () => {
      const chunks = createChunks(documentText, configuration.size, configuration.overlap);
      for (const evidence of evidenceCatalog) {
        const ranked = rankChunks(chunks, queryByEvidence[evidence.id]);
        for (const topK of [1, 3, 5]) {
          const retrieved = ranked.slice(0, topK);
          const support = resolveEvidenceSupport(documentText, evidence, retrieved);
          if (support.supported) {
            assert.ok(retrieved.some(chunk => chunk.id === support.sourceChunk.id));
            assert.ok(support.sourceChunk.text.includes(evidence.text));
          } else {
            assert.equal(support.sourceChunk, null);
          }
        }
      }
    });
  }

  assert.deepEqual(
    resolveEvidenceSupport(documentText, null, createChunks(documentText, 140, 30)),
    { supported: false, sourceChunk: null, location: null }
  );
});

test('preset queries resolve to the intended stable evidence and unsupported queries resolve to null', () => {
  const cases = [
    ['How much does a consultation cost?', 'evidence-a'],
    ['What is the price of the consultation?', 'evidence-a'],
    ['Who handles orthodontics?', 'evidence-b'],
    ['What payment methods are accepted?', 'evidence-c'],
    ['When can I cancel?', 'evidence-d'],
    ['Who performs root canal treatment?', 'evidence-e']
  ];

  cases.forEach(([query, expectedId]) => {
    assert.equal(findEvidenceForQuery(query, evidenceCatalog)?.id, expectedId);
  });
  assert.equal(findEvidenceForQuery('Does the clinic accept Unimed insurance?', evidenceCatalog), null);
  assert.equal(findEvidenceForQuery('What are the clinic opening hours?', evidenceCatalog), null);
});

test('cosine similarity preserves its mathematical range and endpoints', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([0, 0], [1, 0]), 0);
});

test('cosine similarity matches the mathematical definition for known vectors', () => {
  assert.equal(cosineSimilarity([2, 0], [5, 0]), 1);
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
  assert.equal(cosineSimilarity([0, 0], [0, 0]), 0);
  assert.equal(cosineSimilarity([1, 1, 1], [-1, -1, -1]), -1);

  const angle45 = Math.SQRT1_2;
  assert.ok(Math.abs(cosineSimilarity([1, 0], [angle45, angle45]) - angle45) < 1e-12);
});

test('clearly different vectors receive a low cosine similarity', () => {
  assert.ok(cosineSimilarity([1, 0, 0], [0, 1, 0]) < 0.01);
  assert.ok(cosineSimilarity([1, 2, 3], [3, 2, 1]) < cosineSimilarity([1, 2, 3], [1, 2, 3]));
});

test('the educationally simulated vectors rank the evidence chunk first for its query', () => {
  const chunks = createChunks(documentText, 140, 30);
  const queries = {
    'evidence-a': 'How much does a consultation cost?',
    'evidence-b': 'Who handles orthodontics?',
    'evidence-c': 'What payment methods are accepted?',
    'evidence-d': 'When can I cancel?',
    'evidence-e': 'Who performs root canal treatment?'
  };

  for (const evidence of evidenceCatalog) {
    const ranked = rankChunks(chunks, queries[evidence.id]);
    const topEvidenceChunk = ranked.find(chunk => chunk.text.includes(evidence.text));
    assert.ok(topEvidenceChunk, `${evidence.id} text should appear in the retrieved context`);
    assert.equal(topEvidenceChunk.id, ranked[0].id, `${evidence.id} chunk should rank first for its query`);
  }
});

test('token estimate is explicitly based on selected text length', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('1234'), 1);
  assert.equal(estimateTokens('12345'), 2);
});
