document.addEventListener('DOMContentLoaded', () => {
  const docs = {
    dentcare: `A clínica DentCare funciona de segunda a sexta-feira, das 8h às 18h.
A consulta odontológica inicial custa R$ 250.
A Dra. Ana é especialista em ortodontia e atende às terças e quintas.
O Dr. Carlos realiza tratamentos de canal e procedimentos de endodontia.
Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência.
A clínica aceita pagamentos via PIX, cartão de crédito e cartão de débito.`,
    techcorp: `A política de TI da TechCorp exige autenticação em dois fatores (2FA) para todos os sistemas internos.
Senhas de usuários expiram a cada 90 dias e devem ter pelo menos 12 caracteres.
O suporte técnico opera 24/7 pelo canal Slack #support-ti.
Backups dos servidores principais ocorrem diariamente às 02h00.`
  };

  const docSelect = document.getElementById('lab-doc-select');
  const customGroup = document.getElementById('custom-doc-group');
  const customText = document.getElementById('lab-custom-text');
  const chunkSizeInput = document.getElementById('lab-chunk-size');
  const overlapInput = document.getElementById('lab-overlap');
  const topKInput = document.getElementById('lab-top-k');
  const queryInput = document.getElementById('lab-query');
  const btnRun = document.getElementById('btn-run-debug');

  const valChunkSize = document.getElementById('val-chunk-size');
  const valOverlap = document.getElementById('val-overlap');
  const valTopK = document.getElementById('val-top-k');

  const countChunks = document.getElementById('count-chunks');
  const chunksList = document.getElementById('debug-chunks-list');
  const simList = document.getElementById('debug-similarity-list');
  const promptOutput = document.getElementById('debug-prompt-output');
  const answerOutput = document.getElementById('debug-answer-output');

  docSelect.addEventListener('change', () => {
    if (docSelect.value === 'custom') {
      customGroup.classList.remove('hidden');
    } else {
      customGroup.classList.add('hidden');
    }
    runDebugger();
  });

  chunkSizeInput.addEventListener('input', () => {
    valChunkSize.textContent = chunkSizeInput.value;
    runDebugger();
  });
  overlapInput.addEventListener('input', () => {
    valOverlap.textContent = overlapInput.value;
    runDebugger();
  });
  topKInput.addEventListener('input', () => {
    valTopK.textContent = topKInput.value;
    runDebugger();
  });

  function getDocumentText() {
    if (docSelect.value === 'custom') return customText.value || 'Insira um texto...';
    return docs[docSelect.value] || docs.dentcare;
  }

  function splitIntoChunks(text, size, overlap) {
    const raw = text.trim();
    const effectiveSize = Math.max(30, size);
    const effectiveOverlap = Math.min(overlap, effectiveSize - 10);
    const step = Math.max(10, effectiveSize - effectiveOverlap);

    const chunks = [];
    let start = 0;
    let chunkId = 1;

    while (start < raw.length) {
      let end = start + effectiveSize;
      if (end >= raw.length) {
        end = raw.length;
      } else {
        const segment = raw.slice(start, Math.min(raw.length, end + 15));
        const newlineIdx = segment.indexOf('\n');
        const periodIdx = segment.indexOf('. ');
        if (newlineIdx !== -1 && newlineIdx >= effectiveSize * 0.55) {
          end = start + newlineIdx + 1;
        } else if (periodIdx !== -1 && periodIdx >= effectiveSize * 0.55) {
          end = start + periodIdx + 1;
        }
      }

      const chunkStr = raw.slice(start, end).trim();
      if (chunkStr.length > 0) {
        chunks.push({
          id: chunkId++,
          text: chunkStr
        });
      }

      if (end >= raw.length) break;
      start += step;
    }

    return chunks;
  }

  function tokenize(str) {
    return str.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 1);
  }

  function calculateSimilarity(query, chunkText) {
    const qTokens = tokenize(query);
    const cTokens = tokenize(chunkText);
    if (qTokens.length === 0 || cTokens.length === 0) return 0.1;

    let dot = 0;
    qTokens.forEach(qt => {
      if (cTokens.some(ct => ct.includes(qt) || qt.includes(ct))) dot += 1.5;
    });

    const normQ = Math.sqrt(qTokens.length);
    const normC = Math.sqrt(cTokens.length);
    const sim = dot / (normQ * normC + 0.001);

    return Math.min(0.99, Math.max(0.12, sim * 0.45 + 0.1));
  }

  function runDebugger() {
    const text = getDocumentText();
    const size = parseInt(chunkSizeInput.value, 10);
    const overlap = parseInt(overlapInput.value, 10);
    const topK = parseInt(topKInput.value, 10);
    const query = queryInput.value.trim() || "Consulta";

    const chunks = splitIntoChunks(text, size, overlap);
    countChunks.textContent = chunks.length;

    // Render Chunks
    chunksList.innerHTML = '';
    chunks.forEach(c => {
      const box = document.createElement('div');
      box.className = 'chunk-box';
      box.innerHTML = `<div class="chunk-header">Chunk #${c.id} (${c.text.length} chars)</div><div>${c.text}</div>`;
      chunksList.appendChild(box);
    });

    // Similarity
    const ranked = chunks.map(c => {
      return {
        ...c,
        score: calculateSimilarity(query, c.text)
      };
    }).sort((a, b) => b.score - a.score);

    simList.innerHTML = '';
    ranked.forEach((item, idx) => {
      const isTopK = idx < topK;
      const row = document.createElement('div');
      row.className = 'sim-item';
      row.style.borderLeft = isTopK ? '3px solid #10b981' : '3px solid transparent';
      row.innerHTML = `
        <span style="width: 80px; font-weight: 600; color: ${isTopK ? '#10b981' : '#94a3b8'}">Chunk #${item.id}</span>
        <div class="sim-bar-bg">
          <div class="sim-bar-fill" style="width: ${Math.round(item.score * 100)}%; background: ${isTopK ? '#10b981' : '#38bdf8'}"></div>
        </div>
        <span style="width: 60px; font-family: monospace; font-size: 0.85rem">${(item.score).toFixed(2)}</span>
      `;
      simList.appendChild(row);
    });

    // Retrieved Context
    const retrieved = ranked.slice(0, topK);
    const contextStr = retrieved.map(r => `[Chunk 0${r.id}]\n${r.text}`).join('\n\n');

    // Prompt
    const fullPrompt = `SYSTEM: Responda usando exclusivamente o contexto fornecido abaixo. Se não souber, afirme que a informação está indisponível.

CONTEXTO RECUPERADO:
${contextStr || '(Nenhum contexto recuperado)'}

PERGUNTA DO USUÁRIO:
${query}`;

    promptOutput.textContent = fullPrompt;

    // Answer & Grounding verification
    let answerText = "";
    if (retrieved.length > 0) {
      answerText = `Baseado no contexto recuperado: "${retrieved[0].text}" [Fonte: Chunk #${retrieved[0].id}]`;
    } else {
      answerText = "Nenhuma informação relevante encontrada no contexto recuperado.";
    }

    answerOutput.innerHTML = `<strong>Resposta Simulada do LLM:</strong><p style="margin-top: 0.5rem; color: #a7f3d0;">${answerText}</p>`;
  }

  btnRun.addEventListener('click', runDebugger);
  queryInput.addEventListener('input', runDebugger);
  customText.addEventListener('input', runDebugger);
  runDebugger();
});

