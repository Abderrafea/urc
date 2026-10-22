import PushNotifications from '@pusher/push-notifications-server';
import { getConnecterUser } from '../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }
  try {
    const user = await getConnecterUser(req);
    if (!user) return res.status(401).json({ message: 'Session expirée.' });
    res.setHeader('Cache-Control', 'no-store');
    const configured = Boolean(process.env.PUSHER_INSTANCE_ID && process.env.PUSHER_SECRET_KEY);
    if (req.query.config === '1')
      return res
        .status(200)
        .json({ configured, instanceId: configured ? process.env.PUSHER_INSTANCE_ID : null });
    if (req.query.user_id !== user.externalId)
      return res.status(403).json({ message: 'Utilisateur non autorisé.' });
    if (!configured)
      return res.status(503).json({ message: 'Les notifications ne sont pas encore configurées.' });
    const client = new PushNotifications({
      instanceId: process.env.PUSHER_INSTANCE_ID,
      secretKey: process.env.PUSHER_SECRET_KEY,
    });
    return res.status(200).json(client.generateToken(user.externalId));
  } catch (error) {
    console.error('Push authentication failed', error.code || error.name);
    return res.status(500).json({ message: 'Notifications indisponibles.' });
  }
}
