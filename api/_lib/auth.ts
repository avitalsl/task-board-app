import type { VercelRequest } from '@vercel/node';

/** Extracts the Bearer ownerKey from the Authorization header, or null. */
export function getOwnerKey(req: VercelRequest): string | null {
  const auth = req.headers['authorization'];
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
