import { sql } from '@vercel/postgres';
import { redis } from '../lib/redis.js';
import { arrayBufferToBase64, stringToArrayBuffer } from '../lib/base64.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ message: 'Requête invalide.' }, { status: 400 });
    }
    const { username, password } = body || {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password ||
      username.length > 50 ||
      password.length > 256
    ) {
      return Response.json({ message: 'Identifiants invalides.' }, { status: 400 });
    }
    const hash = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(username + password));
    const hashed64 = arrayBufferToBase64(hash);

    const { rowCount, rows } =
      await sql`select * from users where username = ${username} and password = ${hashed64}`;
    if (rowCount !== 1) {
      const error = { code: 'UNAUTHORIZED', message: 'Identifiant ou mot de passe incorrect' };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    } else {
      await sql`update users set last_login = now() where user_id = ${rows[0].user_id}`;
      const token = crypto.randomUUID().toString();
      const user = {
        id: rows[0].user_id,
        username: rows[0].username,
        email: rows[0].email,
        externalId: rows[0].external_id,
      };
      await redis.set(token, user, { ex: 3600 });
      const userInfo = {};
      userInfo[user.id] = user;
      await redis.hset('users', userInfo);

      return new Response(
        JSON.stringify({
          token: token,
          username: username,
          externalId: rows[0].external_id,
          id: rows[0].user_id,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
  } catch (error) {
    console.log(error);
    return new Response(JSON.stringify({ message: 'Connexion indisponible.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
