CREATE TABLE "OrderPaymentReservation" (
    "orderId" TEXT NOT NULL PRIMARY KEY,
    "couponIds" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderPaymentReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
