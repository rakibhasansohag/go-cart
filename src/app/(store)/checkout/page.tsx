import CheckoutContainer from '@/components/store/checkout-page/container';
import Header from '@/components/store/layout/header/header';
import { db } from '@/lib/db';
import { Country } from '@/lib/types';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

const getCheckoutCountries = unstable_cache(
	() => db.country.findMany({ orderBy: { name: 'desc' } }),
	['checkout-countries'],
	{ revalidate: 24 * 60 * 60 },
);

export default async function CheckoutPage() {
	const { userId } = await auth();
	if (!userId) redirect('/sign-in?redirect_url=/checkout');

	const [cart, addresses, countries, cookieStore, loyaltyAccount] = await Promise.all([
		db.cart.findUnique({
			where: { userId },
			include: {
				cartItems: true,
				coupon: {
					include: { store: true },
				},
			},
		}),
		db.shippingAddress.findMany({
			where: { userId },
			include: { country: true, user: true },
		}),
		getCheckoutCountries(),
		cookies(),
		db.loyaltyAccount.findUnique({
			where: { userId },
			select: { balance: true },
		}),
	]);

	if (!cart) redirect('/cart');

	const userCountryCookie = cookieStore.get('userCountry');

	// Set default country if cookie is missing
	let userCountry: Country = {
		name: 'Bangladesh',
		city: '',
		code: 'BD',
		region: '',
	};

	// If cookie exists, update the user country
	if (userCountryCookie) {
		userCountry = JSON.parse(userCountryCookie.value) as Country;
	}

	return (
		<>
			<Header />
			<div className='bg-f5 min-h-[calc(100vh-65px)]'>
				<div className='max-w-container mx-auto py-4 px-2 '>
					<CheckoutContainer
						cart={cart}
						countries={countries}
						addresses={addresses}
						userCountry={userCountry}
						coinBalance={loyaltyAccount?.balance ?? 0}
					/>
				</div>
			</div>
		</>
	);
}
