'use strict';
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
let isAnalyzing = false;
function setFile(file) {
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    showError('Wybierz plik PNG, JPG lub WEBP.');
    fileInput.value = '';
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showError('Plik jest za duży. Maksymalny rozmiar to 8 MB.');
    fileInput.value = '';
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.hidden = false;
  dropzone.querySelectorAll('strong, span:not(.upload-symbol), small')
    .forEach(el => el.hidden = true);
  dropzone.querySelector('.upload-symbol').hidden = true;
  dropzone.style.padding = '12px';
  dropzone.style.minHeight = '160px';
  hideError();
}
fileInput.addEventListener('change', () => {
  setFile(fileInput.files[0]);
});
['dragenter', 'dragover'].forEach(name => {
  dropzone.addEventListener(name, event => {
    event.preventDefault();
    dropzone.classList.add('dragging');
  });
});
['dragleave', 'drop'].forEach(name => {
  dropzone.addEventListener(name, event => {
    event.preventDefault();
    dropzone.classList.remove('dragging');
  });
});
dropzone.addEventListener('drop', event => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  setFile(file);
});
function showError(message) {
  loadingState.hidden = true;
  loadingState.style.display = 'none';
  emptyState.hidden = true;
  resultContent.hidden = true;
  resultContent.style.display = 'none';
  errorBox.textContent = message;
  errorBox.hidden = false;
  errorBox.style.display = 'block';
  status.textContent = 'BŁĄD';
  status.style.color = '#ffc1d0';
}
function hideError() {
  errorBox.hidden = true;
  errorBox.style.display = 'none';
  status.textContent = 'GOTOWE';
  status.style.color = '';
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}
function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}
function renderMarkdown(text) {
  const escaped = escapeHtml(String(text).replace(/\r/g, ''));
  return escaped
    .split(/\n\s*\n/)
    .map(block => {
      const lines = block.split('\n');
      if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
        return '<ul>' + lines.map(line =>
          '<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>'
        ).join('') + '</ul>';
      }
      return lines.map(line => {
        const heading = line.match(/^\s*#{1,3}\s+(.+)/);
        if (heading) {
          return `<h3>${inline(heading[1])}</h3>`;
        }
        const numbered = line.match(/^\s*\d+[.)]\s+(.+)/);
        if (numbered) {
          const number = numbered[0].split(/\s+/)[0];
          return `<p><strong>${inline(number)}</strong> ${inline(numbered[1])}</p>`;
        }
        return line.trim() ? `<p>${inline(line)}</p>` : '';
      }).join('');
    })
    .join('');
}
function finishLoading() {
  loadingState.hidden = true;
  loadingState.style.display = 'none';
  submitButton.disabled = false;
  submitButton.removeAttribute('aria-busy');
  const label = submitButton.querySelector('.button-label');
  if (label) label.textContent = 'Przeanalizuj wykres z AI';
  isAnalyzing = false;
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (isAnalyzing) return;
  if (!fileInput.files[0]) {
    showError('Najpierw dodaj zdjęcie wykresu.');
    return;
  }
  isAnalyzing = true;
  hideError();
  const buttonLabel = submitButton.querySelector('.button-label');
  const data = new FormData(form);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  emptyState.hidden = true;
  emptyState.style.display = 'none';
  resultContent.hidden = true;
  resultContent.style.display = 'none';
  errorBox.hidden = true;
  errorBox.style.display = 'none';
  loadingState.hidden = false;
  loadingState.style.removeProperty('display');
  status.textContent = 'ANALIZA…';
  submitButton.disabled = true;
  submitButton.setAttribute('aria-busy', 'true');
  if (buttonLabel) buttonLabel.textContent = 'Analizuję wykres…';
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: data,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        payload.error || `Błąd serwera (${response.status}).`
      );
    }
    if (typeof payload.analysis !== 'string' || !payload.analysis.trim()) {
      throw new Error('AI zwróciła pustą odpowiedź. Spróbuj ponownie.');
    }
    resultContent.innerHTML = renderMarkdown(payload.analysis);
    // Najpierw pokaż wynik, potem bezwarunkowo ukryj loader.
    resultContent.hidden = false;
    resultContent.style.removeProperty('display');
    loadingState.hidden = true;
    loadingState.style.display = 'none';
    emptyState.hidden = true;
    emptyState.style.display = 'none';
    status.textContent = 'GOTOWE';
    status.style.color = '';
    requestAnimationFrame(() => {
      resultContent.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      showError('Analiza trwa zbyt długo. Spróbuj ponownie.');
    } else {
      showError(
        error.message || 'Nie udało się połączyć z serwerem. Spróbuj ponownie.'
      );
    }
  } finally {
    clearTimeout(timeout);
    finishLoading();
  }
});
resetButton.addEventListener('click', () => {
  if (isAnalyzing) return;
  form.reset();
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  preview.src = '';
  preview.hidden = true;
  dropzone.querySelectorAll('strong, span:not(.upload-symbol), small')
    .forEach(element => element.hidden = false);
  dropzone.querySelector('.upload-symbol').hidden = false;
  dropzone.style.padding = '';
  dropzone.style.minHeight = '';
  resultContent.hidden = true;
  resultContent.style.removeProperty('display');
  errorBox.hidden = true;
  errorBox.style.display = 'none';
  loadingState.hidden = true;
  loadingState.style.display = 'none';
  emptyState.hidden = false;
  emptyState.style.removeProperty('display');
  status.textContent = 'GOTOWE';
  status.style.color = '';
  document.querySelector('#analyzer').scrollIntoView({
    behavior: 'smooth'
  });
});
// Interaktywny mini-quiz edukacyjny.
const quizCard = document.querySelector('#quiz-card');
if (quizCard) {
  const quizOptions = [
    ...quizCard.querySelectorAll('.quiz-options button')
  ];
  const quizFeedback = quizCard.querySelector('#quiz-feedback');
  const quizReset = quizCard.querySelector('#quiz-reset');
  quizOptions.forEach(option => {
    option.addEventListener('click', () => {
      quizOptions.forEach(button => {
        button.disabled = true;
      });
      const correct = option.dataset.correct === 'true';
      option.classList.add(correct ? 'correct' : 'incorrect');
      const correctOption = quizOptions.find(
        button => button.dataset.correct === 'true'
      );
      if (correctOption) correctOption.classList.add('correct');
      quizFeedback.textContent = correct
        ? 'Dokładnie! Powrót ceny poniżej oporu może oznaczać fałszywe wybicie. Warto szukać potwierdzenia i rozważyć alternatywne scenariusze.'
        : 'Nie całkiem. Samo wybicie ani powrót pod poziom nie gwarantują kierunku. Warto poczekać na dodatkowe potwierdzenie.';
      quizFeedback.hidden = false;
      quizReset.hidden = false;
    });
  });
  quizReset.addEventListener('click', () => {
    quizOptions.forEach(button => {
      button.disabled = false;
      button.classList.remove('correct', 'incorrect');
    });
    quizFeedback.hidden = true;
    quizReset.hidden = true;
  });
}
