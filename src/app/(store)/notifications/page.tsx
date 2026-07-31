import Header from "@/components/store/layout/header/header";
import NotificationList from "@/components/store/notifications/notification-list";
import { getQueryClient } from "@/lib/get-query-client";
import { queryKeys } from "@/lib/query-keys";
import { getNotifications } from "@/queries/notifications";
import { auth } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

const INITIAL_FILTERS = { page: 1, limit: 10, unreadOnly: false } as const;

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/notifications");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.notifications.list({
      ...INITIAL_FILTERS,
      viewerId: userId,
    }),
    queryFn: () => getNotifications(INITIAL_FILTERS),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Order, delivery, return, and account activity in one place.
          </p>
        </header>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <NotificationList />
        </HydrationBoundary>
      </main>
    </div>
  );
}
