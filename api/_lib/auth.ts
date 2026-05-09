import type { VercelRequest } from '@vercel/node';

export function getOwnerKey(req: VercelRequest): string | null {
  const auth = req.headers['authorization'];
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  // Client percent-encodes so non-Latin-1 keys survive header transport.
  try {
    return decodeURIComponent(auth.slice(7));
  } catch {
    return null;
  }
}
