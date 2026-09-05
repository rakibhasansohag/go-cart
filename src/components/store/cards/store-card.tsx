'use client';
import { cn } from '@/lib/utils';
import { getStoreFollowingInfo } from '@/queries/product-optimized';
import { followStore } from '@/queries/user';
import { useUser } from '@clerk/nextjs';
import { Check, MessageSquareMore, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ContactSellerDialog from '@/components/store/messages/contact-seller-dialog';

interface Props {
	store: {
		id: string;
		url: string;
		name: string;
		logo: string;
		followersCount: number;
		isUserFollowingStore: boolean;
	};
	checkForFollowing?: boolean;
	productId?: string;
	productName?: string;
}

const StoreCard: FC<Props> = ({
	store,
	checkForFollowing,
	productId,
	productName,
}) => {
	const { id, logo, name, followersCount, url } = store;
	const [following, setFollowing] = useState<boolean>(
		store.isUserFollowingStore,
	);
	const [storeFollowersCount, setStoreFollowersCount] =
		useState<number>(followersCount);
	const user = useUser();
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data: followInfo } = useQuery({
		queryKey: ['store', 'followInfo', id, user.user?.id],
		queryFn: () => getStoreFollowingInfo(id),
		enabled: !!id,
	});

	useEffect(() => {
		if (followInfo) {
			setFollowing(followInfo.isUserFollowingStore);
			setStoreFollowersCount(followInfo.followersCount);
		}
	}, [followInfo]);

	const followMutation = useMutation({
		mutationFn: () => followStore(id),
		onSuccess: (res) => {
			setFollowing(res);
			if (res) {
				setStoreFollowersCount((prev) => prev + 1);
				toast.success(`You are now following ${name}`);
			} else {
				setStoreFollowersCount((prev) => prev - 1);
				toast.success(`You unfollowed ${name}`);
			}
			queryClient.invalidateQueries({ queryKey: ['store', 'followInfo', id] });
		},
		onError: () => {
			toast.error('Something happened, Try again later !');
		},
	});

	const handleStoreFollow = () => {
		if (!user.isSignedIn) {
			router.push('/sign-in');
			return;
		}
		followMutation.mutate();
	};
	return (
		<div className='w-full'>
			<div className='bg-f5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 rounded-xl py-3 px-4'>
				<div className='flex'>
					<Link href={`/store/${url}`}>
						<Image
							src={logo}
							alt={name}
							width={50}
							height={50}
							className='min-w-12 min-h-12 object-cover rounded-full'
						/>
					</Link>
					<div className='mx-2'>
						<div className='text-xl font-bold leading-6'>
							<Link href={`/store/${url}`} className='text-main-primary'>
								{name}
							</Link>
						</div>
						<div className='text-sm leading-5 mt-1'>
							<strong>100%</strong>
							<span> Positive Feedback</span>&nbsp;|&nbsp;
							<strong>{storeFollowersCount}</strong>
							<strong> Followers</strong>
						</div>
					</div>
				</div>
				<div className='flex'>
					<div
						className={cn(
							'flex items-center border border-black rounded-full cursor-pointer text-base font-bold h-9 mx-2 px-4 hover:bg-black hover:text-white',
							{
								'bg-black text-white': following,
							},
						)}
						onClick={() => handleStoreFollow()}
					>
						{following ? (
							<Check className='w-4 me-1' />
						) : (
							<Plus className='w-4 me-1' />
						)}
						<span>{following ? 'Following' : 'Follow'}</span>
					</div>
					<ContactSellerDialog
						storeId={id}
						storeName={name}
						storeUrl={url}
						productId={productId}
						productName={productName}
						trigger={
							<div className='flex items-center border border-black rounded-full cursor-pointer text-base font-bold h-9 mx-2 px-4 bg-black text-white hover:bg-black/80 transition-colors'>
								<MessageSquareMore className='w-4 me-2' />
								<span>Message</span>
							</div>
						}
					/>
				</div>
			</div>
		</div>
	);
};

export default StoreCard;
