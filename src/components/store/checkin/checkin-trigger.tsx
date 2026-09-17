"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getDailyCheckInStatus } from "@/queries/checkin";
import { openDailyCheckIn } from "./checkin-modal";
import { cn } from "@/lib/utils";

interface CheckInTriggerProps {
  variant?: "header" | "mobile" | "floating";
  className?: string;
}

export default function CheckInTrigger({
  variant = "header",
  className,
}: CheckInTriggerProps) {
  const { isLoaded, isSignedIn } = useUser();

  const { data: statusData } = useQuery({
    queryKey: ["daily-checkin-status"],
    queryFn: () => getDailyCheckInStatus(),
    enabled: Boolean(isLoaded && isSignedIn),
    staleTime: 1000 * 60 * 60 * 4,
    gcTime: 1000 * 60 * 60 * 24,
  });

  const hasUnclaimed = Boolean(
    statusData?.isEligible && !statusData?.hasClaimedToday
  );

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    openDailyCheckIn();
  };

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Open daily check-in calendar"
        title="Open Daily Check-In Calendar (Testing & Rewards)"
        className={cn(
          "fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-3.5 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 hover:shadow-orange-500/30 cursor-pointer",
          className
        )}
      >
        <Calendar className="w-4 h-4 text-white shrink-0" />
        <span className="hidden sm:inline">Check-In Calendar</span>
        <span className="sm:hidden">Check-In</span>
        {hasUnclaimed && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        )}
      </button>
    );
  }

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Daily Check-In"
        title="Daily Check-In"
        className={cn(
          "relative flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer",
          className
        )}
      >
        <Calendar className="w-3.5 h-3.5 text-amber-300" />
        <span>Check-in</span>
        {hasUnclaimed && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Daily Check-In Calendar"
      title="Daily Check-In Calendar"
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer",
        className
      )}
    >
      <Calendar className="w-3.5 h-3.5 text-amber-300" />
      <span>Daily Check-in</span>
      {hasUnclaimed && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
        </span>
      )}
    </button>
  );
}
