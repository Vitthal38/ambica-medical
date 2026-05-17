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

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@ambicamedical.in').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'change-me-now-12345';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN', active: true },
    create: {
      email,
      passwordHash,
      name: 'Pharmacy Admin',
      role: 'ADMIN',
      active: true,
    },
  });
  console.log(`✓ Admin user ready: ${email}`);
  if (password === 'change-me-now-12345') {
    console.log('⚠  Default password in use. Set SEED_ADMIN_PASSWORD before deploying.');
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
