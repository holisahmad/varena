import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

// In-memory request counters for DDoS edge throttling
const globalIpThrottle = new Map<string, { count: number; resetAt: number }>();

// Blocklist of common hacker probing paths / scanning scripts
const BLOCKED_PROBE_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /wp-admin/i,
  /wp-login/i,
  /phpinfo/i,
  /cgi-bin/i,
  /\.php$/i,
  /actuator/i,
  /swagger-ui/i,
  /\/\.aws/i,
  /etc\/passwd/i,
  /eval-stdin/i,
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Scanner & Attack Probe Blocker
  for (const pattern of BLOCKED_PROBE_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse('Blocked suspicious request.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  // 2. Anti-DDoS Rate Limiter for API endpoints
  if (pathname.startsWith('/api/')) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const now = Date.now();

    const record = globalIpThrottle.get(ip);
    if (!record || now > record.resetAt) {
      globalIpThrottle.set(ip, { count: 1, resetAt: now + 10000 }); // 10 seconds window
    } else {
      record.count += 1;
      // Allow max 100 requests per 10 seconds per IP (10 req/sec sustained)
      if (record.count > 100) {
        return new NextResponse(
          JSON.stringify({
            error: 'Terlalu banyak permintaan (DDoS Protection Triggered). Mohon tunggu beberapa detik.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '10',
            },
          }
        );
      }
    }
  }

  // 3. Security Headers Enforcement (OWASP Top 10 Standards)
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return response;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, brand images, manifest.json
     */
    '/((?!_next/static|_next/image|favicon.ico|brand/|icons/|manifest.json).*)',
  ],
};
