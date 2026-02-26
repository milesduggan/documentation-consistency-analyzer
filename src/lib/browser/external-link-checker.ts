/**
 * External Link Checker
 * Validates external URLs using HTTP HEAD requests with rate limiting
 * Runs client-side in the browser
 */

import type { Inconsistency } from '@/types';

export interface ExternalLink {
  url: string;
  text: string;
  filePath: string;
  lineNumber?: number;
}

export interface ExternalLinkResult {
  url: string;
  status: 'ok' | 'error' | 'timeout' | 'blocked';
  statusCode?: number;
  errorMessage?: string;
}

export interface ExternalCheckProgress {
  checked: number;
  total: number;
  currentUrl: string;
}

// Private IP / SSRF blocklist
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
];

const PRIVATE_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,          // 10.x.x.x
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16-31.x.x
  /^192\.168\.\d{1,3}\.\d{1,3}$/,              // 192.168.x.x
  /^169\.254\.\d{1,3}\.\d{1,3}$/,              // link-local
];

/**
 * Validate a URL for safe fetching (SSRF protection)
 * Returns null if valid, or an error string if blocked
 */
export function validateUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'Invalid URL';
  }

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Blocked scheme: ${parsed.protocol}`;
  }

  const hostname = parsed.hostname;

  // Block known localhost variants
  if (BLOCKED_HOSTS.includes(hostname)) {
    return `Blocked host: ${hostname}`;
  }

  // Block private IP ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return `Blocked private IP: ${hostname}`;
    }
  }

  return null;
}

// Rate limiting configuration
const RATE_LIMIT_MS = 200; // 200ms between requests (5 req/sec)
const TIMEOUT_MS = 10000; // 10 second timeout per request
const MAX_CONCURRENT = 3; // Max concurrent requests

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check a single external URL
 * Uses fetch with HEAD method to minimize bandwidth
 */
async function checkUrl(url: string, parentSignal?: AbortSignal): Promise<ExternalLinkResult> {
  // SSRF protection
  const blocked = validateUrl(url);
  if (blocked) {
    return { url, status: 'blocked', errorMessage: blocked };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Link parent abort to this request's controller
  if (parentSignal) {
    if (parentSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException('Aborted', 'AbortError');
    }
    parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    // Try HEAD first (lighter weight)
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors', // Avoid CORS issues - we just want to know if it's reachable
    });

    clearTimeout(timeoutId);

    // In no-cors mode, response.ok is always false and status is 0
    // We can only tell if the request completed without error
    // This is a limitation of browser-based checking
    return {
      url,
      status: 'ok',
      statusCode: response.status || 200, // Assume OK if no CORS error
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { url, status: 'timeout', errorMessage: 'Request timed out' };
      }
      // CORS errors or network errors
      // In no-cors mode, failed requests throw TypeError
      if (error.name === 'TypeError') {
        return { url, status: 'blocked', errorMessage: 'CORS blocked or network error' };
      }
      return { url, status: 'error', errorMessage: error.message };
    }

    return { url, status: 'error', errorMessage: 'Unknown error' };
  }
}

/**
 * Extract external links from parsed markdown
 */
export function extractExternalLinks(
  parsedMarkdown: Array<{
    filePath: string;
    links: Array<{ url: string; text: string; lineNumber?: number; isInternal: boolean }>;
  }>
): ExternalLink[] {
  const externalLinks: ExternalLink[] = [];

  for (const md of parsedMarkdown) {
    for (const link of md.links) {
      if (!link.isInternal && (link.url.startsWith('http://') || link.url.startsWith('https://'))) {
        externalLinks.push({
          url: link.url,
          text: link.text,
          filePath: md.filePath,
          lineNumber: link.lineNumber,
        });
      }
    }
  }

  // Deduplicate by URL (keep first occurrence)
  const seen = new Set<string>();
  return externalLinks.filter(link => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

/**
 * Check multiple external links with rate limiting
 */
export async function checkExternalLinks(
  links: ExternalLink[],
  onProgress?: (progress: ExternalCheckProgress) => void,
  parentSignal?: AbortSignal
): Promise<Map<string, ExternalLinkResult>> {
  const results = new Map<string, ExternalLinkResult>();

  if (links.length === 0) return results;

  // Process in batches with rate limiting
  let checked = 0;

  for (let i = 0; i < links.length; i += MAX_CONCURRENT) {
    // Check parent abort between batches
    if (parentSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const batch = links.slice(i, i + MAX_CONCURRENT);

    // Check batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (link) => {
        onProgress?.({
          checked,
          total: links.length,
          currentUrl: link.url,
        });

        const result = await checkUrl(link.url, parentSignal);
        checked++;
        return result;
      })
    );

    // Store results
    for (const result of batchResults) {
      results.set(result.url, result);
    }

    // Rate limit between batches
    if (i + MAX_CONCURRENT < links.length) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  return results;
}

/**
 * Generate issue ID
 */
function generateId(): string {
  return `inc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Convert external link check results to inconsistencies
 */
export function externalLinksToInconsistencies(
  links: ExternalLink[],
  results: Map<string, ExternalLinkResult>
): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];

  for (const link of links) {
    const result = results.get(link.url);
    if (!result) continue;

    // Only report errors, not successful checks
    if (result.status === 'ok') continue;

    let severity: 'high' | 'medium' | 'low' = 'medium';
    let message = '';
    let suggestion = '';

    switch (result.status) {
      case 'timeout':
        severity = 'medium';
        message = 'External link timed out';
        suggestion = 'The URL may be slow or unreachable. Verify it manually.';
        break;
      case 'blocked':
        severity = 'low';
        message = 'External link could not be verified (CORS)';
        suggestion = 'Browser restrictions prevent checking this URL. Verify manually.';
        break;
      case 'error':
        severity = 'high';
        message = `External link error: ${result.errorMessage || 'Unknown error'}`;
        suggestion = 'Check if the URL is correct and the site is online.';
        break;
    }

    inconsistencies.push({
      id: generateId(),
      type: 'external-link',
      severity,
      confidence: result.status === 'blocked' ? 'low' : 'medium',
      message,
      location: {
        filePath: link.filePath,
        lineNumber: link.lineNumber,
      },
      context: `Link: [${link.text}](${link.url})`,
      suggestion,
    });
  }

  return inconsistencies;
}
