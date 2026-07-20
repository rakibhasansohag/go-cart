'use client';

import { Country, ShippingAddress } from '@prisma/client';
import { FC, useState } from 'react';
import UserShippingAddresses from '../../shared/shipping-addresses/shipping-addresses';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getUserShippingAddresses } from '@/queries/user';
import { queryKeys } from '@/lib/query-keys';

interface Props {
	countries: Country[];
}

const AddressContainer: FC<Props> = ({ countries }) => {
	const [selectedAddress, setSelectedAddress] =
		useState<ShippingAddress | null>(null);

	const { data: addresses } = useSuspenseQuery({
		queryKey: queryKeys.profile.addresses(),
		queryFn: () => getUserShippingAddresses(),
	});

	if (!addresses) return null;

	return (
		<div className='w-full rounded-xl'>
			<UserShippingAddresses
				addresses={addresses}
				countries={countries}
				selectedAddress={selectedAddress}
				setSelectedAddress={setSelectedAddress}
			/>
		</div>
	);
};

export default AddressContainer;
