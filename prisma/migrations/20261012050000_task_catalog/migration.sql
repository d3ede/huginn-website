ALTER TABLE "BillingSettings" ADD COLUMN "taskProducts" JSONB;
UPDATE "BillingSettings" SET "taskProducts" = jsonb_build_array(jsonb_build_object(
  'id', 'hcaptcha', 'name', 'hCaptcha', 'priceMicro', "priceMicro", 'enabled', true
));
ALTER TABLE "BillingSettings" ALTER COLUMN "taskProducts" SET NOT NULL;
