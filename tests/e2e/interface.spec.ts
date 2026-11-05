import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Message, PublicUser, Room } from '../../src/model/chat';

interface SentMessage {
  content: string;
  targetUserId?: number;
  roomId?: number;
  replyTo?: string;
}

// These tests exercise the interface without contacting the database or Pusher.
async function mockMessaging(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'urc-session',
      JSON.stringify({
        state: {
          session: {
            id: 1,
            username: 'Mayka',
            externalId: 'interface-test',
            token: 'local-interface-test',
          },
        },
        version: 0,
      }),
    );
  });

  const users: PublicUser[] = [
    { user_id: 1, username: 'Mayka', last_login: null },
    { user_id: 2, username: 'Alice', last_login: '2026-10-22 09:00' },
    { user_id: 3, username: 'Bastien', last_login: null },
  ];
  const rooms: Room[] = [
    { room_id: 10, name: 'Général', joined: true, is_private: false, created_by: 1 },
    { room_id: 11, name: 'Projet web', joined: true, is_private: true, created_by: 2 },
  ];
  const history = new Map<string, Message[]>([
    [
      'user:2',
      [
        {
          id: 'welcome-message',
          senderId: 2,
          senderName: 'Alice',
          content: 'On avance sur le projet ensemble ?',
          createdAt: '2026-10-22T09:00:00.000Z',
        },
      ],
    ],
  ]);
  const sent: SentMessage[] = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname === '/api/users') {
      await route.fulfill({ json: users });
    } else if (url.pathname === '/api/rooms' && method === 'GET') {
      await route.fulfill({ json: rooms });
    } else if (url.pathname === '/api/rooms' && method === 'POST') {
      const body = request.postDataJSON() as { name: string; isPrivate: boolean };
      const room = {
        room_id: 12,
        name: body.name,
        is_private: body.isPrivate,
        joined: true,
        created_by: 1,
      };
      rooms.push(room);
      await route.fulfill({ status: 201, json: room });
    } else if (url.pathname === '/api/unread') {
      await route.fulfill({ json: method === 'GET' ? { 'user:2': 1 } : { success: true } });
    } else if (url.pathname === '/api/beams') {
      await route.fulfill({ json: { configured: false, instanceId: null } });
    } else if (url.pathname === '/api/message' && method === 'GET') {
      const key = url.searchParams.has('room_id')
        ? `room:${url.searchParams.get('room_id')}`
        : `user:${url.searchParams.get('user_id')}`;
      await route.fulfill({ json: history.get(key) || [] });
    } else if (url.pathname === '/api/message' && method === 'POST') {
      const body = request.postDataJSON() as SentMessage;
      sent.push(body);
      const message: Message = {
        id: `sent-${sent.length}`,
        senderId: 1,
        senderName: 'Mayka',
        content: body.content,
        createdAt: new Date().toISOString(),
        ...(body.replyTo ? { replyTo: body.replyTo } : {}),
      };
      const key = body.roomId ? `room:${body.roomId}` : `user:${body.targetUserId}`;
      history.set(key, [...(history.get(key) || []), message]);
      await route.fulfill({ status: 201, json: message });
    } else if (url.pathname === '/api/logout') {
      await route.fulfill({ json: { success: true } });
    } else {
      await route.fulfill({ status: 404, json: { message: 'Unexpected mocked API request.' } });
    }
  });

  return { sent };
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test('recherche, salons et panneaux du compte', async ({ page }) => {
  await mockMessaging(page);
  await page.goto('/messages');

  const usersTab = page.getByRole('button', { name: 'Utilisateurs', exact: true });
  const roomsTab = page.getByRole('button', { name: 'Salons', exact: true });
  const search = page.getByRole('searchbox', { name: 'Rechercher une conversation' });
  await expect(usersTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: /Alice/ })).toBeVisible();
  await search.fill('bastien');
  await expect(page.getByRole('link', { name: /Bastien/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Alice/ })).toHaveCount(0);

  await search.clear();
  await roomsTab.click();
  await expect(roomsTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: /Général/ })).toBeVisible();
  await search.fill('projet');
  await expect(page.getByRole('link', { name: /Projet web/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Général/ })).toHaveCount(0);
  await search.fill('general');
  await expect(page.getByRole('link', { name: /Général/ })).toBeVisible();
  await search.clear();
  await page.locator('summary').filter({ hasText: 'Créer un salon' }).click();
  await page.getByLabel('Créer un salon', { exact: true }).fill('Atelier interface');
  await page.getByRole('button', { name: 'Créer le salon', exact: true }).click();
  await expect(page).toHaveURL(/messages\/room\/12$/);
  await expect(page.getByRole('heading', { name: /Atelier interface/ })).toBeVisible();

  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Les notifications seront disponibles après configuration de Pusher.',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeFocused();

  await page.getByRole('button', { name: 'Mon profil', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Mayka');
  await page.getByRole('dialog').getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/login$/);
});

test('envoi de message et préférence de lecture compacte', async ({ page }) => {
  const { sent } = await mockMessaging(page);
  await page.goto('/messages/user/2');
  const received = page.getByRole('article').filter({ hasText: 'On avance sur le projet' });
  await expect(received).toBeVisible();
  await expect(page.getByRole('button', { name: /Appel vidéo/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Appel vocal/ })).toBeDisabled();
  const padding = await received.evaluate((element) =>
    parseFloat(getComputedStyle(element).paddingTop),
  );

  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Messages compacts' }).check();
  await page.keyboard.press('Escape');
  await expect
    .poll(() => received.evaluate((element) => parseFloat(getComputedStyle(element).paddingTop)))
    .toBeLessThan(padding);
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Messages compacts' })).toBeChecked();
  await page.keyboard.press('Escape');

  const sendButton = page.getByRole('button', { name: 'Envoyer', exact: true });
  const attachment = page.getByLabel('Image ou GIF (1 Mo maximum)');
  await expect(sendButton).toBeDisabled();
  await attachment.setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByRole('button', { name: 'Retirer pixel.png' })).toBeVisible();
  await expect(sendButton).toBeEnabled();
  await page.getByRole('button', { name: 'Retirer pixel.png' }).click();
  await expect(attachment).toHaveValue('');
  await expect(sendButton).toBeDisabled();

  await received.getByRole('button', { name: /Répondre/ }).click();
  await expect(page.getByRole('heading', { name: 'Fil de discussion' })).toBeVisible();
  await expect(page.getByLabel('Votre réponse dans le fil')).toBeVisible();
  await page.getByRole('button', { name: 'Retour à la conversation' }).click();
  await expect(page.getByLabel('Votre message', { exact: true })).toBeVisible();
  await expect(received).toBeVisible();

  await page
    .getByLabel('Votre message', { exact: true })
    .fill('Oui, la nouvelle interface est prête.');
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(
    page.getByRole('article').filter({ hasText: 'Oui, la nouvelle interface est prête.' }),
  ).toBeVisible();
  expect(sent).toEqual([{ targetUserId: 2, content: 'Oui, la nouvelle interface est prête.' }]);
  await expect(page.getByLabel('Votre message', { exact: true })).toHaveValue('');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: 'test-results/interface-desktop.png', fullPage: true });
});

test('navigation mobile et composition sans débordement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockMessaging(page);
  await page.goto('/messages');
  await expectNoHorizontalOverflow(page);
  await page.getByRole('link', { name: /Alice/ }).click();
  await expect(page).toHaveURL(/messages\/user\/2$/);
  await expect(page.getByRole('button', { name: 'Utilisateurs', exact: true })).not.toBeVisible();
  await expect(page.getByLabel('Votre message', { exact: true })).toBeVisible();
  await page.getByLabel('Votre message', { exact: true }).fill('Bonjour depuis le mobile !');
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(
    page.getByRole('article').filter({ hasText: 'Bonjour depuis le mobile !' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const sendBounds = await page.getByRole('button', { name: 'Envoyer', exact: true }).boundingBox();
  expect(sendBounds).not.toBeNull();
  expect(sendBounds!.y + sendBounds!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: 'test-results/interface-mobile.png', fullPage: true });

  await page.getByRole('link', { name: 'Retour aux conversations' }).click();
  await expect(page.getByRole('button', { name: 'Utilisateurs', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salons', exact: true }).click();
  await page.getByRole('link', { name: /Général/ }).click();
  await expect(page).toHaveURL(/messages\/room\/10$/);
  await expect(page.getByLabel('Votre message', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.screenshot({ path: 'test-results/interface-mobile-room.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 640 });
  await expectNoHorizontalOverflow(page);
  const roomSendBounds = await page
    .getByRole('button', { name: 'Envoyer', exact: true })
    .boundingBox();
  expect(roomSendBounds).not.toBeNull();
  expect(roomSendBounds!.y + roomSendBounds!.height).toBeLessThanOrEqual(640);
  await page.getByRole('link', { name: 'Retour aux conversations' }).click();
  await page.getByRole('button', { name: 'Paramètres', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
