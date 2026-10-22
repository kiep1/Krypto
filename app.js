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
      showError('Wybierz obraz PNG, JPG lub WEBP.'); fileInput.value = ''; return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showError('Plik jest wiÄkszy niÅ¼ 8 MB. Wybierz mniejszy obraz.'); fileInput.value = ''; return;
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
    $('#error-message').textContent = message || 'SprÃ³buj ponownie za chwilÄ.';
    setView('error'); setStatus('BÅÄD', 'error');
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
    $('#score-value').textContent = Number.isFinite(Number(data.score)) ? Math.max(0, Math.min(100, Number(data.score))) : 'â';
    $('#signal-rationale').textContent = data.rationale || 'Brak wystarczajÄcego uzasadnienia.';
    const riskLabels = {NISKIE:'Niskie',UMIARKOWANE:'Umiarkowane',WYSOKIE:'Wysokie',NIEZNANE:'Nieznane'};
    $('#risk-value').textContent = riskLabels[data.risk] || 'Nieznane';
    $('#risk-reason').textContent = data.risk_reason || 'Nie podano uzasadnienia oceny ryzyka.';
    $('#entry-value').textContent = data.entry || 'Nie da siÄ okreÅliÄ';
    $('#sl-value').textContent = data.stop_loss || 'Nie da siÄ okreÅliÄ';
    $('#tp1-value').textContent = data.take_profit_1 || 'Nie da siÄ okreÅliÄ';
    $('#tp2-value').textContent = data.take_profit_2 || 'Nie da siÄ okreÅliÄ';
    $('#rr-value').textContent = data.reward_risk || 'Nie da siÄ wiarygodnie okreÅliÄ';
    $('#invalidation-value').textContent = data.invalidation || 'Nie podano warunkÃ³w uniewaÅ¼nienia.';
    $('#analysis-body').innerHTML = renderMarkdown(data.analysis || 'Brak szczegÃ³Åowej analizy.');
    setView('content'); setStatus('ANALIZA GOTOWA');
  }
  async function analyze() {
    const file = lastFile || fileInput.files?.[0];
    if (!file) { showError('Najpierw dodaj zdjÄcie wykresu.'); $('#chart-file').focus(); return; }
    const data = new FormData(form);
    data.set('chart', file);
    analyzeButton.disabled = true;
    setView('loading'); setStatus('ANALIZUJÄ', 'busy');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 100000);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: data, signal: controller.signal });
      let payload;
      try { payload = await response.json(); } catch { throw new Error('Serwer zwrÃ³ciÅ nieprawidÅowÄ odpowiedÅº.'); }
      if (!response.ok) throw new Error(payload.error || `BÅÄd serwera (${response.status}).`);
      // Compatibility fallback if an older server returns only { analysis: "..." }.
      if (!payload.signal && payload.analysis) {
        payload = { signal:'WAIT', score:0, risk:'NIEZNANE', risk_reason:'Starsza wersja API nie zwrÃ³ciÅa struktury oceny.', entry:'Nie da siÄ wiarygodnie okreÅliÄ', stop_loss:'Nie da siÄ wiarygodnie okreÅliÄ', take_profit_1:'Nie da siÄ wiarygodnie okreÅliÄ', take_profit_2:'Nie da siÄ wiarygodnie okreÅliÄ', reward_risk:'Nie da siÄ wiarygodnie okreÅliÄ', rationale:'PoniÅ¼ej znajduje siÄ opis z API. Zaktualizuj server.js, aby wÅÄczyÄ kartÄ sygnaÅu.', invalidation:'Brak danych strukturalnych.', analysis:payload.analysis };
      }
      renderResult(payload);
    } catch (error) {
      showError(error.name === 'AbortError' ? 'Analiza trwaÅa zbyt dÅugo i zostaÅa przerwana. SprÃ³buj ponownie z mniejszym, czytelniejszym obrazem.' : error.message || 'Nie udaÅo siÄ poÅÄczyÄ z serwerem.');
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
    if (button.dataset.answer === 'b') { button.classList.add('correct'); $('#quiz-feedback').textContent = 'DokÅadnie. To ocena jakoÅci przesÅanek na obrazie, nie prawdopodobieÅstwo zysku.'; }
    else { button.classList.add('incorrect'); $('#quiz-feedback').textContent = 'Nie tym razem. Wynik nie przewiduje zysku â opisuje jakoÅÄ dostÄpnych przesÅanek.'; }
  }));
  $('#quiz-reset').addEventListener('click', () => { document.querySelectorAll('.quiz-options button').forEach(b => b.classList.remove('correct','incorrect')); $('#quiz-feedback').textContent = ''; });
  setView('empty');
})();
