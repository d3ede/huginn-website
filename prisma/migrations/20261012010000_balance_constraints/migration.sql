ALTER TABLE "User" ADD CONSTRAINT "User_balance_nonnegative" CHECK ("balanceMicro" >= 0);
ALTER TABLE "Task" ADD CONSTRAINT "Task_money_valid" CHECK ("reservedMicro" > 0 AND "costMicro" >= 0 AND "costMicro" <= "reservedMicro");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive" CHECK ("amountMicro" > 0);
