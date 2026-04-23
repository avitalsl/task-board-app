import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOwnerKey } from '../_lib/auth.js';
import { getBoard, updateBoard } from '../../server/handlers/board.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ownerKey = getOwnerKey(req);
  if (!ownerKey) return res.status(401).json({ error: 'Missing owner key' });

  if (req.method === 'GET') {
    const { status, body } = await getBoard(ownerKey);
    return res.status(status).json(body);
  }
  if (req.method === 'PUT') {
    const boardState = (req.body as { boardState?: Parameters<typeof updateBoard>[1] })?.boardState;
    const { status, body } = await updateBoard(ownerKey, boardState);
    return res.status(status).json(body);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
