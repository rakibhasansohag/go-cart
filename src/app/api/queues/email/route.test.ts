import { afterEach, describe, expect, it, vi } from 'vitest';

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));
vi.mock('@/lib/email/outbox', () => ({ dispatchEmailOutboxBatch: dispatch }));
import { POST as email } from './route';
import { POST as inventory } from '../inventory/route';
import { POST as notification } from '../notification/route';
import { POST as payment } from '../payment/route';
import { POST as cron } from '../cron/route';
import { POST as workflow } from '../workflow/route';

afterEach(() => vi.unstubAllEnvs());

describe('inactive Phase 26 consumers', () => {
  it.each([email, inventory, notification, payment, cron, workflow])(
    'does not acknowledge unprocessed work or send email',
    async (handler) => {
      vi.stubEnv('PHASE26_ENABLED', 'false');
      const response = await handler(new Request('http://localhost/api/queues/test', { method: 'POST' }));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ ok: false });
      expect(dispatch).not.toHaveBeenCalled();
    },
  );
  it.each([email, inventory, notification, payment, cron, workflow])('rejects unauthenticated local callbacks when enabled', async handler => {
    vi.stubEnv('PHASE26_ENABLED', 'true');
    vi.stubEnv('VERCEL', '');
    const response = await handler(new Request('http://localhost/api/queues/test', { method: 'POST', body: '{}' }));
    expect(response.status).toBe(401);
  });
});
