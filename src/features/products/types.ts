/**
 * Product schema — the database-ready shape every medicine record uses.
 *
 * The schema is layered:
 *   • Identity & display       — id, name, brand, manufacturer, slug, emoji, tile
 *   • Pricing & stock          — price, mrp, inStock, stockCount
 *   • Categorisation (USER)    — category, subcategory
 *   • Categorisation (INTERNAL) — internalClass (never shown directly)
 *   • Discovery                — tags, conditions, aliases
 *   • Long-form content        — description, dosage, pack
 */

import type { UserCategorySlug } from '@/lib/taxonomy';

export type CategorySlug = UserCategorySlug;

export type TileTint =
  | 'green'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'sky'
  | 'slate';

export interface Product {
  /* Identity --------------------------------------------------------------- */
  id: string;
  /** SEO-friendly URL slug, unique across the catalog */
  slug: string;
  /** Brand name shown as the primary heading on the card */
  name: string;
  brand: string;
  /** Manufacturer / marketer. Falls back to brand when CSV doesn't give one. */
  manufacturer?: string;

  /* Pharmaceutical metadata ----------------------------------------------- */
  /** "500 mg", "5 mg/ml", undefined for devices and non-dosed items */
  dosage?: string;
  /** Free-text pack description e.g. "Strip of 10 tablets" */
  pack: string;
  /** Tablet, Capsule, Syrup, Drops, Cream… */
  dosageForm?: string;

  /* Categorisation -------------------------------------------------------- */
  /** Top-level user-facing category slug (one of USER_CATEGORIES) */
  category: CategorySlug;
  /** Optional finer-grained subcategory slug */
  subcategory?: string;
  /** Internal pharma classification — used for analytics, NOT for navigation */
  internalClass?: string;

  /* Discovery ------------------------------------------------------------- */
  /** Symptom + form + general tags, drives filter chips */
  tags: string[];
  /** Health conditions this medicine treats — drives "Used for" panel */
  conditions: string[];
  /** Misspellings, brand synonyms, abbreviations for search */
  aliases: string[];

  /* Pricing --------------------------------------------------------------- */
  price: number;
  mrp: number;
  inStock: boolean;
  stockCount?: number;

  /* Compliance ------------------------------------------------------------ */
  rxRequired: boolean;

  /* UI visuals ------------------------------------------------------------ */
  emoji: string;
  tile: TileTint;
  /** Optional photo URL — when set, ProductCard renders <img> instead of emoji */
  imageUrl?: string;

  /* Optional content ------------------------------------------------------ */
  description?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}
