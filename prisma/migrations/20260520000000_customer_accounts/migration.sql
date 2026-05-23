-- Customer-facing accounts: auth fields on the existing Customer row.
-- The patient record and the login account are intentionally the same row so
-- order history + dispensary timeline stay unified.

ALTER TABLE "Customer" ADD COLUMN     "passwordHash" TEXT,
                       ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
                       ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
                       ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
                       ADD COLUMN     "lockedUntil" TIMESTAMP(3),
                       ADD COLUMN     "resetTokenHash" TEXT,
                       ADD COLUMN     "resetTokenExpires" TIMESTAMP(3);

-- Email becomes a login identifier. Postgres allows multiple NULLs under a
-- UNIQUE index, so walk-ins without an email are unaffected.
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- New audit actions for the customer auth surface.
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_SIGNUP';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_LOGIN_SUCCESS';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_LOGIN_FAILURE';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_LOGIN_LOCKED';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_PASSWORD_RESET_REQUEST';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_PASSWORD_RESET';
