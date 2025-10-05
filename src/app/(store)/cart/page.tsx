import CartContainer from '@/components/store/cart-page/container';
import Header from '@/components/store/layout/header/header';
import { Country } from '@/lib/types';
import { cookies } from 'next/headers';

export default async function CartPage() {
	// Get cookies from the store
	const cookieStore = cookies();
	const userCountryCookie = (await cookieStore).get('userCountry');

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

	// TODO: Update the black and light mode features

	return (
		<>
			<Header />
			<CartContainer userCountry={userCountry} />
		</>
	);
}
