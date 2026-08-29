document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  if (!window.RagCore) {
    throw new Error('RagCore must be loaded before script.js');
  }

  const {
    createChunks,
    hasCompleteCoverage,
    findEvidenceForQuery,
    computeEducationalVector,
    cosineSimilarity,
    locateEvidence,
    resolveEvidenceSupport,
    estimateTokens
  } = window.RagCore;

  const messages = {
    groundingVerified: 'Grounding verified',
    unsupportedQuery: 'The retrieved context does not contain enough evidence to answer this question.',
    evidenceSplit: 'The required evidence is split across chunks, so no retrieved chunk contains the complete fact.',
    evidenceExcluded: 'The complete evidence exists in the document but was not included in the active Top-K context.'
  };

  const state = {
    documentText: `DentCare Clinic is open from Monday to Friday, from 8 AM to 6 PM.
The initial dental consultation costs R$ 250.
Dr. Ana is an orthodontics specialist and works on Tuesdays and Thursdays.
Dr. Carlos performs root canal treatments and endodontics procedures.
Cancellations must be made at least 24 hours in advance.
The clinic accepts payments via PIX, credit card, and debit card.`,
    chunkSize: 140,
    overlap: 30,
    showOverlap: true,
    chunks: [],
    query: 'How much does a consultation cost?',
    topK: 3,
    rankedChunks: [],
    retrievedChunks: [],
    selectedSimilarityChunkId: null,
    sourceChunkId: null,
    pipelineStep: -1,
    pipelineTimer: null
  };

  const evidenceCatalog = [
    {
      id: 'evidence-a',
      label: 'Evidence A',
      title: 'Consultation price',
      text: 'The initial dental consultation costs R$ 250.',
      queryTerms: ['cost', 'price', 'much']
    },
    {
      id: 'evidence-b',
      label: 'Evidence B',
      title: 'Orthodontics specialist and schedule',
      text: 'Dr. Ana is an orthodontics specialist and works on Tuesdays and Thursdays.',
      queryTerms: ['orthodont', 'ana']
    },
    {
      id: 'evidence-c',
      label: 'Evidence C',
      title: 'Accepted payment methods',
      text: 'The clinic accepts payments via PIX, credit card, and debit card.',
      queryTerms: ['payment', 'pix', 'card']
    },
    {
      id: 'evidence-d',
      label: 'Evidence D',
      title: 'Cancellation policy',
      text: 'Cancellations must be made at least 24 hours in advance.',
      queryTerms: ['cancel', '24 hour']
    },
    {
      id: 'evidence-e',
      label: 'Evidence E',
      title: 'Root canal treatment',
      text: 'Dr. Carlos performs root canal treatments and endodontics procedures.',
      queryTerms: ['canal', 'carlos', 'endodont']
    }
  ];

  const sliderChunkSize = document.getElementById('slider-chunk-size');
  const sliderOverlap = document.getElementById('slider-overlap');
  const toggleOverlap = document.getElementById('toggle-overlap');
  const valChunkSize = document.getElementById('val-chunk-size');
  const valOverlap = document.getElementById('val-overlap');
  const pyChunkSize = document.getElementById('py-chunk-size');
  const pyOverlap = document.getElementById('py-overlap');
  const chunkWarningBox = document.getElementById('chunk-warning-box');
  const chunksVisualList = document.getElementById('chunks-visual-list');
  const chunkCountBadge = document.getElementById('chunk-count-badge');
  const evidenceAStatus = document.getElementById('evidence-a-status');
  const btnPresetTiny = document.getElementById('preset-tiny');
  const btnPresetBalanced = document.getElementById('preset-balanced');
  const btnPresetLarge = document.getElementById('preset-large');
  const svgSpace = document.getElementById('vector-space-svg');
  const svgTooltip = document.getElementById('vector-space-tooltip');
  const embeddingInspector = document.getElementById('embedding-inspector');
  const embeddingChunkCount = document.getElementById('embedding-chunk-count');
  const embeddingVectorPreview = document.getElementById('embedding-vector-preview');
  const userQueryInput = document.getElementById('user-query-input');
  const btnVectorizeQuery = document.getElementById('btn-vectorize-query');
  const qPresetBtns = document.querySelectorAll('.q-preset-btn');
  const displayQueryText = document.getElementById('display-query-text');
  const displayQueryVector = document.getElementById('display-query-vector');
  const similarityRankingList = document.getElementById('similarity-ranking-list');
  const angleCircleSvg = document.getElementById('angle-circle-svg');
  const angleDegVal = document.getElementById('angle-deg-val');
  const angleCosVal = document.getElementById('angle-cos-val');
  const angleSemanticStatus = document.getElementById('angle-semantic-status');
  const sliderAngleAdjust = document.getElementById('slider-angle-adjust');
  const labelAngleSlider = document.getElementById('label-angle-slider');
  const angleFormulaText = document.getElementById('angle-formula-text');
  const angleComparedChunk = document.getElementById('angle-compared-chunk');
  const sliderTopK = document.getElementById('slider-top-k');
  const valTopK = document.getElementById('val-top-k');
  const pyTopK = document.getElementById('py-top-k');
  const topKBadge = document.getElementById('top-k-badge');
  const topkVisualList = document.getElementById('topk-visual-list');
  const metricSelectedChunks = document.getElementById('metric-selected-chunks');
  const metricContextChars = document.getElementById('metric-context-chars');
  const metricTokens = document.getElementById('metric-tokens');
  const contextBufferOutput = document.getElementById('context-buffer-output');
  const contextSelectedList = document.getElementById('context-selected-list');
  const promptContextPreview = document.getElementById('prompt-context-preview');
  const promptQuestionPreview = document.getElementById('prompt-question-preview');
  const finalAnswerText = document.getElementById('final-answer-text');
  const sourceCitationBtn = document.getElementById('source-citation-btn');
  const groundingStatusBox = document.getElementById('grounding-status-box');
  const groundingStatusMsg = document.getElementById('grounding-status-msg');
  const groundingStatusSymbol = document.getElementById('grounding-status-symbol');
  const answerEvidence = document.getElementById('answer-evidence');
  const answerEvidenceQuote = document.getElementById('answer-evidence-quote');
  const answerEvidenceLocation = document.getElementById('answer-evidence-location');
  const sourceDetail = document.getElementById('source-detail');
  const sourceDetailTitle = document.getElementById('source-detail-title');
  const sourceDetailText = document.getElementById('source-detail-text');
  const btnRunPipeline = document.getElementById('btn-run-pipeline');
  const btnStepPipeline = document.getElementById('btn-step-pipeline');
  const btnResetPipeline = document.getElementById('btn-reset-pipeline');
  const pipelineStatusText = document.getElementById('pipeline-status-text');
  const progressFill = document.getElementById('progress-fill');
  const progressDots = document.querySelectorAll('.progress-dot');
  const mobileProgressFill = document.getElementById('mobile-progress-fill');
  const mobileProgressLabel = document.getElementById('mobile-progress-label');
  const pipelineEvidenceChunk = document.getElementById('pipeline-evidence-chunk');
  const pipelineEvidenceTopK = document.getElementById('pipeline-evidence-topk');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatChunkId(id) {
    return String(id).padStart(2, '0');
  }

  function getEvidenceRelations(chunk) {
    return evidenceCatalog.flatMap(evidence => {
      const location = locateEvidence(state.documentText, evidence, [chunk]);
      if (location.containingChunks.length > 0) return [{ evidence, relation: 'complete' }];
      if (location.intersectingChunks.length > 0) return [{ evidence, relation: 'fragment' }];
      return [];
    });
  }

  function renderEvidenceBadges(chunk) {
    return getEvidenceRelations(chunk).map(({ evidence, relation }) => (
      `<span class="evidence-badge ${relation}">${escapeHtml(evidence.label)}${relation === 'fragment' ? ' fragment' : ''}</span>`
    )).join('');
  }

  function renderChunkTextWithEvidence(chunk) {
    const evidence = evidenceCatalog[0];
    const evidenceStart = state.documentText.indexOf(evidence.text);
    const evidenceEnd = evidenceStart + evidence.text.length;
    const intersectionStart = Math.max(chunk.startOffset, evidenceStart);
    const intersectionEnd = Math.min(chunk.endOffset, evidenceEnd);

    if (evidenceStart < 0 || intersectionStart >= intersectionEnd) {
      return escapeHtml(chunk.text);
    }

    const localStart = intersectionStart - chunk.startOffset;
    const localEnd = intersectionEnd - chunk.startOffset;
    return `${escapeHtml(chunk.text.slice(0, localStart))}<mark class="evidence-text-mark">${escapeHtml(chunk.text.slice(localStart, localEnd))}</mark>${escapeHtml(chunk.text.slice(localEnd))}`;
  }

  function setPressedState(buttons, activeButton) {
    buttons.forEach(button => {
      const isActive = button === activeButton;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function pulseElements(...elements) {
    elements.filter(Boolean).forEach(element => {
      element.classList.remove('is-updating');
      void element.offsetWidth;
      element.classList.add('is-updating');
      window.setTimeout(() => element.classList.remove('is-updating'), 240);
    });
  }

  function syncChunkControls() {
    const maximumOverlap = Math.min(100, Math.max(0, state.chunkSize - 10));
    sliderOverlap.max = maximumOverlap;
    if (state.overlap > maximumOverlap) state.overlap = maximumOverlap;
    sliderChunkSize.value = state.chunkSize;
    sliderOverlap.value = state.overlap;
    valChunkSize.textContent = state.chunkSize;
    valOverlap.textContent = state.overlap;
    pyChunkSize.textContent = state.chunkSize;
    pyOverlap.textContent = state.overlap;
  }

  function rebuildChunks() {
    syncChunkControls();
    state.chunks = createChunks(state.documentText, state.chunkSize, state.overlap)
      .map(chunk => ({ ...chunk, vector: computeEducationalVector(chunk.text) }));

    if (!hasCompleteCoverage(state.documentText, state.chunks)) {
      throw new Error('Chunk generation lost document coverage');
    }

    renderChunks();
    updateRetrievalFlow();
  }

  function renderChunks() {
    chunkCountBadge.textContent = state.chunks.length;
    chunksVisualList.innerHTML = '';

    if (state.chunkSize < 70) {
      chunkWarningBox.classList.remove('hidden');
      chunkWarningBox.innerHTML = `<strong>Fragmentation warning:</strong> Chunk size is very small (${state.chunkSize} chars). Complete evidence may be split across chunks.`;
    } else if (state.chunkSize > 240) {
      chunkWarningBox.classList.remove('hidden');
      chunkWarningBox.innerHTML = `<strong>Context dilution warning:</strong> Chunk size is large (${state.chunkSize} chars). Each retrieved chunk may contain unrelated information.`;
    } else {
      chunkWarningBox.classList.add('hidden');
      chunkWarningBox.textContent = '';
    }

    state.chunks.forEach((chunk, index) => {
      if (index > 0) {
        const boundary = document.createElement('div');
        boundary.className = 'chunk-boundary';
        boundary.textContent = `cut at character ${chunk.startOffset} · ${chunk.overlapWithPrevious} repeated`;
        chunksVisualList.appendChild(boundary);
      }

      const card = document.createElement('div');
      card.className = 'chunk-card';
      card.id = `chunk-card-${chunk.id}`;
      const overlapText = state.showOverlap && chunk.overlapWithNext > 0
        ? chunk.text.slice(-chunk.overlapWithNext)
        : '';

      card.innerHTML = `
        <div class="chunk-card-header">
          <span>Chunk ${formatChunkId(chunk.id)}</span>
          <span>${chunk.text.length} chars · ${chunk.overlapWithNext} overlap</span>
        </div>
        <div class="evidence-badges">${renderEvidenceBadges(chunk)}</div>
        <div>${renderChunkTextWithEvidence(chunk)}</div>
        ${overlapText ? `<div class="overlap-preview"><strong>Repeated next</strong><span>${escapeHtml(overlapText)}</span></div>` : ''}
      `;
      chunksVisualList.appendChild(card);
    });

    embeddingChunkCount.textContent = String(state.chunks.length).padStart(2, '0');
    embeddingVectorPreview.textContent = `[${state.chunks.slice(0, 2).map(chunk => `[${chunk.vector.slice(0, 2).map(value => value.toFixed(2)).join(', ')}, …]`).join(', ')}, …]`;
  }

  function updateRetrievalFlow() {
    const queryVector = computeEducationalVector(state.query);
    displayQueryVector.textContent = `[${queryVector.slice(0, 4).map(value => value.toFixed(3)).join(', ')}, ...]`;
    state.rankedChunks = state.chunks
      .map(chunk => ({ ...chunk, score: cosineSimilarity(queryVector, chunk.vector) }))
      .sort((first, second) => second.score - first.score || first.id - second.id);
    if (!state.rankedChunks.some(chunk => chunk.id === state.selectedSimilarityChunkId)) {
      state.selectedSimilarityChunkId = state.rankedChunks[0]?.id ?? null;
    }
    renderVectorSpace(queryVector);
    renderSimilarity();
    renderAngleVisualizer();
    updateTopKFlow();
  }

  function renderVectorSpace(queryVector) {
    svgSpace.innerHTML = '';
    svgSpace.insertAdjacentHTML('beforeend', `
      <defs>
        <radialGradient id="queryGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <line x1="50" y1="350" x2="650" y2="350" stroke="#334155" stroke-width="1.5" />
      <line x1="50" y1="50" x2="50" y2="350" stroke="#334155" stroke-width="1.5" />
      <text x="565" y="370" fill="#64748b" font-size="10">Illustrative axis X</text>
      <text x="25" y="60" fill="#64748b" font-size="10">Illustrative axis Y</text>
    `);

    const queryX = Math.round(350 + (queryVector[0] - queryVector[1] + (queryVector[4] || 0) * 0.5) * 220);
    const queryY = Math.round(200 - (queryVector[2] - queryVector[3] + (queryVector[5] || 0) * 0.5) * 160);

    state.chunks.forEach(chunk => {
      const chunkX = Math.round(350 + (chunk.vector[0] - chunk.vector[1] + (chunk.vector[4] || 0) * 0.5) * 220);
      const chunkY = Math.round(200 - (chunk.vector[2] - chunk.vector[3] + (chunk.vector[5] || 0) * 0.5) * 160);
      const clampedX = Math.max(70, Math.min(630, chunkX));
      const clampedY = Math.max(70, Math.min(330, chunkY));
      const evidenceRelations = getEvidenceRelations(chunk);
      const evidenceARelation = evidenceRelations.find(relation => relation.evidence.id === 'evidence-a');
      if (evidenceARelation) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', clampedX);
        ring.setAttribute('cy', clampedY);
        ring.setAttribute('r', 12);
        ring.setAttribute('class', 'evidence-point-ring');
        svgSpace.appendChild(ring);
      }

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', clampedX);
      circle.setAttribute('cy', clampedY);
      circle.setAttribute('r', 7);
      circle.setAttribute('fill', '#8b5cf6');
      circle.setAttribute('class', `node-point${chunk.id === state.selectedSimilarityChunkId ? ' is-selected' : ''}`);
      circle.setAttribute('tabindex', '0');
      circle.setAttribute('role', 'button');
      circle.setAttribute('aria-label', `Inspect simulated vector for Chunk ${formatChunkId(chunk.id)}${evidenceARelation ? `, containing ${evidenceARelation.evidence.label} ${evidenceARelation.relation}` : ''}`);

      const inspectChunk = () => {
        embeddingInspector.innerHTML = `
          <h4>Chunk ${formatChunkId(chunk.id)} Simulated Vector</h4>
          <div class="evidence-badges">${renderEvidenceBadges(chunk)}</div>
          <p><strong>Educational feature coordinates:</strong> <code class="inspector-vector">[${chunk.vector.map(value => value.toFixed(3)).join(', ')}]</code></p>
          <p class="inspector-copy">${renderChunkTextWithEvidence(chunk)}</p>
        `;
        state.selectedSimilarityChunkId = chunk.id;
        renderSimilarity();
        delete sliderAngleAdjust.dataset.manual;
        renderAngleVisualizer();
      };

      circle.addEventListener('mouseenter', event => {
        svgTooltip.classList.remove('hidden');
        svgTooltip.style.left = `${event.offsetX + 15}px`;
        svgTooltip.style.top = `${event.offsetY - 15}px`;
        svgTooltip.innerHTML = `<strong>Chunk ${formatChunkId(chunk.id)}</strong><br>Simulated vector: [${chunk.vector.slice(0, 3).map(value => value.toFixed(3)).join(', ')}...]`;
      });
      circle.addEventListener('mouseleave', () => svgTooltip.classList.add('hidden'));
      circle.addEventListener('click', inspectChunk);
      circle.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inspectChunk();
        }
      });
      svgSpace.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', clampedX + 10);
      label.setAttribute('y', clampedY + 4);
      label.setAttribute('class', 'node-label');
      label.textContent = `Chunk ${formatChunkId(chunk.id)}${evidenceARelation ? ' · Evidence A' : ''}`;
      svgSpace.appendChild(label);
    });

    const clampedQueryX = Math.max(70, Math.min(630, queryX));
    const clampedQueryY = Math.max(70, Math.min(330, queryY));
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', clampedQueryX);
    glow.setAttribute('cy', clampedQueryY);
    glow.setAttribute('r', 18);
    glow.setAttribute('fill', 'url(#queryGlow)');
    svgSpace.appendChild(glow);
    const queryPoint = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    queryPoint.setAttribute('x', clampedQueryX - 7);
    queryPoint.setAttribute('y', clampedQueryY - 7);
    queryPoint.setAttribute('width', 14);
    queryPoint.setAttribute('height', 14);
    queryPoint.setAttribute('transform', `rotate(45 ${clampedQueryX} ${clampedQueryY})`);
    queryPoint.setAttribute('fill', '#3b82f6');
    queryPoint.setAttribute('stroke', '#ffffff');
    queryPoint.setAttribute('stroke-width', '2');
    svgSpace.appendChild(queryPoint);
    const queryLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    queryLabel.setAttribute('x', clampedQueryX + 12);
    queryLabel.setAttribute('y', clampedQueryY + 4);
    queryLabel.setAttribute('fill', '#60a5fa');
    queryLabel.setAttribute('font-weight', 'bold');
    queryLabel.setAttribute('font-size', '12');
    queryLabel.textContent = 'Query vector ◆';
    svgSpace.appendChild(queryLabel);
  }

  function renderSimilarity() {
    similarityRankingList.innerHTML = '';
    state.rankedChunks.forEach((item, index) => {
      const row = document.createElement('button');
      const isCompared = item.id === state.selectedSimilarityChunkId;
      row.type = 'button';
      row.className = `rank-item-card${isCompared ? ' is-compared' : ''}`;
      row.setAttribute('aria-pressed', String(isCompared));
      row.setAttribute('aria-label', `Compare Chunk ${formatChunkId(item.id)}, dense cosine rank ${index + 1}, score ${item.score.toFixed(3)}`);
      const mappedWidth = Math.round(((item.score + 1) / 2) * 100);
      row.innerHTML = `
        <span class="rank-score-badge">${item.score.toFixed(3)}</span>
        <div class="rank-bar-wrapper">
          <div class="rank-heading">
            <strong>Chunk ${formatChunkId(item.id)}</strong>
            <span class="rank-meta">Dense cosine rank #${index + 1}</span>
          </div>
          <div class="evidence-badges">${renderEvidenceBadges(item)}</div>
          <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${mappedWidth}%"></div></div>
          <span class="rank-chunk-text">${renderChunkTextWithEvidence(item)}</span>
        </div>
      `;
      row.addEventListener('click', () => {
        state.selectedSimilarityChunkId = item.id;
        delete sliderAngleAdjust.dataset.manual;
        renderSimilarity();
        renderAngleVisualizer();
        renderVectorSpace(computeEducationalVector(state.query));
        pulseElements(angleCircleSvg, row);
      });
      similarityRankingList.appendChild(row);
    });
  }

  function renderAngleVisualizer() {
    angleCircleSvg.innerHTML = '';
    const comparedChunk = state.rankedChunks.find(chunk => chunk.id === state.selectedSimilarityChunkId) || state.rankedChunks[0];
    const topCosine = comparedChunk?.score ?? 0;
    angleComparedChunk.textContent = comparedChunk ? `Chunk ${formatChunkId(comparedChunk.id)}` : 'selected chunk';
    let radians = Math.acos(Math.max(-1, Math.min(1, topCosine)));
    let degrees = Math.round(radians * (180 / Math.PI));
    if (sliderAngleAdjust.dataset.manual === 'true') {
      degrees = parseInt(sliderAngleAdjust.value, 10);
      radians = degrees * Math.PI / 180;
    } else {
      sliderAngleAdjust.value = degrees;
    }

    const cosine = Math.cos(radians);
    angleDegVal.textContent = `${degrees}°`;
    angleCosVal.textContent = cosine.toFixed(3);
    labelAngleSlider.textContent = `${degrees}°`;
    if (cosine >= 0.75) {
      angleSemanticStatus.textContent = 'Strong alignment';
      angleSemanticStatus.style.color = 'var(--color-context)';
    } else if (cosine >= 0.40) {
      angleSemanticStatus.textContent = 'Moderate alignment';
      angleSemanticStatus.style.color = 'var(--color-gen)';
    } else if (cosine > -0.40) {
      angleSemanticStatus.textContent = 'Weak / near orthogonal';
      angleSemanticStatus.style.color = 'var(--text-secondary)';
    } else {
      angleSemanticStatus.textContent = 'Opposite direction';
      angleSemanticStatus.style.color = 'var(--color-warn)';
    }

    const radius = 85;
    angleCircleSvg.insertAdjacentHTML('beforeend', `
      <circle cx="0" cy="0" r="${radius}" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="3 3"/>
      <line x1="-100" y1="0" x2="100" y2="0" stroke="#1f2937" stroke-width="1"/>
      <line x1="0" y1="-100" x2="0" y2="100" stroke="#1f2937" stroke-width="1"/>
    `);
    const queryLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    queryLine.setAttribute('x1', 0);
    queryLine.setAttribute('y1', 0);
    queryLine.setAttribute('x2', radius);
    queryLine.setAttribute('y2', 0);
    queryLine.setAttribute('stroke', '#3b82f6');
    queryLine.setAttribute('stroke-width', '3');
    angleCircleSvg.appendChild(queryLine);
    const chunkX = radius * Math.cos(-radians);
    const chunkY = radius * Math.sin(-radians);
    const chunkLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    chunkLine.setAttribute('x1', 0);
    chunkLine.setAttribute('y1', 0);
    chunkLine.setAttribute('x2', chunkX);
    chunkLine.setAttribute('y2', chunkY);
    chunkLine.setAttribute('stroke', '#8b5cf6');
    chunkLine.setAttribute('stroke-width', '3');
    angleCircleSvg.appendChild(chunkLine);
    const arcRadius = 35;
    const arcX = arcRadius * Math.cos(-radians);
    const arcY = arcRadius * Math.sin(-radians);
    const arcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arcPath.setAttribute('d', `M ${arcRadius} 0 A ${arcRadius} ${arcRadius} 0 0 0 ${arcX} ${arcY}`);
    arcPath.setAttribute('fill', 'none');
    arcPath.setAttribute('stroke', '#06b6d4');
    arcPath.setAttribute('stroke-width', '2');
    angleCircleSvg.appendChild(arcPath);
    angleFormulaText.textContent = `cos(${degrees}°) = (q · c) / (||q|| ||c||) = ${cosine.toFixed(3)}`;
  }

  function updateTopKFlow() {
    state.retrievedChunks = state.rankedChunks.slice(0, state.topK);
    topKBadge.textContent = state.topK;
    valTopK.textContent = state.topK;
    pyTopK.textContent = state.topK;
    const selectedText = state.retrievedChunks.map(chunk => chunk.text).join('\n\n');
    metricSelectedChunks.textContent = `${state.retrievedChunks.length} of ${state.rankedChunks.length}`;
    metricContextChars.textContent = `${selectedText.length} chars`;
    metricTokens.textContent = `≈${estimateTokens(selectedText)} tokens`;
    renderTopK();
    renderContextAndGeneration();
    renderEvidenceAStatus();
  }

  function renderTopK() {
    topkVisualList.innerHTML = '';
    state.rankedChunks.forEach((item, index) => {
      const isRetrieved = index < state.topK;
      if (index === state.topK) {
        const cutoff = document.createElement('div');
        cutoff.className = 'topk-cutoff';
        cutoff.textContent = `Top-K cutoff after rank ${state.topK}`;
        topkVisualList.appendChild(cutoff);
      }
      const row = document.createElement('div');
      row.className = `topk-item ${isRetrieved ? 'selected' : 'excluded'}`;
      row.innerHTML = `
        <div>
          <div class="topk-heading"><strong>Chunk ${formatChunkId(item.id)}</strong><span class="badge-neutral">Cosine: ${item.score.toFixed(3)}</span></div>
          <div class="evidence-badges">${renderEvidenceBadges(item)}</div>
          <p class="topk-copy">${renderChunkTextWithEvidence(item)}</p>
        </div>
        <span class="retrieval-state">
          ${isRetrieved ? '✓ RETRIEVED' : '✕ EXCLUDED'}
        </span>
      `;
      topkVisualList.appendChild(row);
    });
  }

  function renderEvidenceAStatus() {
    const evidence = evidenceCatalog[0];
    const location = locateEvidence(state.documentText, evidence, state.chunks);
    const containingIds = new Set(location.containingChunks.map(chunk => chunk.id));
    const rankedMatches = state.rankedChunks
      .map((chunk, index) => ({ chunk, rank: index + 1 }))
      .filter(item => containingIds.has(item.chunk.id));
    const retrievedMatch = state.retrievedChunks.find(chunk => containingIds.has(chunk.id));

    if (location.containingChunks.length === 0) {
      const fragmentLabels = location.intersectingChunks
        .map(chunk => `Chunk ${formatChunkId(chunk.id)}`)
        .join(', ');
      evidenceAStatus.textContent = `${evidence.label} is split across ${fragmentLabels || 'the current chunks'}. No chunk contains the complete evidence, so it cannot ground an answer.`;
      pipelineEvidenceChunk.textContent = `${evidence.label} split across chunks`;
      pipelineEvidenceTopK.textContent = `${evidence.label} cannot be grounded`;
      return;
    }

    const currentChunks = location.containingChunks.map(chunk => `Chunk ${formatChunkId(chunk.id)}`).join(', ');
    const ranking = rankedMatches.map(item => `#${item.rank}`).join(', ');
    const topKStatus = retrievedMatch
      ? `Included in Top-K and context via Chunk ${formatChunkId(retrievedMatch.id)}.`
      : 'Not included in the active Top-K context.';
    evidenceAStatus.textContent = `${evidence.label} is currently in ${currentChunks}; dense rank ${ranking}. ${topKStatus}`;
    pipelineEvidenceChunk.textContent = `${evidence.label} · ${currentChunks}`;
    pipelineEvidenceTopK.textContent = retrievedMatch
      ? `${evidence.label} selected`
      : `${evidence.label} excluded`;
  }

  function renderContextAndGeneration() {
    contextSelectedList.innerHTML = state.retrievedChunks.map(chunk => `
      <article class="context-unit">
        <strong>Chunk ${formatChunkId(chunk.id)}</strong>
        <div class="evidence-badges">${renderEvidenceBadges(chunk)}</div>
        <p>${renderChunkTextWithEvidence(chunk)}</p>
      </article>
    `).join('');
    contextBufferOutput.innerHTML = state.retrievedChunks.length > 0
      ? state.retrievedChunks.map(chunk => `
        <div class="context-entry">
          <strong>[Chunk ${formatChunkId(chunk.id)}]</strong>
          <p>${renderChunkTextWithEvidence(chunk)}</p>
        </div>
      `).join('')
      : '<p>(No chunks retrieved in context)</p>';
    promptContextPreview.innerHTML = state.retrievedChunks.length > 0
      ? state.retrievedChunks.map(chunk => `<p><strong>[Chunk ${formatChunkId(chunk.id)}]</strong> ${renderChunkTextWithEvidence(chunk)}</p>`).join('')
      : '<p>(No context)</p>';
    promptQuestionPreview.textContent = `“${state.query}”`;
    state.sourceChunkId = null;
    sourceCitationBtn.disabled = true;
    sourceCitationBtn.setAttribute('aria-expanded', 'false');
    sourceCitationBtn.textContent = 'No complete evidence in context';
    sourceDetail.classList.add('hidden');
    answerEvidence.classList.add('hidden');
    groundingStatusBox.className = 'grounding-status-banner retrieval-miss';
    groundingStatusSymbol.textContent = '!';

    const evidence = findEvidenceForQuery(state.query, evidenceCatalog);
    const support = resolveEvidenceSupport(state.documentText, evidence, state.retrievedChunks);
    if (!evidence) {
      finalAnswerText.textContent = `“${messages.unsupportedQuery}”`;
      groundingStatusMsg.textContent = messages.unsupportedQuery;
      return;
    }
    if (!support.supported) {
      const documentLocation = locateEvidence(state.documentText, evidence, state.chunks);
      const message = documentLocation.containingChunks.length === 0
        ? messages.evidenceSplit
        : messages.evidenceExcluded;
      finalAnswerText.textContent = `“${message}”`;
      groundingStatusMsg.textContent = `${evidence.label} — ${message}`;
      return;
    }

    state.sourceChunkId = support.sourceChunk.id;
    sourceCitationBtn.disabled = false;
    sourceCitationBtn.textContent = 'Inspect evidence details';
    groundingStatusBox.className = 'grounding-status-banner grounded';
    groundingStatusSymbol.textContent = '✓';
    groundingStatusMsg.textContent = `${messages.groundingVerified}: ${evidence.label} — ${evidence.title} is fully present in Chunk ${formatChunkId(state.sourceChunkId)} and in the active context.`;
    finalAnswerText.textContent = `“${evidence.text}”`;
    answerEvidence.classList.remove('hidden');
    answerEvidence.querySelector('.evidence-identity').textContent = evidence.label;
    answerEvidence.querySelector('strong').textContent = evidence.title;
    answerEvidenceQuote.textContent = `“${evidence.text}”`;
    answerEvidenceLocation.textContent = `Currently in Chunk ${formatChunkId(state.sourceChunkId)} · Included in context`;
    sourceDetailTitle.textContent = `${evidence.label} — ${evidence.title}`;
    sourceDetailText.textContent = `Loaded from the DentCare source document, preserved completely inside Chunk ${formatChunkId(state.sourceChunkId)}, retrieved into context, and used to support this answer.`;
  }

  function setPreset(chunkSize, overlap, activeButton) {
    state.chunkSize = chunkSize;
    state.overlap = overlap;
    setPressedState([btnPresetTiny, btnPresetBalanced, btnPresetLarge], activeButton);
    rebuildChunks();
    pulseElements(valChunkSize, valOverlap, chunksVisualList, document.getElementById('py-chunk-size-line'), document.getElementById('py-overlap-line'));
  }

  sliderChunkSize.addEventListener('input', event => {
    state.chunkSize = parseInt(event.target.value, 10);
    setPressedState([btnPresetTiny, btnPresetBalanced, btnPresetLarge], null);
    rebuildChunks();
    pulseElements(valChunkSize, chunksVisualList, document.getElementById('py-chunk-size-line'));
  });
  sliderOverlap.addEventListener('input', event => {
    state.overlap = parseInt(event.target.value, 10);
    setPressedState([btnPresetTiny, btnPresetBalanced, btnPresetLarge], null);
    rebuildChunks();
    pulseElements(valOverlap, chunksVisualList, document.getElementById('py-overlap-line'));
  });
  toggleOverlap.addEventListener('change', event => {
    state.showOverlap = event.target.checked;
    renderChunks();
    pulseElements(chunksVisualList);
  });
  btnPresetTiny.addEventListener('click', () => setPreset(60, 10, btnPresetTiny));
  btnPresetBalanced.addEventListener('click', () => setPreset(140, 30, btnPresetBalanced));
  btnPresetLarge.addEventListener('click', () => setPreset(260, 50, btnPresetLarge));
  sliderAngleAdjust.addEventListener('input', () => {
    sliderAngleAdjust.dataset.manual = 'true';
    renderAngleVisualizer();
    pulseElements(angleCircleSvg, angleFormulaText);
  });
  sliderTopK.addEventListener('input', event => {
    state.topK = parseInt(event.target.value, 10);
    updateTopKFlow();
    pulseElements(valTopK, topkVisualList, contextSelectedList, promptContextPreview, answerEvidence, document.getElementById('py-top-k-line'), document.getElementById('py-context-line'));
  });

  function setQuery(query, activePreset = null) {
    state.query = query;
    userQueryInput.value = query;
    displayQueryText.textContent = `“${query}”`;
    delete sliderAngleAdjust.dataset.manual;
    state.selectedSimilarityChunkId = null;
    setPressedState(qPresetBtns, activePreset);
    updateRetrievalFlow();
    pulseElements(displayQueryText, displayQueryVector, svgSpace, similarityRankingList, document.getElementById('py-query-line'), document.getElementById('py-prompt-line'));
  }

  btnVectorizeQuery.addEventListener('click', () => {
    setQuery(userQueryInput.value.trim() || 'How much does a consultation cost?');
  });
  userQueryInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') setQuery(userQueryInput.value.trim() || 'How much does a consultation cost?');
  });
  qPresetBtns.forEach(button => {
    button.addEventListener('click', () => setQuery(button.dataset.q, button));
  });

  sourceCitationBtn.addEventListener('click', () => {
    if (sourceCitationBtn.disabled || state.sourceChunkId === null) return;
    const isExpanded = sourceCitationBtn.getAttribute('aria-expanded') === 'true';
    sourceCitationBtn.setAttribute('aria-expanded', String(!isExpanded));
    sourceDetail.classList.toggle('hidden', isExpanded);
    if (!isExpanded) sourceDetail.focus?.();
  });

  const pipelineNodes = [
    { id: 'node-doc', text: 'Step 1: Raw document loaded as source text.' },
    { id: 'node-chunk', text: 'Step 2: Document split into overlapping chunks.' },
    { id: 'node-embed', text: 'Step 3: Chunks converted to simulated educational vectors.' },
    { id: 'node-vstore', text: 'Step 4: Vectors represented in a vector index.' },
    { id: 'node-query', text: 'Step 5: User submits a question.' },
    { id: 'node-qembed', text: 'Step 6: Question converted to the same simulated vector space.' },
    { id: 'node-vsearch', text: 'Step 7: Dense cosine similarity ranks the chunks.' },
    { id: 'node-topk', text: 'Step 8: Top-K dense results are selected.' },
    { id: 'node-ctx', text: 'Step 9: Selected chunks form the context buffer.' },
    { id: 'node-prompt', text: 'Step 10: Instructions, context, and question form the prompt.' },
    { id: 'node-llm', text: 'Step 11: A simulated answer is produced only from complete evidence.' }
  ];

  function resetPipelineAnimation() {
    clearInterval(state.pipelineTimer);
    state.pipelineTimer = null;
    state.pipelineStep = -1;
    pipelineNodes.forEach(node => {
      const element = document.getElementById(node.id);
      element?.classList.remove('completed-node', 'current-node');
      element?.classList.add('upcoming-node');
    });
    pipelineStatusText.textContent = 'Status: Ready to run pipeline simulation.';
  }

  function stepPipelineAnimation() {
    state.pipelineStep = (state.pipelineStep + 1) % pipelineNodes.length;
    pipelineNodes.forEach((node, index) => {
      const element = document.getElementById(node.id);
      element?.classList.toggle('completed-node', index < state.pipelineStep);
      element?.classList.toggle('current-node', index === state.pipelineStep);
      element?.classList.toggle('upcoming-node', index > state.pipelineStep);
    });
    const currentNode = pipelineNodes[state.pipelineStep];
    pipelineStatusText.textContent = currentNode.text;
  }

  function runPipelineAnimation() {
    resetPipelineAnimation();
    if (prefersReducedMotion.matches) {
      state.pipelineStep = pipelineNodes.length - 1;
      pipelineNodes.forEach(node => {
        const element = document.getElementById(node.id);
        element?.classList.remove('upcoming-node', 'current-node');
        element?.classList.add('completed-node');
      });
      pipelineStatusText.textContent = 'Status: Basic RAG pipeline complete. Reduced motion is enabled, so the full result is shown immediately.';
      return;
    }
    stepPipelineAnimation();
    state.pipelineTimer = setInterval(() => {
      if (state.pipelineStep === pipelineNodes.length - 1) {
        clearInterval(state.pipelineTimer);
        state.pipelineTimer = null;
        return;
      }
      stepPipelineAnimation();
    }, 900);
  }

  btnRunPipeline.addEventListener('click', runPipelineAnimation);
  btnStepPipeline.addEventListener('click', stepPipelineAnimation);
  btnResetPipeline.addEventListener('click', resetPipelineAnimation);

  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      progressDots.forEach(dot => {
        const isActive = dot.dataset.section === id;
        dot.classList.toggle('active', isActive);
        if (isActive) dot.setAttribute('aria-current', 'step');
        else dot.removeAttribute('aria-current');
      });
      const index = Array.from(sections).indexOf(entry.target);
      const percentage = ((index + 1) / sections.length) * 100;
      progressFill.style.height = `${percentage}%`;
      mobileProgressFill.style.width = `${percentage}%`;
      mobileProgressLabel.textContent = progressDots[index]?.querySelector('.dot-label')?.textContent || entry.target.querySelector('h2, h1')?.textContent || 'Basic RAG';
    });
  }, {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  });
  sections.forEach(section => observer.observe(section));

  document.documentElement.lang = 'en';
  syncChunkControls();
  rebuildChunks();
  resetPipelineAnimation();
});
