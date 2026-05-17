/**
 * Seed an initial admin user + sync medicines from the public catalog so the
 * admin can immediately link prescriptions/orders to real SKUs.
 *
 * Run:
 *   npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';

const prisma = new PrismaClient();

// bcrypt cost — keep in sync with src/app/api/admin/auth/login/route.ts.
const BCRYPT_ROUNDS = 12;
// Lowest-effort password we'll accept for production seeds.
const MIN_PASSWORD_LEN = 12;

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@ambicamedical.in').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'change-me-now-12345';
  const isProd = process.env.NODE_ENV === 'production';
  const isDefault = password === 'change-me-now-12345';

  // Refuse to seed a weak admin password in a production environment.
  if (isProd && (isDefault || password.length < MIN_PASSWORD_LEN)) {
    console.error(
      '✗ SEED_ADMIN_PASSWORD must be set to a strong value (≥12 chars, non-default) in production.',
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email },
    update: {
      // On re-seed in prod, ONLY rotate the password — do NOT silently
      // re-enable a deactivated admin or change the role.
      passwordHash,
    },
    create: {
      email,
      passwordHash,
      name: 'Pharmacy Admin',
      role: 'ADMIN',
      active: true,
    },
  });
  console.log(`✓ Admin user ready: ${email}`);
  if (isDefault) {
    console.log(
      '⚠  Default password in use. Set SEED_ADMIN_PASSWORD to a strong value before deploying.',
    );
  }
}

interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  manufacturer?: string;
  category: string;
  subcategory?: string;
  dosage?: string;
  dosageForm?: string;
  pack: string;
  rxRequired?: boolean;
  mrp: number;
  price: number;
  imageUrl?: string;
}

function loadJson(file: string): CatalogProduct[] {
  const p = path.join(process.cwd(), 'src', 'data', file);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function syncMedicines() {
  const products = [...loadJson('products.json'), ...loadJson('medicines.json')];
  if (products.length === 0) {
    console.log('⊘ No catalog files found, skipping medicine sync.');
    return;
  }
  let n = 0;
  for (const p of products) {
    await prisma.medicine.upsert({
      where: { id: p.id },
      update: {
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        manufacturer: p.manufacturer ?? null,
        category: p.category,
        subcategory: p.subcategory ?? null,
        dosage: p.dosage ?? null,
        dosageForm: p.dosageForm ?? null,
        pack: p.pack,
        rxRequired: Boolean(p.rxRequired),
        mrp: p.mrp,
        price: p.price,
        imageUrl: p.imageUrl ?? null,
      },
      create: {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        manufacturer: p.manufacturer ?? null,
        category: p.category,
        subcategory: p.subcategory ?? null,
        dosage: p.dosage ?? null,
        dosageForm: p.dosageForm ?? null,
        pack: p.pack,
        rxRequired: Boolean(p.rxRequired),
        mrp: p.mrp,
        price: p.price,
        imageUrl: p.imageUrl ?? null,
      },
    });
    n++;
  }
  console.log(`✓ Synced ${n} medicines from catalog.`);
}

async function main() {
  await seedAdmin();
  await syncMedicines();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
