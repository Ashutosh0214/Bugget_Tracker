import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { transformWithOxc } from 'vite';

const source = readFileSync(new URL('../src/lib/passwordRecovery.ts', import.meta.url), 'utf8');
const { code } = await transformWithOxc(source, 'passwordRecovery.ts');

function setup(hash) {
  const changes = [];
  const context = { URLSearchParams, TextEncoder, location: { hash, pathname: '/reset-password' },
    history: { state: null, replaceState(_state, _title, path) { changes.push(path); context.location.hash = ''; } } };
  vm.createContext(context);
  vm.runInContext(code.replace(/^export /gm, '')
    + '\nglobalThis.read = readResetToken; globalThis.clear = clearResetToken; globalThis.validate = validateResetPassword;', context);
  return { context, changes };
}

test('reset token is removed from history, survives StrictMode replay in memory, and is cleared on success', () => {
  const token = 's'.repeat(43);
  const app = setup('#token=' + token);
  assert.equal(app.context.read(), token);
  assert.deepEqual(app.changes, ['/reset-password']);
  assert.equal(app.context.location.hash, '');
  assert.equal(app.context.read(), token);
  app.context.clear();
  assert.equal(app.context.read(), '');
});

test('missing and malformed credentials cannot open a reset form', () => {
  for (const hash of ['', '#token=short', '#token=' + 'x'.repeat(44), '#token=<script>']) {
    const app = setup(hash);
    assert.equal(app.context.read(), '');
    assert.deepEqual(app.changes, ['/reset-password']);
  }
});

test('reset validation supports passphrases, checks confirmation, and counts bcrypt UTF-8 bytes', () => {
  const app = setup('');
  assert.equal(app.context.validate('a unique passphrase 2026', 'a unique passphrase 2026'), '');
  assert.match(app.context.validate('too short', 'too short'), /12 characters/);
  assert.match(app.context.validate('é'.repeat(37), 'é'.repeat(37)), /72 UTF-8 bytes/);
  assert.match(app.context.validate('a unique passphrase 2026', 'different password'), /do not match/);
});

const pageSource = readFileSync(new URL('../src/pages/PasswordRecoveryPages.tsx', import.meta.url), 'utf8');
const pageCode = (await transformWithOxc(pageSource, 'PasswordRecoveryPages.tsx', { jsx: { runtime: 'classic' } })).code;

function pageSetup(page, fail = false) {
  let cursor = 0, logouts = 0, cleared = 0;
  const slots = [], requests = [];
  const context = { Error, TextEncoder, React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    Link: 'Link', Wallet: 'Wallet', LoaderCircle: 'Loader', Button: 'Button', Input: 'Input',
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useAuth: () => ({ logout() { logouts++; } }),
    readResetToken: () => 's'.repeat(43), clearResetToken: () => { cleared++; },
    validateResetPassword: (password, confirmation) => password === confirmation ? '' : 'Passwords do not match.',
    passwordApi: {
      forgot: async email => { requests.push(email); if (fail) throw new Error('Too many attempts. Please try again later.'); return { message: 'Generic confirmation' }; },
      reset: async (...args) => { requests.push(args); if (fail) throw new Error('Reset link expired'); return { message: 'Password updated' }; },
    },
  };
  vm.createContext(context);
  vm.runInContext(pageCode.replace(/^import .*;$/gm, '').replace(/^export /gm, '')
    + '\nglobalThis.Forgot = ForgotPasswordPage; globalThis.Reset = ResetPasswordPage;', context);
  function render() { cursor = 0; return context[page](); }
  const find = (node, predicate) => node && typeof node === 'object' && (predicate(node) ? node
    : node.props?.children?.flat(Infinity).map(child => find(child, predicate)).find(Boolean));
  return { render, find, requests, status: () => ({ logouts, cleared }),
    submit: () => find(render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} }) };
}

test('forgot page prevents duplicate requests and displays generic confirmation or rate-limit errors', async () => {
  for (const fail of [false, true]) {
    const page = pageSetup('Forgot', fail);
    page.find(page.render(), node => node.type === 'Input').props.onChange({ target: { value: 'person@example.com' } });
    const first = page.submit();
    await page.submit();
    await first;
    assert.equal(page.requests.length, 1);
    const result = page.find(page.render(), node => node.props?.role === (fail ? 'alert' : 'status'));
    assert.match(result.props.children[0], fail ? /Too many attempts/ : /Generic confirmation/);
  }
});

test('reset page submits password once, clears sensitive state, logs out locally, and requires sign-in', async () => {
  const page = pageSetup('Reset');
  page.find(page.render(), node => node.props?.id === 'reset-password').props.onChange({ target: { value: 'new passphrase 2026' } });
  page.find(page.render(), node => node.props?.id === 'reset-confirmation').props.onChange({ target: { value: 'new passphrase 2026' } });
  const first = page.submit();
  await page.submit();
  await first;
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0][0], 's'.repeat(43));
  assert.deepEqual(page.status(), { logouts: 1, cleared: 1 });
  assert.ok(page.find(page.render(), node => node.props?.role === 'status'));
  assert.equal(page.find(page.render(), node => node.type === 'form'), undefined);
});
