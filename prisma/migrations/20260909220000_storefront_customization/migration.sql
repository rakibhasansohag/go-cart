-- AlterTable
ALTER TABLE "Store" ADD COLUMN "announcementText" TEXT,
ADD COLUMN "announcementUrl" TEXT,
ADD COLUMN "announcementActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "instagram" TEXT,
ADD COLUMN "facebook" TEXT,
ADD COLUMN "twitter" TEXT,
ADD COLUMN "youtube" TEXT,
ADD COLUMN "tiktok" TEXT;
