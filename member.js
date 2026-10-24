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
      addLink(state.authenticated ? 'Account' : 'Sign in', '/account');
      if (state.authenticated) addLink('Saved analyses', '/journal');
      if (!statusBox) return;
      statusBox.textContent = '';
      if (!state.enabled) {
        statusBox.textContent = 'Account, saved-journal, and membership features are being configured.';
        statusBox.hidden = false;
      } else if (!state.authenticated) {
        statusBox.textContent = 'Sign in with Google to save analyses and use your daily chart-analysis allowance.';
        statusBox.hidden = false;
      } else {
        const plan = state.user?.premium ? 'Premium' : 'Free';
        const usage = state.usage?.analyses;
        statusBox.textContent = usage ? `${plan} plan · ${usage.remaining} of ${usage.limit} chart analyses left today (UTC).` : `${plan} plan`;
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
