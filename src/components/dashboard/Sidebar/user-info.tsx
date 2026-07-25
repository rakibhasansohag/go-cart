import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
interface UserType {
	firstName?: string | null;
	lastName?: string | null;
	imageUrl?: string;
	emailAddresses?: Array<{ emailAddress: string }>;
	privateMetadata?: Record<string, unknown>;
	publicMetadata?: Record<string, unknown>;
	unsafeMetadata?: Record<string, unknown>;
}

export default function UserInfo({ user }: { user: UserType | null }) {
	const role = (
		user?.privateMetadata?.role ||
		user?.publicMetadata?.role ||
		user?.unsafeMetadata?.role ||
		''
	)?.toString();
	const firstName = user?.firstName || '';
	const lastName = user?.lastName || '';
	const userName = `${firstName} ${lastName}`.trim() || 'User';
	const email = user?.emailAddresses?.[0]?.emailAddress || '';
	const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';

	return (
		<div className='w-full my-3 p-3 rounded-xl bg-muted/50 border border-border/60 flex items-center gap-3 overflow-hidden shrink-0'>
			<Avatar className='w-10 h-10 shrink-0 ring-2 ring-primary/20'>
				<AvatarImage src={user?.imageUrl} alt={userName} />
				<AvatarFallback className='bg-primary text-primary-foreground font-semibold text-xs'>
					{initials}
				</AvatarFallback>
			</Avatar>
			<div className='flex flex-col min-w-0 flex-1 space-y-0.5 overflow-hidden'>
				<p className='text-xs font-semibold leading-tight truncate text-foreground'>
					{userName}
				</p>
				<p
					className='text-[11px] text-muted-foreground truncate w-full block'
					title={email}
				>
					{email}
				</p>
				<div className='pt-0.5'>
					<Badge
						variant='secondary'
						className='capitalize text-[10px] px-2 py-0 h-4 font-medium inline-block truncate max-w-full'
					>
						{role?.toLowerCase() || 'user'} dashboard
					</Badge>
				</div>
			</div>
		</div>
	);
}
