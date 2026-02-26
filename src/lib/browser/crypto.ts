// Shared crypto utilities for hashing and ID generation
// Uses Web Crypto API for secure operations

/**
 * Generate SHA-256 hash of input string
 * Returns hex-encoded hash
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a UUID v4
 * Uses crypto.randomUUID() if available, falls back to manual generation
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short ID (8 characters) for display purposes
 * Not cryptographically secure, but good for UI
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}
