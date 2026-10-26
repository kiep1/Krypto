(() => {
  const panel = document.querySelector('#account-panel');
  const message = document.querySelector('#account-message');
  if (!panel) return;
  const button = (label, action, className = 'button secondary') => {
    const item = document.createElement('button');
    item.type = 'button'; item.className = className; item.textContent = label; item.addEventListener('click', action); return item;
  };
  const setMessage = (value) => { message.textContent = value || ''; };
  async function post(url, method = 'POST') {
    const response = await fetch(url, { method, credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
    return payload;
  }
  async function openCheckout() {
    try { const payload = await post('/api/billing/checkout-link'); window.location.assign(payload.url); }
    catch (error) { setMessage(error.message); }
  }
  async function openPortal() {
    try { const payload = await post('/api/billing/portal'); window.location.assign(payload.url); }
    catch (error) { setMessage(error.message); }
  }
  async function logout() {
    try { await post('/api/auth/logout'); window.location.reload(); }
    catch (error) { setMessage(error.message); }
  }
  async function deleteAccount() {
    if (!window.confirm('Delete your account, saved chart images, and analysis reports? An active Premium subscription will be cancelled. This cannot be undone.')) return;
    try { await post('/api/account', 'DELETE'); window.location.assign('/'); }
    catch (error) { setMessage(error.message); }
  }
  function addUsage(container, label, value) {
    const row = document.createElement('p');
    row.className = 'account-usage';
    row.textContent = `${label}: ${Math.max(0, value.limit - value.used)} of ${value.limit} remaining today (UTC).`;
    container.append(row);
  }
  async function load() {
    try {
      const response = await fetch('/api/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const state = await response.json();
      panel.replaceChildren();
      if (!state.enabled) {
        const heading = document.createElement('h2'); heading.textContent = 'Membership setup is in progress';
        const text = document.createElement('p'); text.textContent = 'Accounts, saved charts, and Premium access will be available after the secure database and sign-in setup is complete.';
        panel.append(heading, text); return;
      }
      if (!state.authenticated) {
        const heading = document.createElement('h2'); heading.textContent = 'Sign in to ChartMentor AI';
        const text = document.createElement('p'); text.textContent = 'Google sign-in lets you save your chart screenshots and analysis reports to a private journal.';
        const link = document.createElement('a'); link.className = 'button primary'; link.href = '/auth/google'; link.textContent = 'Continue with Google';
        panel.append(heading, text, link);
        if (new URLSearchParams(location.search).has('login')) setMessage('Google sign-in did not complete. Please try again.');
        return;
      }
      const heading = document.createElement('h2'); heading.textContent = `Welcome, ${state.user.name || state.user.email}`;
      const email = document.createElement('p'); email.textContent = state.user.email;
      const plan = document.createElement('p'); plan.className = 'membership-plan'; plan.textContent = state.user.premium ? 'Premium membership is active.' : 'You are on the Free plan.';
      if (state.user.subscriptionStatus === 'trialing' && state.user.trialEndsAt) {
        const trialEnd = new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(state.user.trialEndsAt));
        plan.textContent = `Your 7-day Premium trial is active until ${trialEnd} (UTC). Unless you cancel before then, $9.99 USD will be charged and the subscription will renew monthly.`;
      }
      const trialNotice = document.createElement('div'); trialNotice.className = 'callout';
      const trialText = document.createElement('p');
      trialText.textContent = 'Start with 7 days free. A payment method is required. Unless you cancel before the trial ends, Stripe will charge $9.99 USD and renew monthly until cancelled. Cancel from this account before the trial ends to avoid the first charge.';
      trialNotice.append(trialText);
      const usage = document.createElement('div');
      if (state.usage?.analyses) addUsage(usage, 'Chart analyses', state.usage.analyses);
      if (state.usage?.lessonQuestions) addUsage(usage, 'Lesson tutor questions', state.usage.lessonQuestions);
      const actions = document.createElement('div'); actions.className = 'account-actions';
      if (state.user.premium) actions.append(button('Manage or cancel Premium', openPortal));
      else if (state.paymentsEnabled) actions.append(button('Start 7-day free trial', openCheckout, 'button primary'));
      else { const pending = document.createElement('p'); pending.textContent = 'Premium checkout is being configured.'; actions.append(pending); }
      const journalLink = document.createElement('a'); journalLink.className = 'button secondary'; journalLink.href = '/journal'; journalLink.textContent = 'Open saved analyses';
      actions.append(journalLink, button('Sign out', logout), button('Delete account and data', deleteAccount, 'button danger'));
      if (!state.user.premium && state.paymentsEnabled) panel.append(heading, email, plan, trialNotice, usage, actions);
      else panel.append(heading, email, plan, usage, actions);
    } catch {
      panel.textContent = 'Your account could not be loaded. Please refresh the page.';
    }
  }
  load();
})();
