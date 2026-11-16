import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { deriveCredentialHash, requireSiteLogin } from '../src/services/site-gate.js';

test('site login derives the same credentials as the deploy generator', async () => {
  const config = { salt: '0123456789abcdef0123456789abcdef', iterations: 1000 };
  const expected = pbkdf2Sync('learner\npassword', Buffer.from(config.salt, 'hex'), config.iterations, 32, 'sha256').toString('hex');
  assert.equal(await deriveCredentialHash(' Learner ', 'password', config), expected);
});

test('site login only allows a missing configuration or a valid saved session', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const config = { hash: 'ab'.repeat(32), salt: 'cd'.repeat(16), iterations: 1000 };
  try {
    globalThis.localStorage = { getItem: () => config.hash };
    globalThis.fetch = async () => new Response(null, { status: 404 });
    assert.equal(await requireSiteLogin('auth-config.json'), false);

    globalThis.fetch = async () => Response.json(config);
    assert.equal(await requireSiteLogin('auth-config.json'), true);

    globalThis.fetch = async () => new Response(null, { status: 500 });
    await assert.rejects(requireSiteLogin('auth-config.json'), /HTTP 500/);

    for (const invalid of [
      { ...config, hash: 'invalid' },
      { ...config, salt: 'a' },
      { ...config, iterations: 0 },
      { ...config, iterations: '1000' }
    ]) {
      globalThis.fetch = async () => Response.json(invalid);
      await assert.rejects(requireSiteLogin('auth-config.json'), /configuration is invalid/);
    }

    globalThis.fetch = async () => { throw new Error('Network unavailable'); };
    await assert.rejects(requireSiteLogin('auth-config.json'), /Network unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});
