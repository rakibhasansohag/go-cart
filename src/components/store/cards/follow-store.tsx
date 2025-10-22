'use client';
import { cn } from '@/lib/utils';
import { followStore } from '@/queries/user';
import { useUser } from '@clerk/nextjs';
import { Check, MessageSquareMore, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import { PulseLoader } from 'react-spinners';
import { toast } from 'sonner';

interface Props {
	id: string;
	isUserFollowingStore: boolean;
	setFollowersCount?: Dispatch<SetStateAction<number>>;
}

const FollowStore: FC<Props> = ({
	id,
	isUserFollowingStore,
	setFollowersCount,
}) => {
	const [following, setFollowing] = useState<boolean>(isUserFollowingStore);
	const [loading, setLoading] = useState<boolean>(false);
	const user = useUser();
	const router = useRouter();
	const handleStoreFollow = async () => {
		if (!user.isSignedIn) router.push('/sign-in');
		try {
			setLoading(true);
			const res = await followStore(id);
			setFollowing(res);
			if (setFollowersCount) {
				if (res === true) {
					setFollowersCount((prev) => prev + 1);
				} else {
					setFollowersCount((prev) => prev - 1);
				}
			}
			setLoading(false);
		} catch (error) {
			setLoading(false);
			toast.error('Something happened, Try again later !');
		}
	};
	return (
		<div className='w-fit  md:w-96'>
			<div className='flex items-center justify-between rounded-xl py-3 px-4'>
				<div className='flex'>
					<div
						className={cn(
							'flex items-center border border-black bg-white text-black rounded-full cursor-pointer text-base font-bold h-9 mx-2 w-28 px-4 hover:bg-black hover:text-white',
							{
								'bg-black text-white w-32': following,
							},
						)}
						onClick={() => handleStoreFollow()}
					>
						{following ? (
							<>
								{loading ? (
									<div className='w-full flex justify-center'>
										<PulseLoader size={5} color='#fff' />
									</div>
								) : (
									<>
										<Check className='w-4 me-1' />
										<span>Following</span>
									</>
								)}
							</>
						) : (
							<>
								{loading ? (
									<div className='w-full flex justify-center'>
										<PulseLoader size={5} />
									</div>
								) : (
									<>
										<Plus className='w-4 me-1' />
										<span>Follow</span>
									</>
								)}
							</>
						)}
					</div>
					<div className='flex items-center border border-black rounded-full cursor-pointer text-base font-bold h-9 mx-2 px-4 bg-black text-white'>
						<MessageSquareMore className='w-4 me-2' />
						<span>Message</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default FollowStore;
