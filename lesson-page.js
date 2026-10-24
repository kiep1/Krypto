(() => {
  const form = document.querySelector('#tutor-form');
  if (!form) return;
  const status = document.querySelector('#tutor-status');
  const answer = document.querySelector('#tutor-answer');
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Preparing an answer…';
    answer.textContent = '';
    button.disabled = true;
    try {
      const response = await fetch('/api/lesson-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ slug: document.body.dataset.lessonSlug, question: document.querySelector('#tutor-question').value })
      });
      const payload = await response.json();
      if (response.status === 401) {
        status.textContent = 'Sign in with Google to ask the lesson tutor.';
        const link = document.createElement('a');
        link.href = '/account';
        link.textContent = ' Sign in';
        status.append(link);
        return;
      }
      if (!response.ok) throw new Error(payload.error || 'The lesson tutor could not answer just now.');
      answer.textContent = payload.answer || 'No answer was returned.';
      status.textContent = `Daily tutor questions used: ${payload.usage.used} of ${payload.usage.limit}.`;
    } catch (error) {
      status.textContent = error.message;
    } finally { button.disabled = false; }
  });
})();
