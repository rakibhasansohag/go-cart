'use client';
import { StoreDetailsType } from '@/lib/types';
import {
	CircleCheckBig,
	Megaphone,
	X,
	ExternalLink,
	Instagram,
	Facebook,
	Twitter,
	Youtube,
} from 'lucide-react';
import Image from 'next/image';
import FollowStore from '../cards/follow-store';
import { useState, useEffect } from 'react';

function TikTokIcon({ className }: { className?: string }) {
	return (
		<svg
			role='img'
			viewBox='0 0 24 24'
			width='16'
			height='16'
			fill='currentColor'
			className={className}
		>
			<path d='M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.8 1.43-.01 2.76-.92 3.22-2.28.24-.65.27-1.36.27-2.06.01-4.75 0-9.51.01-14.26z' />
		</svg>
	);
}

export default function StoreDetails({
	details,
}: {
	details: StoreDetailsType;
}) {
	const { averageRating, cover, description, logo, name, numReviews } = details;
	const numOfReviews = new Intl.NumberFormat().format(numReviews);
	const [followersCount, setFollowersCount] = useState<number>(
		details._count.followers,
	);
	const [isAnnouncementVisible, setIsAnnouncementVisible] = useState<boolean>(false);

	useEffect(() => {
		if (details.announcementActive && details.announcementText?.trim()) {
			const dismissed = sessionStorage.getItem(
				`store-announcement-dismissed-${details.id}`
			);
			if (!dismissed) {
				setIsAnnouncementVisible(true);
			}
		}
	}, [details.id, details.announcementActive, details.announcementText]);

	const handleDismissAnnouncement = () => {
		setIsAnnouncementVisible(false);
		sessionStorage.setItem(`store-announcement-dismissed-${details.id}`, 'true');
	};

	console.log({
		averageRating,
		description,
		numOfReviews,
	});

	const socialLinks = [
		{ key: 'instagram', url: details.instagram, icon: Instagram, label: 'Instagram' },
		{ key: 'facebook', url: details.facebook, icon: Facebook, label: 'Facebook' },
		{ key: 'twitter', url: details.twitter, icon: Twitter, label: 'X (Twitter)' },
		{ key: 'youtube', url: details.youtube, icon: Youtube, label: 'YouTube' },
		{
			key: 'tiktok',
			url: details.tiktok,
			icon: TikTokIcon,
			label: 'TikTok',
		},
	].filter((s) => Boolean(s.url));

	return (
		<div className='relative w-full pb-4 md:pb-44'>
			{isAnnouncementVisible && details.announcementText && (
				<div
					data-testid='store-announcement-bar'
					className='w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-xl mb-3 flex items-center justify-between gap-3 text-sm shadow-md transition-all'
				>
					<div className='flex items-center gap-2.5 overflow-hidden flex-1'>
						<Megaphone className='w-4 h-4 shrink-0' />
						<p className='font-medium truncate'>{details.announcementText}</p>
						{details.announcementUrl && (
							<a
								href={details.announcementUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 shrink-0 font-semibold text-xs ml-1'
							>
								<span>Learn more</span>
								<ExternalLink className='w-3 h-3' />
							</a>
						)}
					</div>
					<button
						type='button'
						onClick={handleDismissAnnouncement}
						aria-label='Dismiss announcement'
						className='p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer'
					>
						<X className='w-4 h-4' />
					</button>
				</div>
			)}
			<div className='relative flex flex-col'>
				<Image
					src={cover}
					alt={name}
					width={2000}
					height={500}
					className='w-full h-44 md:h-96 object-cover object-top rounded-b-2xl'
				/>
				<div className='relative -mt-14 md:mt-0 md:absolute md:-bottom-[140px] left-0 md:left-2 flex flex-col md:flex-row w-full md:w-[calc(100%-1rem)] justify-between items-center px-4 md:px-0 md:gap-y-0 text-center md:text-left'>
					<div className='flex flex-col md:flex-row items-center gap-y-3 md:gap-y-0'>
						<Image
							src={logo}
							alt={name}
							width={200}
							height={200}
							className='w-28 h-28 md:h-44 md:w-44 object-cover rounded-full shadow-2xl border-4 border-background bg-background shrink-0'
						/>
						<div className='mb-2 md:mb-0 md:mt-14 ml-0 md:ml-6 flex flex-col items-center md:items-start'>
							<div className='flex items-center gap-x-1 justify-center md:justify-start'>
								<h1 className='font-bold text-lg md:text-xl capitalize leading-5 line-clamp-1 text-main-primary'>
									{name.toLowerCase()}
								</h1>
								<CircleCheckBig className='stroke-green-400 w-5 h-5 shrink-0' />
							</div>
							<div className='flex items-center gap-x-1 mt-1 justify-center md:justify-start'>
								<div className='text-xs md:text-sm leading-5 text-main-secondary'>
									<strong>100%</strong>
									<span> Positive Feedback</span> <br />
									<strong>{followersCount}</strong>
									<span>
										{followersCount > 1 ? ' Followers' : ' Follower'}
									</span>
								</div>
							</div>
							{description && (
								<p className='text-xs md:text-sm text-main-secondary max-w-md mt-1.5 line-clamp-2 text-center md:text-left'>
									{description}
								</p>
							)}
							{socialLinks.length > 0 && (
								<div className='flex items-center gap-2 mt-2.5' data-testid='store-social-links'>
									{socialLinks.map((item) => {
										const IconComponent = item.icon;
										return (
											<a
												key={item.key}
												href={item.url!}
												target='_blank'
												rel='noopener noreferrer'
												aria-label={item.label}
												className='w-8 h-8 rounded-full border border-border/60 bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:scale-105 transition-all shadow-xs'
											>
												<IconComponent className='w-4 h-4' />
											</a>
										);
									})}
								</div>
							)}
						</div>
					</div>
					<div className='w-full md:w-fit flex justify-center md:justify-end mt-2 md:mt-0'>
						<FollowStore
							id={details.id}
							isUserFollowingStore={details.isUserFollowingStore}
							setFollowersCount={setFollowersCount}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
