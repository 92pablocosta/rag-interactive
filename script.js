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

  const i18n = {
    en: {
      groundingVerified: 'Grounding verified',
      unsupportedQuery: 'Information unavailable: no canonical evidence is defined for this question.',
      evidenceSplit: 'The required evidence is split across chunks, so no retrieved chunk contains the complete fact.',
      evidenceExcluded: 'The complete evidence exists in the document but was not included in the active Top-K context.'
    },
    pt: {
      groundingVerified: 'Fundamentação verificada',
      unsupportedQuery: 'Informação indisponível: nenhuma evidência canônica foi definida para esta pergunta.',
      evidenceSplit: 'A evidência necessária foi dividida entre chunks; nenhum chunk recuperado contém o fato completo.',
      evidenceExcluded: 'A evidência completa existe no documento, mas não foi incluída no contexto Top-K ativo.'
    }
  };

  let currentLang = 'en';

  const state = {
    documentText: `A clínica DentCare funciona de segunda a sexta-feira, das 8h às 18h.
A consulta odontológica inicial custa R$ 250.
A Dra. Ana é especialista em ortodontia e atende às terças e quintas.
O Dr. Carlos realiza tratamentos de canal e procedimentos de endodontia.
Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência.
A clínica aceita pagamentos via PIX, cartão de crédito e cartão de débito.`,
    chunkSize: 140,
    overlap: 30,
    showOverlap: true,
    chunks: [],
    query: 'Quanto custa uma consulta?',
    topK: 3,
    rankedChunks: [],
    retrievedChunks: [],
    sourceChunkId: null,
    pipelineStep: -1,
    pipelineTimer: null
  };

  const evidenceCatalog = [
    {
      id: 'evidence-a',
      label: 'Evidence A',
      title: 'Consultation price',
      text: 'A consulta odontológica inicial custa R$ 250.',
      queryTerms: ['custa', 'preco', 'valor']
    },
    {
      id: 'evidence-b',
      label: 'Evidence B',
      title: 'Orthodontics specialist and schedule',
      text: 'A Dra. Ana é especialista em ortodontia e atende às terças e quintas.',
      queryTerms: ['ortodont', 'ana']
    },
    {
      id: 'evidence-c',
      label: 'Evidence C',
      title: 'Accepted payment methods',
      text: 'A clínica aceita pagamentos via PIX, cartão de crédito e cartão de débito.',
      queryTerms: ['pagamento', 'pix', 'cartao']
    },
    {
      id: 'evidence-d',
      label: 'Evidence D',
      title: 'Cancellation policy',
      text: 'Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência.',
      queryTerms: ['cancel', '24 hora']
    },
    {
      id: 'evidence-e',
      label: 'Evidence E',
      title: 'Root canal treatment',
      text: 'O Dr. Carlos realiza tratamentos de canal e procedimentos de endodontia.',
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
  const sliderTopK = document.getElementById('slider-top-k');
  const valTopK = document.getElementById('val-top-k');
  const pyTopK = document.getElementById('py-top-k');
  const topKBadge = document.getElementById('top-k-badge');
  const topkVisualList = document.getElementById('topk-visual-list');
  const metricSelectedChunks = document.getElementById('metric-selected-chunks');
  const metricContextChars = document.getElementById('metric-context-chars');
  const metricTokens = document.getElementById('metric-tokens');
  const contextBufferOutput = document.getElementById('context-buffer-output');
  const promptContextPreview = document.getElementById('prompt-context-preview');
  const promptQuestionPreview = document.getElementById('prompt-question-preview');
  const finalAnswerText = document.getElementById('final-answer-text');
  const sourceCitationBtn = document.getElementById('source-citation-btn');
  const groundingStatusBox = document.getElementById('grounding-status-box');
  const groundingStatusMsg = document.getElementById('grounding-status-msg');
  const btnRunPipeline = document.getElementById('btn-run-pipeline');
  const btnStepPipeline = document.getElementById('btn-step-pipeline');
  const btnResetPipeline = document.getElementById('btn-reset-pipeline');
  const pipelineStatusText = document.getElementById('pipeline-status-text');
  const progressFill = document.getElementById('progress-fill');
  const progressDots = document.querySelectorAll('.progress-dot');
  const langBtnEn = document.getElementById('lang-en');
  const langBtnPt = document.getElementById('lang-pt');

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
      chunkWarningBox.innerHTML = `⚠️ <strong>Fragmentation Warning:</strong> Chunk size is very small (${state.chunkSize} chars). Complete evidence may be split across chunks.`;
    } else if (state.chunkSize > 240) {
      chunkWarningBox.classList.remove('hidden');
      chunkWarningBox.innerHTML = `⚠️ <strong>Context Dilution Warning:</strong> Chunk size is large (${state.chunkSize} chars). Each retrieved chunk may contain unrelated information.`;
    } else {
      chunkWarningBox.classList.add('hidden');
    }

    state.chunks.forEach(chunk => {
      const card = document.createElement('div');
      card.className = 'chunk-card';
      card.id = `chunk-card-${chunk.id}`;
      const overlapLength = state.showOverlap ? chunk.overlapWithNext : 0;
      const mainLength = Math.max(0, chunk.text.length - overlapLength);
      const contentHtml = overlapLength > 0
        ? `${escapeHtml(chunk.text.slice(0, mainLength))}<span class="overlap-text">${escapeHtml(chunk.text.slice(mainLength))}</span>`
        : escapeHtml(chunk.text);

      card.innerHTML = `
        <div class="chunk-card-header">
          <span>Chunk ${formatChunkId(chunk.id)}</span>
          <span>${chunk.text.length} chars · ${chunk.overlapWithNext} overlap</span>
        </div>
        <div class="evidence-badges">${renderEvidenceBadges(chunk)}</div>
        <div>${contentHtml}</div>
      `;
      chunksVisualList.appendChild(card);
    });
  }

  function updateRetrievalFlow() {
    const queryVector = computeEducationalVector(state.query);
    displayQueryVector.textContent = `[${queryVector.slice(0, 4).map(value => value.toFixed(3)).join(', ')}, ...]`;
    renderVectorSpace(queryVector);
    state.rankedChunks = state.chunks
      .map(chunk => ({ ...chunk, score: cosineSimilarity(queryVector, chunk.vector) }))
      .sort((first, second) => second.score - first.score || first.id - second.id);
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
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', clampedX);
      circle.setAttribute('cy', clampedY);
      circle.setAttribute('r', 7);
      circle.setAttribute('fill', '#8b5cf6');
      circle.setAttribute('class', 'node-point');
      circle.setAttribute('tabindex', '0');
      circle.setAttribute('role', 'button');
      circle.setAttribute('aria-label', `Inspect simulated vector for Chunk ${formatChunkId(chunk.id)}`);

      const inspectChunk = () => {
        embeddingInspector.innerHTML = `
          <h4>Chunk ${formatChunkId(chunk.id)} Simulated Vector</h4>
          <p><strong>Educational feature coordinates:</strong> <code style="color:#06b6d4">[${chunk.vector.map(value => value.toFixed(3)).join(', ')}]</code></p>
          <p style="margin-top:0.4rem; color:#cbd5e1;">${escapeHtml(chunk.text)}</p>
        `;
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
      label.textContent = `Chunk ${formatChunkId(chunk.id)}`;
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
    const queryPoint = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    queryPoint.setAttribute('cx', clampedQueryX);
    queryPoint.setAttribute('cy', clampedQueryY);
    queryPoint.setAttribute('r', 8);
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
    queryLabel.textContent = '★ Simulated Query Vector';
    svgSpace.appendChild(queryLabel);
  }

  function renderSimilarity() {
    similarityRankingList.innerHTML = '';
    state.rankedChunks.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'rank-item-card';
      const mappedWidth = Math.round(((item.score + 1) / 2) * 100);
      row.innerHTML = `
        <span class="rank-score-badge">${item.score.toFixed(3)}</span>
        <div class="rank-bar-wrapper">
          <div style="display:flex; justify-content:space-between; gap:0.75rem; font-size:0.8rem;">
            <strong>Chunk ${formatChunkId(item.id)}</strong>
            <span style="color:var(--text-muted)">Dense cosine rank #${index + 1}</span>
          </div>
          <div class="evidence-badges">${renderEvidenceBadges(item)}</div>
          <div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${mappedWidth}%"></div></div>
          <span class="rank-chunk-text">${escapeHtml(item.text)}</span>
        </div>
      `;
      similarityRankingList.appendChild(row);
    });
  }

  function renderAngleVisualizer() {
    angleCircleSvg.innerHTML = '';
    const topCosine = state.rankedChunks[0]?.score ?? 0;
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
    const context = state.retrievedChunks
      .map(chunk => `[Chunk ${formatChunkId(chunk.id)}]\n${chunk.text}`)
      .join('\n\n');
    renderContextAndGeneration(context);
    renderEvidenceAStatus();
  }

  function renderTopK() {
    topkVisualList.innerHTML = '';
    state.rankedChunks.forEach((item, index) => {
      const isRetrieved = index < state.topK;
      const row = document.createElement('div');
      row.className = `topk-item ${isRetrieved ? 'selected' : 'excluded'}`;
      row.innerHTML = `
        <div>
          <strong>Chunk ${formatChunkId(item.id)}</strong>
          <span class="badge-neutral" style="margin-left:0.5rem;">Cosine: ${item.score.toFixed(3)}</span>
          <div class="evidence-badges">${renderEvidenceBadges(item)}</div>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.2rem;">${escapeHtml(item.text)}</p>
        </div>
        <span style="font-weight:bold; font-size:0.8rem; color:${isRetrieved ? 'var(--color-context)' : 'var(--text-muted)'}">
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
      return;
    }

    const currentChunks = location.containingChunks.map(chunk => `Chunk ${formatChunkId(chunk.id)}`).join(', ');
    const ranking = rankedMatches.map(item => `#${item.rank}`).join(', ');
    const topKStatus = retrievedMatch
      ? `Included in Top-K and context via Chunk ${formatChunkId(retrievedMatch.id)}.`
      : 'Not included in the active Top-K context.';
    evidenceAStatus.textContent = `${evidence.label} is currently in ${currentChunks}; dense rank ${ranking}. ${topKStatus}`;
  }

  function renderContextAndGeneration(context) {
    contextBufferOutput.textContent = context || '(No chunks retrieved in context)';
    promptContextPreview.textContent = context || '(No context)';
    promptQuestionPreview.textContent = `“${state.query}”`;
    state.sourceChunkId = null;
    sourceCitationBtn.disabled = true;
    sourceCitationBtn.textContent = 'No complete evidence in context';
    groundingStatusBox.className = 'grounding-status-banner retrieval-miss';

    const evidence = findEvidenceForQuery(state.query, evidenceCatalog);
    const support = resolveEvidenceSupport(state.documentText, evidence, state.retrievedChunks);
    if (!evidence) {
      finalAnswerText.textContent = `“${i18n[currentLang].unsupportedQuery}”`;
      groundingStatusMsg.textContent = i18n[currentLang].unsupportedQuery;
      return;
    }
    if (!support.supported) {
      const documentLocation = locateEvidence(state.documentText, evidence, state.chunks);
      const message = documentLocation.containingChunks.length === 0
        ? i18n[currentLang].evidenceSplit
        : i18n[currentLang].evidenceExcluded;
      finalAnswerText.textContent = `“${message}”`;
      groundingStatusMsg.textContent = `${evidence.label} — ${message}`;
      return;
    }

    state.sourceChunkId = support.sourceChunk.id;
    sourceCitationBtn.disabled = false;
    sourceCitationBtn.textContent = `${evidence.label} — ${evidence.title} • Currently in Chunk ${formatChunkId(state.sourceChunkId)} 🔍`;
    groundingStatusBox.className = 'grounding-status-banner grounded';
    groundingStatusMsg.textContent = `${i18n[currentLang].groundingVerified}: ${evidence.label} — ${evidence.title} is fully present in Chunk ${formatChunkId(state.sourceChunkId)} and in the active context.`;
    finalAnswerText.textContent = `“${evidence.text}”`;
  }

  function setPreset(chunkSize, overlap, activeButton) {
    state.chunkSize = chunkSize;
    state.overlap = overlap;
    [btnPresetTiny, btnPresetBalanced, btnPresetLarge].forEach(button => {
      button.classList.toggle('active', button === activeButton);
    });
    rebuildChunks();
  }

  sliderChunkSize.addEventListener('input', event => {
    state.chunkSize = parseInt(event.target.value, 10);
    [btnPresetTiny, btnPresetBalanced, btnPresetLarge].forEach(button => button.classList.remove('active'));
    rebuildChunks();
  });
  sliderOverlap.addEventListener('input', event => {
    state.overlap = parseInt(event.target.value, 10);
    [btnPresetTiny, btnPresetBalanced, btnPresetLarge].forEach(button => button.classList.remove('active'));
    rebuildChunks();
  });
  toggleOverlap.addEventListener('change', event => {
    state.showOverlap = event.target.checked;
    renderChunks();
  });
  btnPresetTiny.addEventListener('click', () => setPreset(60, 10, btnPresetTiny));
  btnPresetBalanced.addEventListener('click', () => setPreset(140, 30, btnPresetBalanced));
  btnPresetLarge.addEventListener('click', () => setPreset(260, 50, btnPresetLarge));
  sliderAngleAdjust.addEventListener('input', () => {
    sliderAngleAdjust.dataset.manual = 'true';
    renderAngleVisualizer();
  });
  sliderTopK.addEventListener('input', event => {
    state.topK = parseInt(event.target.value, 10);
    updateTopKFlow();
  });

  function setQuery(query, activePreset = null) {
    state.query = query;
    userQueryInput.value = query;
    displayQueryText.textContent = `“${query}”`;
    delete sliderAngleAdjust.dataset.manual;
    qPresetBtns.forEach(button => button.classList.toggle('active', button === activePreset));
    updateRetrievalFlow();
  }

  btnVectorizeQuery.addEventListener('click', () => {
    setQuery(userQueryInput.value.trim() || 'Quanto custa uma consulta?');
  });
  userQueryInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') setQuery(userQueryInput.value.trim() || 'Quanto custa uma consulta?');
  });
  qPresetBtns.forEach(button => {
    button.addEventListener('click', () => setQuery(button.dataset.q, button));
  });

  sourceCitationBtn.addEventListener('click', () => {
    if (sourceCitationBtn.disabled || state.sourceChunkId === null) return;
    const targetCard = document.getElementById(`chunk-card-${state.sourceChunkId}`);
    if (!targetCard) return;
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetCard.classList.add('source-highlight');
    setTimeout(() => targetCard.classList.remove('source-highlight'), 2500);
  });

  langBtnEn.addEventListener('click', () => setLanguage('en'));
  langBtnPt.addEventListener('click', () => setLanguage('pt'));

  function setLanguage(language) {
    currentLang = language;
    langBtnEn.classList.toggle('active', language === 'en');
    langBtnPt.classList.toggle('active', language === 'pt');
    langBtnEn.setAttribute('aria-pressed', String(language === 'en'));
    langBtnPt.setAttribute('aria-pressed', String(language === 'pt'));
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
    const context = state.retrievedChunks
      .map(chunk => `[Chunk ${formatChunkId(chunk.id)}]\n${chunk.text}`)
      .join('\n\n');
    renderContextAndGeneration(context);
  }

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
    pipelineNodes.forEach(node => document.getElementById(node.id)?.classList.remove('active-node'));
    pipelineStatusText.textContent = 'Status: Ready to run pipeline simulation.';
  }

  function stepPipelineAnimation() {
    pipelineNodes.forEach(node => document.getElementById(node.id)?.classList.remove('active-node'));
    state.pipelineStep = (state.pipelineStep + 1) % pipelineNodes.length;
    const currentNode = pipelineNodes[state.pipelineStep];
    document.getElementById(currentNode.id)?.classList.add('active-node');
    pipelineStatusText.textContent = currentNode.text;
  }

  function runPipelineAnimation() {
    resetPipelineAnimation();
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
      progressDots.forEach(dot => dot.classList.toggle('active', dot.dataset.section === id));
      const index = Array.from(sections).indexOf(entry.target);
      progressFill.style.height = `${((index + 1) / sections.length) * 100}%`;
    });
  }, {
    root: null,
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  });
  sections.forEach(section => observer.observe(section));

  langBtnEn.setAttribute('aria-pressed', 'true');
  langBtnPt.setAttribute('aria-pressed', 'false');
  document.documentElement.lang = 'en';
  syncChunkControls();
  rebuildChunks();
});
