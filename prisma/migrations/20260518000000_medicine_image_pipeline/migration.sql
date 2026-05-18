-- Medicine image pipeline — adds verification, storage, and quality metadata
-- columns to the Medicine table. Existing `imageUrl` is preserved as a legacy
-- fallback (catalog-supplied URLs). The new fields describe admin-uploaded,
-- pharmacist-verified, sharp-optimized pack-shots.
--
-- All columns are nullable so the migration is safe to apply to a populated
-- production table — no backfill required. Storefront read paths default to
-- the existing `imageUrl` when the new fields are NULL, then to the
-- auto-generated SVG placeholder.

ALTER TABLE "Medicine" ADD COLUMN "imageStorageKey"  TEXT;
ALTER TABLE "Medicine" ADD COLUMN "imagePublicUrl"   TEXT;
ALTER TABLE "Medicine" ADD COLUMN "imageMime"        TEXT;
ALTER TABLE "Medicine" ADD COLUMN "imageWidth"       INTEGER;
ALTER TABLE "Medicine" ADD COLUMN "imageHeight"      INTEGER;
ALTER TABLE "Medicine" ADD COLUMN "imageBytes"       INTEGER;
ALTER TABLE "Medicine" ADD COLUMN "imagePhash"       TEXT;
ALTER TABLE "Medicine" ADD COLUMN "imageSha256"      TEXT;
ALTER TABLE "Medicine" ADD COLUMN "imageSource"      TEXT;
ALTER TABLE "Medicine" ADD COLUMN "imageSourceUrl"   TEXT;
ALTER TABLE "Medicine" ADD COLUMN "imageConfidence"  INTEGER;
ALTER TABLE "Medicine" ADD COLUMN "imageVerifiedAt"  TIMESTAMP(3);
ALTER TABLE "Medicine" ADD COLUMN "imageOptimizedAt" TIMESTAMP(3);

-- Find unverified medicines fast (admin queue).
CREATE INDEX "Medicine_imageVerifiedAt_idx" ON "Medicine"("imageVerifiedAt");

-- Catch perceptual-hash duplicates (same packshot uploaded twice for
-- different SKUs by mistake). Plain btree on the 16-char hex string
-- is enough; we don't need a GiST/GIN for this scale.
CREATE INDEX "Medicine_imagePhash_idx" ON "Medicine"("imagePhash");

-- Audit actions for the image pipeline. Postgres requires committing each
-- ALTER TYPE ... ADD VALUE separately from any subsequent use of the value
-- in the same transaction; Prisma migrate handles this for us, but we keep
-- the statements as the very last block so any future surgery on this
-- migration doesn't get tripped by Postgres's enum-modification rules.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICINE_IMAGE_UPLOAD';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICINE_IMAGE_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICINE_IMAGE_VERIFY';
