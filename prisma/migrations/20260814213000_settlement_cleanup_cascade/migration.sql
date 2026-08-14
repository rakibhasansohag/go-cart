ALTER TABLE "SettlementLedgerEntry" DROP CONSTRAINT "SettlementLedgerEntry_settlementId_fkey";
ALTER TABLE "SellerSettlement" DROP CONSTRAINT "SellerSettlement_orderGroupId_fkey";

ALTER TABLE "SellerSettlement" ADD CONSTRAINT "SellerSettlement_orderGroupId_fkey"
  FOREIGN KEY ("orderGroupId") REFERENCES "OrderGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SettlementLedgerEntry" ADD CONSTRAINT "SettlementLedgerEntry_settlementId_fkey"
  FOREIGN KEY ("settlementId") REFERENCES "SellerSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
