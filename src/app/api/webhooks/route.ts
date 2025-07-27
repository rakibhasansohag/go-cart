import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
	try {
		// Clerk will verify and parse the webhook automatically
		const evt = await verifyWebhook(req);

		// Get the ID and type from the event
		const { id } = evt.data;
		const eventType = evt.type;

		console.log(`Received webhook with ID ${id} and event type ${eventType}`);

		// Use evt.data directly – it's already parsed
		if (eventType === 'user.created' || eventType === 'user.updated') {
			console.log('userId: ', evt.data.id);

			// User was created or updated
			console.log('User Data ===>', evt.data);
		}

		return new Response('Webhook received', { status: 200 });
	} catch (err) {
		console.error('Error verifying webhook:', err);
		return new Response('Error verifying webhook', { status: 400 });
	}
}
