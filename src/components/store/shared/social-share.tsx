'use client';
import { FC, useEffect, useState } from 'react';
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
	const [shareUrl, setShareUrl] = useState(url || '');
	const [shareQuote, setShareQuote] = useState(quote || '');
	const [shareMedia, setShareMedia] = useState(media || '');
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (typeof window !== 'undefined') {
			setShareUrl(url || window.location.href);
			setShareQuote(quote || document.title || 'Check out this deal on GoCart!');
			if (!media) {
				const ogImage = document
					.querySelector('meta[property="og:image"]')
					?.getAttribute('content');
				setShareMedia(
					ogImage || `${window.location.origin}/assets/images/logo.png`,
				);
			} else {
				setShareMedia(media);
			}
		}
	}, [url, quote, media]);

	const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		e.stopPropagation();
		const currentUrl =
			shareUrl || (typeof window !== 'undefined' ? window.location.href : '');

		if (navigator.clipboard) {
			navigator.clipboard.writeText(currentUrl);
			setCopied(true);
			toast.success('Link copied to clipboard!');
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const effectiveUrl = shareUrl || 'https://gocart.com';

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

export default SocialShare;
