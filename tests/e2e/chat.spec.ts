import { test, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import type { Session } from '../../src/model/common';

type TestAccount = Session & { id: number; username: string; password: string };

import { sql, db } from '@vercel/postgres';
import { Redis } from '@upstash/redis';
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3400';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);
test('parcours complet, confidentialité et mobile', async ({ browser, request }) => {
  const redis = new Redis({
    url: process.env.REDIS_KV_REST_API_URL!,
    token: process.env.REDIS_KV_REST_API_TOKEN!,
  });
  const accounts: TestAccount[] = [];
  let roomId: number | undefined;
  const contexts: BrowserContext[] = [];
  try {
    for (let i = 0; i < 3; i++) {
      const username = 'e2e_' + crypto.randomUUID().slice(0, 12),
        password = 'Pass-ubo-2026';
      expect(
        (
          await request.post('/api/register', {
            data: { username, email: username + '@example.invalid', password },
          })
        ).status(),
      ).toBe(201);
      const response = await request.post('/api/login', { data: { username, password } });
      expect(response.status()).toBe(200);
      accounts.push({ ...(await response.json()), password });
    }
    const [a, b, c] = accounts;
    const headers = (p: TestAccount) => ({ Authorization: 'Bearer ' + p.token });
    const contextA = await browser.newContext(),
      contextB = await browser.newContext();
    contexts.push(contextA, contextB);
    const pageA = await contextA.newPage(),
      pageB = await contextB.newPage();
    for (const [page, p] of [
      [pageA, a],
      [pageB, b],
    ] as const) {
      await page.goto(base + '/login');
      await page.getByLabel('Identifiant', { exact: true }).fill(p.username);
      await page.getByLabel('Mot de passe', { exact: true }).fill(p.password);
      await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
      await expect(page).toHaveURL(/messages/);
    }
    await pageA.goto(base + '/messages/user/' + b.id);
    await pageA.getByLabel('Votre message', { exact: true }).fill('Bonjour privé');
    await pageA.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(pageA.getByText('Bonjour privé', { exact: true })).toBeVisible();
    await expect(
      pageB.getByRole('link').filter({ hasText: a.username }).getByLabel('1 messages non lus'),
    ).toBeVisible();
    await pageB.goto(base + '/messages/user/' + a.id);
    await expect(pageB.getByText('Bonjour privé', { exact: true })).toBeVisible();
    const message = pageB.getByRole('article').filter({ hasText: 'Bonjour privé' });
    await message.getByRole('button', { name: /👍/ }).click();
    await expect(message.getByRole('button', { name: /👍/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await message.getByRole('button', { name: /Répondre/ }).click();
    await pageB.getByLabel('Votre réponse dans le fil').fill('Réponse dans le fil');
    await pageB.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(pageB.getByText('Réponse dans le fil', { exact: true })).toBeVisible();
    await pageA.reload();
    await expect(pageA.getByRole('button', { name: /Répondre · 1/ })).toBeVisible();
    await pageA
      .getByLabel('Image ou GIF (1 Mo maximum)')
      .setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png });
    await pageA.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(pageA.getByAltText('pixel.png')).toBeVisible();
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    await pageA
      .getByLabel('Image ou GIF (1 Mo maximum)')
      .setInputFiles({ name: 'animation.gif', mimeType: 'image/gif', buffer: gif });
    await pageA.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(pageA.getByAltText('animation.gif')).toBeVisible();
    const hist = await (
      await request.get('/api/message?user_id=' + b.id, { headers: headers(a) })
    ).json();
    const attachment = hist.find((m: { attachment?: { id: string } }) => m.attachment).attachment;
    expect(
      (await request.get('/api/attachment?id=' + attachment.id, { headers: headers(c) })).status(),
    ).toBe(404);
    expect(
      (await request.get('/api/attachment?id=' + attachment.id, { headers: headers(b) })).status(),
    ).toBe(200);
    const roomName = 'Privé ' + crypto.randomUUID().slice(0, 8);
    await pageA.getByLabel('Créer un salon', { exact: true }).fill(roomName);
    await pageA.getByLabel('Salon privé, sur invitation').check();
    await pageA.getByRole('button', { name: 'Créer le salon', exact: true }).click();
    await expect(pageA).toHaveURL(/messages\/room\/\d+/);
    roomId = Number(pageA.url().split('/').pop());
    const outsiders = await (await request.get('/api/rooms', { headers: headers(c) })).json();
    expect(outsiders.some((r: { room_id: number }) => r.room_id === roomId)).toBe(false);
    expect(
      (await request.get('/api/message?room_id=' + roomId, { headers: headers(c) })).status(),
    ).toBe(404);
    expect(
      (await request.post('/api/rooms', { headers: headers(c), data: { roomId } })).status(),
    ).toBe(404);
    await pageA.getByLabel('Ajouter un membre au salon privé').selectOption(String(b.id));
    await pageA.getByRole('button', { name: 'Inviter', exact: true }).click();
    await expect(pageA.getByText('Utilisateur ajouté au salon.')).toBeVisible();
    await pageB.goto(base + '/messages/room/' + roomId);
    await pageB.getByLabel('Votre message', { exact: true }).fill('Bonjour au groupe privé');
    await pageB.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(pageA.getByText('Bonjour au groupe privé', { exact: true })).toBeVisible();
    await pageB
      .getByLabel('Image ou GIF (1 Mo maximum)')
      .setInputFiles({ name: 'secret.png', mimeType: 'image/png', buffer: png });
    await pageB.getByRole('button', { name: 'Envoyer', exact: true }).click();
    await expect(pageB.getByAltText('secret.png')).toBeVisible();
    const roomHistory = await (
      await request.get('/api/message?room_id=' + roomId, { headers: headers(a) })
    ).json();
    const privateFile = roomHistory.find(
      (m: { attachment?: { id: string } }) => m.attachment,
    ).attachment;
    expect(
      (await request.get('/api/attachment?id=' + privateFile.id, { headers: headers(c) })).status(),
    ).toBe(404);
    await pageA.screenshot({ path: 'test-results/desktop.png', fullPage: true });
    await pageA.setViewportSize({ width: 390, height: 844 });
    await pageA.getByRole('button', { name: 'Envoyer', exact: true }).scrollIntoViewIfNeeded();
    expect(
      await pageA.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await pageA.evaluate(() => window.scrollTo(0, 0));
    await pageA.screenshot({ path: 'test-results/mobile.png', fullPage: true });
    await Promise.all([
      pageB.waitForResponse(
        (response) =>
          response.url().endsWith('/api/rooms') && response.request().method() === 'DELETE',
      ),
      pageB.getByRole('button', { name: 'Quitter le salon' }).click(),
    ]);
    expect(
      (await request.get('/api/message?room_id=' + roomId, { headers: headers(b) })).status(),
    ).toBe(404);
    const browserSession = await pageA.evaluate(
      () => JSON.parse(sessionStorage.getItem('urc-session')!).state.session,
    );
    await Promise.all([
      pageA.waitForResponse((response) => response.url().endsWith('/api/logout')),
      pageA.getByRole('button', { name: 'Se déconnecter' }).click(),
    ]);
    await expect(pageA).toHaveURL(/login/);
    expect(
      (
        await request.get('/api/users', {
          headers: { Authorization: 'Bearer ' + browserSession.token },
        })
      ).status(),
    ).toBe(401);
  } finally {
    for (const context of contexts) {
      for (const page of context.pages()) {
        try {
          const saved = await page.evaluate(() => sessionStorage.getItem('urc-session'));
          const token = saved ? JSON.parse(saved).state?.session?.token : null;
          if (token) {
            await redis.del(token);
          }
        } catch {
          // La page peut être fermée ou la ressource temporaire déjà supprimée.
        }
      }
      await context.close();
    }
    if (roomId) {
      await redis.del(`room:${roomId}:messages`, `room:${roomId}:messages:reactions`);
      for (const p of accounts) {
        await redis.del(`read:${p.id}:room:${roomId}:messages`);
      }
      await sql`DELETE FROM rooms WHERE room_id=${roomId}`;
    }
    for (const a of accounts) {
      for (const b of accounts) {
        if (a.id === b.id) {
          continue;
        }
        const key = 'conversation:' + [a.id, b.id].sort((x, y) => x - y).join(':');
        await redis.del(key, key + ':reactions', `read:${a.id}:${key}`);
      }
      await redis.del(a.token);
      await redis.hdel('users', String(a.id));
      await sql`DELETE FROM users WHERE user_id=${a.id}`;
    }
    await db.end();
  }
});
