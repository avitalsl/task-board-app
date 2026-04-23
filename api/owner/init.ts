import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ownerInit } from '../../server/handlers/ownerInit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { existingOwnerKey, localState } = (req.body ?? {}) as {
    existingOwnerKey?: string;
    localState?: Parameters<typeof ownerInit>[0]['localState'];
  };
  const { status, body } = await ownerInit({ existingOwnerKey, localState });
  return res.status(status).json(body);
}
