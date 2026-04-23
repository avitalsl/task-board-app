import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchSharedBoard } from '../../../server/handlers/shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = String(req.query.token ?? '');
  if (!token) return res.status(404).json({ error: 'Invalid or expired share link' });

  const { status, body } = await fetchSharedBoard(token);
  return res.status(status).json(body);
}
