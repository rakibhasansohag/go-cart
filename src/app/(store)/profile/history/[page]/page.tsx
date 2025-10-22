import { notFound } from 'next/navigation';
import HistoryContent from '@/components/store/profile/history/history-content';

interface ProfileHistoryPageProps {
	params: Promise<{ page: string }>;
}

export default async function ProfileHistoryPage({
	params,
}: ProfileHistoryPageProps) {
	const awaitedParams = await params;

	const pageParam = awaitedParams.page;

	// Server-side validation
	const initialPage = Number(pageParam);

	if (isNaN(initialPage) || initialPage < 1) {
		// Handle invalid page number gracefully
		notFound();
	}

	return <HistoryContent initialPage={initialPage} />;
}
