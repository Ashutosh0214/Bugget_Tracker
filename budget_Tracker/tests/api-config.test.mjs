import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { transformWithOxc } from 'vite';

const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
const productionBackend = 'https://spendze-backend.onrender.com';

for (const [production, configured, expected] of [
  [false, undefined, 'http://127.0.0.1:8000/api'],
  [false, ' http://localhost:8000/api/ ', 'http://localhost:8000/api'],
  [true, undefined, productionBackend + '/api'],
  [true, '', productionBackend + '/api'],
  [true, 'http://localhost:8000', productionBackend + '/api'],
  [true, 'http://127.0.0.1:8000/api', productionBackend + '/api'],
  [true, 'http://[::1]:8000', productionBackend + '/api'],
  [true, 'https://custom-backend.example/', 'https://custom-backend.example/api'],
  [true, 'https://custom-backend.example/api/', 'https://custom-backend.example/api'],
]) {
  test(`API routing: production=${production}, configured=${configured ?? '(unset)'}`, async () => {
    const input = source.replaceAll('import.meta.env.VITE_API_BASE_URL', JSON.stringify(configured) ?? 'undefined')
      .replaceAll('import.meta.env.PROD', String(production));
    const { code } = await transformWithOxc(input, 'api.ts');
    const requests = [];
    const context = { console, localStorage: { getItem: () => 'existing-session' },
      fetch: async (url, config) => { requests.push({ url, config }); return { ok: true, json: async () => ({}) }; } };
    vm.createContext(context);
    vm.runInContext(code.replace(/^export /gm, '')
      + '\nglobalThis.api = { root: API_ROOT_URL, authApi, socialApi };', context);
    assert.equal(context.api.root, expected);
    await context.api.authApi.signup({ name: 'Example', email: 'example@example.com', password: 'test-password' });
    await context.api.authApi.login({ email: 'example@example.com', password: 'test-password' });
    await context.api.authApi.getMe();
    await context.api.socialApi.providers();
    assert.deepEqual(requests.map(r => r.url), ['/auth/signup', '/auth/login', '/auth/me', '/auth/oauth/providers'].map(p => expected + p));
    assert.equal(requests[0].config.headers.Authorization, 'Bearer existing-session');
  });
}
