import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { transformWithOxc } from 'vite';

// Execute the real provider with controlled hooks/API/storage, without new test dependencies.
const source = readFileSync(new URL('../src/context/AuthContext.tsx', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source, 'AuthContext.tsx', { jsx: { runtime: 'classic' } });

function setup(api, savedToken = null, storageFails = false) {
  let cursor = 0;
  const slots = [], effects = [], cleanups = [];
  const storage = new Map(savedToken ? [['spendzy_token', savedToken]] : []);
  const sandbox = {
    console: { warn() {} }, authApi: api, socialApi: { exchange: api.exchange },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { if (storageFails) throw new Error('Storage blocked'); storage.set(key, value); },
      removeItem: key => storage.delete(key),
    },
    createContext: () => ({ Provider: 'Provider' }), useContext: () => null,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect) { const index = cursor++; if (!(index in slots)) { slots[index] = true; effects.push(effect); } },
    React: { createElement: (type, props) => ({ type, props }) },
  };
  vm.createContext(sandbox);
  vm.runInContext(code.replace(/^import .*;$/gm, '').replace(/^export /gm, '') + '\nglobalThis.Provider = AuthProvider;', sandbox);
  const render = () => { cursor = 0; return sandbox.Provider({ children: null }).props.value; };
  render();
  for (const effect of effects.splice(0)) cleanups.push(effect());
  return { render, storage, cleanup: () => cleanups.forEach(fn => fn?.()) };
}

const account = { token: 'server-issued-token', user: { id: 7, name: 'New User', email: 'new@example.com' } };

test('signup uses issued token, verifies profile, and stores no password', async () => {
  let calls = 0;
  const app = setup({ signup: async () => { calls++; return account; }, getMe: async () => ({ user: account.user }) });
  await app.render().signup('New User', 'new@example.com', 'secret-password');
  assert.equal(calls, 1);
  assert.equal(app.render().isAuthenticated, true);
  assert.equal(app.render().loading, false);
  assert.equal(app.render().user.id, 7);
  assert.deepEqual([...app.storage], [['spendzy_token', account.token]]);
});

test('failed signup keeps the session unauthenticated', async () => {
  const app = setup({ signup: async () => { throw new Error('Email already registered'); } });
  await assert.rejects(app.render().signup(), /Email already registered/);
  assert.equal(app.render().isAuthenticated, false);
  assert.equal(app.storage.size, 0);
});

for (const failure of ['profile', 'storage']) {
  test(`account creation followed by ${failure} failure gives login recovery, without another signup`, async () => {
    let calls = 0;
    const app = setup({ signup: async () => { calls++; return account; }, getMe: async () => { throw new Error('Unavailable'); } }, null, failure === 'storage');
    await assert.rejects(app.render().signup(), /account was created.*Please log in/);
    assert.equal(calls, 1);
    assert.equal(app.render().isAuthenticated, false);
    assert.equal(app.render().loading, false);
    assert.equal(app.storage.size, 0);
  });
}

test('refresh restores valid session; logout clears identity and token', async () => {
  const app = setup({ getMe: async () => ({ user: account.user }) }, account.token);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.render().isAuthenticated, true);
  app.render().logout();
  assert.equal(app.render().user, null);
  assert.equal(app.render().token, null);
  assert.equal(app.storage.size, 0);
});

test('invalid or expired stored session is removed', async () => {
  const app = setup({ getMe: async () => { throw new Error('401'); } }, 'expired');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.render().isAuthenticated, false);
  assert.equal(app.render().loading, false);
  assert.equal(app.storage.size, 0);
});

test('late profile response cannot restore a logged-out account', async () => {
  let resolveProfile;
  const app = setup({ getMe: () => new Promise(resolve => { resolveProfile = resolve; }) }, account.token);
  app.render().logout();
  resolveProfile({ user: account.user });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.render().user, null);
  assert.equal(app.render().isAuthenticated, false);
});

test('returning users log in with the existing endpoint', async () => {
  const app = setup({ login: async () => account, getMe: async () => ({ user: account.user }) });
  await app.render().login('new@example.com', 'password');
  assert.equal(app.render().isAuthenticated, true);
});

test('social handoff uses the existing verified session and returns account flags', async () => {
  let exchanges = 0;
  const app = setup({ exchange: async (code, verifier) => {
    assert.equal(code, 'one-use-code'); assert.equal(verifier, 'browser-proof'); exchanges++;
    return { ...account, new_account: true, linked: false };
  }, getMe: async () => ({ user: account.user }) });
  const result = await app.render().completeSocialLogin('one-use-code', 'browser-proof');
  assert.equal(result.new_account, true);
  assert.equal(exchanges, 1);
  assert.equal(app.render().isAuthenticated, true);
});

const registerSource = readFileSync(new URL('../src/pages/RegisterPage.tsx', import.meta.url), 'utf8');
const registerCode = (await transformWithOxc(registerSource, 'RegisterPage.tsx', { jsx: { runtime: 'classic' } })).code;

function registration(signupFails = false) {
  let cursor = 0;
  const states = [], effects = [], navigations = [];
  const auth = { loading: false, isAuthenticated: false, user: null,
    async signup() {
      if (signupFails) throw new Error('Email already registered');
      auth.isAuthenticated = true;
      auth.user = account.user;
      return account;
    } };
  const context = { TextEncoder, useAuth: () => auth, useNavigate: () => (...args) => navigations.push(args),
    useRef(initial) { const index = cursor++; return states[index] ??= { current: initial }; },
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useEffect: effect => effects.push(effect),
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    ApiError: class extends Error {},
  };
  for (const name of ['Link', 'AlertCircle', 'ArrowLeft', 'AtSignIcon', 'CheckCircle2', 'Eye', 'EyeOff', 'LockIcon', 'UserIcon', 'Wallet', 'Button', 'Input', 'SocialLoginButtons']) context[name] = name;
  vm.createContext(context);
  vm.runInContext(registerCode.replace(/^import[\s\S]*?from ["'][^"']+["'];/gm, '')
    .replace('export default function RegisterPage', 'function RegisterPage') + '\nglobalThis.Page = RegisterPage;', context);
  function render() { cursor = 0; const tree = context.Page(); for (const effect of effects.splice(0)) effect(); return tree; }
  const find = (node, type) => node && typeof node === 'object' && (node.type === type ? node : node.props?.children?.flat(Infinity).map(child => find(child, type)).find(Boolean));
  render();
  states[1] = { name: 'New User', email: 'new@example.com', password: 'password123', confirmPassword: 'password123' };
  return { render, auth, navigations, find, submit: () => find(render(), 'form').props.onSubmit({ preventDefault() {} }) };
}

test('successful registration redirects after session update with welcome state', async () => {
  const page = registration();
  assert.equal(page.navigations.length, 0);
  await page.submit();
  page.render();
  assert.equal(page.navigations[0][0], '/dashboard');
  assert.equal(page.navigations[0][1].replace, true);
  assert.equal(page.navigations[0][1].state.newAccount, true);
});

test('unsuccessful registration stays on the form', async () => {
  const page = registration(true);
  await page.submit();
  page.render();
  assert.equal(page.navigations.length, 0);
});

test('valid returning session skips registration without creating an account', () => {
  const page = registration();
  page.auth.isAuthenticated = true;
  page.render();
  assert.equal(page.navigations[0][0], '/dashboard');
  assert.equal(page.navigations[0][1].state.newAccount, false);
});

test('registration offers Google through the shared flow and blocks email submission during OAuth', async () => {
  const page = registration();
  const social = page.find(page.render(), 'SocialLoginButtons');
  assert.equal(social.props.providersToShow.join(','), 'google');
  assert.equal(social.props.disabled, false);
  social.props.onBusyChange(true);
  assert.equal(page.find(page.render(), 'fieldset').props.disabled, true);
  await page.submit();
  assert.equal(page.auth.isAuthenticated, false);
  assert.equal(page.navigations.length, 0);
  social.props.onBusyChange(false);
  assert.equal(page.find(page.render(), 'fieldset').props.disabled, false);
  await page.submit();
  page.render();
  assert.equal(page.navigations[0][0], '/dashboard');
});
