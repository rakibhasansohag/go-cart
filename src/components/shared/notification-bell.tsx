"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { queryKeys } from "@/lib/query-keys";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/queries/notifications";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const RECENT_FILTERS = { page: 1, limit: 6 } as const;

export default function NotificationBell() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: queryKeys.notifications.list({
      ...RECENT_FILTERS,
      viewerId: user?.id,
    }),
    queryFn: () => getNotifications(RECENT_FILTERS),
    enabled: Boolean(isLoaded && isSignedIn),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: refresh,
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: refresh,
  });

  if (!isSignedIn) return null;

  const unreadCount = data?.unreadCount ?? 0;
  const openNotification = async (
    notificationId: string,
    actionUrl: string | null,
    isUnread: boolean,
  ) => {
    if (isUnread) {
      try {
        await markOne.mutateAsync(notificationId);
      } finally {
        router.push(actionUrl || "/notifications");
      }
    }
  };

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) void refetch();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-current hover:bg-current/10"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          title="Notifications"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-[100000] w-[min(92vw,380px)] p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Notifications</h2>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {unreadCount} unread
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data?.notifications.length ? (
            data.notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.actionUrl || "/notifications"}
                onClick={(event) => {
                  if (!notification.readAt) {
                    event.preventDefault();
                    void openNotification(
                      notification.id,
                      notification.actionUrl,
                      true,
                    );
                  }
                }}
                className="block border-b border-border/60 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <div className="flex items-start gap-2">
                  {!notification.readAt && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <time className="mt-1 block text-[11px] text-muted-foreground">
                      {formatDistanceToNow(notification.createdAt, {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
        </div>
        <Link
          href="/notifications"
          className="block px-4 py-3 text-center text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          View all notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
}
