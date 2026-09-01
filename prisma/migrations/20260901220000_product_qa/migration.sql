-- CreateEnum
CREATE TYPE "QAModerationStatus" AS ENUM ('PUBLISHED', 'PENDING_REVIEW', 'FLAGGED', 'REJECTED', 'HIDDEN');

-- CreateTable
CREATE TABLE "ProductQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" "QAModerationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAnswer" (
    "id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isOfficialSeller" BOOLEAN NOT NULL DEFAULT false,
    "isVerifiedBuyer" BOOLEAN NOT NULL DEFAULT false,
    "status" "QAModerationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductQuestionVote" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductQuestionVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAnswerVote" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAnswerVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductQuestion_productId_status_createdAt_idx" ON "ProductQuestion"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductQuestion_userId_idx" ON "ProductQuestion"("userId");

-- CreateIndex
CREATE INDEX "ProductAnswer_questionId_status_createdAt_idx" ON "ProductAnswer"("questionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductAnswer_userId_idx" ON "ProductAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductQuestionVote_questionId_userId_key" ON "ProductQuestionVote"("questionId", "userId");

-- CreateIndex
CREATE INDEX "ProductQuestionVote_userId_idx" ON "ProductQuestionVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAnswerVote_answerId_userId_key" ON "ProductAnswerVote"("answerId", "userId");

-- CreateIndex
CREATE INDEX "ProductAnswerVote_userId_idx" ON "ProductAnswerVote"("userId");

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnswer" ADD CONSTRAINT "ProductAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ProductQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnswer" ADD CONSTRAINT "ProductAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestionVote" ADD CONSTRAINT "ProductQuestionVote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ProductQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductQuestionVote" ADD CONSTRAINT "ProductQuestionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnswerVote" ADD CONSTRAINT "ProductAnswerVote_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "ProductAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnswerVote" ADD CONSTRAINT "ProductAnswerVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
