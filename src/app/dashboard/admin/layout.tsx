// React, Next.js
import { ReactNode } from "react";
import { redirect } from "next/navigation";

// Clerk
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// Components
import Header from "@/components/dashboard/Header/Header";
import Sidebar from "@/components/dashboard/Sidebar/Sidebar";

// Authorization reads the request-bound Clerk session. Do not reuse a rendered
// admin segment between users or requests.
export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Block non admins from accessing the admin dashboard
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard/admin");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") redirect("/");
  return (
    <div className="w-full min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <Sidebar isAdmin />
      <div className="w-full lg:ml-[300px] ml-0 flex flex-col min-w-0 transition-all">
        {/* Header */}
        <Header isAdmin />
        <main className="w-full mt-[65px] p-4 sm:p-6 lg:p-8 flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
