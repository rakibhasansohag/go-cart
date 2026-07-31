import PaymentStatusTag from '@/components/shared/payment-status';
import {
	PaymentStatus,
	ProductStatus,
	StoreOrderType,
} from '@/lib/types';
import { formatOrderId, formatPackageId, getShippingDatesRange } from '@/lib/utils';
import { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Printer } from 'lucide-react';
import PackageStatusSelect from '../forms/package-status-select';
import ShipmentStatusTag from '@/components/shared/shipment-status';
import ProductStatusTag from '@/components/shared/product-status';
import { Button } from '@/components/ui/button';
import CancellationRequestActions from '@/components/dashboard/orders/cancellation-request-actions';
import { CancellationRequestStatus } from '@prisma/client';

interface Props {
	group: StoreOrderType;
}

const StoreOrderSummary: FC<Props> = ({ group }) => {
	const paymentDetails = group.order.paymentDetails;
	const paymentStatus = group.order.paymentStatus as PaymentStatus;
	const shippingAddress = group.order.shippingAddress;
	const activeCancellation = group.cancellationRequests.find(
		(request) => request.status === CancellationRequestStatus.REQUESTED,
	);

	const { minDate, maxDate } = getShippingDatesRange(
		group.shippingDeliveryMin,
		group.shippingDeliveryMax,
		group.createdAt,
	);

	const {
		address1,
		address2,
		city,
		country,
		firstName,
		lastName,
		phone,
		state,
		zip_code,
		user,
	} = shippingAddress;

	const handlePrint = () => {
		window.print();
	};

	return (
		<div className='py-2 relative print:py-0 print:text-black'>
			<div className='w-full px-1'>
				{activeCancellation && (
					<div className='mb-4 print:hidden'>
						<CancellationRequestActions
							request={activeCancellation}
							storeId={group.storeId}
							orderId={group.order.id}
						/>
					</div>
				)}
				<div className='flex items-center justify-between gap-4 border-b pb-4 border-border'>
					<div className='space-y-1.5'>
						<div className='flex items-center gap-2'>
							<h2 className='font-bold text-2xl leading-8'>
								Order Details
							</h2>
							<span className='font-mono font-bold text-sm bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border/50'>
								{formatPackageId(group.id)}
							</span>
						</div>
						<div className='flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2 py-1'>
							<span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
								Order
							</span>
							<span className='font-mono text-xs font-semibold text-foreground'>
								{formatOrderId(group.order.id)}
							</span>
						</div>
						<div className='flex items-center gap-x-2 print:hidden'>
							<PaymentStatusTag status={paymentStatus} />
							<PackageStatusSelect
								storeId={group.storeId}
								groupId={group.id}
								orderId={group.order.id}
								status={group.packageStatus}
							/>
							{group.shipment && (
								<ShipmentStatusTag status={group.shipment.status} />
							)}
						</div>
					</div>
					<Button
						variant='outline'
						size='sm'
						onClick={handlePrint}
						className='print:hidden gap-1.5 cursor-pointer font-medium text-xs'
					>
						<Printer className='w-4 h-4' /> Print Receipt
					</Button>
				</div>
				<div className='mt-3 grid grid-cols-1 gap-4 py-4 border-b border-border mb-4 text-sm'>
					{/* Shipping & Delivery info */}
					<div className='grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-xl border border-border/50'>
						<div>
							<p className='font-medium text-xs text-muted-foreground mb-1'>
								Shipping Service
							</p>
							<h6 className='font-semibold text-sm text-foreground'>
								{group.shippingService}
							</h6>
						</div>
						<div>
							<p className='font-medium text-xs text-muted-foreground mb-1'>
								Expected Delivery Date
							</p>
							<h6 className='font-semibold text-sm text-foreground'>
								{minDate} - {maxDate}
							</h6>
						</div>
					</div>
					{/* Payment info */}
					<div className='grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-xl border border-border/50'>
						<div>
							<p className='font-medium text-xs text-muted-foreground mb-1'>
								Payment Method
							</p>
							<h6 className='font-semibold text-sm text-foreground'>
								{paymentDetails?.paymentMethod || '-'}
							</h6>
						</div>
						<div>
							<p className='font-medium text-xs text-muted-foreground mb-1'>
								Payment Reference
							</p>
							<h6 className='font-semibold text-sm font-mono text-foreground truncate' title={paymentDetails?.paymentInetntId || '-'}>
								{paymentDetails?.paymentInetntId || '-'}
							</h6>
						</div>
					</div>
					{/* Address */}
					<div className='bg-muted/30 p-3 rounded-xl border border-border/50'>
						<p className='font-medium text-xs text-muted-foreground mb-1'>
							Shipping Address
						</p>
						<h6 className='font-semibold text-sm text-foreground leading-relaxed'>
							{address1}, {address2 && `${address2}, `}{city}, {state} {zip_code}, {country.name}
						</h6>
					</div>
					{/* Customer Details */}
					<div className='bg-muted/30 p-3 rounded-xl border border-border/50 space-y-1.5'>
						<p className='font-medium text-xs text-muted-foreground mb-1'>
							Customer Information
						</p>
						<div className='grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs'>
							<div>
								<span className='text-muted-foreground block text-[11px]'>Name</span>
								<span className='font-semibold text-foreground capitalize'>{firstName} {lastName}</span>
							</div>
							<div>
								<span className='text-muted-foreground block text-[11px]'>Email</span>
								<span className='font-semibold text-foreground truncate block' title={user?.email || ''}>{user?.email || '-'}</span>
							</div>
							<div>
								<span className='text-muted-foreground block text-[11px]'>Phone</span>
								<span className='font-semibold text-foreground'>{phone || '-'}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Products Section */}
				<div className='space-y-3'>
					<h3 className='font-bold text-sm text-foreground'>Items in Order</h3>
					{group.items.map((product, index) => (
						<div
							key={index}
							className='grid gap-4 py-3.5 px-3 w-full rounded-xl border border-border/60 bg-card/40 items-center'
							style={{ gridTemplateColumns: '100px 1.4fr 1fr' }}
						>
							{/* Product image link */}
							<Link
								href={`/product/${product.productSlug}?variant=${product.variantSlug}`}
								target='_blank'
								rel='noopener noreferrer'
								className='relative group overflow-hidden rounded-lg border border-border/40 shrink-0 block w-24 h-24'
								title={`Open ${product.name} in new tab`}
							>
								<Image
									src={product.image}
									alt={product.name}
									fill
									className='object-cover transition-transform group-hover:scale-105'
								/>
								<div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white'>
									<ExternalLink className='w-4 h-4' />
								</div>
							</Link>
							{/* Product info */}
							<div className='flex flex-col gap-y-1 text-xs min-w-0'>
								<Link
									href={`/product/${product.productSlug}?variant=${product.variantSlug}`}
									target='_blank'
									rel='noopener noreferrer'
									className='font-bold text-xs text-foreground hover:text-primary transition-colors line-clamp-2 inline-flex items-center gap-1'
								>
									<span>{product.name}</span>
									<ExternalLink className='w-3 h-3 shrink-0 opacity-60' />
								</Link>
								<p className='text-muted-foreground text-[11px]'>
									SKU: <span className='font-mono font-medium text-foreground'>{product.sku}</span>
								</p>
								<p className='text-muted-foreground text-[11px]'>
									Size: <span className='font-medium text-foreground'>{product.size}</span> · Qty: <span className='font-medium text-foreground'>{product.quantity}</span>
								</p>
								<p className='text-muted-foreground text-[11px]'>
									Price: <span className='font-medium text-foreground'>${product.price.toFixed(2)}</span>
									{product.shippingFee > 0 && ` (+$${product.shippingFee.toFixed(2)} shipping)`}
								</p>
							</div>
							{/* Product status & total */}
							<div className='flex flex-col items-end justify-center gap-2'>
								<ProductStatusTag status={product.status as ProductStatus} />
								<h5 className='font-bold text-lg text-foreground'>
									${product.totalPrice.toFixed(2)}
								</h5>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default StoreOrderSummary;
