import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
vi.mock('@pusher/push-notifications-web', () => ({
  Client: class {
    async start() {}
    async stop() {}
    async getDeviceId() {
      return null;
    }
    async setUserId() {}
  },
  TokenProvider: class {},
}));
import { Notifications } from './Notifications';
import { useStore } from '../../store/useStore';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'serviceWorker');
  useStore.setState({ session: null });
});
test('le refus navigateur est expliqué sans lancer Pusher', async () => {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} });
  vi.stubGlobal('isSecureContext', true);
  const requestPermission = vi.fn().mockResolvedValue('denied');
  vi.stubGlobal('Notification', { requestPermission });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ configured: true, instanceId: 'instance-test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  useStore.setState({ session: { token: 'test', externalId: 'test', id: 1 } });
  render(<Notifications />);
  fireEvent.click(await screen.findByRole('button', { name: 'Activer les notifications' }));
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toMatch(/Notifications refusées/),
  );
  expect(requestPermission).toHaveBeenCalledOnce();
});

test('aucun faux succès si le navigateur ne crée pas d’abonnement Push', async () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: vi
        .fn()
        .mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } }),
    },
  });
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted') });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ configured: true, instanceId: 'instance-test' }), {
        status: 200,
      }),
    ),
  );
  useStore.setState({ session: { token: 'test', externalId: 'test', id: 1 } });
  render(<Notifications />);
  fireEvent.click(await screen.findByRole('button', { name: 'Activer les notifications' }));
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toMatch(/Activation impossible/),
  );
  expect(screen.queryByText('Notifications activées.')).toBeNull();
});
