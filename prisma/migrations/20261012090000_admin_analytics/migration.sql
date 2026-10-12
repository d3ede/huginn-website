ALTER TABLE "Task" ADD COLUMN "solveMode" TEXT, ADD COLUMN "reportSummary" JSONB;
CREATE INDEX "Task_createdAt_userId_idx" ON "Task"("createdAt", "userId");
