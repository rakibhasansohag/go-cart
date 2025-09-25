/* eslint-disable @typescript-eslint/no-explicit-any */
import { CartProductType } from '@/lib/types';
import { Size } from '@prisma/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Dispatch, FC, SetStateAction, useEffect } from 'react';

interface Props {
	sizes: Size[];
	sizeId: string | undefined;
	handleChange: (property: keyof CartProductType, value: any) => void;
	setSizeId: Dispatch<SetStateAction<string>>;
}

const SizeSelector: FC<Props> = ({
	sizeId,
	setSizeId,
	sizes,
	handleChange,
}) => {
	const pathname = usePathname();
	const { replace, refresh } = useRouter();

	const searchParams = useSearchParams();
	const params = new URLSearchParams(searchParams);

	useEffect(() => {
		if (sizeId) {
			const search_size = sizes.find((s) => s.id === sizeId);
			if (search_size) {
				handleCartProductToBeAddedChange(search_size);
			}
		} else {
		}
	}, [sizeId]);

	const handleSelectSize = (size: Size) => {
		setSizeId(size.id);
		handleCartProductToBeAddedChange(size);
	};

	const handleCartProductToBeAddedChange = (size: Size) => {
		handleChange('sizeId', size.id);
		handleChange('size', size.size);
	};

	return (
		<div className='flex flex-wrap gap-4'>
			{sizes.map((size) => (
				<span
					key={size.size}
					className={`border rounded-full px-5 py-1 cursor-pointer transition-all hover:bg-orange-background text-main-primary ${
						size.id === sizeId ? 'bg-orange-background text-main-primary' : ''
					}`}
					onClick={() => handleSelectSize(size)}
				>
					{size.size}
				</span>
			))}
		</div>
	);
};

export default SizeSelector;
