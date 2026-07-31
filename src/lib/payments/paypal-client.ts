type PayPalTokenResponse = {
	access_token?: string;
};

export function getPayPalBaseUrl() {
	return process.env.PAYPAL_API_BASE_URL || 'https://api-m.sandbox.paypal.com';
}

function getPayPalCredentials() {
	const clientId =
		process.env.PAYPAL_CLIENT_ID ||
		process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
	const secret = process.env.PAYPAL_SECRET;

	if (!clientId || !secret) {
		throw new Error('PayPal server credentials are not configured.');
	}

	return { clientId, secret };
}

export async function getPayPalAccessToken() {
	const { clientId, secret } = getPayPalCredentials();
	const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Accept-Language': 'en_US',
			Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString(
				'base64',
			)}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'grant_type=client_credentials',
		cache: 'no-store',
	});

	const data = (await response.json()) as PayPalTokenResponse;

	if (!response.ok || !data.access_token) {
		throw new Error('Unable to authenticate with PayPal.');
	}

	return data.access_token;
}

export async function paypalRequest<T>(
	path: string,
	init: RequestInit = {},
): Promise<T> {
	const accessToken = await getPayPalAccessToken();
	const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
		...init,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
			...init.headers,
		},
		cache: 'no-store',
	});

	const data = (await response.json()) as T & {
		message?: string;
		details?: Array<{ description?: string }>;
	};

	if (!response.ok) {
		throw new Error(
			data.details?.[0]?.description ||
				data.message ||
				'PayPal request failed.',
		);
	}

	return data;
}

