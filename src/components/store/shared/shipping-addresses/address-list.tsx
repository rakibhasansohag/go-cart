import { UserShippingAddressType } from '@/lib/types';
import { Country, ShippingAddress } from '@prisma/client';
import { Dispatch, FC, SetStateAction, useEffect } from 'react';
import ShippingAddressCard from '../../cards/address-card';

interface Props {
	addresses: UserShippingAddressType[];
	countries: Country[];
	selectedAddress: ShippingAddress | null;
	setSelectedAddress: Dispatch<SetStateAction<ShippingAddress | null>>;
}

const AddressList: FC<Props> = ({
	addresses,
	countries,
	selectedAddress,
	setSelectedAddress,
}) => {
	useEffect(() => {
		if (selectedAddress) return;
		// Auto-select default address if set, otherwise select first available address
		const defaultAddress =
			addresses.find((address) => address.default) || addresses[0];
		if (defaultAddress) {
			setSelectedAddress(defaultAddress);
		}
	}, [addresses, selectedAddress, setSelectedAddress]);

	const haneldeAddressSelect = (address: ShippingAddress) => {
		setSelectedAddress(address);
	};

	return (
		<div className='space-y-4 max-h-80 overflow-y-auto pr-1'>
			{addresses.map((address) => (
				<ShippingAddressCard
					key={address.id}
					address={address}
					countries={countries}
					isSelected={selectedAddress?.id === address.id}
					onSelect={() => haneldeAddressSelect(address)}
				/>
			))}
		</div>
	);
};

export default AddressList;
