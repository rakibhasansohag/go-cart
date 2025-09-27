import { cn } from '@/lib/utils';
import { FC } from 'react';

interface Spec {
	name: string;
	value: string;
}

interface Props {
	specs: {
		product: Spec[];
		variant: Spec[] | undefined;
	};
}

const ProductSpecs: FC<Props> = ({ specs }) => {
	const { product, variant = [] } = specs;
	const newSpecs = [...product, ...variant];
	return (
		<div className='pt-6'>
			{/* Title */}
			<div className='h-12'>
				<h2 className='text-main-primary text-2xl font-bold'>Specifications</h2>
			</div>
			{/* Product Specs Table */}
			<SpecTable data={newSpecs} />
		</div>
	);
};

export default ProductSpecs;

const SpecTable = ({
	data,
	noTopBorder,
}: {
	data: Spec[];
	noTopBorder?: boolean;
}) => {
	return (
		<ul
			className={cn('border grid md:grid-cols-2', {
				'border-t-0': noTopBorder,
			})}
		>
			{data.map((spec, i) => (
				<li
					key={i}
					className={cn('flex border-t', {
						'border-t-0': i === 0,
					})}
				>
					<div className='float-left text-sm leading-7 relative flex'>
						<div className='p-4 bg-f5 text-main-primary min-w-44'>
							<span className='leading-5'>{spec.name}</span>
						</div>
						<div className='w-full p-4  text-[#151515] flex-1 break-words leading-5'>
							<span className='leading-5 w-full flex-1 '>{spec.value}</span>
						</div>
					</div>
				</li>
			))}
		</ul>
	);
};
