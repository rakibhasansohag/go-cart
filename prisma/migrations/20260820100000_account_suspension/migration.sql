-- Enforceable account status for platform-wide access control.
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "User"
ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");
