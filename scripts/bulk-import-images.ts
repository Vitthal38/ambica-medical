/**
 * scripts/bulk-import-images.ts
 *
 * One-shot bulk import of medicine pack-shots from a local directory.
 *
 * Use this whenever you receive a batch of legitimately-sourced photos
 * (own inventory shoot, manufacturer-supplied retailer pack-shots, stock
 * licence) and want them on every relevant card without clicking through
 * the admin UI 500 times.
 *
 * Filename convention (case-insensitive extension):
 *   {medicineId}.{ext}        → e.g.  MED-0001.jpg, p042.png
 *   {slug}.{ext}              → e.g.  paracetamol-500mg.webp
 *   {medicineId}--anything.{ext} → e.g. MED-0001--front.jpg  (only the
 *                                    part before "--" is used to match)
 *
 * Allowed extensions:  .jpg .jpeg .png .webp .avif
 * Rejected by design:  .svg .gif .pdf .heic .tif .bmp
 *
 * Behaviour:
 *   - For each file we look up the medicine by id, then by slug if id fails.
 *   - Unrecognised files are listed at the end as "no match" — never silently
 *     skipped.
 *   - Already-imaged medicines are skipped unless --force is passed. Skip
 *     state is detected from the imageStorageKey column.
 *   - Every accepted image is run through the SAME pipeline the admin POST
 *     uses (sharp validate → WebP → phash → SHA-256 → storage). No
 *     bypassing security checks. Failures are reported per-file.
 *   - Duplicate pHashes across files are surfaced as warnings, not failures
 *     (same pack-shot legitimately covers multiple strengths in pharma).
 *   - DB writes are atomic per medicine; a crash mid-batch leaves prior
 *     successes intact.
 *
 * CLI:
 *   npm run images:import -- ./incoming
 *   npm run images:import -- ./incoming --source=own_photo --confidence=100
 *   npm run images:import -- ./incoming --force          # re-import even if exists
 *   npm run images:import -- ./incoming --dry-run        # validate only, no writes
 *
 * Source labels accepted (default: admin_upload):
 *   admin_upload  manufacturer  own_photo  stock_licensed
 */

import { readdir, readFile, stat } from 'fs/promises';
import { extname, basename, resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { processMedicineImage } from '../src/lib/medicine-images/pipeline';
import { getMedicineImageStorage } from '../src/lib/medicine-images/storage';

const prisma = new PrismaClient();

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const ALLOWED_SOURCES = new Set(['admin_upload', 'manufacturer', 'own_photo', 'stock_licensed']);

interface CliArgs {
  dir: string;
  source: string;
  confidence: number;
  force: boolean;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const a = process.argv.slice(2);
  let dir = '';
  let source = 'admin_upload';
  let confidence = 70;
  let force = false;
  let dryRun = false;
  for (const tok of a) {
    if (tok === '--force') force = true;
    else if (tok === '--dry-run' || tok === '--dryrun') dryRun = true;
    else if (tok.startsWith('--source=')) source = tok.slice('--source='.length);
    else if (tok.startsWith('--confidence=')) confidence = parseInt(tok.slice('--confidence='.length), 10);
    else if (!tok.startsWith('--')) dir = tok;
  }
  if (!dir) {
    console.error('Usage: npm run images:import -- <directory> [--source=...] [--confidence=N] [--force] [--dry-run]');
    process.exit(2);
  }
  if (!ALLOWED_SOURCES.has(source)) {
    console.error(`--source must be one of: ${[...ALLOWED_SOURCES].join(', ')}`);
    process.exit(2);
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    console.error('--confidence must be an integer 0-100');
    process.exit(2);
  }
  return { dir: resolve(dir), source, confidence, force, dryRun };
}

/**
 * Strip path noise from a filename to a candidate medicine identifier.
 *
 *   "MED-0001.jpg"             -> "MED-0001"
 *   "MED-0001--front.png"      -> "MED-0001"
 *   "paracetamol-500mg.webp"   -> "paracetamol-500mg"
 *   "Crocin 500 mg.jpg"        -> "crocin-500-mg"   (best-effort slug)
 */
function identifierFromFilename(file: string): string {
  const stem = basename(file).replace(extname(file), '');
  const beforeDoubleDash = stem.includes('--') ? stem.split('--')[0] : stem;
  return beforeDoubleDash.trim();
}

interface BatchReport {
  total: number;
  imported: number;
  skipped_existing: number;
  skipped_no_match: { file: string; identifier: string }[];
  rejected: { file: string; medicineId: string; code: string; message: string }[];
  duplicates_warned: { file: string; medicineId: string; collision_with: string[] }[];
  source_storage: string;
  dryRun: boolean;
}

async function main() {
  const args = parseArgs();
  console.log(`Bulk-importing medicine images from: ${args.dir}`);
  console.log(`  source label:  ${args.source}`);
  console.log(`  confidence:    ${args.confidence}`);
  console.log(`  force:         ${args.force}`);
  console.log(`  dry-run:       ${args.dryRun}`);

  // Confirm directory exists
  try {
    const s = await stat(args.dir);
    if (!s.isDirectory()) throw new Error('not a directory');
  } catch (err) {
    console.error(`  ✗ ${args.dir}: ${err instanceof Error ? err.message : 'unreadable'}`);
    process.exit(2);
  }

  const storage = getMedicineImageStorage();
  console.log(`  storage:       ${storage.backendName}`);
  console.log();

  // Enumerate candidate files (top-level only; we don't recurse)
  const entries = await readdir(args.dir);
  const candidates = entries.filter((f) => ALLOWED_EXTS.has(extname(f).toLowerCase()));

  const report: BatchReport = {
    total: candidates.length,
    imported: 0,
    skipped_existing: 0,
    skipped_no_match: [],
    rejected: [],
    duplicates_warned: [],
    source_storage: storage.backendName,
    dryRun: args.dryRun,
  };

  console.log(`Found ${candidates.length} candidate file(s).`);

  for (const file of candidates) {
    const path = resolve(args.dir, file);
    const ident = identifierFromFilename(file);

    // Match by id OR slug — single SQL round-trip
    const med = await prisma.medicine.findFirst({
      where: { OR: [{ id: ident }, { slug: ident.toLowerCase() }] },
      select: { id: true, brand: true, slug: true, imageStorageKey: true },
    });

    if (!med) {
      report.skipped_no_match.push({ file, identifier: ident });
      continue;
    }

    if (med.imageStorageKey && !args.force) {
      report.skipped_existing++;
      continue;
    }

    const bytes = await readFile(path);
    const result = await processMedicineImage({
      bytes,
      declaredMime: 'application/octet-stream',
      medicineId: med.id,
      source: args.source,
    });

    if (!result.ok) {
      report.rejected.push({ file, medicineId: med.id, code: result.code, message: result.message });
      continue;
    }

    // Duplicate detection across the catalog (non-blocking warning).
    const dupes = await prisma.medicine.findMany({
      where: { imagePhash: result.phash, id: { not: med.id } },
      select: { id: true },
      take: 5,
    });
    if (dupes.length > 0) {
      report.duplicates_warned.push({
        file,
        medicineId: med.id,
        collision_with: dupes.map((d) => d.id),
      });
    }

    if (args.dryRun) {
      console.log(`  ✓ ${file} → ${med.id} (${med.brand}) — DRY-RUN (would import ${result.bytes} bytes)`);
      report.imported++;
      // In dry-run mode the file was written to storage by the pipeline.
      // Roll that back so a dry-run leaves no trace.
      await storage.remove(result.storageKey).catch(() => {});
      continue;
    }

    // Remove any previous image bytes to avoid orphan storage.
    if (med.imageStorageKey && med.imageStorageKey !== result.storageKey) {
      await storage.remove(med.imageStorageKey).catch(() => {});
    }

    await prisma.medicine.update({
      where: { id: med.id },
      data: {
        imageStorageKey: result.storageKey,
        imagePublicUrl: result.publicUrl,
        imageMime: result.mime,
        imageWidth: result.width,
        imageHeight: result.height,
        imageBytes: result.bytes,
        imagePhash: result.phash,
        imageSha256: result.sha256,
        imageSource: args.source,
        imageConfidence: args.confidence,
        imageVerifiedAt: args.confidence >= 70 ? new Date() : null,
        imageOptimizedAt: new Date(),
      },
    });

    console.log(`  ✓ ${file} → ${med.id} (${med.brand}) [${result.bytes} B, ${result.width}×${result.height}]`);
    report.imported++;
  }

  // ----- Summary -----------------------------------------------------------
  console.log();
  console.log('Batch report');
  console.log(`  total candidates:     ${report.total}`);
  console.log(`  imported:             ${report.imported}${args.dryRun ? ' (dry-run; no DB changes persisted)' : ''}`);
  console.log(`  skipped (had image):  ${report.skipped_existing}`);
  console.log(`  skipped (no match):   ${report.skipped_no_match.length}`);
  console.log(`  rejected by pipeline: ${report.rejected.length}`);
  console.log(`  duplicate warnings:   ${report.duplicates_warned.length}`);
  console.log(`  storage backend:      ${report.source_storage}`);

  if (report.skipped_no_match.length) {
    console.log();
    console.log('No-match files (first 10):');
    for (const s of report.skipped_no_match.slice(0, 10)) {
      console.log(`    - ${s.file}  (matched ident: '${s.identifier}')`);
    }
  }
  if (report.rejected.length) {
    console.log();
    console.log('Rejections (first 10):');
    for (const r of report.rejected.slice(0, 10)) {
      console.log(`    - ${r.file} → ${r.medicineId} : ${r.code} : ${r.message}`);
    }
  }
  if (report.duplicates_warned.length) {
    console.log();
    console.log('Duplicate pHashes (first 10):');
    for (const d of report.duplicates_warned.slice(0, 10)) {
      console.log(`    - ${d.file} → ${d.medicineId} also matches: ${d.collision_with.join(', ')}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
