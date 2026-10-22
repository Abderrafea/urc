import { redis } from './redis.js';

export async function getConnecterUser(request) {
  const authorization = new Headers(request.headers).get('Authorization');
  if (!authorization?.startsWith('Bearer ') || !authorization.slice(7).trim()) {
    return null;
  }
  const token = authorization.slice(7).trim();
  const user = await redis.get(token);
  return user;
}

export async function checkSession(request) {
  const user = await getConnecterUser(request);
  // console.log(user);
  return user !== undefined && user !== null && user;
}

export function unauthorizedResponse() {
  const error = { code: 'UNAUTHORIZED', message: 'Session expired' };
  return new Response(JSON.stringify(error), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}

export function triggerNotConnected(res) {
  res.status(401).json('{code: "UNAUTHORIZED", message: "Session expired"}');
}
