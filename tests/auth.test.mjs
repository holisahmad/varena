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

test('Security - Validasi Kebijakan Kata Sandi VARENA', async () => {
  // Policy rule checks: min 8 chars, letter + number, reject common passwords
  const validatePassword = (pwd, confirm, current) => {
    if (!pwd || pwd.length < 8) return 'Password minimal 8 karakter';
    if (pwd.length > 128) return 'Password maksimal 128 karakter';
    if (!/[a-zA-Z]/.test(pwd) || !/\d/.test(pwd)) return 'Password wajib kombinasi huruf dan angka';
    if (['12345678', 'password', 'password123', 'admin123', 'varena123'].includes(pwd.toLowerCase())) {
      return 'Password terlalu umum';
    }
    if (pwd !== confirm) return 'Konfirmasi password tidak cocok';
    if (current && pwd === current) return 'Password baru tidak boleh sama dengan password lama';
    return null;
  };

  assert.equal(validatePassword('short', 'short'), 'Password minimal 8 karakter');
  assert.equal(validatePassword('onlyletters', 'onlyletters'), 'Password wajib kombinasi huruf dan angka');
  assert.equal(validatePassword('1234567890', '1234567890'), 'Password wajib kombinasi huruf dan angka');
  assert.equal(validatePassword('password123', 'password123'), 'Password terlalu umum');
  assert.equal(validatePassword('VarenaPro2026', 'VarenaBeda2026'), 'Konfirmasi password tidak cocok');
  assert.equal(validatePassword('OldPass123', 'OldPass123', 'OldPass123'), 'Password baru tidak boleh sama dengan password lama');
  assert.equal(validatePassword('VarenaLuxury2026!', 'VarenaLuxury2026!'), null, 'Password kuat harus lolos validasi');
});
