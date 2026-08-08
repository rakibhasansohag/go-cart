import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
			'server-only': fileURLToPath(
				new URL('./src/test/server-only.ts', import.meta.url),
			),
		},
	},
	test: {
		environment: 'node',
		clearMocks: true,
		exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
		},
	},
});
