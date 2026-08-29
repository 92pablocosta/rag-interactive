(function () {
  'use strict';

  function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getChunkSettings(chunkSize, overlap) {
    const size = Math.max(10, Math.floor(Number(chunkSize) || 0));
    const requestedOverlap = Math.max(0, Math.floor(Number(overlap) || 0));
    const effectiveOverlap = Math.min(requestedOverlap, Math.max(0, size - 10));

    return { size, requestedOverlap, effectiveOverlap };
  }

  function findNaturalBoundary(text, start, targetEnd, size, overlap) {
    const minimumLength = Math.max(Math.ceil(size * 0.55), overlap + 1);
    const minimumBoundary = start + minimumLength;

    if (minimumBoundary >= targetEnd) return targetEnd;

    let bestBoundary = -1;
    for (let index = minimumBoundary; index < targetEnd; index += 1) {
      const character = text[index];
      if (character === '\n') {
        bestBoundary = index + 1;
      } else if (
        (character === '.' || character === '!' || character === '?') &&
        (index + 1 >= text.length || /\s/.test(text[index + 1]))
      ) {
        bestBoundary = index + 1;
      }
    }

    return bestBoundary > start ? bestBoundary : targetEnd;
  }

  function createChunks(documentText, chunkSize, overlap) {
    const text = String(documentText ?? '');
    if (text.length === 0) return [];

    const settings = getChunkSettings(chunkSize, overlap);
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const targetEnd = Math.min(text.length, start + settings.size);
      const end = targetEnd >= text.length
        ? text.length
        : findNaturalBoundary(
          text,
          start,
          targetEnd,
          settings.size,
          settings.effectiveOverlap
        );

      chunks.push({
        id: chunks.length + 1,
        text: text.slice(start, end),
        startOffset: start,
        endOffset: end,
        overlapWithPrevious: 0,
        overlapWithNext: 0
      });

      if (end >= text.length) break;
      start = Math.max(start + 1, end - settings.effectiveOverlap);
    }

    chunks.forEach((chunk, index) => {
      const previous = chunks[index - 1];
      const next = chunks[index + 1];
      chunk.overlapWithPrevious = previous
        ? Math.max(0, previous.endOffset - chunk.startOffset)
        : 0;
      chunk.overlapWithNext = next
        ? Math.max(0, chunk.endOffset - next.startOffset)
        : 0;
    });

    return chunks;
  }

  function hasCompleteCoverage(documentText, chunks) {
    const text = String(documentText ?? '');
    if (text.length === 0) return chunks.length === 0;
    if (chunks.length === 0 || chunks[0].startOffset !== 0) return false;

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      if (chunk.text !== text.slice(chunk.startOffset, chunk.endOffset)) return false;
      if (index > 0 && chunk.startOffset > chunks[index - 1].endOffset) return false;
    }

    return chunks[chunks.length - 1].endOffset === text.length;
  }

  function tokenize(text) {
    return String(text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);
  }

  function normalizeQuery(text) {
    return String(text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function findEvidenceForQuery(query, evidenceCatalog) {
    const normalizedQuery = normalizeQuery(query);
    const queryTokens = normalizedQuery.split(/[^\w]+/).filter(Boolean);
    return evidenceCatalog.find(evidence => (
      evidence.queryTerms.some(term => (
        term.includes(' ')
          ? normalizedQuery.includes(term)
          : queryTokens.some(token => token === term || token.startsWith(term))
      ))
    )) || null;
  }

  const educationalDimensions = {
    price: ['cust', 'prec', 'valor', '250', 'pag', 'dinheir', 'taxa', 'custo', 'consulta'],
    schedule: ['horari', 'funcion', 'segund', 'sext', '8h', '18h', 'atend', 'dia', 'hora', 'abert'],
    ortho: ['ana', 'ortodont', 'aparelh', 'terc', 'quint', 'dente', 'dra'],
    endo: ['carlos', 'canal', 'endodont', 'dr', 'tratament', 'procediment'],
    cancel: ['cancel', 'anteced', '24', 'hora', 'desmarc', 'reagend'],
    payment: ['pix', 'carta', 'credit', 'debit', 'pagament', 'dinheir', 'form']
  };

  function computeEducationalVector(text) {
    const tokens = tokenize(text);
    const vector = Object.values(educationalDimensions).map(keywords => {
      let weight = 0;
      tokens.forEach(token => {
        keywords.forEach(keyword => {
          if (token.includes(keyword) || keyword.includes(token)) weight += 1.2;
        });
      });
      return weight;
    });

    let hashOne = 0;
    let hashTwo = 0;
    tokens.forEach((token, index) => {
      hashOne += Math.sin(token.charCodeAt(0) * (index + 1));
      hashTwo += Math.cos(token.charCodeAt(token.length - 1) * (index + 1));
    });
    vector.push(hashOne * 0.3, hashTwo * 0.3);

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return magnitude === 0 ? vector : vector.map(value => value / magnitude);
  }

  function cosineSimilarity(vectorA, vectorB) {
    const length = Math.min(vectorA.length, vectorB.length);
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let index = 0; index < length; index += 1) {
      dotProduct += vectorA[index] * vectorB[index];
      magnitudeA += vectorA[index] * vectorA[index];
      magnitudeB += vectorB[index] * vectorB[index];
    }

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    const cosine = dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
    return clampNumber(cosine, -1, 1);
  }

  function locateEvidence(documentText, evidence, chunks) {
    const text = String(documentText ?? '');
    const evidenceText = String(evidence?.text ?? '');
    const startOffset = text.indexOf(evidenceText);

    if (startOffset < 0 || evidenceText.length === 0) {
      return {
        foundInDocument: false,
        startOffset: -1,
        endOffset: -1,
        containingChunks: [],
        intersectingChunks: []
      };
    }

    const endOffset = startOffset + evidenceText.length;
    const intersectingChunks = chunks.filter(chunk => (
      chunk.startOffset < endOffset && chunk.endOffset > startOffset
    ));
    const containingChunks = intersectingChunks.filter(chunk => (
      chunk.startOffset <= startOffset && chunk.endOffset >= endOffset
    ));

    return {
      foundInDocument: true,
      startOffset,
      endOffset,
      containingChunks,
      intersectingChunks
    };
  }

  function resolveEvidenceSupport(documentText, evidence, retrievedChunks) {
    if (!evidence) {
      return { supported: false, sourceChunk: null, location: null };
    }

    const location = locateEvidence(documentText, evidence, retrievedChunks);
    const sourceChunk = location.containingChunks[0] || null;
    return {
      supported: Boolean(sourceChunk),
      sourceChunk,
      location
    };
  }

  function estimateTokens(text) {
    const content = String(text ?? '');
    return content.length === 0 ? 0 : Math.ceil(content.length / 4);
  }

  const api = {
    clampNumber,
    getChunkSettings,
    createChunks,
    hasCompleteCoverage,
    tokenize,
    normalizeQuery,
    findEvidenceForQuery,
    computeEducationalVector,
    cosineSimilarity,
    locateEvidence,
    resolveEvidenceSupport,
    estimateTokens
  };

  if (typeof window !== 'undefined') window.RagCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
