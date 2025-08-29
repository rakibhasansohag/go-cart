// Next.js
import Link from 'next/link';
import Image from 'next/image';

// Assets
import { AppIcon } from '@/components/store/icons';
import AppStoreIcon from '@/components/store/icons/app-store.webp';
import GooglePlayIcon from '@/components/store/icons/google-play.webp';

export default function DownloadApp() {
	return (
		<div className='relative group'>
			{/* Trigger */}
			<div className='flex h-11 items-center px-2 cursor-pointer'>
				<span className='text-[32px]'>
					<AppIcon />
				</span>
				<div className='ml-1'>
					<b className='max-w-[90px] inline-block font-medium text-xs text-white'>
						Download the GoShop app
					</b>
				</div>
			</div>
			{/* Content */}
			<div className='absolute hidden top-0 group-hover:block cursor-pointer'>
				<div className='relative mt-12 -ml-20 w-[300px] bg-white rounded-3xl text-main-primary pt-2 px-1 pb-6 z-50 shadow-lg'>
					{/* Traingle */}
					<div
						className='w-0 h-0 absolute -top-1.5 left-36 border-l-[10px] border-l-transparent
           border-b-[10px] border-white border-r-[10px] border-r-transparent'
					/>
					<div className='py-3 px-1 break-words'>
						<div className='flex'>
							<div className='mx-3'>
								<h3 className='font-bold text-[20px] text-main-primary m-0 max-w-40 mx-auto'>
									Download the GoShop app
								</h3>
								<div className='mt-4 flex items-center gap-x-2'>
									<Link
										href=''
										className='rounded-3xl bg-black grid place-items-center px-4 py-3'
									>
										<Image
											src={AppStoreIcon}
											alt='App store'
											width={40}
											height={40}
										/>
									</Link>
									<Link
										href=''
										className='rounded-3xl bg-black grid place-items-center px-4 py-3'
									>
										<Image
											src={GooglePlayIcon}
											alt='Play store'
											width={40}
											height={40}
										/>
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
