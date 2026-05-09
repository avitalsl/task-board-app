// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { getOwnerKey } from './auth.js';

function reqWith(authorization: string | undefined): VercelRequest {
  return { headers: { authorization } } as unknown as VercelRequest;
}

describe('getOwnerKey', () => {
  it('returns the key for a plain ASCII bearer token', () => {
    expect(getOwnerKey(reqWith('Bearer abc123'))).toBe('abc123');
  });

  it('round-trips a percent-encoded Hebrew key', () => {
    const key = 'לוח-שלי';
    const encoded = encodeURIComponent(key);
    expect(getOwnerKey(reqWith(`Bearer ${encoded}`))).toBe(key);
  });

  it('returns null when the Authorization header is missing', () => {
    expect(getOwnerKey(reqWith(undefined))).toBeNull();
  });

  it('returns null for a non-Bearer scheme', () => {
    expect(getOwnerKey(reqWith('Basic abc123'))).toBeNull();
  });

  it('returns null for malformed percent-encoding', () => {
    expect(getOwnerKey(reqWith('Bearer %E0%A4'))).toBeNull();
  });
});
