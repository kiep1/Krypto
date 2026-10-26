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
  let currentAnalysis = null;
  const savePanel = $('#analysis-save-panel');
  const saveButton = $('#save-analysis-button');
  const saveSignIn = $('#save-analysis-signin');
  const saveHelp = $('#analysis-save-help');
  const saveStatus = $('#save-analysis-status');

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
    setStatus('READY');
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
    const riskLabels = {LOW:'Low',MODERATE:'Moderate',HIGH:'High',UNKNOWN:'Unknown'};
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
    currentAnalysis = null;
    if (savePanel) savePanel.hidden = true;
    savePanel?.querySelector('a[href="/journal"]')?.remove();
    if (saveButton) { saveButton.hidden = true; saveButton.disabled = false; }
    analyzeButton.disabled = true;
    setView('loading'); setStatus('ANALYZING', 'busy');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 100000);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: data, signal: controller.signal });
      let payload;
      try { payload = await response.json(); } catch { throw new Error('The server returned an invalid response.'); }
      if (!response.ok) throw new Error(payload.error || `Server error (${response.status}).`);
      if (payload.usage) {
        const memberStatus = $('#membership-status');
        if (memberStatus) {
          memberStatus.textContent = `${payload.usage.remaining} of ${payload.usage.limit} analyses left today. Limit resets at ${payload.usage.resetsAt}.`;
          memberStatus.hidden = false;
        }
        window.dispatchEvent(new Event('membership:refresh'));
      }
      // Compatibility fallback if an older server returns only { analysis: "..." }.
      if (!payload.signal && payload.analysis) {
        payload = { signal:'WAIT', score:0, risk:'UNKNOWN', risk_reason:'The older API did not return a structured assessment.', entry:'Cannot be reliably determined', stop_loss:'Cannot be reliably determined', take_profit_1:'Cannot be reliably determined', take_profit_2:'Cannot be reliably determined', reward_risk:'Cannot be reliably determined', rationale:'The API analysis is shown below. Update server.js to enable the signal card.', invalidation:'No structured data available.', analysis:payload.analysis };
      }
      currentAnalysis = {
        file,
        fields: {
          instrument: String(data.get('instrument') || ''),
          timeframe: String(data.get('timeframe') || ''),
          question: String(data.get('question') || '')
        },
        result: Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'usage'))
      };
      renderResult(payload);
      await updateSaveOption();
    } catch (error) {
      showError(error.name === 'AbortError' ? 'The analysis took too long and was stopped. Try again with a smaller, clearer image.' : error.message || 'Could not connect to the server.');
    } finally {
      clearTimeout(timeout); analyzeButton.disabled = false;
    }
  }
  async function updateSaveOption() {
    if (!savePanel || !currentAnalysis) return;
    savePanel.hidden = false;
    saveStatus.textContent = '';
    saveButton.hidden = true;
    saveSignIn.hidden = true;
    saveHelp.textContent = 'Your chart and report stay in this browser unless you choose to save them to your private journal.';
    try {
      const response = await fetch('/api/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const state = await response.json();
      if (!state.enabled) {
        saveHelp.textContent = 'Saving is temporarily unavailable. This analysis has not been saved.';
      } else if (state.authenticated) {
        saveButton.hidden = false;
      } else {
        saveHelp.textContent = 'Sign in to save this chart and report to your private journal. Nothing is saved unless you choose to save it.';
        saveSignIn.hidden = false;
      }
    } catch {
      saveHelp.textContent = 'We could not check your sign-in status. This analysis has not been saved.';
    }
  }
  async function saveCurrentAnalysis() {
    if (!currentAnalysis || !saveButton) return;
    saveButton.disabled = true;
    saveStatus.textContent = 'Saving your chart and report…';
    try {
      const data = new FormData();
      data.append('chart', currentAnalysis.file, currentAnalysis.file.name || 'chart.png');
      data.append('instrument', currentAnalysis.fields.instrument);
      data.append('timeframe', currentAnalysis.fields.timeframe);
      data.append('question', currentAnalysis.fields.question);
      data.append('result', JSON.stringify(currentAnalysis.result));
      const response = await fetch('/api/journal', { method: 'POST', body: data, credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not save this analysis.');
      saveStatus.textContent = 'Saved to your private journal.';
      saveButton.hidden = true;
      const journalLink = document.createElement('a');
      journalLink.className = 'text-link';
      journalLink.href = '/journal';
      journalLink.textContent = 'Open saved analyses';
      savePanel.append(journalLink);
    } catch (error) {
      saveStatus.textContent = error.message || 'Could not save this analysis.';
      saveButton.disabled = false;
    }
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); analyze(); });
  $('#retry-button').addEventListener('click', analyze);
  saveButton?.addEventListener('click', saveCurrentAnalysis);
  $('#reset-button').addEventListener('click', () => {
    form.reset(); lastFile = null;
    currentAnalysis = null;
    if (savePanel) savePanel.hidden = true;
    saveStatus.textContent = '';
    savePanel?.querySelector('a[href="/journal"]')?.remove();
    if (saveButton) { saveButton.hidden = true; saveButton.disabled = false; }
    if (saveSignIn) saveSignIn.hidden = true;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null; preview.removeAttribute('src'); preview.hidden = true;
    fileName.textContent = 'No file selected'; setView('empty'); setStatus('READY');
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
