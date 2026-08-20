"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function AccountStatusControl({
  userId,
  accountStatus,
}: {
  userId: string;
  accountStatus: "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const nextStatus = accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  async function changeStatus() {
    const action = nextStatus === "SUSPENDED" ? "suspend" : "reactivate";
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;
    setPending(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/account-status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountStatus: nextStatus }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to update account access.");
      toast.success(`Account ${nextStatus === "SUSPENDED" ? "suspended" : "reactivated"}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update account access.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={nextStatus === "SUSPENDED" ? "destructive" : "outline"}
      onClick={changeStatus}
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : nextStatus === "SUSPENDED" ? <Ban /> : <CheckCircle2 />}
      {nextStatus === "SUSPENDED" ? "Suspend account" : "Reactivate account"}
    </Button>
  );
}
