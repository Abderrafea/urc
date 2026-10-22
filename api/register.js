import { sql } from '@vercel/postgres';
import { arrayBufferToBase64, stringToArrayBuffer } from '../lib/base64.js';

export const config = { runtime: 'edge' };
const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ message: 'Requête JSON invalide.' }, 400);
  }
  const username = typeof data?.username === 'string' ? data.username.trim() : '';
  const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data?.password === 'string' ? data.password : '';
  if (
    !username ||
    username.length > 50 ||
    !email ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password.trim() ||
    password.length > 256
  ) {
    return json(
      {
        message:
          'Renseignez un identifiant (50 caractères maximum), un email valide et un mot de passe (256 caractères maximum).',
      },
      400,
    );
  }
  try {
    const existing =
      await sql`SELECT user_id FROM users WHERE username = ${username} OR email = ${email}`;
    if (existing.rowCount) {
      return json({ message: 'Cet identifiant ou cet email est déjà utilisé.' }, 409);
    }
    const digest = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(username + password));
    const hashed = arrayBufferToBase64(digest);
    const externalId = crypto.randomUUID();
    await sql`INSERT INTO users (username, email, password, external_id, created_on) VALUES (${username}, ${email}, ${hashed}, ${externalId}, NOW())`;
    return json({ message: 'Compte créé. Vous pouvez vous connecter.' }, 201);
  } catch (error) {
    if (error.code === '23505') {
      return json({ message: 'Cet identifiant ou cet email est déjà utilisé.' }, 409);
    }
    console.error('Registration failed', error.code || error.name);
    return json({ message: 'Impossible de créer le compte. Réessayez.' }, 500);
  }
}
