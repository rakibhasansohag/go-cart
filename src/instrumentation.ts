import { assertSafeE2ERuntime } from './lib/runtime-safety';

export function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		assertSafeE2ERuntime();
	}
}
