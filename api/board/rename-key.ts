import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOwnerKey } from '../_lib/auth.js';
import { renameOwnerKey } from '../../server/handlers/board.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ownerKey = getOwnerKey(req);
  if (!ownerKey) return res.status(401).json({ error: 'Missing owner key' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const newOwnerKey = (req.body as { newOwnerKey?: unknown })?.newOwnerKey;
  const { status, body } = await renameOwnerKey(ownerKey, newOwnerKey);
  return res.status(status).json(body);
}
