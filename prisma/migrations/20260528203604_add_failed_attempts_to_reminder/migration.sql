-- AlterTable
ALTER TABLE "RefillReminder" ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0;
