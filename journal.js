(() => {
  const list = document.querySelector('#journal-list');
  const status = document.querySelector('#journal-status');
  if (!list) return;
  async function load() {
    try {
      const response = await fetch('/api/journal', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (response.status === 401) { status.textContent = 'Sign in with Google to open your private journal.'; return; }
      if (!response.ok) throw new Error(payload.error || 'Could not load your journal.');
      list.replaceChildren();
      status.textContent = payload.analyses.length ? `${payload.analyses.length} saved analysis${payload.analyses.length === 1 ? '' : 'es'}.` : 'No saved analyses yet. Your signed-in chart analyses will appear here.';
      payload.analyses.forEach((item) => {
        const card = document.createElement('article'); card.className = 'journal-card panel';
        const heading = document.createElement('h2'); heading.textContent = item.instrument || 'Chart analysis';
        const date = document.createElement('p'); date.className = 'journal-date'; date.textContent = new Date(item.created_at).toLocaleString();
        const chart = document.createElement('img'); chart.src = `/api/journal/${encodeURIComponent(item.id)}/chart`; chart.alt = `Saved chart for ${item.instrument || 'analysis'}`; chart.loading = 'lazy';
        const details = document.createElement('details');
        const summary = document.createElement('summary'); summary.textContent = `${item.result?.signal || 'Analysis'} report · ${item.timeframe || 'Timeframe not recorded'}`;
        const report = document.createElement('div'); report.className = 'journal-report prose';
        const explain = document.createElement('p'); explain.textContent = item.result?.analysis || 'No detailed analysis was saved.';
        const rationale = document.createElement('p'); rationale.textContent = item.result?.rationale ? `Rationale: ${item.result.rationale}` : '';
        report.append(explain, rationale); details.append(summary, report);
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'button danger'; remove.textContent = 'Delete saved analysis';
        remove.addEventListener('click', async () => {
          if (!window.confirm('Delete this saved chart and its analysis report?')) return;
          remove.disabled = true;
          try {
            const deletion = await fetch(`/api/journal/${encodeURIComponent(item.id)}`, { method: 'DELETE', credentials: 'same-origin', headers: { Accept: 'application/json' } });
            const result = await deletion.json();
            if (!deletion.ok) throw new Error(result.error || 'Could not delete the saved analysis.');
            card.remove();
            status.textContent = 'Saved analysis deleted.';
          } catch (error) { remove.disabled = false; status.textContent = error.message; }
        });
        card.append(heading, date, chart, details, remove); list.append(card);
      });
    } catch (error) { status.textContent = error.message; }
  }
  load();
})();
