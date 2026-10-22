import { notifyMessage } from '../lib/messageNotifications.js';
import { getRoomAccess } from '../lib/roomAccess.js';
import { summarizeReactions } from '../lib/reactions.js';
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
    if (!user) {
      return response.status(401).json({ message: 'Session expirée.' });
    }
    let body = request.body;
    if (request.method === 'POST' && typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return response.status(400).json({ message: 'Requête JSON invalide.' });
      }
    }
    const roomValue = request.method === 'GET' ? request.query.room_id : body?.roomId;
    const isRoom = roomValue !== undefined;
    const userValue = request.method === 'GET' ? request.query.user_id : body?.targetUserId;
    if (isRoom && userValue !== undefined) {
      return response.status(400).json({ message: 'Choisissez un seul destinataire.' });
    }
    const rawTarget = isRoom ? roomValue : userValue;
    const targetId =
      typeof rawTarget === 'string' && /^\d+$/.test(rawTarget) ? Number(rawTarget) : rawTarget;
    if (!Number.isSafeInteger(targetId) || targetId <= 0 || (!isRoom && targetId === user.id)) {
      return response.status(400).json({ message: 'Destinataire invalide.' });
    }
    if (isRoom && !(await getRoomAccess(targetId, user.id))) {
      return response.status(404).json({ message: 'Salon introuvable.' });
    }
    const target = isRoom
      ? await sql`SELECT room_id, name FROM rooms WHERE room_id = ${targetId}`
      : await sql`SELECT user_id, external_id FROM users WHERE user_id = ${targetId}`;
    if (!target.rowCount) {
      return response
        .status(404)
        .json({ message: isRoom ? 'Salon introuvable.' : 'Utilisateur introuvable.' });
    }
    const key = isRoom
      ? `room:${targetId}:messages`
      : `conversation:${[user.id, targetId].sort((a, b) => a - b).join(':')}`;
    if (request.method === 'GET') {
      const messages = await redis.lrange(key, 0, -1);
      const reactions = await redis.hgetall(`${key}:reactions`);
      return response.status(200).json(
        messages.map((message) => ({
          ...message,
          reactions: summarizeReactions(reactions, message.id, user.id),
        })),
      );
    }
    if (isRoom) {
      const membership =
        await sql`SELECT user_id FROM room_members WHERE room_id = ${targetId} AND user_id = ${user.id}`;
      if (!membership.rowCount) {
        return response
          .status(403)
          .json({ message: 'Rejoignez le salon avant d’envoyer un message.' });
      }
    }
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if ((!content && !body?.attachmentId) || content.length > 4000) {
      return response
        .status(400)
        .json({ message: 'Le message doit contenir entre 1 et 4000 caractères.' });
    }
    let attachment;
    if (body?.attachmentId !== undefined) {
      if (typeof body.attachmentId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.attachmentId)) {
        return response.status(400).json({ message: 'Pièce jointe invalide.' });
      }
      const found =
        await sql`SELECT attachment_id,filename,mime,owner_id,target_user_id,room_id FROM attachments WHERE attachment_id=${body.attachmentId} AND expires_on>NOW()`;
      const file = found.rows[0];
      if (
        !file ||
        file.owner_id !== user.id ||
        (isRoom
          ? file.room_id !== targetId
          : file.target_user_id !== targetId || file.room_id !== null)
      ) {
        return response.status(403).json({ message: 'Pièce jointe non autorisée.' });
      }
      attachment = { id: file.attachment_id, filename: file.filename, mime: file.mime };
    }
    const replyTo = body?.replyTo;
    if (replyTo !== undefined) {
      if (typeof replyTo !== 'string' || !/^[a-f0-9-]{36}$/.test(replyTo)) {
        return response.status(400).json({ message: 'Message parent invalide.' });
      }
      const history = await redis.lrange(key, 0, -1);
      const parent = history.find((message) => message.id === replyTo);
      if (!parent || parent.replyTo) {
        return response
          .status(404)
          .json({ message: 'Message parent introuvable dans cette conversation.' });
      }
    }
    const message = {
      ...(attachment ? { attachment } : {}),
      ...(replyTo ? { replyTo } : {}),
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: user.username,
      ...(isRoom ? { roomId: targetId } : { targetUserId: targetId }),
      content,
      createdAt: new Date().toISOString(),
    };
    const readerIds = isRoom
      ? (await sql`SELECT user_id FROM room_members WHERE room_id=${targetId}`).rows.map(
          (row) => row.user_id,
        )
      : [user.id, targetId];
    const transaction = redis
      .multi()
      .rpush(key, message)
      .expire(key, 86400)
      .expire(`${key}:reactions`, 86400);
    for (const reader of readerIds) {
      transaction.expire(`read:${reader}:${key}`, 172800);
    }
    await transaction.exec();
    if (isRoom) {
      await sql`UPDATE attachments SET expires_on=NOW()+INTERVAL '48 hours' WHERE room_id=${targetId}`;
    } else {
      await sql`UPDATE attachments SET expires_on=NOW()+INTERVAL '48 hours' WHERE (owner_id=${user.id} AND target_user_id=${targetId}) OR (owner_id=${targetId} AND target_user_id=${user.id})`;
    }
    await notifyMessage({ user, target, targetId, isRoom, content, message });
    return response.status(201).json(message);
  } catch (error) {
    console.error('Message request failed', error.code || error.name);
    return response.status(500).json({ message: 'Impossible de traiter les messages. Réessayez.' });
  }
}
