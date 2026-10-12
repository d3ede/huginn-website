ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "BillingSettings" (
  "id" SERIAL PRIMARY KEY,
  "priceMicro" INTEGER NOT NULL CHECK ("priceMicro" BETWEEN 1 AND 1000000),
  "topUpMinUsd" INTEGER NOT NULL CHECK ("topUpMinUsd" BETWEEN 1 AND 1000000),
  "topUpMaxUsd" INTEGER NOT NULL CHECK ("topUpMaxUsd" BETWEEN "topUpMinUsd" AND 1000000),
  "paymentProvider" TEXT NOT NULL CHECK ("paymentProvider" IN ('disabled', 'http')),
  "paymentURL" TEXT NOT NULL,
  "paymentSecret" TEXT,
  "webhookSecret" TEXT,
  "changedById" UUID REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "RuntimeSettings" (
  "id" TEXT PRIMARY KEY,
  "billingSettingsId" INTEGER NOT NULL UNIQUE REFERENCES "BillingSettings"("id") ON DELETE RESTRICT
);
ALTER TABLE "Payment" ADD COLUMN "billingSettingsId" INTEGER REFERENCES "BillingSettings"("id") ON DELETE RESTRICT;
