'use client';
import { CartWithCartItemsType, UserShippingAddressType } from '@/lib/types';
import { Country, ShippingAddress } from '@prisma/client';
import { FC, useEffect, useState } from 'react';
import UserShippingAddresses from '../shared/shipping-addresses/shipping-addresses';
import CheckoutProductCard from '../cards/checkout-product';

import { Country as CountryType } from '@/lib/types';
import { updateCheckoutProductstWithLatest } from '@/queries/user';
import CountryNote from '../shared/country-note';

interface Props {
	cart: CartWithCartItemsType;
	countries: Country[];
	addresses: UserShippingAddressType[];
	userCountry: CountryType;
}

const CheckoutContainer: FC<Props> = ({
	cart,
	countries,
	addresses,
	userCountry,
}) => {
	const [cartData, setCartData] = useState<CartWithCartItemsType>(cart);

	const [selectedAddress, setSelectedAddress] =
		useState<ShippingAddress | null>(null);

	const activeCountry = addresses.find(
		(add) => add.countryId === selectedAddress?.countryId,
	)?.country;

	const { cartItems } = cart;

	useEffect(() => {
		const hydrateCheckoutCart = async () => {
			const updatedCart = await updateCheckoutProductstWithLatest(
				cartItems,
				activeCountry,
			);
			setCartData(updatedCart);
		};

		if (cartItems.length > 0) {
			hydrateCheckoutCart();
		}
	}, [activeCountry]);
	return (
		<div className='w-full flex flex-col gap-y-2 lg:flex-row'>
			<div className='space-y-2 lg:flex-1'>
				<UserShippingAddresses
					addresses={addresses}
					countries={countries}
					selectedAddress={selectedAddress}
					setSelectedAddress={setSelectedAddress}
				/>
				<CountryNote
					country={activeCountry ? activeCountry.name : userCountry.name}
				/>
				{cartData.cartItems.map((product) => (
					<CheckoutProductCard
						key={product.variantId}
						product={product}
						isDiscounted={cartData.coupon?.storeId === product.storeId}
					/>
				))}
			</div>
			{/* TODO:  Will add place order or order like cards */}
		</div>
	);
};

export default CheckoutContainer;
