import { sql } from '@vercel/postgres';
import { redis } from '../lib/redis.js';
import { getConnecterUser } from '../lib/session.js';
import { EMOJIS, summarizeReactions } from '../lib/reactions.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }
  try {
    const user = await getConnecterUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Session expirée.' });
    }
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ message: 'Requête invalide.' });
      }
    }
    const room = body?.roomId !== undefined;
    const id = room ? body.roomId : body?.targetUserId;
    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      (!room && id === user.id) ||
      (room && body.targetUserId !== undefined) ||
      typeof body?.messageId !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(body.messageId) ||
      !EMOJIS.includes(body?.emoji)
    ) {
      return res.status(400).json({ message: 'Réaction invalide.' });
    }
    if (room) {
      const member =
        await sql`SELECT user_id FROM room_members WHERE room_id = ${id} AND user_id = ${user.id}`;
      if (!member.rowCount) {
        return res.status(403).json({ message: 'Rejoignez le salon pour réagir.' });
      }
    }
    const key = room
      ? `room:${id}:messages`
      : `conversation:${[user.id, id].sort((a, b) => a - b).join(':')}`;
    const messages = await redis.lrange(key, 0, -1);
    if (!messages.some((message) => message.id === body.messageId)) {
      return res.status(404).json({ message: 'Message introuvable.' });
    }
    // One reaction per member; repeat the same emoji to remove it atomically.
    await redis.eval(
      `
      if redis.call('EXISTS', KEYS[2]) == 0 then return 0 end
      if redis.call('HGET', KEYS[1], ARGV[1]) == ARGV[2] then
        redis.call('HDEL', KEYS[1], ARGV[1])
      else redis.call('HSET', KEYS[1], ARGV[1], ARGV[2]) end
      local ttl = redis.call('TTL', KEYS[2])
      if ttl > 0 then redis.call('EXPIRE', KEYS[1], ttl) end
      return 1
    `,
      [`${key}:reactions`, key],
      [`${body.messageId}:${user.id}`, body.emoji],
    );
    const values = await redis.hgetall(`${key}:reactions`);
    return res.status(200).json(summarizeReactions(values, body.messageId, user.id));
  } catch (error) {
    console.error('Reaction failed', error.code || error.name);
    return res.status(500).json({ message: 'Impossible d’enregistrer la réaction.' });
  }
}
