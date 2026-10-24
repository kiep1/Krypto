(() => {
  const root = document.querySelector('#lesson-catalog');
  if (!root) return;
  const esc = (value) => String(value || '');
  async function load() {
    try {
      const response = await fetch('/api/lessons', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('The lesson library is not available right now.');
      const { lessons } = await response.json();
      root.replaceChildren();
      const grid = document.createElement('div');
      grid.className = 'card-grid lesson-grid';
      lessons.forEach((lesson) => {
        const link = document.createElement('a');
        link.className = `content-card lesson-card ${lesson.access === 'premium' ? 'premium-lesson-card' : ''}`;
        link.href = `/lessons/${encodeURIComponent(lesson.slug)}`;
        const label = document.createElement('span');
        label.textContent = `LESSON ${String(lesson.number).padStart(2, '0')} · ${lesson.access === 'premium' ? 'PREMIUM' : 'FREE'}`;
        const title = document.createElement('strong');
        title.textContent = esc(lesson.title);
        const description = document.createElement('small');
        description.textContent = esc(lesson.summary);
        link.append(label, title, description);
        grid.append(link);
      });
      root.append(grid);
    } catch (error) {
      const message = document.createElement('p');
      message.textContent = error.message;
      root.replaceChildren(message);
    }
  }
  load();
})();
