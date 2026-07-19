/* eslint-disable @typescript-eslint/no-explicit-any */
import { ShippingAddressPayload, UserShippingAddressType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Country } from '@prisma/client';
import { Check } from 'lucide-react';
import { FC, useState } from 'react';
import Modal from '../shared/modal';
import AddressDetails from '../shared/shipping-addresses/address-details';
import { toast } from 'sonner';
import { upsertShippingAddress } from '@/queries/user';
import { useRouter } from 'next/navigation';

interface Props {
	address: UserShippingAddressType;
	isSelected: boolean;
	onSelect: () => void;
	countries: Country[];
}

const ShippingAddressCard: FC<Props> = ({
	address,
	countries,
	isSelected,
	onSelect,
}) => {
	const router = useRouter();
	const [show, setShow] = useState(false);
	const handleMakeDefault = async () => {
		try {
			const payload: ShippingAddressPayload = {
				id: address.id,
				firstName: address.firstName,
				lastName: address.lastName,
				phone: address.phone,
				address1: address.address1,

				address2: address.address2 ?? undefined,
				state: address.state,
				city: address.city,
				zip_code: address.zip_code,

				countryId:
					(address as any).countryId ?? (address as any).country?.id ?? '',
				default: true,
			};

			const response = await upsertShippingAddress(payload);

			if (response) {
				toast.success('New Default Address saved.');
				router.refresh();
			}
		} catch (error) {
			toast.error('Something went wrong ! ');
		}
	};

	return (
		<div className='w-full relative flex self-start group'>
			{/* Checkbox */}
			<label
				htmlFor={address.id}
				className='p-0 text-gray-900 text-sm leading-6 inline-flex items-center mr-3 cursor-pointer'
				onClick={onSelect}
			>
				<span className='leading-8 inline-flex p-0.5 cursor-pointer'>
					<span
						className={cn(
							'leading-8 inline-block w-5 h-5 rounded-full bg-background border border-gray-300',
							{
								'bg-orange-background border-none flex items-center justify-center':
									isSelected,
							},
						)}
					>
						{isSelected && <Check className='stroke-white w-3' />}
					</span>
				</span>
				<input type='checkbox' hidden id={address.id} />
			</label>
			{/* Address */}
			<div className='w-full border-t pt-2 pr-20 relative min-w-0'>
				{/* Full name - Phone number */}
				<div className='flex flex-wrap items-center gap-x-2 text-sm leading-normal'>
					<span className='text-main-primary font-semibold capitalize'>
						{address.firstName} {address.lastName}
					</span>
					<span className='text-main-secondary text-xs'>{address.phone}</span>
				</div>
				{/* Address 1 - Address 2 */}
				<div className='text-sm text-main-secondary leading-normal mt-1 break-words'>
					{address.address1}
					{address.address2 && `, ${address.address2}`}
				</div>
				{/* State - City - Country - Zipcode */}
				<div className='text-sm text-main-secondary leading-normal break-words'>
					{address.state}, {address.city}, {address.country.name},&nbsp;
					{address.zip_code}
				</div>
				{/* Save as default - Edit */}
				<div className='absolute right-0 top-2 flex flex-col items-end gap-y-1.5'>
					<div
						className='cursor-pointer block md:hidden md:group-hover:block bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded text-xs transition-colors font-medium border border-blue-500/20'
						onClick={() => setShow(true)}
					>
						<span>Edit</span>
					</div>
					{isSelected && !address.default && (
						<div
							className='cursor-pointer bg-green-500/10 hover:bg-green-500/20 text-green-600 px-2 py-0.5 rounded text-xs transition-colors font-medium border border-green-500/20'
							onClick={() => handleMakeDefault()}
						>
							<span>Save as default</span>
						</div>
					)}
				</div>
				{show && (
					<Modal title='Edit Shipping Address' show={show} setShow={setShow}>
						<AddressDetails
							data={address}
							countries={countries}
							setShow={setShow}
						/>
					</Modal>
				)}
			</div>
		</div>
	);
};

export default ShippingAddressCard;
