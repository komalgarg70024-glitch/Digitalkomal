import dns from 'node:dns/promises';
import net from 'node:net';
import type { RedirectHop } from '../src/types/seo.ts';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  '169.254.169.254',
]);

export function isPrivateOrReservedIp(ip: string): boolean {
  const cleanIp = ip.replace(/^::ffff:/i, '');

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
    const [a, b, c] = parts;

    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a >= 224) return true;

    return false;
  }

  if (net.isIPv6(cleanIp)) {
    const normalized = cleanIp.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }
    if (normalized.startsWith('ff')) return true;
    return false;
  }

  return true;
}

export interface ValidatedUrlResult {
  valid: boolean;
  parsedUrl?: URL;
  error?: string;
}

export async function validatePublicUrl(rawUrl: string): Promise<ValidatedUrlResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required.' };
  }

  let trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      return {
        valid: false,
        error: 'Unsafe or unsupported URL scheme. Only public HTTP and HTTPS URLs are permitted.',
      };
    }
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: `Blocked URL protocol "${parsed.protocol}". Only http: and https: are allowed.`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: 'URLs containing embedded credentials are not permitted.',
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      valid: false,
      error: `Access to internal or reserved host "${hostname}" is blocked by SSRF security policy.`,
    };
  }

  if (
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.arpa') ||
    !hostname.includes('.')
  ) {
    return {
      valid: false,
      error: `Hostname "${hostname}" is not a valid public top-level domain.`,
    };
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return {
        valid: false,
        error: `IP address "${hostname}" resolves to a private, loopback, or cloud metadata network and is blocked.`,
      };
    }
    return { valid: true, parsedUrl: parsed };
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { valid: false, error: `Could not resolve DNS for "${hostname}".` };
    }
    for (const record of records) {
      if (isPrivateOrReservedIp(record.address)) {
        return {
          valid: false,
          error: `Hostname "${hostname}" resolved to restricted internal IP (${record.address}) and was blocked by SSRF protection.`,
        };
      }
    }
  } catch (err: any) {
    return {
      valid: false,
      error: `DNS lookup failed for "${hostname}": ${err?.code || err?.message || 'Host unreachable'}`,
    };
  }

  return { valid: true, parsedUrl: parsed };
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  method?: 'GET' | 'HEAD';
  acceptHeader?: string;
}

export interface SafeFetchResponse {
  ok: boolean;
  statusCode: number;
  finalUrl: string;
  redirectChain: RedirectHop[];
  isRedirectLoop: boolean;
  headers: Record<string, string>;
  bodyText: string;
  contentSizeBytes: number;
  responseTimeMs: number;
  error?: string;
}

export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxBytes = options.maxBytes ?? 3 * 1024 * 1024;
  const maxRedirects = options.maxRedirects ?? 6;
  const method = options.method ?? 'GET';

  const startTime = Date.now();
  const redirectChain: RedirectHop[] = [];
  const visitedInChain = new Set<string>();
  let currentUrl = targetUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const validation = await validatePublicUrl(currentUrl);
    if (!validation.valid || !validation.parsedUrl) {
      return {
        ok: false,
        statusCode: 0,
        finalUrl: currentUrl,
        redirectChain,
        isRedirectLoop: false,
        headers: {},
        bodyText: '',
        contentSizeBytes: 0,
        responseTimeMs: Date.now() - startTime,
        error: validation.error || 'Blocked URL',
      };
    }

    const normalizedCurrent = validation.parsedUrl.toString();
    if (visitedInChain.has(normalizedCurrent)) {
      return {
        ok: false,
        statusCode: 310,
        finalUrl: normalizedCurrent,
        redirectChain,
        isRedirectLoop: true,
        headers: {},
        bodyText: '',
        contentSizeBytes: 0,
        responseTimeMs: Date.now() - startTime,
        error: 'Redirect loop detected.',
      };
    }
    visitedInChain.add(normalizedCurrent);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(normalizedCurrent, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'SEOAuditProAI-Crawler/1.0 (+https://seoauditpro.ai/bot; respectful-audit-crawler)',
          Accept:
            options.acceptHeader ??
            'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(timer);

      const status = response.status;
      const locationHeader = response.headers.get('location');

      if (status >= 300 && status < 400 && locationHeader) {
        let nextUrl: string;
        try {
          nextUrl = new URL(locationHeader, normalizedCurrent).toString();
        } catch {
          return {
            ok: false,
            statusCode: status,
            finalUrl: normalizedCurrent,
            redirectChain,
            isRedirectLoop: false,
            headers: {},
            bodyText: '',
            contentSizeBytes: 0,
            responseTimeMs: Date.now() - startTime,
            error: `Invalid redirect Location header: ${locationHeader}`,
          };
        }

        redirectChain.push({
          from: normalizedCurrent,
          to: nextUrl,
          statusCode: status,
        });

        currentUrl = nextUrl;
        if (hop === maxRedirects) {
          return {
            ok: false,
            statusCode: status,
            finalUrl: nextUrl,
            redirectChain,
            isRedirectLoop: false,
            headers: {},
            bodyText: '',
            contentSizeBytes: 0,
            responseTimeMs: Date.now() - startTime,
            error: `Maximum redirect depth (${maxRedirects}) exceeded.`,
          };
        }
        continue;
      }

      const headersObj: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        headersObj[key.toLowerCase()] = val;
      });

      if (method === 'HEAD') {
        const contentLengthHeader = headersObj['content-length'];
        const size = contentLengthHeader ? parseInt(contentLengthHeader, 10) || 0 : 0;
        return {
          ok: status >= 200 && status < 300,
          statusCode: status,
          finalUrl: normalizedCurrent,
          redirectChain,
          isRedirectLoop: false,
          headers: headersObj,
          bodyText: '',
          contentSizeBytes: size,
          responseTimeMs: Date.now() - startTime,
        };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return {
          ok: status >= 200 && status < 300,
          statusCode: status,
          finalUrl: normalizedCurrent,
          redirectChain,
          isRedirectLoop: false,
          headers: headersObj,
          bodyText: '',
          contentSizeBytes: 0,
          responseTimeMs: Date.now() - startTime,
        };
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }

      const combined = new Uint8Array(Math.min(totalBytes, maxBytes));
      let offset = 0;
      for (const chunk of chunks) {
        if (offset + chunk.byteLength <= combined.byteLength) {
          combined.set(chunk, offset);
          offset += chunk.byteLength;
        }
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      const bodyText = decoder.decode(combined);

      return {
        ok: status >= 200 && status < 300,
        statusCode: status,
        finalUrl: normalizedCurrent,
        redirectChain,
        isRedirectLoop: false,
        headers: headersObj,
        bodyText,
        contentSizeBytes: totalBytes,
        responseTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const isAbort = err?.name === 'AbortError';
      return {
        ok: false,
        statusCode: 0,
        finalUrl: normalizedCurrent,
        redirectChain,
        isRedirectLoop: false,
        headers: {},
        bodyText: '',
        contentSizeBytes: 0,
        responseTimeMs: Date.now() - startTime,
        error: isAbort
          ? `Request timed out after ${timeoutMs}ms`
          : err?.message || 'Network request failed',
      };
    }
  }

  return {
    ok: false,
    statusCode: 0,
    finalUrl: currentUrl,
    redirectChain,
    isRedirectLoop: false,
    headers: {},
    bodyText: '',
    contentSizeBytes: 0,
    responseTimeMs: Date.now() - startTime,
    error: 'Redirect limit reached',
  };
}
