import { test, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import type { Session } from '../../src/model/common';

type TestAccount = Session & { id: number; username: string; password: string };

import { sql, db } from '@vercel/postgres';
import { Redis } from '@upstash/redis';
import PushNotifications from '@pusher/push-notifications-server';

type PushWindow = Window & { chrome?: unknown; lastPush?: { type?: string } | null };
type PushWorker = typeof self & {
  PusherPushNotifications: {
    onNotificationReceived: (event: {
      pushEvent: { waitUntil: (promise: Promise<unknown>) => void };
      payload: { data: { type: string } };
      handleNotification: () => Promise<void>;
    }) => void;
  };
};
test.use({
  channel: 'chromium',
  launchOptions: { ignoreDefaultArgs: ['--disable-background-networking'] },
});
test('notification Web Push réelle', async ({ browser, request }) => {
  test.skip(process.env.RUN_PUSH_E2E !== '1', 'Test externe explicite seulement.');
  test.setTimeout(120000);
  const accounts: TestAccount[] = [];
  let context: BrowserContext | undefined;
  const redis = new Redis({
    url: process.env.REDIS_KV_REST_API_URL!,
    token: process.env.REDIS_KV_REST_API_TOKEN!,
  });
  try {
    for (let i = 0; i < 2; i++) {
      const username = 'push_' + crypto.randomUUID().slice(0, 12),
        password = 'Test-push-2026';
      expect(
        (
          await request.post('/api/register', {
            data: { username, email: username + '@example.invalid', password },
          })
        ).status(),
      ).toBe(201);
      const response = await request.post('/api/login', { data: { username, password } });
      accounts.push({ ...(await response.json()), password });
    }
    const [a, b] = accounts;
    context = await browser.newContext({ permissions: ['notifications'] });
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('Identifiant', { exact: true }).fill(b.username);
    await page.getByLabel('Mot de passe', { exact: true }).fill(b.password);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL(/messages/);
    console.log(
      'Navigateur Push',
      await page.evaluate(() => ({
        vendor: navigator.vendor,
        chromium: typeof (window as PushWindow).chrome !== 'undefined',
        secure: isSecureContext,
      })),
    );
    await page.getByRole('button', { name: 'Activer les notifications' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Notifications activées.' }),
    ).toBeVisible({ timeout: 45000 });
    await page.evaluate(() => {
      (window as PushWindow).lastPush = null;
      navigator.serviceWorker.addEventListener('message', (event) => {
        (window as PushWindow).lastPush = event.data;
      });
    });
    const worker = context.serviceWorkers()[0];
    expect(worker).toBeTruthy();
    await worker.evaluate(async () => {
      let pending: Promise<unknown> | undefined;
      (self as PushWorker).PusherPushNotifications.onNotificationReceived({
        pushEvent: {
          waitUntil: (promise: Promise<unknown>) => {
            pending = promise;
          },
        },
        payload: { data: { type: 'worker-check' } },
        handleNotification: async () => {},
      });
      await pending;
    });
    await page.waitForFunction(() => (window as PushWindow).lastPush?.type === 'worker-check');
    await page.evaluate(() => {
      (window as PushWindow).lastPush = null;
    });
    expect(
      (
        await request.post('/api/message', {
          headers: { Authorization: 'Bearer ' + a.token },
          data: { targetUserId: b.id, content: 'Test de notification réelle' },
        })
      ).status(),
    ).toBe(201);
    try {
      await page.waitForFunction(
        () => (window as PushWindow).lastPush?.type === 'new-message',
        undefined,
        { timeout: 45000 },
      );
    } catch (error) {
      console.log(
        'Diagnostic Push',
        await page.evaluate(async () => {
          const r = await navigator.serviceWorker.ready;
          return {
            subscriptionPresent: Boolean(await r.pushManager.getSubscription()),
            notificationsReceived: (await r.getNotifications()).length,
            workerActive: r.active?.state,
          };
        }),
      );
      throw error;
    }
  } finally {
    if (context) {
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
    const client = new PushNotifications({
      instanceId: process.env.PUSHER_INSTANCE_ID!,
      secretKey: process.env.PUSHER_SECRET_KEY!,
    });
    for (const a of accounts) {
      try {
        await client.deleteUser(a.externalId);
      } catch {
        // La page peut être fermée ou la ressource temporaire déjà supprimée.
      }
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
