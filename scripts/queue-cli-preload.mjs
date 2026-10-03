import { mock } from 'bun:test';

// Bun runs these server scripts outside Next's React server export condition.
// This bypasses only the browser bundler marker, never app authorization.
mock.module('server-only', () => ({}));
