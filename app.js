const form = document.querySelector('#analysis-form');
const fileInput = document.querySelector('#chart-file');
const dropzone = document.querySelector('#dropzone');
const preview = document.querySelector('#image-preview');
const emptyState = document.querySelector('#result-empty');
const loadingState = document.querySelector('#result-loading');
const resultContent = document.querySelector('#result-content');
const errorBox = document.querySelector('#result-error');
const status = document.querySelector('#result-status');
const submitButton = form.querySelector('button[type="submit"]');
const resetButton = document.querySelector('#reset-button');
let previewUrl = null;

function setFile(file) {
  if (!file) return;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { showError('Wybierz plik PNG, JPG lub WEBP.'); fileInput.value=''; return; }
  if (file.size > 8 * 1024 * 1024) { showError('Plik jest za duży. Maksymalny rozmiar to 8 MB.'); fileInput.value=''; return; }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.hidden = false;
  dropzone.querySelectorAll('strong,span:not(.upload-symbol),small').forEach(el => el.hidden = true);
  dropzone.querySelector('.upload-symbol').hidden = true;
  dropzone.style.padding = '12px';
  dropzone.style.minHeight = '160px';
  hideError();
}
fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
['dragenter','dragover'].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave','drop'].forEach(name => dropzone.addEventListener(name, e => { e.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', e => { const file = e.dataTransfer.files[0]; if (!file) return; const dt = new DataTransfer(); dt.items.add(file); fileInput.files = dt.files; setFile(file); });

function showError(message) {
  emptyState.hidden = true; loadingState.hidden = true; resultContent.hidden = true;
  errorBox.textContent = message; errorBox.hidden = false; status.textContent = 'BŁĄD'; status.style.color = '#ffc1d0';
}
function hideError() { errorBox.hidden = true; status.textContent = 'GOTOWE'; status.style.color = ''; }
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderMarkdown(text) {
  // Minimal safe Markdown renderer; all raw text is escaped before formatting.
  const escaped = escapeHtml(text.replace(/\r/g,''));
  const blocks = escaped.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    if (lines.every(line => /^\s*[-*]\s+/.test(line))) return '<ul>' + lines.map(line => '<li>' + inline(line.replace(/^\s*[-*]\s+/,'')) + '</li>').join('') + '</ul>';
    return lines.map(line => {
      const heading = line.match(/^\s*(#{1,3})\s+(.+)/);
      if (heading) return `<h3>${inline(heading[2])}</h3>`;
      const numbered = line.match(/^\s*\d+[.)]\s+(.+)/);
      if (numbered) return `<p><strong>${inline(numbered[0].split(/\s+/)[0])}</strong> ${inline(numbered[1])}</p>`;
      return line.trim() ? `<p>${inline(line)}</p>` : '';
    }).join('');
  });
  return blocks.join('');
}
function inline(s) { return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>'); }

form.addEventListener('submit', async e => {
  e.preventDefault(); hideError();
  if (!fileInput.files[0]) { showError('Najpierw dodaj zdjęcie wykresu.'); return; }
  const data = new FormData(form);
  emptyState.hidden = true; resultContent.hidden = true; errorBox.hidden = true; loadingState.hidden = false;
  status.textContent = 'ANALIZA…'; submitButton.disabled = true; submitButton.querySelector('.button-label').textContent = 'Analizuję wykres…';
  try {
    const response = await fetch('/api/analyze', { method: 'POST', body: data });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Nie udało się przeanalizować wykresu.');
    resultContent.innerHTML = renderMarkdown(payload.analysis || 'Brak odpowiedzi. Spróbuj ponownie.');
    loadingState.hidden = true; resultContent.hidden = false; status.textContent = 'GOTOWE';
  } catch (err) {
    showError(err.message || 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.');
  } finally {
    submitButton.disabled = false; submitButton.querySelector('.button-label').textContent = 'Przeanalizuj wykres z AI';
  }
});
resetButton.addEventListener('click', () => {
  form.reset();
  if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
  preview.src = ''; preview.hidden = true;
  dropzone.querySelectorAll('strong,span:not(.upload-symbol),small').forEach(el => el.hidden = false);
  dropzone.querySelector('.upload-symbol').hidden = false; dropzone.style.padding = ''; dropzone.style.minHeight = '';
  resultContent.hidden = true; errorBox.hidden = true; loadingState.hidden = true; emptyState.hidden = false; status.textContent = 'GOTOWE';
  document.querySelector('#analyzer').scrollIntoView({behavior:'smooth'});
});


// Interactive educational mini-quiz: no backend or API usage required.
const quizCard = document.querySelector('#quiz-card');
if (quizCard) {
  const quizOptions = [...quizCard.querySelectorAll('.quiz-options button')];
  const quizFeedback = quizCard.querySelector('#quiz-feedback');
  const quizReset = quizCard.querySelector('#quiz-reset');
  quizOptions.forEach(option => option.addEventListener('click', () => {
    quizOptions.forEach(button => { button.disabled = true; });
    const correct = option.dataset.correct === 'true';
    option.classList.add(correct ? 'correct' : 'incorrect');
    quizOptions.find(button => button.dataset.correct === 'true')?.classList.add('correct');
    quizFeedback.textContent = correct
      ? 'Dokładnie. Powrót ceny poniżej oporu może oznaczać fałszywe wybicie. To nie przesądza o dalszym ruchu — szukaj potwierdzenia i rozważ alternatywne scenariusze.'
      : 'Nie całkiem. Samo wybicie ani powrót pod poziom nie gwarantują kierunku. Powrót pod opór może oznaczać fałszywe wybicie, dlatego warto poczekać na dodatkowe potwierdzenie.';
    quizFeedback.hidden = false;
    quizReset.hidden = false;
  }));
  quizReset.addEventListener('click', () => {
    quizOptions.forEach(button => { button.disabled = false; button.classList.remove('correct', 'incorrect'); });
    quizFeedback.hidden = true;
    quizReset.hidden = true;
  });
}
