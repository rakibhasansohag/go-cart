import { createClerkClient } from '@clerk/backend';
import { PrismaClient, Role } from '@prisma/client';
import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';

assertSafeE2ERuntime();

const secretKey = process.env.CLERK_SECRET_KEY;
if (!secretKey) throw new Error('CLERK_SECRET_KEY is required to sync E2E users.');

const clerk = createClerkClient({ secretKey });
const db = new PrismaClient();

const roles = [
	['E2E_CUSTOMER_EMAIL', Role.USER],
	['E2E_SELLER_EMAIL', Role.SELLER],
	['E2E_ADMIN_EMAIL', Role.ADMIN],
] as const;

async function main() {
	for (const [envKey, role] of roles) {
		const email = process.env[envKey];
		if (!email) throw new Error(`${envKey} is required to sync E2E users.`);

		const result = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
		const clerkUser = result.data[0];
		if (!clerkUser) {
			throw new Error(`No Clerk test user found for ${envKey} (${email}). Create it in the staging Clerk instance first.`);
		}

		await clerk.users.updateUserMetadata(clerkUser.id, {
			privateMetadata: { role },
		});

		const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress ?? email;
		await db.user.upsert({
			where: { id: clerkUser.id },
			update: {
				name: clerkUser.fullName || primaryEmail,
				email: primaryEmail,
				picture: clerkUser.imageUrl,
				role,
			},
			create: {
				id: clerkUser.id,
				name: clerkUser.fullName || primaryEmail,
				email: primaryEmail,
				picture: clerkUser.imageUrl,
				role,
			},
		});

		console.log(`Synchronized ${role} E2E user ${clerkUser.id}.`);
	}
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
