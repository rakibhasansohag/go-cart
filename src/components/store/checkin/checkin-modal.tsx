"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getDailyCheckInStatus } from "@/queries/checkin";
import CheckInCalendar from "./checkin-calendar";
import { X, Sparkles, Trophy } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function CheckInModal() {
  const { isLoaded, isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: statusData } = useQuery({
    queryKey: ["daily-checkin-status"],
    queryFn: () => getDailyCheckInStatus(),
    enabled: Boolean(isLoaded && isSignedIn),
    staleTime: 1000 * 60 * 60 * 4, // 4 hours cache
    gcTime: 1000 * 60 * 60 * 24,
  });

  useEffect(() => {
    if (!statusData) return;

    const dismissedKey = `gocart_checkin_dismissed_${statusData.todayDateStr}`;
    const isDismissed = localStorage.getItem(dismissedKey);

    if (statusData.isEligible && !statusData.hasClaimedToday && !isDismissed) {
      setIsOpen(true);
    }
  }, [statusData]);

  const handleClose = () => {
    try {
      if (statusData?.todayDateStr) {
        localStorage.setItem(
          `gocart_checkin_dismissed_${statusData.todayDateStr}`,
          "true",
        );
      }
    } catch {
      // Closing the modal must still work if browser storage is unavailable.
    } finally {
      setIsOpen(false);
    }
  };

  if (!isSignedIn || !statusData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-2.5 backdrop-blur-md sm:p-6"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className="relative flex h-[min(94vh,52rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl sm:h-[min(90vh,52rem)] sm:rounded-3xl"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleClose();
              }}
              aria-label="Close modal"
              className="absolute top-3 right-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:top-4 sm:right-4 sm:h-9 sm:w-9"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Top Banner */}
            <div className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 p-4 sm:p-6 text-white text-center relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none">
                <Trophy className="w-36 h-36 sm:w-48 sm:h-48 text-white" />
              </div>
              <div className="relative z-10 flex flex-col items-center justify-center gap-y-1 sm:gap-y-1.5">
                <div className="inline-flex items-center gap-x-1.5 bg-white/20 backdrop-blur-md px-3 py-0.5 sm:px-4 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Daily
                  Visitor Reward
                </div>
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight">
                  Claim Your Daily GoCoins & Coupons!
                </h1>
                <p className="text-[11px] sm:text-xs text-white/90 max-w-lg hidden sm:block">
                  Welcome back! Check in each day of the month to unlock GoCoins
                  balance, free shipping perks, and personal promo codes.
                </p>
              </div>
            </div>

            <ScrollArea
              className="min-h-0 flex-1 bg-background"
              scrollBarClassName="w-3 border-l-0 bg-slate-950/5 p-1.5 hover:bg-slate-950/10"
              thumbClassName="bg-slate-400/70 hover:bg-slate-500 active:bg-slate-600"
            >
              <div className="p-3 sm:p-5">
                <CheckInCalendar
                  hasClaimedToday={statusData.hasClaimedToday}
                  claimedDaysCount={statusData.claimedDaysCount}
                  daysInMonth={statusData.daysInMonth}
                  todayDateStr={statusData.todayDateStr}
                  checkIns={statusData.checkIns}
                  onClaimSuccess={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["daily-checkin-status"],
                    });
                  }}
                />
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
