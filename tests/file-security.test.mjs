import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUploadedFile } from '../src/lib/file-security';

test('File Security - Tolak file PHP yang disamarkan sebagai JPEG', async () => {
  const phpContent = Buffer.from('<?php system($_GET["cmd"]); ?>');
  const file = { name: 'foto.jpg', size: phpContent.length };
  const result = validateUploadedFile(file, phpContent);
  assert.equal(result.valid, false, 'File PHP harus ditolak');
  assert.ok(result.error, 'Harus ada pesan error');
});

test('File Security - Tolak file EXE', async () => {
  const exeHeader = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
  const file = { name: 'foto.exe', size: exeHeader.length };
  const result = validateUploadedFile(file, exeHeader);
  assert.equal(result.valid, false, 'File EXE harus ditolak');
});

test('File Security - Tolak file SVG (XSS risk)', async () => {
  const svgContent = Buffer.from('<svg><script>alert(1)</script></svg>');
  const file = { name: 'gambar.svg', size: svgContent.length };
  const result = validateUploadedFile(file, svgContent);
  assert.equal(result.valid, false, 'File SVG harus ditolak (risiko XSS)');
});

test('File Security - Tolak file terlalu besar (>5MB)', async () => {
  const bigContent = Buffer.alloc(6 * 1024 * 1024); // 6MB
  bigContent[0] = 0xFF; bigContent[1] = 0xD8; bigContent[2] = 0xFF;
  const file = { name: 'besar.jpg', size: bigContent.length };
  const result = validateUploadedFile(file, bigContent);
  assert.equal(result.valid, false, 'File >5MB harus ditolak');
});

test('File Security - Terima JPEG valid', async () => {
  const jpegContent = Buffer.concat([
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]),
    Buffer.alloc(100),
  ]);
  const file = { name: 'foto_valid.jpg', size: jpegContent.length };
  const result = validateUploadedFile(file, jpegContent);
  assert.equal(result.valid, true, 'JPEG valid harus diterima');
  assert.equal(result.sanitizedExt, 'jpg');
});

test('File Security - Terima PNG valid', async () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
  const pngContent = Buffer.concat([pngHeader, Buffer.alloc(50)]);
  const file = { name: 'foto_valid.png', size: pngContent.length };
  const result = validateUploadedFile(file, pngContent);
  assert.equal(result.valid, true, 'PNG valid harus diterima');
  assert.equal(result.sanitizedExt, 'png');
});

test('File Security - Tolak ekstensi ganda (double extension)', async () => {
  const phpContent = Buffer.from('<?php phpinfo(); ?>');
  const file = { name: 'shell.php.jpg', size: phpContent.length };
  const result = validateUploadedFile(file, phpContent);
  assert.equal(result.valid, false, 'File dengan ekstensi ganda PHP harus ditolak');
});
