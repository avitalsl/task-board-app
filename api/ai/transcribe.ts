import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOwnerKey } from '../_lib/auth.js';
import { getBoardByOwnerKey } from '../../server/storage/index.js';
import { transcribeAudio } from '../../server/handlers/ai.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const ownerKey = getOwnerKey(req);
  if (!ownerKey) return res.status(401).json({ error: 'Missing owner key' });
  const row = await getBoardByOwnerKey(ownerKey);
  if (!row) return res.status(403).json({ error: 'Invalid owner key' });

  const { audio, mimeType } = (req.body ?? {}) as { audio?: string; mimeType?: string };
  const { status, body } = await transcribeAudio(audio ?? '', mimeType ?? '');
  return res.status(status).json(body);
}
