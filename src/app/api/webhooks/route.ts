import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
	// You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
	const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

	if (!WEBHOOK_SECRET) {
		throw new Error(
			'Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local',
		);
	}

	// Get the headers
	const headerPayload = headers();
	const svix_id = (await headerPayload).get('svix-id');
	const svix_timestamp = (await headerPayload).get('svix-timestamp');
	const svix_signature = (await headerPayload).get('svix-signature');

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response('Error occured -- no svix headers', {
			status: 400,
		});
	}

	// Get the body
	const payload = await req.json();
	const body = JSON.stringify(payload);

	// Create a new Svix instance with your secret.
	const wh = new Webhook(WEBHOOK_SECRET);

	let evt: WebhookEvent;

	// Verify the payload with the headers
	try {
		evt = wh.verify(body, {
			'svix-id': svix_id,
			'svix-timestamp': svix_timestamp,
			'svix-signature': svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		console.error('Error verifying webhook:', err);
		return new Response('Error occured', {
			status: 400,
		});
	}
	// When user is created or updated
	if (evt.type === 'user.created' || evt.type === 'user.updated') {
		const data = evt.data;
		const primaryEmail =
			data.email_addresses.find(
				(email) => email.id === data.primary_email_address_id,
			) ?? data.email_addresses[0];

		if (!primaryEmail) {
			return new Response('User has no email address', { status: 400 });
		}

		const name =
			[data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
			primaryEmail.email_address;

		// Clerk's user ID is the stable identity key. Email can change.
		const dbUser = await db.user.upsert({
			where: {
				id: data.id,
			},
			update: {
				name,
				email: primaryEmail.email_address,
				picture: data.image_url,
			},
			create: {
				id: data.id,
				name,
				email: primaryEmail.email_address,
				picture: data.image_url,
				role: 'USER',
			},
		});

		// Avoid emitting another user.updated event when the role is unchanged.
		if (data.private_metadata.role !== dbUser.role) {
			const client = await clerkClient();
			await client.users.updateUserMetadata(data.id, {
				privateMetadata: {
					role: dbUser.role,
				},
			});
		}
	}

	// When user is deleted
	if (evt.type === 'user.deleted') {
		const userId = evt.data.id;
		if (userId) {
			await db.user.deleteMany({
				where: {
					id: userId,
				},
			});
		}
	}

	return new Response('', { status: 200 });
}
