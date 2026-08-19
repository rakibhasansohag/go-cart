"use client";

import { RecentOrderSummary } from "@/queries/analytics";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OrderStatusTag from "@/components/shared/order-status";
import { format } from "date-fns";

interface RecentTransactionsProps {
  orders: RecentOrderSummary[];
  title?: string;
  description?: string;
}

export default function RecentTransactions({
  orders,
  title = "Recent Transactions",
  description = "Latest customer purchases across stores",
}: RecentTransactionsProps) {
  return (
    <Card className="shadow-sm border border-border/60">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No recent orders found.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {orders.map((order) => {
              const initials = order.customerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={order.id}
                  className="group relative -mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-3.5 transition-[background-color,box-shadow] duration-200 ease-out hover:bg-primary/10 hover:shadow-[inset_3px_0_0_hsl(var(--primary))] dark:hover:bg-primary/20 first:pt-0 last:pb-0 motion-reduce:transition-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage
                        src={order.customerImage}
                        alt={order.customerName}
                      />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-none truncate transition-colors duration-200 group-hover:text-primary motion-reduce:transition-none">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.storeName} •{" "}
                        {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
                    <OrderStatusTag
                      status={
                        order.status as unknown as import("@/lib/types").OrderStatus
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
