import { sql } from '@vercel/postgres';
import { redis } from '../lib/redis.js';
import { getConnecterUser } from '../lib/session.js';
const conversationKey = (a, b) => `conversation:${[a, b].sort((a, b) => a - b).join(':')}`;
export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ message: 'Méthode non autorisée.' }); }
  try {
    const user = await getConnecterUser(req);
    if (!user) return res.status(401).json({ message: 'Session expirée.' });
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') {
      const [users, rooms] = await Promise.all([
        sql`SELECT user_id FROM users WHERE user_id <> ${user.id}`,
        sql`SELECT room_id FROM room_members WHERE user_id = ${user.id}`,
      ]);
      const targets = [
        ...users.rows.map((row) => ({ label: `user:${row.user_id}`, key: conversationKey(user.id, row.user_id) })),
        ...rooms.rows.map((row) => ({ label: `room:${row.room_id}`, key: `room:${row.room_id}:messages` })),
      ];
      if (!targets.length) return res.status(200).json({});
      const pipeline = redis.pipeline();
      for (const target of targets) { pipeline.lrange(target.key, 0, -1); pipeline.smembers(`read:${user.id}:${target.key}`); }
      const results = await pipeline.exec();
      const counts = {};
      targets.forEach((target, index) => {
        const seen = new Set(results[index * 2 + 1]);
        counts[target.label] = results[index * 2].filter((message) => message.senderId !== user.id && !seen.has(message.id)).length;
      });
      return res.status(200).json(counts);
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ message: 'Requête invalide.' }); } }
    const room = body?.roomId !== undefined;
    const id = room ? body.roomId : body?.targetUserId;
    if (!Number.isSafeInteger(id) || id <= 0 || (!room && id === user.id) || (room && body.targetUserId !== undefined) || !Array.isArray(body?.messageIds) || body.messageIds.length > 500 || body.messageIds.some((id) => typeof id !== 'string')) return res.status(400).json({ message: 'Lecture invalide.' });
    if (room) {
      const member = await sql`SELECT user_id FROM room_members WHERE room_id = ${id} AND user_id = ${user.id}`;
      if (!member.rowCount) return res.status(403).json({ message: 'Salon non rejoint.' });
    }
    const key = room ? `room:${id}:messages` : conversationKey(user.id, id);
    const messages = await redis.lrange(key, 0, -1);
    const requested = new Set(body.messageIds);
    const ids = messages.filter((message) => message.senderId !== user.id && requested.has(message.id)).map((message) => message.id);
    if (ids.length) await redis.multi().sadd(`read:${user.id}:${key}`, ...ids).expire(`read:${user.id}:${key}`, 172800).exec();
    return res.status(200).json({ marked: ids.length });
  } catch (error) {
    console.error('Unread request failed', error.code || error.name);
    return res.status(500).json({ message: 'Compteurs indisponibles.' });
  }
}
