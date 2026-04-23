import type { VercelRequest, VercelResponse } from '@vercel/node';
import { completeTaskViaToken } from '../../../../../server/handlers/shared.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = String(req.query.token ?? '');
  const taskId = String(req.query.taskId ?? '');
  if (!token || !taskId) {
    return res.status(404).json({ error: 'Invalid or expired share link' });
  }

  const { status, body } = await completeTaskViaToken(token, taskId);
  return res.status(status).json(body);
}
