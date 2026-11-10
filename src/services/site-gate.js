const SESSION_KEY = 'fidelat.siteAccess';

function toBytes(hex) {
  return Uint8Array.from(hex.match(/../g) || [], (byte) => parseInt(byte, 16));
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function deriveCredentialHash(username, password, { salt, iterations }) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${username.trim().toLowerCase()}\n${password}`),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toBytes(salt), iterations },
    key,
    256
  );
  return toHex(bits);
}

async function loadConfig(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const config = await response.json();
    return config?.hash && config?.salt && config?.iterations ? config : null;
  } catch {
    return null;
  }
}

function showLoginForm(config) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'site-gate';
    overlay.innerHTML = `
      <div class='site-gate-letters' aria-hidden='true'><span>ሀ</span><span>በ</span><span>ሰ</span><span>ቀ</span><span>መ</span></div>
      <form class='site-gate-form' autocomplete='on'>
        <h1>Eritrean Mother Language and Culture Bern<small>ፊደላት · Fidelat</small></h1>
        <p>Welcome! Please log in to start learning. 🌟</p>
        <label>Username <input name='username' autocomplete='username' required autofocus></label>
        <label>Password <input name='password' type='password' autocomplete='current-password' required></label>
        <p class='site-gate-error' role='alert' hidden>Oops! Check your username and password and try again.</p>
        <button type='submit'>Let's go! 🚀</button>
      </form>`;
    document.body.append(overlay);
    const form = overlay.querySelector('form');
    const error = overlay.querySelector('.site-gate-error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const hash = await deriveCredentialHash(data.get('username'), data.get('password'), config);
      if (hash === config.hash) {
        localStorage.setItem(SESSION_KEY, config.hash);
        overlay.remove();
        resolve();
      } else {
        error.hidden = false;
      }
    });
  });
}

export function logoutSite() {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

// Resolves once access is granted. With no auth-config.json (local dev) the gate is open.
export async function requireSiteLogin(configUrl) {
  const config = await loadConfig(configUrl);
  if (!config) return false;
  if (localStorage.getItem(SESSION_KEY) !== config.hash) {
    await showLoginForm(config);
  }
  return true;
}
