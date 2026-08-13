import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const compose = ['compose', '-f', 'docker-compose.e2e.yml'];

function loadEnvFile(path: string, values: Record<string, string> = {}): Record<string, string> {
	try {
		for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
		if (!match || match[1].startsWith('#')) continue;
		const value = match[2].replace(/^['"]|['"]$/g, '');
		if (value || !(match[1] in values)) values[match[1]] = value;
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
	return values;
}

function loadE2EEnv(): Record<string, string> {
	// Reuse local staging/test credentials when present, then let the E2E file
	// override the database, safety flags, and any test-specific credentials.
	return loadEnvFile(
		'.env.e2e.local',
		loadEnvFile('.env.staging.local', loadEnvFile('.env')),
	);
}

function validatedE2EEnv(): Record<string, string> {
	const env = loadE2EEnv();
	if (env.DATABASE_URL !== env.E2E_DATABASE_URL) {
		throw new Error('DATABASE_URL and E2E_DATABASE_URL must be identical in .env.e2e.local.');
	}
	return env;
}

function run(command: string, args: string[], env?: Record<string, string>, exitOnFailure = true) {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		env: env ? { ...process.env, ...env } : process.env,
		shell: process.platform === 'win32',
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		if (exitOnFailure) process.exit(result.status ?? 1);
		return result.status ?? 1;
	}
	return 0;
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
	const env = validatedE2EEnv();
	run('docker', [...compose, 'up', '-d', 'postgres']);
	run('bun', ['x', 'prisma', 'migrate', 'deploy'], env);
	if (env.E2E_PROTECTED?.toLowerCase() === 'true') {
		run('bun', ['prisma/sync-e2e-users.ts'], env);
	}
	run('bun', ['prisma/seed-demo.ts'], env);
	if (env.E2E_COMMERCE?.toLowerCase() === 'true') {
		run('bun', ['prisma/seed-e2e-commerce.ts'], env);
	}
} else if (action === 'sync-users') {
	const env = validatedE2EEnv();
	run('docker', [...compose, 'up', '-d', 'postgres']);
	run('bun', ['prisma/sync-e2e-users.ts'], env);
} else if (action === 'integration') {
	const env = validatedE2EEnv();
	run('docker', [...compose, 'up', '-d', 'postgres']);
	run('bun', ['x', 'prisma', 'migrate', 'deploy'], env);
	run('bun', ['prisma/integration-check.ts'], env);
} else if (action === 'stripe-refund') {
	const env = validatedE2EEnv();
	const stripeRefundEnv = { ...env, E2E_STRIPE_REFUND: env.E2E_STRIPE_REFUND ?? process.env.E2E_STRIPE_REFUND ?? '' };
	if (stripeRefundEnv.E2E_STRIPE_REFUND?.toLowerCase() !== 'true') {
		throw new Error('Set E2E_STRIPE_REFUND=true to run the external Stripe refund test.');
	}
	run('docker', [...compose, 'up', '-d', 'postgres']);
	run('bun', ['x', 'prisma', 'migrate', 'deploy'], stripeRefundEnv);
	if (env.E2E_PROTECTED?.toLowerCase() === 'true') run('bun', ['prisma/sync-e2e-users.ts'], stripeRefundEnv);
	run('bun', ['prisma/seed-demo.ts'], stripeRefundEnv);
	run('bun', ['prisma/seed-e2e-commerce.ts'], stripeRefundEnv);
	run('bun', ['scripts/e2e-stripe-refund.ts'], stripeRefundEnv);
} else if (action === 'stripe-browser-refund') {
	const env = validatedE2EEnv();
	const browserRefundEnv = { ...env, E2E_BROWSER_REFUND: env.E2E_BROWSER_REFUND ?? process.env.E2E_BROWSER_REFUND ?? '', E2E_SKIP_BROWSER_INSTALL: 'true' };
	if (browserRefundEnv.E2E_BROWSER_REFUND?.toLowerCase() !== 'true') {
		throw new Error('Set E2E_BROWSER_REFUND=true to run the browser refund test.');
	}
	let testStatus = 1;
	try {
		run('bun', ['--no-env-file', 'scripts/e2e-local.ts', 'prepare'], browserRefundEnv);
		run('bun', ['scripts/e2e-stripe-browser-refund.ts', 'setup'], browserRefundEnv);
		testStatus = run('bun', ['--no-env-file', 'scripts/e2e-local.ts', 'test', 'e2e/protected/provider-refund.spec.ts', '--project=protected-chromium', '--workers=1'], browserRefundEnv, false);
		if (testStatus === 0) run('bun', ['scripts/e2e-stripe-browser-refund.ts', 'verify'], browserRefundEnv);
	} finally {
		// Recreate the deterministic request/payment fixture even if the browser fails midway.
		run('bun', ['--no-env-file', 'scripts/e2e-local.ts', 'prepare'], browserRefundEnv);
	}
	if (testStatus !== 0) process.exit(testStatus);
} else if (action === 'paypal-auth') {
	const env = validatedE2EEnv();
	const paypalEnv = { ...env, E2E_PAYPAL_AUTH: env.E2E_PAYPAL_AUTH ?? process.env.E2E_PAYPAL_AUTH ?? '' };
	if (paypalEnv.E2E_PAYPAL_AUTH?.toLowerCase() !== 'true') {
		throw new Error('Set E2E_PAYPAL_AUTH=true to run the external PayPal sandbox authentication probe.');
	}
	run('bun', ['scripts/e2e-paypal.ts'], paypalEnv);
} else if (action === 'server') {
	const env = validatedE2EEnv();
	// Preparation already generated Prisma and applied migrations. Starting
	// Next directly avoids a second Prisma generate, which can lock the Windows
	// query-engine DLL when the normal dev server is open.
	run('bun', ['x', 'next', 'dev', '--webpack'], {
		...env,
		PORT: env.E2E_PORT ?? '3100',
	});
} else if (action === 'server:prod') {
	const env = validatedE2EEnv();
	// Production-mode E2E avoids repeated cold development compilation on
	// Windows while still using the isolated database and Clerk test users.
	run('bun', ['x', 'next', 'start'], {
		...env,
		PORT: env.E2E_PORT ?? '3100',
	});
} else if (action === 'build:e2e') {
	const env = validatedE2EEnv();
	run('bun', ['prisma', 'generate'], env);
	run('bun', ['x', 'next', 'build'], env);
} else if (action === 'test') {
	const env = validatedE2EEnv();
	// Playwright keeps browser binaries outside node_modules. Installing the
	// selected browser here makes a fresh developer machine self-starting.
	if (env.E2E_SKIP_BROWSER_INSTALL?.toLowerCase() !== 'true') {
		run('bunx', ['playwright', 'install', 'chromium']);
	}
	run('bunx', ['playwright', 'test', ...process.argv.slice(3)], env);
} else {
	throw new Error(`Unknown action: ${action}. Use up, prepare, sync-users, integration, stripe-refund, stripe-browser-refund, paypal-auth, server, server:prod, build:e2e, test, reset, or down.`);
}
