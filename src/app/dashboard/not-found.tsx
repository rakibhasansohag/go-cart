import Animated404 from '@/components/shared/animated404';

export default function NotFound() {
	return <Animated404 title='Dashboard page not found'
		subtitle='That page is unavailable. Return to your dashboard or explore the guides.'
		suggestions={[
			{ title: 'My dashboard', href: '/dashboard', description: 'Open the dashboard for your account.' },
			{ title: 'Help and guides', href: '/documentation', description: 'Find help with GoCart features.' },
		]} />;
}
