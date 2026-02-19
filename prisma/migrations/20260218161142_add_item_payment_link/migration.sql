-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "orderPaymentId" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_orderPaymentId_idx" ON "OrderItem"("orderPaymentId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderPaymentId_fkey" FOREIGN KEY ("orderPaymentId") REFERENCES "OrderPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
