(() => {
  const $ = (selector) => document.querySelector(selector);
  const form = $('#analysis-form');
  const fileInput = $('#chart-file');
  const dropzone = $('#dropzone');
  const preview = $('#image-preview');
  const fileName = $('#file-name');
  const analyzeButton = $('#analyze-button');
  const empty = $('#result-empty');
  const loading = $('#result-loading');
  const content = $('#result-content');
  const errorBox = $('#result-error');
  const status = $('#result-status');
  let lastFile = null;
  let previewUrl = null;

  const setView = (view) => {
    empty.hidden = view !== 'empty';
    loading.hidden = view !== 'loading';
    content.hidden = view !== 'content';
    errorBox.hidden = view !== 'error';
  };
  const setStatus = (text, type = '') => {
    status.textContent = text;
    status.className = `status-badge ${type}`.trim();
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Minimal Markdown renderer; raw HTML is escaped before formatting.
  function renderMarkdown(text) {
    const safe = escapeHtml(text);
    return safe.split(/\n{2,}/).map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^###\s/.test(trimmed)) return `<h4>${trimmed.replace(/^###\s/, '')}</h4>`;
      if (/^##\s/.test(trimmed)) return `<h3>${trimmed.replace(/^##\s/, '')}</h3>`;
      if (/^#\s/.test(trimmed)) return `<h2>${trimmed.replace(/^#\s/, '')}</h2>`;
      if (/^(\- |\* )/m.test(trimmed)) return `<ul>${trimmed.split('\n').map(line => line.match(/^(\- |\* )(.*)/) ? `<li>${line.replace(/^(\- |\* )/, '')}</li>` : `<li>${line}</li>`).join('')}</ul>`;
      const formatted = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
      return `<p>${formatted}</p>`;
    }).join('');
  }
  function setFile(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showError('Choose a PNG, JPG, or WEBP image.'); fileInput.value = ''; return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showError('File is larger than 8 MB. Choose a smaller image.'); fileInput.value = ''; return;
    }
    lastFile = file;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;
    fileName.textContent = file.name;
    if (content.hidden === false || errorBox.hidden === false) setView('empty');
    setStatus('GOTOWY');
  }
  function showError(message) {
    $('#error-message').textContent = message || 'Please try again shortly.';
    setView('error'); setStatus('ERROR', 'error');
  }
  fileInput.addEventListener('change', () => setFile(fileInput.files?.[0]));
  ['dragenter','dragover'].forEach(type => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(type => dropzone.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.remove('dragover'); }));
  dropzone.addEventListener('drop', (event) => setFile(event.dataTransfer?.files?.[0]));

  function renderResult(data) {
    const signal = ['BUY','SELL','WAIT'].includes(data.signal) ? data.signal : 'WAIT';
    const card = $('#signal-card');
    card.className = `signal-card ${signal.toLowerCase()}`;
    $('#signal-word').textContent = signal;
    $('#score-value').textContent = Number.isFinite(Number(data.score)) ? Math.max(0, Math.min(100, Number(data.score))) : '—';
    $('#signal-rationale').textContent = data.rationale || 'Insufficient rationale provided.';
    const riskLabels = {NISKIE:'Low',UMIARKOWANE:'Moderate',WYSOKIE:'High',NIEZNANE:'Unknown'};
    $('#risk-value').textContent = riskLabels[data.risk] || 'Unknown';
    $('#risk-reason').textContent = data.risk_reason || 'No rationale provided for the risk assessment.';
    $('#entry-value').textContent = data.entry || 'Cannot be determined';
    $('#sl-value').textContent = data.stop_loss || 'Cannot be determined';
    $('#tp1-value').textContent = data.take_profit_1 || 'Cannot be determined';
    $('#tp2-value').textContent = data.take_profit_2 || 'Cannot be determined';
    $('#rr-value').textContent = data.reward_risk || 'Cannot be reliably determined';
    $('#invalidation-value').textContent = data.invalidation || 'No invalidation conditions provided.';
    $('#analysis-body').innerHTML = renderMarkdown(data.analysis || 'No detailed analysis provided.');
    setView('content'); setStatus('ANALYSIS READY');
  }
  async function analyze() {
    const file = lastFile || fileInput.files?.[0];
    if (!file) { showError('Upload a chart image first.'); $('#chart-file').focus(); return; }
    const data = new FormData(form);
    data.set('chart', file);
    analyzeButton.disabled = true;
    setView('loading'); setStatus('ANALYZING', 'busy');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 100000);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: data, signal: controller.signal });
      let payload;
      try { payload = await response.json(); } catch { throw new Error('The server returned an invalid response.'); }
      if (!response.ok) throw new Error(payload.error || `Server error (${response.status}).`);
      // Compatibility fallback if an older server returns only { analysis: "..." }.
      if (!payload.signal && payload.analysis) {
        payload = { signal:'WAIT', score:0, risk:'NIEZNANE', risk_reason:'The older API did not return a structured assessment.', entry:'Cannot be reliably determined', stop_loss:'Cannot be reliably determined', take_profit_1:'Cannot be reliably determined', take_profit_2:'Cannot be reliably determined', reward_risk:'Cannot be reliably determined', rationale:'The API analysis is shown below. Update server.js to enable the signal card.', invalidation:'No structured data available.', analysis:payload.analysis };
      }
      renderResult(payload);
    } catch (error) {
      showError(error.name === 'AbortError' ? 'The analysis took too long and was stopped. Try again with a smaller, clearer image.' : error.message || 'Could not connect to the server.');
    } finally {
      clearTimeout(timeout); analyzeButton.disabled = false;
    }
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); analyze(); });
  $('#retry-button').addEventListener('click', analyze);
  $('#reset-button').addEventListener('click', () => {
    form.reset(); lastFile = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null; preview.removeAttribute('src'); preview.hidden = true;
    fileName.textContent = 'Nie wybrano pliku'; setView('empty'); setStatus('GOTOWY');
    $('#analyzer').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.querySelectorAll('.quiz-options button').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.quiz-options button').forEach(b => b.classList.remove('correct','incorrect'));
    if (button.dataset.answer === 'b') { button.classList.add('correct'); $('#quiz-feedback').textContent = 'That’s right. This rates the quality of evidence in the image, not the probability of profit.'; }
    else { button.classList.add('incorrect'); $('#quiz-feedback').textContent = 'Not quite. The score does not predict profit; it describes the quality of the available evidence.'; }
  }));
  $('#quiz-reset').addEventListener('click', () => { document.querySelectorAll('.quiz-options button').forEach(b => b.classList.remove('correct','incorrect')); $('#quiz-feedback').textContent = ''; });
  setView('empty');
})();
