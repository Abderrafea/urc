import { sql } from '@vercel/postgres';
import { getRoomAccess } from '../lib/roomAccess.js';
import { getConnecterUser } from '../lib/session.js';
export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ message: 'Méthode non autorisée.' });
  }
  try {
    const user = await getConnecterUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Session expirée.' });
    }
    if (req.method === 'GET') {
      const rooms =
        await sql`SELECT r.room_id, r.name, r.is_private, r.created_by, EXISTS(SELECT 1 FROM room_members m WHERE m.room_id = r.room_id AND m.user_id = ${user.id}) AS joined FROM rooms r WHERE NOT r.is_private OR EXISTS(SELECT 1 FROM room_members m WHERE m.room_id=r.room_id AND m.user_id=${user.id}) ORDER BY r.name`;
      return res.status(200).json(rooms.rows);
    }
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ message: 'Requête invalide.' });
      }
    }
    if (req.method === 'POST' && Object.prototype.hasOwnProperty.call(body || {}, 'name')) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 50 || body.roomId !== undefined) {
        return res
          .status(400)
          .json({ message: 'Le nom du salon doit contenir entre 1 et 50 caractères.' });
      }
      if (body.isPrivate !== undefined && typeof body.isPrivate !== 'boolean') {
        return res.status(400).json({ message: 'Visibilité invalide.' });
      }
      const created = await sql`
        WITH new_room AS (
          INSERT INTO rooms(name, created_on, created_by, is_private)
          VALUES (${name}, NOW(), ${user.id}, ${body.isPrivate === true}) RETURNING room_id, name, is_private, created_by
        ), membership AS (
          INSERT INTO room_members(room_id, user_id)
          SELECT room_id, ${user.id} FROM new_room RETURNING room_id
        )
        SELECT r.room_id, r.name, r.is_private, r.created_by, TRUE AS joined FROM new_room r JOIN membership m USING (room_id)
      `;
      return res.status(201).json(created.rows[0]);
    }
    const roomId = body?.roomId;
    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ message: 'Salon invalide.' });
    }
    const room = await getRoomAccess(roomId, user.id);
    if (!room) {
      return res.status(404).json({ message: 'Salon introuvable.' });
    }
    if (req.method === 'POST' && body.action === 'invite') {
      if (room.created_by !== user.id || !room.joined) {
        return res.status(403).json({ message: 'Seul le créateur peut inviter.' });
      }
      if (!Number.isSafeInteger(body.userId) || body.userId <= 0) {
        return res.status(400).json({ message: 'Utilisateur invalide.' });
      }
      const target = await sql`SELECT user_id FROM users WHERE user_id=${body.userId}`;
      if (!target.rowCount) {
        return res.status(404).json({ message: 'Utilisateur introuvable.' });
      }
      await sql`INSERT INTO room_members(room_id,user_id) VALUES (${roomId},${body.userId}) ON CONFLICT DO NOTHING`;
      return res.status(200).json({ invited: true });
    }
    if (req.method === 'DELETE' && room.is_private && room.created_by === user.id) {
      return res.status(400).json({ message: 'Le créateur reste membre de son salon privé.' });
    }
    if (req.method === 'POST') {
      await sql`INSERT INTO room_members(room_id, user_id) VALUES (${roomId}, ${user.id}) ON CONFLICT DO NOTHING`;
    } else {
      await sql`DELETE FROM room_members WHERE room_id = ${roomId} AND user_id = ${user.id}`;
    }
    return res.status(200).json({ roomId, joined: req.method === 'POST' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Un salon porte déjà ce nom.' });
    }
    console.error('Rooms request failed', error.code || error.name);
    return res.status(500).json({ message: 'Impossible de gérer les salons.' });
  }
}
