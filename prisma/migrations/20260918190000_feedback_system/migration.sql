-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "FeedbackCategory" AS ENUM ('BUG', 'FEATURE_REQUEST', 'UI_UX', 'DEVELOPER_IMPRESSION', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_REVIEW', 'PLANNED', 'RESOLVED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FeedbackUserRole" AS ENUM ('GUEST', 'CUSTOMER', 'SELLER', 'DEVELOPER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "FeedbackUserRole" NOT NULL DEFAULT 'GUEST',
    "userId" TEXT,
    "category" "FeedbackCategory" NOT NULL DEFAULT 'GENERAL',
    "rating" INTEGER,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "deviceInfo" JSONB,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback"("status");
CREATE INDEX IF NOT EXISTS "Feedback_category_idx" ON "Feedback"("category");
CREATE INDEX IF NOT EXISTS "Feedback_createdAt_idx" ON "Feedback"("createdAt");
CREATE INDEX IF NOT EXISTS "Feedback_email_idx" ON "Feedback"("email");
