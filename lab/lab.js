document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  if (!window.RagCore) {
    throw new Error('RagCore must be loaded before lab.js');
  }

  const {
    createChunks,
    findEvidenceForQuery,
    computeEducationalVector,
    cosineSimilarity,
    locateEvidence,
    resolveEvidenceSupport
  } = window.RagCore;

  const sampleDocuments = {
    dentcare: `DentCare Clinic is open from Monday to Friday, from 8 AM to 6 PM.
The initial dental consultation costs R$ 250.
Dr. Ana is an orthodontics specialist and works on Tuesdays and Thursdays.
Dr. Carlos performs root canal treatments and endodontics procedures.
Cancellations must be made at least 24 hours in advance.
The clinic accepts payments via PIX, credit card, and debit card.`
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

  const refs = {
    docSelect: document.getElementById('lab-doc-select'),
    customGroup: document.getElementById('custom-doc-group'),
    customText: document.getElementById('lab-custom-text'),
    chunkSize: document.getElementById('lab-chunk-size'),
    overlap: document.getElementById('lab-overlap'),
    topK: document.getElementById('lab-top-k'),
    query: document.getElementById('lab-query'),
    btnRun: document.getElementById('btn-run-debug'),
    valChunkSize: document.getElementById('val-chunk-size'),
    valOverlap: document.getElementById('val-overlap'),
    valTopK: document.getElementById('val-top-k'),
    countChunks: document.getElementById('count-chunks'),
    chunksList: document.getElementById('debug-chunks-list'),
    simList: document.getElementById('debug-similarity-list'),
    promptOutput: document.getElementById('debug-prompt-output'),
    answerOutput: document.getElementById('debug-answer-output')
  };

  const qPresetBtns = document.querySelectorAll('.q-preset-btn');

  function formatChunkId(id) {
    return String(id).padStart(2, '0');
  }

  function setPressedState(activeButton) {
    qPresetBtns.forEach(button => {
      const isActive = button === activeButton;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function getDocumentText() {
    if (refs.docSelect.value === 'custom') return refs.customText.value.trim();
    return sampleDocuments[refs.docSelect.value] || sampleDocuments.dentcare;
  }

  function getEvidenceRelations(chunk, documentText) {
    return evidenceCatalog.flatMap(evidence => {
      const location = locateEvidence(documentText, evidence, [chunk]);
      if (location.containingChunks.length > 0) return [{ evidence, relation: 'complete' }];
      if (location.intersectingChunks.length > 0) return [{ evidence, relation: 'fragment' }];
      return [];
    });
  }

  function renderChunks(chunks, documentText) {
    refs.chunksList.textContent = '';
    refs.countChunks.textContent = chunks.length;

    chunks.forEach(chunk => {
      const box = document.createElement('div');
      box.className = 'chunk-box';

      const header = document.createElement('div');
      header.className = 'chunk-header';
      header.textContent = `Chunk #${formatChunkId(chunk.id)} · ${chunk.text.length} chars · ${chunk.overlapWithNext} overlap`;

      const body = document.createElement('div');
      body.textContent = chunk.text;

      const badges = getEvidenceRelations(chunk, documentText);
      if (badges.length > 0) {
        const badgeRow = document.createElement('div');
        badgeRow.className = 'evidence-badges';
        badges.forEach(({ evidence, relation }) => {
          const badge = document.createElement('span');
          badge.className = `evidence-badge ${relation}`;
          badge.textContent = `${evidence.label}${relation === 'fragment' ? ' fragment' : ''}`;
          badgeRow.appendChild(badge);
        });
        box.appendChild(badgeRow);
      }

      box.appendChild(header);
      box.appendChild(body);
      refs.chunksList.appendChild(box);
    });
  }

  function renderSimilarity(ranked, topK) {
    refs.simList.textContent = '';
    ranked.forEach((item, index) => {
      const isTopK = index < topK;
      const row = document.createElement('div');
      row.className = 'sim-item';
      row.classList.toggle('is-top-k', isTopK);

      const label = document.createElement('span');
      label.className = 'sim-label';
      label.textContent = `Chunk #${formatChunkId(item.id)}`;

      const barBackground = document.createElement('div');
      barBackground.className = 'sim-bar-bg';
      const barFill = document.createElement('div');
      barFill.className = 'sim-bar-fill';
      const mappedWidth = Math.round(((item.score + 1) / 2) * 100);
      barFill.style.width = `${mappedWidth}%`;
      barBackground.appendChild(barFill);

      const score = document.createElement('span');
      score.className = 'sim-score';
      score.textContent = item.score.toFixed(3);

      row.append(label, barBackground, score);
      refs.simList.appendChild(row);
    });
  }

  function renderPrompt(retrieved, query) {
    const system = 'SYSTEM: Answer using only the provided context below. If you do not know, state clearly that the information is unavailable.';
    const context = retrieved.length > 0
      ? retrieved.map(chunk => `[Chunk ${formatChunkId(chunk.id)}]\n${chunk.text}`).join('\n\n')
      : '(No context retrieved)';
    refs.promptOutput.textContent = `${system}\n\nRETRIEVED CONTEXT:\n${context}\n\nUSER QUESTION:\n${query}`;
  }

  function renderGroundedAnswer(evidence, sourceChunk) {
    refs.answerOutput.textContent = '';
    refs.answerOutput.className = 'answer-box grounded';

    const label = document.createElement('strong');
    label.className = 'answer-label';
    label.textContent = 'Simulated LLM output';

    const answer = document.createElement('p');
    answer.className = 'answer-text';
    answer.textContent = `“${evidence.text}”`;

    const citation = document.createElement('div');
    citation.className = 'answer-citation';
    const badge = document.createElement('span');
    badge.className = 'evidence-identity';
    badge.textContent = evidence.label;
    const detail = document.createElement('span');
    detail.textContent = `${evidence.title} · Source: Chunk #${formatChunkId(sourceChunk.id)}`;
    citation.append(badge, detail);

    const status = document.createElement('p');
    status.className = 'answer-status grounded';
    status.textContent = 'Grounding verified: the complete canonical evidence is present in a retrieved chunk and in the active context.';

    refs.answerOutput.append(label, answer, citation, status);
  }

  function renderRefusal(message) {
    refs.answerOutput.textContent = '';
    refs.answerOutput.className = 'answer-box insufficient';

    const label = document.createElement('strong');
    label.className = 'answer-label';
    label.textContent = 'Simulated LLM output';

    const status = document.createElement('p');
    status.className = 'answer-status';
    status.textContent = message;

    refs.answerOutput.append(label, status);
  }

  function renderAnswer(documentText, allChunks, retrieved, query) {
    const usingCustom = refs.docSelect.value === 'custom';
    const evidence = findEvidenceForQuery(query, evidenceCatalog);

    if (!evidence) {
      renderRefusal(usingCustom
        ? 'The retrieved context does not contain enough evidence to answer this question. Custom documents have no canonical evidence catalog, so this debugger shows the refusal state instead of inventing an answer.'
        : 'The retrieved context does not contain enough evidence to answer this question. This is an out-of-domain query: retrieval succeeded, but no canonical evidence matches the question, so the answer is refused.');
      return;
    }

    const support = resolveEvidenceSupport(documentText, evidence, retrieved);
    if (!support.supported) {
      const location = locateEvidence(documentText, evidence, allChunks);
      let reason;
      if (!location.foundInDocument) {
        reason = 'The canonical evidence is not present in the current document text.';
      } else if (location.containingChunks.length === 0) {
        reason = 'The complete evidence is split across chunks, so no single retrieved chunk can ground the answer.';
      } else {
        reason = 'The complete evidence exists in the document but is not included in the active Top-K context.';
      }
      renderRefusal(`The retrieved context does not contain enough evidence to answer this question. ${reason}`);
      return;
    }

    renderGroundedAnswer(evidence, support.sourceChunk);
  }

  function runDebugger() {
    const text = getDocumentText();
    const size = parseInt(refs.chunkSize.value, 10);
    const overlap = parseInt(refs.overlap.value, 10);
    const topK = parseInt(refs.topK.value, 10);
    const query = refs.query.value.trim() || 'How much does a consultation cost?';

    refs.valChunkSize.textContent = size;
    refs.valOverlap.textContent = overlap;
    refs.valTopK.textContent = topK;

    const chunks = createChunks(text, size, overlap);
    const queryVector = computeEducationalVector(query);
    const ranked = chunks
      .map(chunk => ({
        ...chunk,
        score: cosineSimilarity(queryVector, computeEducationalVector(chunk.text))
      }))
      .sort((first, second) => second.score - first.score || first.id - second.id);
    const retrieved = ranked.slice(0, topK);

    renderChunks(chunks, text);
    renderSimilarity(ranked, topK);
    renderPrompt(retrieved, query);
    renderAnswer(text, chunks, retrieved, query);
  }

  refs.docSelect.addEventListener('change', () => {
    refs.customGroup.classList.toggle('hidden', refs.docSelect.value !== 'custom');
    runDebugger();
  });

  refs.chunkSize.addEventListener('input', () => {
    refs.valChunkSize.textContent = refs.chunkSize.value;
    runDebugger();
  });
  refs.overlap.addEventListener('input', () => {
    refs.valOverlap.textContent = refs.overlap.value;
    runDebugger();
  });
  refs.topK.addEventListener('input', () => {
    refs.valTopK.textContent = refs.topK.value;
    runDebugger();
  });
  refs.query.addEventListener('input', () => {
    setPressedState(null);
    runDebugger();
  });
  refs.customText.addEventListener('input', runDebugger);
  refs.btnRun.addEventListener('click', runDebugger);

  qPresetBtns.forEach(button => {
    button.addEventListener('click', () => {
      refs.query.value = button.dataset.q;
      setPressedState(button);
      runDebugger();
    });
  });

  runDebugger();
});