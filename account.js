(() => {
  const panel = document.querySelector('#account-panel');
  const message = document.querySelector('#account-message');
  if (!panel) return;
  const button = (label, action, className = 'button secondary') => {
    const item = document.createElement('button');
    item.type = 'button'; item.className = className; item.textContent = label; item.addEventListener('click', action); return item;
  };
  const setMessage = (value) => { message.textContent = value || ''; };
  const checkoutRequested = new URLSearchParams(location.search).get('checkout') === '1';
  async function post(url, method = 'POST', data = {}) {
    const response = await fetch(url, { method, credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(data) : undefined });
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
  function createLocalAuth(state) {
    const box = document.createElement('div'); box.className = 'local-auth';
    let mode = 'login';
    let emailValue = '';
    let newsletterOptIn = false;
    let verificationMessage = '';
    const render = () => {
      box.replaceChildren();
      if (mode === 'verify') {
        const heading = document.createElement('h3'); heading.textContent = 'Check your email';
        const description = document.createElement('p');
        description.className = 'account-auth-note';
        description.textContent = verificationMessage || `Your account needs email verification. Check the inbox and spam folder for ${emailValue}. If no message arrived, send a new link below. Verification links expire after 24 hours.`;
        const resend = button('Resend verification email', async () => {
          resend.disabled = true; resend.textContent = 'Sending…';
          try {
            setMessage('Sending a new verification link…');
            const result = await post('/api/auth/local/resend-verification', 'POST', { email: emailValue, next: checkoutRequested ? 'checkout' : '' });
            verificationMessage = `If ${emailValue} has an unverified account, a new link has been sent. Check your inbox and spam folder.`;
            description.textContent = verificationMessage;
            setMessage(result.message);
          } catch (error) { setMessage(error.message); }
          finally { resend.disabled = false; resend.textContent = 'Send a new verification link'; }
        }, 'button secondary');
        const back = button('Back to sign in', () => { mode = 'login'; setMessage(''); render(); });
        box.append(heading, description, resend, back);
        return;
      }
      const heading = document.createElement('h3');
      heading.textContent = mode === 'register' ? 'Create your free account' : mode === 'forgot' ? 'Reset your password' : 'Sign in with email';
      const form = document.createElement('form'); form.className = 'account-auth-form';
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        emailValue = form.elements.email.value.trim();
        const password = form.elements.password?.value || '';
        const submit = form.querySelector('[type="submit"]');
        const originalLabel = submit.textContent;
        submit.disabled = true;
        submit.textContent = mode === 'register' ? 'Creating account…' : mode === 'forgot' ? 'Sending link…' : 'Signing in…';
        try {
          if (mode === 'forgot') {
            const result = await post('/api/auth/local/forgot-password', 'POST', { email: emailValue });
            setMessage(result.message); mode = 'login'; render(); return;
          }
          if (mode === 'register') {
            const result = await post('/api/auth/local/register', 'POST', { email: emailValue, password, newsletterOptIn, next: checkoutRequested ? 'checkout' : '' });
            verificationMessage = result.message.toLowerCase().includes('could not be delivered')
              ? 'We could not send the verification email. Please try sending a new link below after the email service is available.'
              : `We sent a verification link to ${emailValue}. Check your inbox and spam folder. The link expires in 24 hours.`;
            mode = 'verify'; setMessage(result.message); render(); return;
          }
          await post('/api/auth/local/login', 'POST', { email: emailValue, password });
          window.location.reload();
        } catch (error) {
          setMessage(error.message);
          if (error.message.toLowerCase().includes('verify your email')) { verificationMessage = ''; mode = 'verify'; render(); }
        } finally {
          submit.disabled = false; submit.textContent = originalLabel;
        }
      });
      const emailLabel = document.createElement('label'); emailLabel.textContent = 'Email address';
      const email = document.createElement('input'); email.type = 'email'; email.name = 'email'; email.required = true; email.maxLength = 254; email.autocomplete = 'email'; email.placeholder = 'you@example.com'; email.value = emailValue;
      email.addEventListener('input', () => { emailValue = email.value; });
      emailLabel.append(email); form.append(emailLabel);
      if (mode !== 'forgot') {
        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = mode === 'register' ? 'Password (at least 12 characters)' : 'Password';
        const password = document.createElement('input'); password.type = 'password'; password.name = 'password'; password.required = true; password.maxLength = 128; password.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
        if (mode === 'register') password.minLength = 12;
        passwordLabel.append(password); form.append(passwordLabel);
      }
      if (mode === 'register') {
        const consent = document.createElement('label'); consent.className = 'newsletter-consent';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.name = 'newsletterOptIn'; checkbox.checked = newsletterOptIn;
        checkbox.addEventListener('change', () => { newsletterOptIn = checkbox.checked; });
        const consentText = document.createElement('span'); consentText.textContent = 'Send me occasional CandleTutor learning tips and product updates. Optional; unsubscribe anytime.';
        consent.append(checkbox, consentText); form.append(consent);
        const privacy = document.createElement('p'); privacy.className = 'account-auth-note'; privacy.innerHTML = 'Your email is used for account verification. Newsletter emails are sent only if you opt in. <a href="/privacy">Privacy details</a>.';
        form.append(privacy);
      }
      const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'button primary';
      submit.textContent = mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in';
      form.append(submit); box.append(heading, form);
      const links = document.createElement('div'); links.className = 'account-auth-links';
      if (mode === 'login' && state.emailRegistrationEnabled) {
        links.append(button('Create a new account', () => { mode = 'register'; setMessage(''); render(); }));
        links.append(button('Forgot password?', () => { mode = 'forgot'; setMessage(''); render(); }));
      } else if (mode === 'register' || mode === 'forgot') {
        links.append(button('Back to sign in', () => { mode = 'login'; setMessage(''); render(); }));
      }
      box.append(links);
      if (!state.emailRegistrationEnabled && mode === 'login') {
        const note = document.createElement('p'); note.className = 'account-auth-note';
        note.textContent = 'Email sign-up and password recovery are being configured. Google sign-in is available in the meantime.';
        box.append(note);
      }
    };
    render();
    return box;
  }
  function createNewsletterSettings(state) {
    const section = document.createElement('section'); section.className = 'newsletter-settings';
    const heading = document.createElement('h3'); heading.textContent = 'Newsletter preferences';
    const description = document.createElement('p'); description.className = 'account-auth-note';
    description.textContent = 'Choose whether to receive occasional CandleTutor learning tips and product updates. This is optional and you can change it any time.';
    const form = document.createElement('form'); form.className = 'account-auth-form';
    const label = document.createElement('label'); label.className = 'newsletter-consent';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = Boolean(state.user.newsletterOptIn);
    const labelText = document.createElement('span'); labelText.textContent = 'Email me occasional CandleTutor updates.';
    label.append(checkbox, labelText);
    const save = document.createElement('button'); save.type = 'submit'; save.className = 'button secondary'; save.textContent = 'Save preference';
    form.append(label, save);
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); save.disabled = true; save.textContent = 'Saving…';
      try {
        const result = await post('/api/account/newsletter', 'POST', { optIn: checkbox.checked });
        checkbox.checked = result.newsletterOptIn;
        setMessage('Your newsletter preference has been saved.');
      } catch (error) { setMessage(error.message); }
      finally { save.disabled = false; save.textContent = 'Save preference'; }
    });
    section.append(heading, description, form);
    return section;
  }
  function createResetForm(token) {
    const form = document.createElement('form'); form.className = 'account-auth-form';
    const heading = document.createElement('h2'); heading.textContent = 'Choose a new password';
    const label = document.createElement('label'); label.textContent = 'New password (12 characters minimum)';
    const password = document.createElement('input'); password.type = 'password'; password.name = 'password'; password.required = true; password.minLength = 12; password.maxLength = 128; password.autocomplete = 'new-password'; label.append(password);
    const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'button primary'; submit.textContent = 'Save new password';
    form.append(label, submit);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await post('/api/auth/local/reset-password', 'POST', { token, password: password.value });
        window.location.replace(checkoutRequested ? '/account?checkout=1' : '/account');
      } catch (error) { setMessage(error.message); }
    });
    panel.replaceChildren(heading, form);
  }
  function createVerificationView(token) {
    const heading = document.createElement('h2'); heading.textContent = 'Verify your email address';
    const text = document.createElement('p'); text.textContent = 'Confirm this email address to activate your CandleTutor account.';
    const verify = button('Verify email', async () => {
      verify.disabled = true;
      try {
        await post('/api/auth/local/verify', 'POST', { token });
        if (checkoutRequested) window.location.replace('/account?checkout=1');
        else window.location.replace('/account?verified=1');
      } catch (error) { setMessage(error.message); verify.disabled = false; }
    }, 'button primary');
    panel.replaceChildren(heading, text, verify);
  }
  async function load() {
    try {
      const query = new URLSearchParams(location.search);
      const verificationToken = query.get('verify');
      if (verificationToken) {
        createVerificationView(verificationToken); return;
      }
      if (query.has('reset')) { createResetForm(query.get('reset')); return; }
      const response = await fetch('/api/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      const state = await response.json();
      panel.replaceChildren();
      if (query.has('verified')) setMessage('Email verified. Your account is ready.');
      if (!state.enabled) {
        const heading = document.createElement('h2'); heading.textContent = 'Membership setup is in progress';
        const text = document.createElement('p'); text.textContent = 'Accounts, saved charts, and Premium access will be available after the secure database and sign-in setup is complete.';
        panel.append(heading, text); return;
      }
      if (!state.authenticated) {
        const heading = document.createElement('h2'); heading.textContent = checkoutRequested ? 'Sign in to continue to Premium' : 'Sign in to CandleTutor';
        const text = document.createElement('p'); text.textContent = checkoutRequested ? 'Sign in or create an account. After verification, you will continue to secure Stripe checkout.' : 'Sign in to manage your plan, daily analysis allowance, and saved chart reports.';
        panel.append(heading, text);
        if (state.googleEnabled) {
          const link = document.createElement('a'); link.className = 'button primary'; link.href = checkoutRequested ? '/auth/google?next=checkout' : '/auth/google'; link.textContent = checkoutRequested ? 'Continue with Google' : 'Continue with Google';
          panel.append(link);
        }
        if (state.googleEnabled) { const divider = document.createElement('p'); divider.className = 'auth-divider'; divider.textContent = 'or'; panel.append(divider); }
        panel.append(createLocalAuth(state));
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
      else if (state.paymentsEnabled) {
        actions.append(button('Get Premium — start free trial', openCheckout, 'button primary'));
        if (checkoutRequested) {
          window.history.replaceState({}, '', '/account');
          openCheckout();
        }
      }
      else { const pending = document.createElement('p'); pending.textContent = 'Premium checkout is being configured.'; actions.append(pending); }
      const journalLink = document.createElement('a'); journalLink.className = 'button secondary'; journalLink.href = '/journal'; journalLink.textContent = 'Open saved analyses';
      actions.append(journalLink, button('Sign out', logout), button('Delete account and data', deleteAccount, 'button danger'));
      const newsletterSettings = createNewsletterSettings(state);
      const passwordDetails = document.createElement('details'); passwordDetails.className = 'local-password-settings';
      const passwordSummary = document.createElement('summary'); passwordSummary.textContent = state.user.localPasswordEnabled ? 'Change local password' : 'Set up email and password sign-in';
      const passwordForm = document.createElement('form'); passwordForm.className = 'account-auth-form';
      if (state.user.localPasswordEnabled) {
        const currentLabel = document.createElement('label'); currentLabel.textContent = 'Current password';
        const currentPassword = document.createElement('input'); currentPassword.type = 'password'; currentPassword.name = 'currentPassword'; currentPassword.required = true; currentPassword.autocomplete = 'current-password'; currentLabel.append(currentPassword); passwordForm.append(currentLabel);
      }
      const newLabel = document.createElement('label'); newLabel.textContent = 'New password (12 characters minimum)';
      const newPassword = document.createElement('input'); newPassword.type = 'password'; newPassword.name = 'newPassword'; newPassword.required = true; newPassword.minLength = 12; newPassword.maxLength = 128; newPassword.autocomplete = 'new-password'; newLabel.append(newPassword);
      const savePassword = document.createElement('button'); savePassword.type = 'submit'; savePassword.className = 'button secondary'; savePassword.textContent = 'Save password'; passwordForm.append(newLabel, savePassword);
      passwordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await post('/api/auth/local/set-password', 'POST', { password: newPassword.value, currentPassword: passwordForm.elements.currentPassword?.value || '' });
          setMessage('Local password saved. You can now sign in with your email and password.');
          load();
        } catch (error) { setMessage(error.message); }
      });
      passwordDetails.append(passwordSummary, passwordForm);
      if (!state.user.premium && state.paymentsEnabled) panel.append(heading, email, plan, trialNotice, usage, actions, newsletterSettings, passwordDetails);
      else panel.append(heading, email, plan, usage, actions, newsletterSettings, passwordDetails);
    } catch {
      panel.textContent = 'Your account could not be loaded. Please refresh the page.';
    }
  }
  load();
})();
