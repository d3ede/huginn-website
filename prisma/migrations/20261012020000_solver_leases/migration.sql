ALTER TABLE "Task"
  ADD COLUMN "serverAcceptance" TEXT,
  ADD COLUMN "resultUserAgent" TEXT,
  ADD COLUMN "resultRespKey" TEXT,
  ADD COLUMN "leaseId" UUID,
  ADD COLUMN "leaseUntil" TIMESTAMP(3);
CREATE INDEX "Task_status_leaseUntil_idx" ON "Task" (status, "leaseUntil");
