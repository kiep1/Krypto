(() => {
  const statusBox = document.querySelector('#membership-status');
  const nav = document.querySelector('.topbar nav');
  const addLink = (label, href) => {
    if (!nav || [...nav.querySelectorAll('a')].some((link) => link.getAttribute('href') === href)) return;
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    link.className = 'member-nav-link';
    nav.append(link);
  };
  async function loadMembership() {
    try {
      const response = await fetch('/api/me', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      const state = await response.json();
      document.querySelectorAll('[data-premium-availability]').forEach((availability) => {
        availability.textContent = state.paymentsEnabled
          ? 'Premium checkout is available. Sign in to start your trial.'
          : 'Premium checkout is temporarily unavailable while account and payment setup is completed.';
      });
      addLink(state.authenticated ? 'Account' : 'Sign in', '/account');
      if (state.authenticated) addLink('Saved analyses', '/journal');
      if (!statusBox) return;
      statusBox.textContent = '';
      if (!state.enabled) {
        statusBox.textContent = 'Accounts and saved analyses are temporarily unavailable while setup is completed.';
        statusBox.hidden = false;
      } else if (!state.authenticated) {
        statusBox.textContent = 'Sign in with Google to use your daily analysis allowance and choose which reports to save.';
        statusBox.hidden = false;
      } else {
        const plan = state.user?.premium ? 'Premium' : 'Free';
        const usage = state.usage?.analyses;
        statusBox.textContent = usage ? `${plan} plan · ${usage.remaining} of ${usage.limit} chart analyses left today. The limit resets at 00:00 UTC.` : `${plan} plan`;
        statusBox.hidden = false;
      }
    } catch {
      if (statusBox) {
        statusBox.textContent = 'Account status is temporarily unavailable.';
        statusBox.hidden = false;
      }
    }
  }
  window.addEventListener('membership:refresh', loadMembership);
  loadMembership();
})();
