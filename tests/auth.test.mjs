import test from 'node:test';
import assert from 'node:assert/strict';
import { getMemberFromJWT } from '../src/lib/auth.ts';
import { signSessionToken, verifySessionToken } from '../src/lib/jwt.ts';

test('Auth - getMemberFromJWT mengembalikan null untuk request tanpa token', async () => {
  const req = new Request('http://localhost/api/test');
  const session = await getMemberFromJWT(req);
  assert.equal(session, null, 'Request tanpa token harus mengembalikan null');
});

test('Auth - getMemberFromJWT mengembalikan null untuk request dengan token tidak valid', async () => {
  const req = new Request('http://localhost/api/test', {
    headers: { Authorization: 'Bearer token_palsu_tidak_valid' },
  });
  const session = await getMemberFromJWT(req);
  assert.equal(session, null, 'Token tidak valid harus mengembalikan null');
});

test('Auth - signSessionToken dan verifikasi member session', async () => {
  const payload = {
    userId: 'usr-test-001',
    email: 'test@varena.id',
    displayName: 'Test Member',
    roles: ['MEMBER'],
    memberId: 'mbr-test-001',
    memberCode: 'VRN-0001',
    isAgent: false,
  };

  const token = await signSessionToken(payload);
  assert.ok(token, 'Token harus berhasil dibuat');
  assert.equal(typeof token, 'string');
  assert.ok(token.split('.').length === 3, 'Token harus berformat JWT (3 bagian)');

  const decoded = await verifySessionToken(token);
  assert.ok(decoded, 'Token harus berhasil diverifikasi');
  assert.equal(decoded?.memberCode, 'VRN-0001');
  assert.equal(decoded?.email, 'test@varena.id');
});

test('Auth - Token kadaluarsa atau rusak harus ditolak', async () => {
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid_sig';
  const result = await verifySessionToken(expiredToken);
  assert.equal(result, null, 'Token expired harus mengembalikan null');
});
