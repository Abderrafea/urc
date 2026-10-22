import PushNotifications from '@pusher/push-notifications-server';
import { sql } from '@vercel/postgres';

export async function notifyMessage({ user, target, targetId, isRoom, content, message }) {
  if (process.env.PUSHER_INSTANCE_ID && process.env.PUSHER_SECRET_KEY) {
    try {
      const client = new PushNotifications({
        instanceId: process.env.PUSHER_INSTANCE_ID,
        secretKey: process.env.PUSHER_SECRET_KEY,
      });
      const recipients = isRoom
        ? (
            await sql`SELECT u.external_id FROM room_members m JOIN users u ON u.user_id = m.user_id WHERE m.room_id = ${targetId} AND m.user_id <> ${user.id}`
          ).rows.map((row) => row.external_id)
        : [target.rows[0].external_id];
      for (let offset = 0; offset < recipients.length; offset += 1000) {
        await client.publishToUsers(recipients.slice(offset, offset + 1000), {
          web: {
            notification: {
              title: isRoom ? `${user.username} · ${target.rows[0].name}` : user.username,
              body: content ? content.slice(0, 200) : 'Image partagée',
            },
            data: {
              type: 'new-message',
              senderId: user.id,
              messageId: message.id,
              ...(isRoom ? { roomId: targetId } : {}),
            },
          },
        });
      }
    } catch (error) {
      console.error('Push delivery failed', error.code || error.name);
    }
  }
}
