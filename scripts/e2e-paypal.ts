import { assertSafeE2ERuntime } from '../src/lib/runtime-safety';
import { getPayPalAccessToken } from '../src/lib/payments/paypal-client';

assertSafeE2ERuntime();

if (process.env.E2E_PAYPAL_AUTH?.toLowerCase() !== 'true') {
	throw new Error('Set E2E_PAYPAL_AUTH=true to run the PayPal sandbox authentication probe.');
}

if (!process.env.PAYPAL_CLIENT_ID && !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
	throw new Error('PAYPAL_CLIENT_ID or NEXT_PUBLIC_PAYPAL_CLIENT_ID is required.');
}

if (!process.env.PAYPAL_SECRET) {
	throw new Error('PAYPAL_SECRET is required.');
}

await getPayPalAccessToken();
console.log('PayPal sandbox OAuth authentication passed without exposing credentials.');
