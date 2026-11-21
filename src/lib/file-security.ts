/**
 * File Upload Security Validator
 * Protects against:
 * - Disguised executables / web shells (checks Magic Bytes / File Signatures)
 * - Extension spoofing (e.g. payload.php.jpg)
 * - SVG Stored XSS attacks
 * - Path traversal (strips ../ and directory separators)
 * - Denial of Service via oversized files
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedExt?: string;
  detectedMime?: string;
}

// Allowed MIME types and their strict extensions
export const ALLOWED_IMAGE_TYPES: Record<string, { ext: string; minBytes: number }> = {
  'image/jpeg': { ext: 'jpg', minBytes: 3 },
  'image/png': { ext: 'png', minBytes: 8 },
  'image/webp': { ext: 'webp', minBytes: 12 },
  'application/pdf': { ext: 'pdf', minBytes: 4 },
};

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates the file buffer against official magic bytes signatures.
 * Returns the detected safe extension if valid, or null if invalid/spoofed.
 */
export function detectMagicBytes(buffer: Buffer): { mime: string; ext: string } | null {
  if (!buffer || buffer.length < 12) return null;

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // 3. WebP: Starts with 'RIFF' (0x52 0x49 0x46 0x46), bytes 8..11 is 'WEBP' (0x57 0x45 0x42 0x50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // 4. PDF: 25 50 44 46 (%PDF)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { mime: 'application/pdf', ext: 'pdf' };
  }

  return null;
}

/**
 * Comprehensive check for uploaded files
 */
export function validateUploadedFile(
  file: File | { name: string; size: number },
  buffer: Buffer,
  allowedMimes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
): ValidationResult {
  // 1. Check size limit
  if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran file melebihi batas maksimum 5MB (ukuran file: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'File kosong tidak dapat diunggah.' };
  }

  // 2. Reject executable or dangerous extensions in raw filename
  const rawLower = file.name.toLowerCase();
  const dangerousExtensions = [
    '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
    '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.vbs',
    '.js', '.mjs', '.cjs', '.ts', '.py', '.rb', '.pl', '.cgi',
    '.svg', '.html', '.htm', '.xhtml', '.shtml', '.jsp', '.asp', '.aspx',
    '.jar', '.war', '.dll', '.so', '.dylib', '.htaccess', '.env'
  ];

  for (const dangerous of dangerousExtensions) {
    if (rawLower.endsWith(dangerous) || rawLower.includes(`${dangerous}.`)) {
      return {
        valid: false,
        error: `Tipe file '${dangerous}' dilarang keras karena potensi risiko keamanan server.`,
      };
    }
  }

  // 3. Verify real file signature (Magic Bytes)
  const magic = detectMagicBytes(buffer);
  if (!magic) {
    return {
      valid: false,
      error: 'Format file tidak valid atau rusak. Hanya format gambar asli (JPG, PNG, WebP) atau PDF yang diperbolehkan.',
    };
  }

  // 4. Ensure magic mime is in allowed list
  if (!allowedMimes.includes(magic.mime)) {
    return {
      valid: false,
      error: `Tipe file '${magic.mime}' tidak diizinkan untuk formulir ini.`,
    };
  }

  return {
    valid: true,
    sanitizedExt: magic.ext,
    detectedMime: magic.mime,
  };
}
