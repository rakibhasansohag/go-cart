import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const compose = ['compose', '-f', 'docker-compose.e2e.yml'];

function loadEnvFile(path: string): Record<string, string> {
	const values: Record<string, string> = {};
	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (!match || match[1].startsWith('#')) continue;
		values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
	}
	return values;
}

function run(command: string, args: string[], env?: Record<string, string>) {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		env: env ? { ...process.env, ...env } : process.env,
		shell: process.platform === 'win32',
	});
	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status ?? 1);
}

const action = process.argv[2] ?? 'prepare';

if (action === 'up') {
	run('docker', [...compose, 'up', '-d', 'postgres']);
} else if (action === 'down') {
	run('docker', [...compose, 'down']);
} else if (action === 'reset') {
	run('docker', [...compose, 'down', '-v']);
	run('docker', [...compose, 'up', '-d', 'postgres']);
} else if (action === 'prepare') {
	const env = loadEnvFile('.env.e2e.local');
	if (env.DATABASE_URL !== env.E2E_DATABASE_URL) {
		throw new Error('DATABASE_URL and E2E_DATABASE_URL must be identical in .env.e2e.local.');
	}
	run('docker', [...compose, 'up', '-d', 'postgres']);
	run('bun', ['x', 'prisma', 'migrate', 'deploy'], env);
	run('bun', ['prisma/seed-demo.ts'], env);
} else if (action === 'test') {
	const env = loadEnvFile('.env.e2e.local');
	if (env.DATABASE_URL !== env.E2E_DATABASE_URL) {
		throw new Error('DATABASE_URL and E2E_DATABASE_URL must be identical in .env.e2e.local.');
	}
	// Playwright keeps browser binaries outside node_modules. Installing the
	// selected browser here makes a fresh developer machine self-starting.
	run('bunx', ['playwright', 'install', 'chromium']);
	run('bunx', ['playwright', 'test', ...process.argv.slice(3)], env);
} else {
	throw new Error(`Unknown action: ${action}. Use up, prepare, test, reset, or down.`);
}
