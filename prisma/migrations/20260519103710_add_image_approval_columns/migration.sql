-- CreateEnum
CREATE TYPE "ImageApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ImageCopyrightStatus" AS ENUM ('UNKNOWN', 'OWNED_BY_PHARMACY', 'MANUFACTURER_AUTHORIZED', 'DISTRIBUTOR_CONTRACT', 'STOCK_LICENSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEDICINE_IMAGE_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE 'MEDICINE_IMAGE_REJECT';

-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "approvalStatus" "ImageApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "copyrightStatus" "ImageCopyrightStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "ocrExtractedText" TEXT,
ADD COLUMN     "ocrMatchedAt" TIMESTAMP(3),
ADD COLUMN     "photographerId" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "Medicine_approvalStatus_idx" ON "Medicine"("approvalStatus");
