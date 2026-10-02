import { describe, expect, it, vi } from 'vitest';

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }));
vi.mock('@/lib/email/outbox', () => ({ dispatchEmailOutboxBatch: dispatch }));
import { POST as email } from './route';
import { POST as inventory } from '../inventory/route';
import { POST as notification } from '../notification/route';
import { POST as payment } from '../payment/route';

describe('inactive Phase 26 consumers', () => {
  it.each([email, inventory, notification, payment])(
    'does not acknowledge unprocessed work or send email',
    async (handler) => {
      const response = await handler();
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ ok: false });
      expect(dispatch).not.toHaveBeenCalled();
    },
  );
});
