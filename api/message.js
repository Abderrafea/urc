import PushNotifications from '@pusher/push-notifications-server';
import { sql } from '@vercel/postgres';
import { getConnecterUser } from '../lib/session.js';
import { redis } from '../lib/redis.js';

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ message: 'Méthode non autorisée.' });
  }
  try {
    const user = await getConnecterUser(request);
    if (!user) return response.status(401).json({ message: 'Session expirée.' });
    let body = request.body;
    if (request.method === 'POST' && typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return response.status(400).json({ message: 'Requête JSON invalide.' }); }
    }
    const roomValue = request.method === 'GET' ? request.query.room_id : body?.roomId;
    const isRoom = roomValue !== undefined;
    const userValue = request.method === 'GET' ? request.query.user_id : body?.targetUserId;
    if (isRoom && userValue !== undefined) return response.status(400).json({ message: 'Choisissez un seul destinataire.' });
    const rawTarget = isRoom ? roomValue : userValue;
    const targetId = typeof rawTarget === 'string' && /^\d+$/.test(rawTarget) ? Number(rawTarget) : rawTarget;
    if (!Number.isSafeInteger(targetId) || targetId <= 0 || (!isRoom && targetId === user.id)) {
      return response.status(400).json({ message: 'Destinataire invalide.' });
    }
    // All authenticated users can access public rooms.
    const target = isRoom
      ? await sql`SELECT room_id, name FROM rooms WHERE room_id = ${targetId}`
      : await sql`SELECT user_id, external_id FROM users WHERE user_id = ${targetId}`;
    if (!target.rowCount) return response.status(404).json({ message: isRoom ? 'Salon introuvable.' : 'Utilisateur introuvable.' });
    const key = isRoom ? `room:${targetId}:messages` : `conversation:${[user.id, targetId].sort((a, b) => a - b).join(':')}`;
    if (request.method === 'GET') {
      const messages = await redis.lrange(key, 0, -1);
      return response.status(200).json(messages);
    }
    if (isRoom) {
      const membership = await sql`SELECT user_id FROM room_members WHERE room_id = ${targetId} AND user_id = ${user.id}`;
      if (!membership.rowCount) return response.status(403).json({ message: 'Rejoignez le salon avant d’envoyer un message.' });
    }
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content || content.length > 4000) return response.status(400).json({ message: 'Le message doit contenir entre 1 et 4000 caractères.' });
    const message = { id: crypto.randomUUID(), senderId: user.id, senderName: user.username, ...(isRoom ? { roomId: targetId } : { targetUserId: targetId }), content, createdAt: new Date().toISOString() };
    await redis.multi().rpush(key, message).expire(key, 86400).exec();
    if (process.env.PUSHER_INSTANCE_ID && process.env.PUSHER_SECRET_KEY) {
      try {
        const client = new PushNotifications({ instanceId: process.env.PUSHER_INSTANCE_ID, secretKey: process.env.PUSHER_SECRET_KEY });
        const recipients = isRoom
          ? (await sql`SELECT u.external_id FROM room_members m JOIN users u ON u.user_id = m.user_id WHERE m.room_id = ${targetId} AND m.user_id <> ${user.id}`).rows.map((row) => row.external_id)
          : [target.rows[0].external_id];
        for (let offset = 0; offset < recipients.length; offset += 1000) {
        await client.publishToUsers(recipients.slice(offset, offset + 1000), {
          web: {
            notification: { title: isRoom ? `${user.username} · ${target.rows[0].name}` : user.username, body: content.slice(0, 200) },
            data: { type: 'new-message', senderId: user.id, messageId: message.id, ...(isRoom ? { roomId: targetId } : {}) },
          },
        });
        }
      } catch (error) { console.error('Push delivery failed', error.code || error.name); }
    }
    return response.status(201).json(message);
  } catch (error) {
    console.error('Message request failed', error.code || error.name);
    return response.status(500).json({ message: 'Impossible de traiter les messages. Réessayez.' });
  }
}
