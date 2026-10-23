import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { transformWithOxc } from 'vite';

const source = readFileSync(new URL('../src/lib/socialAuth.ts', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source, 'socialAuth.ts');
function setup() {
  const stored = new Map();
  const navigations = [], forms = [];
  const context = {
    API_ROOT_URL: 'http://127.0.0.1:8000/api', crypto: webcrypto, TextEncoder, Uint8Array, btoa, URLSearchParams,
    location: { origin: 'http://localhost:5173', hash: '', pathname: '/auth/callback' },
    history: { state: null, replaceState(_s, _t, url) { navigations.push(url); } },
    sessionStorage: { setItem: (k, v) => stored.set(k, v), getItem: k => stored.get(k), removeItem: k => stored.delete(k) },
    localStorage: { getItem: () => 'existing-jwt' },
    window: { location: { assign: url => navigations.push(url) } },
    document: { body: { appendChild() {} }, createElement(type) {
      if (type === 'input') return {};
      const form = { inputs: [], appendChild(input) { this.inputs.push(input); }, submit() { forms.push(this); }, remove() {} };
      return form;
    } },
  };
  vm.createContext(context);
  vm.runInContext(code.replace(/^import .*;$/gm, '').replace(/^export /gm, '')
    + '\nglobalThis.start = startSocialLogin; globalThis.read = readSocialCallback;', context);
  return { context, stored, navigations, forms };
}

test('social navigation stores browser proof in this tab, not in provider URLs', async () => {
  const app = setup();
  await app.context.start('google');
  const pending = JSON.parse(app.stored.get('spendze_oauth_pending'));
  const url = new URL(app.navigations[0]);
  assert.equal(pending.verifier.length, 43);
  assert.equal(url.searchParams.get('challenge').length, 43);
  assert.equal(url.searchParams.get('frontend_origin'), 'http://localhost:5173');
  assert.ok(!url.href.includes(pending.verifier) && !url.href.includes('existing-jwt'));
  app.context.location.hash = '#handoff=short-lived-code';
  assert.equal(app.context.read().verifier, pending.verifier);
  assert.equal(app.stored.size, 0);
  assert.equal(app.navigations.at(-1), '/auth/callback');
  assert.throws(() => app.context.read(), /missing or expired/);
});

test('provider cancellation is meaningful and removed from browser history', async () => {
  const app = setup();
  await app.context.start('github');
  app.context.location.hash = '#error=cancelled';
  assert.throws(() => app.context.read(), /cancelled/);
  assert.equal(app.stored.size, 0);
  assert.equal(app.navigations.at(-1), '/auth/callback');
});

test('explicit linking sends the session token only in a top-level POST body', async () => {
  const app = setup();
  await app.context.start('github', true);
  assert.equal(app.forms.length, 1);
  const form = app.forms[0];
  assert.equal(form.method, 'POST');
  assert.ok(form.action.endsWith('/github/link') && !form.action.includes('jwt'));
  assert.equal(form.inputs.find(i => i.name === 'session_token').value, 'existing-jwt');
  assert.equal(app.navigations.length, 0);
});

test('expired browser proof cannot complete authentication', async () => {
  const app = setup();
  await app.context.start('google');
  const pending = JSON.parse(app.stored.get('spendze_oauth_pending'));
  pending.startedAt = 0;
  app.stored.set('spendze_oauth_pending', JSON.stringify(pending));
  app.context.location.hash = '#handoff=short-lived-code';
  assert.throws(() => app.context.read(), /missing or expired/);
});

test('callback effect replay redeems the handoff once and redirects after session completion', async () => {
  const pageSource = readFileSync(new URL('../src/pages/SocialCallbackPage.tsx', import.meta.url), 'utf8');
  const pageCode = (await transformWithOxc(pageSource, 'SocialCallbackPage.tsx', { jsx: { runtime: 'classic' } })).code;
  const effects = [], navigations = [];
  const completion = { current: null };
  let exchanges = 0, reads = 0;
  const context = {
    React: { createElement: () => ({}) }, Link: 'Link',
    useEffect: effect => effects.push(effect), useRef: () => completion, useState: () => ['', () => {}],
    useNavigate: () => (...args) => navigations.push(args),
    readSocialCallback: () => { reads++; return { code: 'one-use-code', verifier: 'proof' }; },
    useAuth: () => ({ loading: false, completeSocialLogin: async () => {
      exchanges++; return { new_account: true, linked: false };
    } }),
  };
  vm.createContext(context);
  vm.runInContext(pageCode.replace(/^import .*;$/gm, '').replace('export default function SocialCallbackPage', 'function SocialCallbackPage')
    + '\nglobalThis.Page = SocialCallbackPage;', context);
  context.Page();
  const cleanup = effects[0]();
  cleanup();
  effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 1);
  assert.equal(exchanges, 1);
  assert.equal(navigations.length, 1);
  assert.equal(navigations[0][0], '/dashboard');
  assert.equal(navigations[0][1].state.newAccount, true);
});

test('shared Google signup button honors availability, starts existing flow, and reports startup errors', async () => {
  const componentSource = readFileSync(new URL('../src/components/SocialLoginButtons.tsx', import.meta.url), 'utf8');
  const componentCode = (await transformWithOxc(componentSource, 'SocialLoginButtons.tsx', { jsx: { runtime: 'classic' } })).code;
  for (const enabled of [true, false]) {
    let cursor = 0;
    const slots = [], effects = [], starts = [], busy = [];
    const context = {
      React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) }, LoaderCircle: 'Loader', Error,
      socialApi: { providers: async () => ({ google: { enabled }, apple: { enabled: true }, github: { enabled: true } }) },
      startSocialLogin: async (...args) => { starts.push(args); throw new Error('Browser storage unavailable'); },
      useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial;
        return [slots[index], value => { slots[index] = value; }]; },
      useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
      useEffect(effect) { const index = cursor++; if (!(index in slots)) { slots[index] = true; effects.push(effect); } },
    };
    vm.createContext(context);
    vm.runInContext(componentCode.replace(/^import .*;$/gm, '').replace('export default function SocialLoginButtons', 'function SocialLoginButtons')
      + '\nglobalThis.Buttons = SocialLoginButtons;', context);
    const render = (filtered = true) => { cursor = 0; return context.Buttons({ ...(filtered ? { providersToShow: ['google'] } : {}), onBusyChange: value => busy.push(value) }); };
    const buttons = tree => tree.props.children.flat(Infinity).filter(node => node?.type === 'button');
    const initial = render();
    assert.equal(buttons(initial).length, 1);
    assert.equal(buttons(initial)[0].props.disabled, true);
    for (const effect of effects) effect();
    await new Promise(resolve => setImmediate(resolve));
    const ready = buttons(render());
    assert.equal(ready.length, 1);
    assert.equal(ready[0].props.disabled, !enabled);
    await ready[0].props.onClick();
    if (enabled) {
      assert.equal(starts[0][0], 'google');
      assert.equal(starts[0][1], false);
      assert.deepEqual(busy, [true, false]);
      const alert = render().props.children.flat(Infinity).find(node => node?.props?.role === 'alert');
      assert.equal(alert.props.children[0], 'Browser storage unavailable');
    } else {
      assert.equal(starts.length, 0);
    }
    assert.equal(buttons(render(false)).length, 3); // Existing login/linking callers keep their defaults.
  }
});
