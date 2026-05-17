-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('PRESCRIPTION', 'MANUAL', 'OTC');

-- CreateTable
CREATE TABLE "MedicineEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dosage" TEXT,
    "notes" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entryType" "EntryType" NOT NULL DEFAULT 'MANUAL',
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MedicineEntry_customerId_entryDate_idx" ON "MedicineEntry"("customerId", "entryDate");

-- CreateIndex
CREATE INDEX "MedicineEntry_medicineId_idx" ON "MedicineEntry"("medicineId");

-- CreateIndex
CREATE INDEX "MedicineEntry_entryType_idx" ON "MedicineEntry"("entryType");

-- AddForeignKey
ALTER TABLE "MedicineEntry" ADD CONSTRAINT "MedicineEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineEntry" ADD CONSTRAINT "MedicineEntry_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineEntry" ADD CONSTRAINT "MedicineEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
