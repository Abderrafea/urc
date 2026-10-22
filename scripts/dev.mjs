import { createServer as createHttpServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createServer as createViteServer } from 'vite';
const port = Number(process.env.PORT || 3400);
let vite;
const server = createHttpServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + port);
  if (!url.pathname.startsWith('/api/')) return vite.middlewares(req, res);
  const match = /^\/api\/([a-z]+)$/.exec(url.pathname);
  if (!match) {
    res.writeHead(404);
    res.end();
    return;
  }
  const allowed = new Set([
    'login',
    'logout',
    'register',
    'users',
    'rooms',
    'message',
    'beams',
    'attachment',
    'reaction',
    'unread',
  ]);
  if (!allowed.has(match[1])) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        res.writeHead(413);
        res.end();
        return;
      }
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks);
    const module = await import(pathToFileURL(resolve('api', match[1] + '.js')).href);
    if (module.config?.runtime === 'edge') {
      const response = await module.default(
        new Request(url, {
          method: req.method,
          headers: req.headers,
          ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: raw }),
        }),
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } else {
      req.query = Object.fromEntries(url.searchParams);
      req.body = raw.length ? raw.toString() : undefined;
      if (req.headers['content-type']?.includes('application/json') && raw.length) {
        try {
          req.body = JSON.parse(raw.toString());
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Requête JSON invalide.' }));
          return;
        }
      }
      res.status = (status) => {
        res.statusCode = status;
        return res;
      };
      res.json = (body) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
        return res;
      };
      res.send = (body) => {
        if (typeof body === 'object' && !Buffer.isBuffer(body)) return res.json(body);
        res.end(body);
        return res;
      };
      await module.default(req, res);
    }
  } catch (error) {
    console.error('API locale indisponible:', error.code || error.name);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Service indisponible.' }));
  }
});
vite = await createViteServer({
  server: { middlewareMode: true, hmr: { server } },
  appType: 'spa',
});
server.listen(port, '127.0.0.1', () => console.log(`URC (React + API) : http://127.0.0.1:${port}`));
