'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Printer, FileText, Tag } from 'lucide-react';
import { formatOrderId, formatPackageId } from '@/lib/utils';
import { PrintableBarcode, PrintableQRCode } from './printable-barcode';
import type { getStorePackingSlipDetails } from '@/queries/fulfillment';

export type PackingSlipData = NonNullable<Awaited<ReturnType<typeof getStorePackingSlipDetails>>>;

interface PackingSlipViewProps {
	data: PackingSlipData;
	storeUrl: string;
}

export default function PackingSlipView({ data, storeUrl }: PackingSlipViewProps) {
	const [activeTab, setActiveTab] = useState<'packing-slip' | 'shipping-label'>('packing-slip');
	const { store, orderGroup } = data;
	const { order, items } = orderGroup;
	const address = order.shippingAddress;
	const customerName = `${address.firstName} ${address.lastName}`.trim() || 'Customer';
	const customerEmail = address.user?.email || '';
	const assignedShipment = orderGroup.shipmentAssignments?.[0]?.shipment;
	const currency = order.paymentDetails?.currency?.toUpperCase() || 'USD';

	const handlePrint = () => {
		window.print();
	};

	const formattedOrderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});

	return (
		<div className='min-h-screen bg-muted/20 py-6 px-4 print:p-0 print:bg-white print:min-h-0'>
			{/* Top Action Toolbar (hidden on print) */}
			<div className='max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden bg-background p-4 rounded-xl border border-border/80 shadow-xs'>
				<div className='flex items-center gap-3'>
					<Link
						href={`/dashboard/seller/stores/${storeUrl}/orders`}
						className='inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors'
					>
						<ArrowLeft className='w-4 h-4' />
						<span>Back to Orders</span>
					</Link>
					<div className='inline-flex p-1 bg-muted rounded-lg border border-border/60 text-xs font-semibold'>
						<button
							type='button'
							onClick={() => setActiveTab('packing-slip')}
							className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
								activeTab === 'packing-slip'
									? 'bg-background text-foreground shadow-xs'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							<FileText className='w-3.5 h-3.5' />
							<span>Packing Slip</span>
						</button>
						<button
							type='button'
							onClick={() => setActiveTab('shipping-label')}
							className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
								activeTab === 'shipping-label'
									? 'bg-background text-foreground shadow-xs'
									: 'text-muted-foreground hover:text-foreground'
							}`}
						>
							<Tag className='w-3.5 h-3.5' />
							<span>Shipping Label (4x6)</span>
						</button>
					</div>
				</div>

				<button
					type='button'
					onClick={handlePrint}
					className='inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-sm transition-all cursor-pointer'
				>
					<Printer className='w-4 h-4' />
					<span>Print {activeTab === 'packing-slip' ? 'Packing Slip' : 'Shipping Label'}</span>
				</button>
			</div>

			{/* Printable Document Container */}
			<div className='max-w-4xl mx-auto'>
				{activeTab === 'packing-slip' ? (
					/* Standard Packing Slip Layout */
					<div className='bg-white text-black p-8 sm:p-12 rounded-xl shadow-md border border-neutral-200 print:border-none print:shadow-none print:p-0 print:m-0'>
						{/* Header */}
						<div className='flex items-start justify-between border-b-2 border-black pb-6 gap-6'>
							<div className='flex items-center gap-4'>
								{store.logo && (
									<Image
										src={store.logo}
										alt={store.name}
										width={60}
										height={60}
										className='w-14 h-14 rounded-full object-cover border border-neutral-300'
									/>
								)}
								<div>
									<h1 className='text-xl font-extrabold uppercase tracking-tight text-black'>
										{store.name}
									</h1>
									<p className='text-xs text-neutral-600 mt-0.5'>{store.email}</p>
									{store.phone && <p className='text-xs text-neutral-600'>{store.phone}</p>}
								</div>
							</div>
							<div className='text-right'>
								<h2 className='text-2xl font-black tracking-wider text-black'>PACKING SLIP</h2>
								<p className='text-xs font-mono font-semibold text-neutral-700 mt-1'>
									Order: {formatOrderId(order.id)}
								</p>
								<p className='text-xs font-mono font-semibold text-neutral-700'>
									Package: {formatPackageId(orderGroup.id)}
								</p>
								<p className='text-xs text-neutral-500 mt-0.5'>Date: {formattedOrderDate}</p>
							</div>
						</div>

						{/* Addresses & Logistics Block */}
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-neutral-200 text-xs'>
							<div>
								<h3 className='font-bold uppercase tracking-wider text-neutral-500 mb-2'>
									Ship To:
								</h3>
								<p className='font-bold text-sm text-black'>{customerName}</p>
								<p className='text-neutral-700'>{address.address1}</p>
								{address.address2 && <p className='text-neutral-700'>{address.address2}</p>}
								<p className='text-neutral-700'>
									{address.city}, {address.state} {address.zip_code}
								</p>
								<p className='text-neutral-700'>{address.country.name}</p>
								{address.phone && (
									<p className='text-neutral-600 mt-1'>Phone: {address.phone}</p>
								)}
								{customerEmail && (
									<p className='text-neutral-600'>Email: {customerEmail}</p>
								)}
							</div>

							<div className='sm:text-right flex flex-col sm:items-end justify-between'>
								<div>
									<h3 className='font-bold uppercase tracking-wider text-neutral-500 mb-2'>
										Shipping Details:
									</h3>
									<p className='font-semibold text-neutral-900'>
										Service: <span className='font-normal'>{orderGroup.shippingService}</span>
									</p>
									<p className='text-neutral-700'>
										Transit:{' '}
										<span>
											{orderGroup.shippingDeliveryMin}-{orderGroup.shippingDeliveryMax} business days
										</span>
									</p>
									<p className='text-neutral-700'>
										Payment:{' '}
										<span className='font-semibold uppercase'>{order.paymentStatus}</span>
									</p>
									{assignedShipment?.trackingNumber && (
										<p className='font-mono text-neutral-800 mt-1'>
											Tracking: {assignedShipment.trackingNumber}
										</p>
									)}
								</div>
								<div className='mt-4'>
									<PrintableQRCode value={orderGroup.id} size={70} />
								</div>
							</div>
						</div>

						{/* Line Items Table */}
						<div className='py-6'>
							<table className='w-full text-left text-xs border-collapse'>
								<thead>
									<tr className='border-b-2 border-neutral-300 text-neutral-500 uppercase tracking-wider text-xs'>
										<th className='py-2.5 font-bold'>#</th>
										<th className='py-2.5 font-bold'>SKU Breakdown & Item</th>
										<th className='py-2.5 font-bold text-center'>Variant / Size</th>
										<th className='py-2.5 font-bold text-center'>Qty</th>
										<th className='py-2.5 font-bold text-right'>Unit Price</th>
										<th className='py-2.5 font-bold text-right'>Amount</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-neutral-200'>
									{items.map((item, idx) => (
										<tr key={item.id} className='hover:bg-neutral-50/50'>
											<td className='py-3 text-neutral-400 font-mono'>{idx + 1}</td>
											<td className='py-3 pr-4'>
												<div className='font-bold text-black'>{item.name}</div>
												<div className='font-mono text-xs text-neutral-500'>
													SKU: {item.sku || 'N/A'}
												</div>
											</td>
											<td className='py-3 text-center text-neutral-700'>
												{item.size || item.variantSlug || 'Standard'}
											</td>
											<td className='py-3 text-center font-bold text-black'>
												{item.quantity}
											</td>
											<td className='py-3 text-right text-neutral-700'>
												${item.price.toFixed(2)}
											</td>
											<td className='py-3 text-right font-bold text-black'>
												${item.totalPrice.toFixed(2)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Totals Summary */}
						<div className='flex justify-end pt-4 border-t border-neutral-200'>
							<div className='w-64 space-y-1.5 text-xs'>
								<div className='flex justify-between text-neutral-600'>
									<span>Items Subtotal:</span>
									<span>${orderGroup.subTotal.toFixed(2)}</span>
								</div>
								<div className='flex justify-between text-neutral-600'>
									<span>Shipping Fees:</span>
									<span>${orderGroup.shippingFees.toFixed(2)}</span>
								</div>
								<div className='flex justify-between border-t border-neutral-300 pt-1.5 text-sm font-black text-black'>
									<span>Total ({currency}):</span>
									<span>${orderGroup.total.toFixed(2)}</span>
								</div>
							</div>
						</div>

						{/* Bottom Scannable Barcode & Warehouse Footer */}
						<div className='mt-10 pt-6 border-t-2 border-dashed border-neutral-300 flex flex-col items-center text-center'>
							<PrintableBarcode value={orderGroup.id} height={45} />
							<p className='text-xs text-neutral-500 mt-4 max-w-md'>
								Thank you for your order with <strong>{store.name}</strong> on GoCart. For returns or support, please check your GoCart account order history.
							</p>
						</div>
					</div>
				) : (
					/* Standard 4x6 Shipping Label Layout */
					<div className='w-[400px] mx-auto bg-white text-black p-6 rounded-xl shadow-md border-2 border-black print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none'>
						{/* Top Carrier & Priority Header */}
						<div className='border-b-4 border-black pb-3 mb-3 flex items-center justify-between'>
							<span className='font-black text-2xl tracking-tight uppercase'>GOCART SHIP</span>
							<div className='text-right'>
								<span className='inline-block bg-black text-white px-2 py-0.5 text-xs font-black uppercase rounded-xs'>
									STANDARD
								</span>
								<p className='text-xs font-mono text-neutral-600 mt-0.5'>
									{orderGroup.shippingService}
								</p>
							</div>
						</div>

						{/* Shipper (From) Block */}
						<div className='border-b-2 border-black pb-3 mb-3 text-xs'>
							<span className='font-bold uppercase text-xs text-neutral-500 block mb-0.5'>
								SHIP FROM:
							</span>
							<p className='font-bold text-black'>{store.name}</p>
							<p className='text-neutral-700'>c/o GoCart Fulfillment</p>
							{store.phone && <p className='text-neutral-600'>TEL: {store.phone}</p>}
						</div>

						{/* Recipient (To) Block — High contrast, large format for scan/delivery */}
						<div className='border-b-4 border-black pb-4 mb-4'>
							<span className='font-bold uppercase text-xs text-neutral-500 block mb-1'>
								SHIP TO:
							</span>
							<div className='pl-2'>
								<p className='font-black text-base text-black uppercase tracking-wide'>
									{customerName}
								</p>
								<p className='text-xs font-bold text-neutral-900'>{address.address1}</p>
								{address.address2 && (
									<p className='text-xs font-bold text-neutral-900'>{address.address2}</p>
								)}
								<p className='text-sm font-black text-black mt-1 uppercase'>
									{address.city}, {address.state} {address.zip_code}
								</p>
								<p className='text-xs font-bold text-neutral-800 uppercase'>
									{address.country.name}
								</p>
							</div>
						</div>

						{/* Barcode & Routing Section */}
						<div className='flex flex-col items-center justify-center py-2'>
							<PrintableBarcode
								value={assignedShipment?.trackingNumber || orderGroup.id}
								height={65}
							/>
							<div className='w-full grid grid-cols-2 gap-2 mt-4 text-xs font-mono border-t border-neutral-300 pt-2'>
								<div>
									<span className='text-neutral-500 block'>PACKAGE REF:</span>
									<span className='font-bold text-black'>{formatPackageId(orderGroup.id)}</span>
								</div>
								<div className='text-right'>
									<span className='text-neutral-500 block'>ITEM COUNT:</span>
									<span className='font-bold text-black'>
										{items.reduce((sum, item) => sum + item.quantity, 0)} Units
									</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
