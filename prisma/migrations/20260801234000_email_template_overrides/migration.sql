-- CreateEnum
CREATE TYPE "EmailTemplateSource" AS ENUM ('DEFAULT', 'CUSTOM');

-- AlterTable
ALTER TABLE "EmailOutbox"
ADD COLUMN "templateSource" "EmailTemplateSource" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN "templateVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "draftSubject" TEXT NOT NULL,
    "draftPreheader" TEXT NOT NULL,
    "draftBodyHtml" TEXT NOT NULL,
    "draftCtaLabel" TEXT,
    "draftEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publishedSubject" TEXT,
    "publishedPreheader" TEXT,
    "publishedBodyHtml" TEXT,
    "publishedCtaLabel" TEXT,
    "publishedEnabled" BOOLEAN,
    "publishedVersion" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_templateKey_key" ON "EmailTemplate"("templateKey");
CREATE INDEX "EmailTemplate_updatedById_idx" ON "EmailTemplate"("updatedById");
CREATE INDEX "EmailTemplate_publishedAt_idx" ON "EmailTemplate"("publishedAt");

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
