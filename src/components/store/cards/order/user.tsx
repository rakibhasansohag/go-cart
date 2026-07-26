import { UserShippingAddressType } from '@/lib/types';
import Image from 'next/image';
import { Mail, Phone, MapPin, UserCheck } from 'lucide-react';

export default function OrderUserDetailsCard({
	details,
}: {
	details: UserShippingAddressType;
}) {
	const {
		user,
		firstName,
		lastName,
		address1,
		address2,
		city,
		country,
		phone,
		state,
		zip_code,
	} = details;

	const { picture, email } = user;

	return (
		<div className='w-full bg-card/90 backdrop-blur-md rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-md transition-all'>
			<div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4'>
				{/* Customer Name & Avatar */}
				<div className='flex items-center gap-3.5 min-w-0'>
					<Image
						src={picture || '/assets/images/user-placeholder.png'}
						alt='Customer profile'
						width={56}
						height={56}
						className='rounded-full w-12 h-12 object-cover ring-2 ring-primary/20 shrink-0 shadow-xs'
					/>
					<div className='min-w-0'>
						<div className='flex items-center gap-2 flex-wrap'>
							<h2 className='font-bold text-base text-foreground truncate capitalize tracking-tight'>
								{firstName} {lastName}
							</h2>
							<span className='text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold border border-primary/20 shrink-0 flex items-center gap-1'>
								<UserCheck className='w-3 h-3' />
								Customer
							</span>
						</div>
						<div className='flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap'>
							<span className='flex items-center gap-1.5 font-medium text-foreground'>
								<Mail className='w-3.5 h-3.5 text-primary shrink-0' />
								<span className='truncate'>{email}</span>
							</span>
							{phone && (
								<span className='flex items-center gap-1.5 font-medium text-foreground'>
									<Phone className='w-3.5 h-3.5 text-primary shrink-0' />
									<span>{phone}</span>
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Delivery Address */}
				<div className='flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/30 text-xs w-full md:w-auto md:max-w-md shrink-0'>
					<MapPin className='w-4 h-4 text-primary shrink-0 mt-0.5' />
					<div>
						<span className='font-bold text-foreground block mb-0.5'>Shipping Address</span>
						<p className='text-muted-foreground leading-relaxed font-medium'>
							{address1}
							{address2 ? `, ${address2}` : ''}, {city}, {state} {zip_code},{' '}
							<strong className='text-foreground'>{country?.name}</strong>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
