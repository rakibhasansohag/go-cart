'use client';

import { Headset, Mail, MapPin, Globe } from 'lucide-react';
import { SocialLogo } from 'social-logos';

type SocialIconName = React.ComponentProps<typeof SocialLogo>['icon'];

interface SocialProfile {
	name: string;
	icon: SocialIconName;
	href: string;
	label: string;
}

const SOCIAL_PROFILES: SocialProfile[] = [
	{
		name: 'GitHub',
		icon: 'github',
		href: 'https://github.com/rakibhasansohag',
		label: 'GitHub Profile',
	},
	{
		name: 'LinkedIn',
		icon: 'linkedin',
		href: 'https://www.linkedin.com/in/rakib-hasan-sohag',
		label: 'LinkedIn Profile',
	},
	{
		name: 'WhatsApp',
		icon: 'whatsapp',
		href: 'https://wa.me/8801760169982?text=Hello%20Rakib%2C%20contacting%20you%20regarding%20GoCart',
		label: 'Chat on WhatsApp',
	},
	{
		name: 'Facebook',
		icon: 'facebook',
		href: 'https://facebook.com/rakibhasansohag133',
		label: 'Facebook Profile',
	},
	{
		name: 'Telegram',
		icon: 'telegram',
		href: 'https://t.me/rakibhasansohag',
		label: 'Telegram Message',
	},
	{
		name: 'Instagram',
		icon: 'instagram',
		href: 'https://instagram.com/rakibhasansohag',
		label: 'Instagram Profile',
	},
	{
		name: 'YouTube',
		icon: 'youtube',
		href: 'https://youtube.com/@rakibhasansohag',
		label: 'YouTube Channel',
	},
];

export default function Contact() {
	return (
		<div className='flex flex-col gap-y-5'>
			<div className='space-y-2'>
				<div className='flex items-center gap-x-4 sm:gap-x-6'>
					<Headset className='w-10 h-10 text-emerald-500 shrink-0' />
					<div className='flex flex-col'>
						<span className='font-bold text-sm text-foreground'>
							Got Questions ? Contact us 24/7!
						</span>
						<a
							href='tel:+8801760169982'
							className='text-base sm:text-lg text-foreground font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors'
						>
							+880 1760-169982
						</a>
						<a
							href='mailto:rakibhasansohag133@gmail.com'
							className='text-xs text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors'
						>
							rakibhasansohag133@gmail.com
						</a>
					</div>
				</div>
			</div>

			<div className='flex flex-col space-y-2 text-sm text-muted-foreground'>
				<b className='text-foreground text-base'>Contact & Creator Info</b>
				<div className='flex items-center gap-2'>
					<MapPin className='w-4 h-4 text-emerald-500 shrink-0' />
					<span>
						<strong className='text-foreground'>Location:</strong> Dhaka, Bangladesh
					</span>
				</div>
				<div className='flex items-center gap-2'>
					<Globe className='w-4 h-4 text-emerald-500 shrink-0' />
					<span>
						<strong className='text-foreground'>Developer:</strong>{' '}
						<a
							href='https://rakib-hasan-sohag.vercel.app'
							target='_blank'
							rel='noopener noreferrer'
							className='hover:text-emerald-600 dark:hover:text-emerald-400 underline font-medium'
						>
							Rakib Hasan Sohag
						</a>
					</span>
				</div>

				{/* Social Profile Links */}
				<div className='flex flex-wrap gap-2.5 pt-2'>
					{SOCIAL_PROFILES.map((profile) => (
						<a
							key={profile.name}
							href={profile.href}
							target='_blank'
							rel='noopener noreferrer'
							title={`${profile.label} (${profile.name})`}
							aria-label={profile.label}
							className='p-1.5 rounded-lg bg-muted/60 hover:bg-emerald-500/10 border border-border/60 hover:border-emerald-500/30 transition-all group'
						>
							<SocialLogo
								icon={profile.icon}
								size={22}
								fill='#7C7C7C'
								className='group-hover:fill-emerald-600 dark:group-hover:fill-emerald-400 transition-colors'
							/>
						</a>
					))}
				</div>
			</div>
		</div>
	);
}
