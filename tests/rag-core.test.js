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

const documentText = `A clínica DentCare funciona de segunda a sexta-feira, das 8h às 18h.
A consulta odontológica inicial custa R$ 250.
A Dra. Ana é especialista em ortodontia e atende às terças e quintas.
O Dr. Carlos realiza tratamentos de canal e procedimentos de endodontia.
Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência.
A clínica aceita pagamentos via PIX, cartão de crédito e cartão de débito.`;

const evidenceCatalog = [
  { id: 'evidence-a', text: 'A consulta odontológica inicial custa R$ 250.', queryTerms: ['custa', 'preco', 'valor'] },
  { id: 'evidence-b', text: 'A Dra. Ana é especialista em ortodontia e atende às terças e quintas.', queryTerms: ['ortodont', 'ana'] },
  { id: 'evidence-c', text: 'A clínica aceita pagamentos via PIX, cartão de crédito e cartão de débito.', queryTerms: ['pagamento', 'pix', 'cartao'] },
  { id: 'evidence-d', text: 'Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência.', queryTerms: ['cancel', '24 hora'] },
  { id: 'evidence-e', text: 'O Dr. Carlos realiza tratamentos de canal e procedimentos de endodontia.', queryTerms: ['canal', 'carlos', 'endodont'] }
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
    'evidence-a': 'Quanto custa uma consulta?',
    'evidence-b': 'Quem atende ortodontia?',
    'evidence-c': 'Quais formas de pagamento são aceitas?',
    'evidence-d': 'Quando posso cancelar?',
    'evidence-e': 'Quem realiza tratamento de canal?'
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
    ['Quanto custa uma consulta?', 'evidence-a'],
    ['Qual é o preço da consulta?', 'evidence-a'],
    ['Quem atende ortodontia?', 'evidence-b'],
    ['Quais formas de pagamento são aceitas?', 'evidence-c'],
    ['Quando posso cancelar?', 'evidence-d'],
    ['Quem realiza tratamento de canal?', 'evidence-e']
  ];

  cases.forEach(([query, expectedId]) => {
    assert.equal(findEvidenceForQuery(query, evidenceCatalog)?.id, expectedId);
  });
  assert.equal(findEvidenceForQuery('A clínica aceita convênio Unimed?', evidenceCatalog), null);
  assert.equal(findEvidenceForQuery('Qual é o horário da clínica?', evidenceCatalog), null);
});

test('cosine similarity preserves its mathematical range and endpoints', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([0, 0], [1, 0]), 0);
});

test('token estimate is explicitly based on selected text length', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('1234'), 1);
  assert.equal(estimateTokens('12345'), 2);
});
