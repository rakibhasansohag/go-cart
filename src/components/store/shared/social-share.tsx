'use client';
import { FC, Suspense, useState, useSyncExternalStore } from 'react';
import {
	FacebookShareButton,
	FacebookIcon,
	TwitterShareButton,
	TwitterIcon,
	WhatsappShareButton,
	WhatsappIcon,
	PinterestShareButton,
	PinterestIcon,
} from 'next-share';
import { cn } from '@/lib/utils';
import { Link2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { usePathname, useSearchParams } from 'next/navigation';

// The origin stays constant within this document. Use an empty server snapshot
// so the first browser render matches the HTML during hydration.
const subscribeToOrigin = () => () => undefined;
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => '';

interface Props {
	url?: string;
	quote?: string;
	media?: string;
	isCol?: boolean;
	showCopy?: boolean;
	iconSize?: number;
	className?: string;
}

const SocialShare: FC<Props> = ({
	url,
	quote,
	media,
	isCol,
	showCopy = true,
	iconSize = 32,
	className,
}) => {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const origin = useSyncExternalStore(
		subscribeToOrigin,
		getBrowserOrigin,
		getServerOrigin,
	);
	const [copied, setCopied] = useState(false);
	const query = searchParams.toString();
	const currentUrl = origin ? `${origin}${pathname}${query ? `?${query}` : ''}` : '';
	const shareUrl = url || currentUrl;
	const shareQuote =
		quote || (origin ? document.title : '') || 'Check out this deal on GoCart!';
	const ogImage = origin
		? document.querySelector('meta[property="og:image"]')?.getAttribute('content')
		: null;
	const shareMedia = media || ogImage || (origin ? `${origin}/opengraph-image` : '');

	const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		e.stopPropagation();
		const currentUrl =
			shareUrl || (typeof window !== 'undefined' ? window.location.href : '');

		try {
			if (!navigator.clipboard) throw new Error('Clipboard unavailable');
			await navigator.clipboard.writeText(currentUrl);
			setCopied(true);
			toast.success('Link copied to clipboard!');
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error('Could not copy the link. Please copy it from the address bar.');
		}
	};

	if (!shareUrl) return null;
	const effectiveUrl = shareUrl;

	return (
		<div
			className={cn(
				'flex flex-wrap items-center justify-center gap-2',
				{
					'flex-col': isCol,
				},
				className,
			)}
		>
			<div title='Share on Facebook'>
				<FacebookShareButton
					url={effectiveUrl}
					quote={shareQuote}
					hashtag='#GoCart'
				>
					<FacebookIcon size={iconSize} round />
				</FacebookShareButton>
			</div>

			<div title='Share on X (Twitter)'>
				<TwitterShareButton url={effectiveUrl} title={shareQuote}>
					<TwitterIcon size={iconSize} round />
				</TwitterShareButton>
			</div>

			<div title='Share via WhatsApp'>
				<WhatsappShareButton
					url={effectiveUrl}
					title={shareQuote}
					separator=' - '
				>
					<WhatsappIcon size={iconSize} round />
				</WhatsappShareButton>
			</div>

			<div title='Pin to Pinterest'>
				<PinterestShareButton
					url={effectiveUrl}
					media={shareMedia || effectiveUrl}
					description={shareQuote}
				>
					<PinterestIcon size={iconSize} round />
				</PinterestShareButton>
			</div>

			{showCopy && (
				<button
					type='button'
					onClick={handleCopy}
					title='Copy link'
					aria-label='Copy link to clipboard'
					className={cn(
						'flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 active:scale-95 text-white transition-all shadow-md cursor-pointer',
						iconSize === 32 ? 'w-8 h-8' : 'w-7 h-7',
					)}
				>
					{copied ? (
						<Check className='w-4 h-4 text-emerald-400 stroke-[3]' />
					) : (
						<Link2 className='w-4 h-4 text-white' />
					)}
				</button>
			)}
		</div>
	);
};

export default function SocialShareWithSuspense(props: Props) {
	return <Suspense fallback={null}><SocialShare {...props} /></Suspense>;
}
