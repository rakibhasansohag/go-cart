import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AccountSuspendedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-destructive">
          Account unavailable
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">This account is suspended</h1>
        <p className="mt-3 text-muted-foreground">
          You cannot use GoCart while the suspension is active. If you think this is a mistake,
          contact the marketplace team with your account email.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Return to home</Link>
        </Button>
      </section>
    </main>
  );
}
