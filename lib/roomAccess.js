import { sql } from '@vercel/postgres';
export async function getRoomAccess(roomId, userId) {
  const result = await sql`SELECT r.*, EXISTS(SELECT 1 FROM room_members m WHERE m.room_id=r.room_id AND m.user_id=${userId}) AS joined FROM rooms r WHERE r.room_id=${roomId}`;
  const room = result.rows[0];
  return room && (!room.is_private || room.joined) ? room : null;
}
