/**
 * AMBICA MEDICAL — TAXONOMY
 * Single source of truth for the entire categorisation system.
 *
 * Three layers:
 *
 *   1. USER LAYER       USER_CATEGORIES — what humans see in the UI.
 *                       SEO-friendly slugs, plain-language names.
 *
 *   2. INTERNAL LAYER   PHARMA_CLASS_MAP — maps the raw pharmacology
 *                       category from the CSV to user category +
 *                       subcategory + internal class label + symptom tags
 *                       and conditions. Never shown directly to users.
 *
 *   3. DISCOVERY LAYER  CONDITION_KEYWORDS + BRAND_ALIASES + COMMON_TYPOS
 *                       drive search, filter chips, and the "Used for"
 *                       summary on the product detail page.
 *
 * Edit this file to extend the system. Every other module reads from here.
 */

import type { TileTint } from '@/features/products/types';

/* -------------------------------------------------------------------------- */
/* 1. USER-FACING CATEGORIES                                                  */
/* -------------------------------------------------------------------------- */

export type UserCategorySlug =
  | 'fever-and-pain-relief'
  | 'cold-cough-and-flu'
  | 'allergy-relief'
  | 'digestive-care'
  | 'heart-and-bp'
  | 'diabetes-care'
  | 'bone-joint-and-muscle'
  | 'skin-care'
  | 'eye-and-ear-care'
  | 'respiratory-and-asthma'
  | 'mental-wellness'
  | 'womens-health'
  | 'baby-and-child-care'
  | 'infection-care'
  | 'vitamins-and-supplements'
  | 'first-aid-and-personal-care';

export interface Subcategory {
  slug: string;
  name: string;
}

export interface UserCategory {
  slug: UserCategorySlug;
  name: string;
  /** ≤ 16 chars — used in tight UI like nav chips */
  shortName: string;
  emoji: string;
  /** One-line plain-English description shown on category cards */
  tagline: string;
  tile: TileTint;
  subcategories: Subcategory[];
}

export const USER_CATEGORIES: UserCategory[] = [
  {
    slug: 'fever-and-pain-relief',
    name: 'Fever & Pain Relief',
    shortName: 'Fever & Pain',
    emoji: '🤒',
    tagline: 'Headache, fever and body aches',
    tile: 'rose',
    subcategories: [
      { slug: 'fever-reducers', name: 'Fever Reducers' },
      { slug: 'headache-and-migraine', name: 'Headache & Migraine' },
      { slug: 'body-pain', name: 'Body Pain' },
      { slug: 'topical-pain-relief', name: 'Sprays & Balms' },
      { slug: 'severe-pain', name: 'Severe Pain' },
    ],
  },
  {
    slug: 'cold-cough-and-flu',
    name: 'Cold, Cough & Flu',
    shortName: 'Cold & Cough',
    emoji: '🤧',
    tagline: 'Runny nose, blocked sinuses, cough',
    tile: 'sky',
    subcategories: [
      { slug: 'cold-and-flu', name: 'Cold & Flu' },
      { slug: 'cough-syrups', name: 'Cough Syrups' },
      { slug: 'decongestants', name: 'Decongestants' },
      { slug: 'sore-throat', name: 'Sore Throat' },
    ],
  },
  {
    slug: 'allergy-relief',
    name: 'Allergy Relief',
    shortName: 'Allergy',
    emoji: '🌸',
    tagline: 'Sneezing, itching, hay fever',
    tile: 'amber',
    subcategories: [
      { slug: 'antihistamines', name: 'Antihistamines' },
      { slug: 'skin-allergy', name: 'Skin Allergy' },
    ],
  },
  {
    slug: 'digestive-care',
    name: 'Digestive Care',
    shortName: 'Digestive',
    emoji: '🫃',
    tagline: 'Acidity, gas, indigestion, gut health',
    tile: 'violet',
    subcategories: [
      { slug: 'acidity-and-ulcer', name: 'Acidity & Ulcer' },
      { slug: 'nausea-and-vomiting', name: 'Nausea & Vomiting' },
      { slug: 'stomach-cramps', name: 'Stomach Cramps' },
      { slug: 'diarrhea', name: 'Diarrhea' },
      { slug: 'constipation', name: 'Constipation' },
      { slug: 'liver-and-gut-health', name: 'Liver & Gut Health' },
    ],
  },
  {
    slug: 'heart-and-bp',
    name: 'Heart & Blood Pressure',
    shortName: 'Heart & BP',
    emoji: '❤️',
    tagline: 'BP, cholesterol, blood thinners',
    tile: 'rose',
    subcategories: [
      { slug: 'blood-pressure', name: 'Blood Pressure' },
      { slug: 'cholesterol', name: 'Cholesterol' },
      { slug: 'blood-thinners', name: 'Blood Thinners' },
      { slug: 'heart-rhythm', name: 'Heart Rhythm' },
      { slug: 'angina', name: 'Angina' },
      { slug: 'water-retention', name: 'Water Retention' },
      { slug: 'monitors-and-devices', name: 'Monitors & Devices' },
    ],
  },
  {
    slug: 'diabetes-care',
    name: 'Diabetes Care',
    shortName: 'Diabetes',
    emoji: '🩸',
    tagline: 'Sugar control, insulin, monitoring',
    tile: 'rose',
    subcategories: [
      { slug: 'oral-tablets', name: 'Oral Tablets' },
      { slug: 'insulin-and-injectables', name: 'Insulin & Injectables' },
      { slug: 'monitors-and-strips', name: 'Monitors & Strips' },
    ],
  },
  {
    slug: 'bone-joint-and-muscle',
    name: 'Bone, Joint & Muscle',
    shortName: 'Bone & Joint',
    emoji: '🦴',
    tagline: 'Arthritis, gout, nerve pain, sprains',
    tile: 'amber',
    subcategories: [
      { slug: 'arthritis-and-rheumatism', name: 'Arthritis' },
      { slug: 'muscle-relaxants', name: 'Muscle Relaxants' },
      { slug: 'gout', name: 'Gout' },
      { slug: 'nerve-pain', name: 'Nerve Pain' },
      { slug: 'inflammation', name: 'Inflammation' },
    ],
  },
  {
    slug: 'skin-care',
    name: 'Skin Care',
    shortName: 'Skin',
    emoji: '🧴',
    tagline: 'Acne, fungal, eczema, infections',
    tile: 'violet',
    subcategories: [
      { slug: 'antifungal-creams', name: 'Antifungal Creams' },
      { slug: 'antibacterial-creams', name: 'Antibacterial Creams' },
      { slug: 'acne-treatment', name: 'Acne Treatment' },
      { slug: 'steroid-creams', name: 'Steroid Creams' },
      { slug: 'parasite-treatment', name: 'Lice & Scabies' },
    ],
  },
  {
    slug: 'eye-and-ear-care',
    name: 'Eye & Ear Care',
    shortName: 'Eye & Ear',
    emoji: '👁️',
    tagline: 'Drops for eyes and ears',
    tile: 'sky',
    subcategories: [
      { slug: 'eye-drops', name: 'Eye Drops' },
      { slug: 'ear-drops', name: 'Ear Drops' },
    ],
  },
  {
    slug: 'respiratory-and-asthma',
    name: 'Respiratory & Asthma',
    shortName: 'Respiratory',
    emoji: '🫁',
    tagline: 'Asthma, breathing, inhalers',
    tile: 'blue',
    subcategories: [
      { slug: 'asthma-and-copd', name: 'Asthma & COPD' },
      { slug: 'inhalers', name: 'Inhalers' },
    ],
  },
  {
    slug: 'mental-wellness',
    name: 'Mental Wellness',
    shortName: 'Mental Health',
    emoji: '🧘',
    tagline: 'Anxiety, depression, sleep, neuro',
    tile: 'violet',
    subcategories: [
      { slug: 'anxiety', name: 'Anxiety' },
      { slug: 'depression', name: 'Depression' },
      { slug: 'sleep', name: 'Sleep' },
      { slug: 'epilepsy', name: 'Epilepsy' },
      { slug: 'parkinson-and-dementia', name: 'Parkinson & Dementia' },
      { slug: 'serious-mental-illness', name: 'Schizophrenia & Bipolar' },
      { slug: 'vertigo-and-dizziness', name: 'Vertigo & Dizziness' },
    ],
  },
  {
    slug: 'womens-health',
    name: "Women's Health",
    shortName: "Women's Health",
    emoji: '🌷',
    tagline: 'Contraception, hormones, urinary care',
    tile: 'rose',
    subcategories: [
      { slug: 'contraception', name: 'Contraception' },
      { slug: 'hormonal-health', name: 'Hormonal Health' },
      { slug: 'thyroid', name: 'Thyroid' },
      { slug: 'urinary-care', name: 'Urinary Care' },
      { slug: 'breast-cancer', name: 'Breast Cancer' },
    ],
  },
  {
    slug: 'baby-and-child-care',
    name: 'Baby & Child Care',
    shortName: 'Baby Care',
    emoji: '🍼',
    tagline: 'Powders, lotions, gentle care',
    tile: 'sky',
    subcategories: [
      { slug: 'baby-skin-care', name: 'Baby Skin Care' },
      { slug: 'baby-essentials', name: 'Essentials' },
    ],
  },
  {
    slug: 'infection-care',
    name: 'Infection Care',
    shortName: 'Infection',
    emoji: '💉',
    tagline: 'Antibiotics, antivirals, TB, malaria',
    tile: 'green',
    subcategories: [
      { slug: 'antibiotics', name: 'Antibiotics' },
      { slug: 'antivirals', name: 'Antivirals' },
      { slug: 'antifungals', name: 'Antifungals' },
      { slug: 'tuberculosis', name: 'Tuberculosis' },
      { slug: 'malaria-and-parasites', name: 'Malaria & Parasites' },
      { slug: 'anti-cancer', name: 'Anti-Cancer' },
      { slug: 'vaccines', name: 'Vaccines' },
      { slug: 'iv-fluids', name: 'IV Fluids' },
    ],
  },
  {
    slug: 'vitamins-and-supplements',
    name: 'Vitamins & Supplements',
    shortName: 'Vitamins',
    emoji: '🌿',
    tagline: 'Daily nutrition, immunity, energy',
    tile: 'green',
    subcategories: [
      { slug: 'multivitamins', name: 'Multivitamins' },
      { slug: 'vitamin-d-and-calcium', name: 'Vitamin D & Calcium' },
      { slug: 'minerals', name: 'Minerals' },
      { slug: 'omega-and-wellness', name: 'Omega-3 & Wellness' },
    ],
  },
  {
    slug: 'first-aid-and-personal-care',
    name: 'First Aid & Personal Care',
    shortName: 'First Aid',
    emoji: '🩹',
    tagline: 'Antiseptics, bandages, masks',
    tile: 'amber',
    subcategories: [
      { slug: 'antiseptics', name: 'Antiseptics' },
      { slug: 'wound-care', name: 'Wound Care' },
      { slug: 'masks-and-protection', name: 'Masks & Protection' },
      { slug: 'personal-care', name: 'Personal Care' },
      { slug: 'emergency', name: 'Emergency' },
    ],
  },
];

export const USER_CATEGORY_SLUGS: UserCategorySlug[] = USER_CATEGORIES.map(
  (c) => c.slug,
);

export function findUserCategory(slug: string): UserCategory | undefined {
  return USER_CATEGORIES.find((c) => c.slug === slug);
}

/* -------------------------------------------------------------------------- */
/* 2. INTERNAL → USER MAPPING                                                 */
/* -------------------------------------------------------------------------- */

export interface PharmaMapping {
  /** Slug of the user-facing category */
  category: UserCategorySlug;
  /** Slug of the user-facing subcategory inside that category */
  subcategory: string;
  /** Internal label for analytics, related-products, pharmacist tooling.
   *  Never shown directly to users. */
  internalClass: string;
  /** Symptom-/condition-keywords appended to every medicine in this class.
   *  These power both `tags` (filter chips) and `conditions` (Used for…). */
  conditions: string[];
  /** Whether this class is prescription-only by default. Override per-row
   *  if needed. */
  rxRequired: boolean;
}

/**
 * Maps the CSV's `category` column (raw pharmacology) → user-facing nav.
 * Anything not in this table falls back to {medicines, body-pain, OTC}.
 */
export const PHARMA_CLASS_MAP: Record<string, PharmaMapping> = {
  /* PAIN ----------------------------------------------------------------- */
  Analgesic: {
    category: 'fever-and-pain-relief',
    subcategory: 'body-pain',
    internalClass: 'Analgesic',
    conditions: ['pain', 'body-pain'],
    rxRequired: false,
  },
  'Analgesic / Anti-inflammatory': {
    category: 'fever-and-pain-relief',
    subcategory: 'body-pain',
    internalClass: 'NSAID',
    conditions: ['pain', 'inflammation', 'body-pain', 'sprain'],
    rxRequired: false,
  },
  'Analgesic / Antipyretic': {
    category: 'fever-and-pain-relief',
    subcategory: 'fever-reducers',
    internalClass: 'Antipyretic',
    conditions: ['fever', 'headache', 'body-pain'],
    rxRequired: false,
  },
  'Opioid analgesic': {
    category: 'fever-and-pain-relief',
    subcategory: 'severe-pain',
    internalClass: 'Opioid',
    conditions: ['severe-pain', 'post-surgery-pain'],
    rxRequired: true,
  },
  'Topical analgesic': {
    category: 'fever-and-pain-relief',
    subcategory: 'topical-pain-relief',
    internalClass: 'Topical Analgesic',
    conditions: ['sprain', 'muscle-pain', 'back-pain'],
    rxRequired: false,
  },
  Antimigraine: {
    category: 'fever-and-pain-relief',
    subcategory: 'headache-and-migraine',
    internalClass: 'Triptan',
    conditions: ['migraine', 'severe-headache'],
    rxRequired: true,
  },
  'Migraine prophylaxis': {
    category: 'fever-and-pain-relief',
    subcategory: 'headache-and-migraine',
    internalClass: 'Migraine Prophylaxis',
    conditions: ['migraine', 'migraine-prevention'],
    rxRequired: true,
  },

  /* COLD / COUGH --------------------------------------------------------- */
  Mucolytic: {
    category: 'cold-cough-and-flu',
    subcategory: 'cough-syrups',
    internalClass: 'Mucolytic',
    conditions: ['cough', 'phlegm', 'congestion'],
    rxRequired: false,
  },
  Decongestant: {
    category: 'cold-cough-and-flu',
    subcategory: 'decongestants',
    internalClass: 'Decongestant',
    conditions: ['nasal-congestion', 'blocked-nose', 'cold'],
    rxRequired: false,
  },
  Cough: {
    category: 'cold-cough-and-flu',
    subcategory: 'cough-syrups',
    internalClass: 'Cough Suppressant',
    conditions: ['cough', 'dry-cough'],
    rxRequired: false,
  },
  'Cough / Cold': {
    category: 'cold-cough-and-flu',
    subcategory: 'cold-and-flu',
    internalClass: 'Cough-Cold Combo',
    conditions: ['cough', 'cold', 'sore-throat'],
    rxRequired: false,
  },
  'Cold / Flu': {
    category: 'cold-cough-and-flu',
    subcategory: 'cold-and-flu',
    internalClass: 'Cold-Flu Combo',
    conditions: ['cold', 'flu', 'runny-nose'],
    rxRequired: false,
  },

  /* ALLERGY -------------------------------------------------------------- */
  Antihistamine: {
    category: 'allergy-relief',
    subcategory: 'antihistamines',
    internalClass: 'Antihistamine',
    conditions: ['allergy', 'sneezing', 'runny-nose', 'itching', 'hives', 'hay-fever'],
    rxRequired: false,
  },

  /* DIGESTIVE ------------------------------------------------------------ */
  Antacid: {
    category: 'digestive-care',
    subcategory: 'acidity-and-ulcer',
    internalClass: 'Antacid',
    conditions: ['acidity', 'heartburn', 'gas'],
    rxRequired: false,
  },
  'Anti-ulcer': {
    category: 'digestive-care',
    subcategory: 'acidity-and-ulcer',
    internalClass: 'PPI',
    conditions: ['acidity', 'gerd', 'stomach-ulcer', 'heartburn'],
    rxRequired: false,
  },
  Antiemetic: {
    category: 'digestive-care',
    subcategory: 'nausea-and-vomiting',
    internalClass: 'Antiemetic',
    conditions: ['nausea', 'vomiting', 'motion-sickness'],
    rxRequired: false,
  },
  Antispasmodic: {
    category: 'digestive-care',
    subcategory: 'stomach-cramps',
    internalClass: 'Antispasmodic',
    conditions: ['stomach-cramps', 'period-cramps', 'ibs'],
    rxRequired: false,
  },
  Antidiarrheal: {
    category: 'digestive-care',
    subcategory: 'diarrhea',
    internalClass: 'Antidiarrheal',
    conditions: ['diarrhea', 'loose-motion'],
    rxRequired: false,
  },
  Laxative: {
    category: 'digestive-care',
    subcategory: 'constipation',
    internalClass: 'Laxative',
    conditions: ['constipation'],
    rxRequired: false,
  },
  Prokinetic: {
    category: 'digestive-care',
    subcategory: 'acidity-and-ulcer',
    internalClass: 'Prokinetic',
    conditions: ['gerd', 'bloating', 'slow-digestion'],
    rxRequired: false,
  },
  Hepatoprotective: {
    category: 'digestive-care',
    subcategory: 'liver-and-gut-health',
    internalClass: 'Hepatoprotective',
    conditions: ['liver-health', 'fatty-liver', 'hepatitis'],
    rxRequired: false,
  },
  Probiotic: {
    category: 'digestive-care',
    subcategory: 'liver-and-gut-health',
    internalClass: 'Probiotic',
    conditions: ['gut-health', 'diarrhea-prevention', 'antibiotic-recovery'],
    rxRequired: false,
  },
  'GI anti-inflammatory': {
    category: 'digestive-care',
    subcategory: 'liver-and-gut-health',
    internalClass: 'GI Anti-inflammatory',
    conditions: ['ulcerative-colitis', 'crohns', 'ibd'],
    rxRequired: true,
  },

  /* HEART & BP ----------------------------------------------------------- */
  Antihypertensive: {
    category: 'heart-and-bp',
    subcategory: 'blood-pressure',
    internalClass: 'Antihypertensive',
    conditions: ['high-blood-pressure', 'hypertension'],
    rxRequired: true,
  },
  'Antihypertensive / Antianginal': {
    category: 'heart-and-bp',
    subcategory: 'blood-pressure',
    internalClass: 'CCB / Beta-blocker',
    conditions: ['high-blood-pressure', 'angina', 'chest-pain'],
    rxRequired: true,
  },
  'Antihypertensive / Diuretic': {
    category: 'heart-and-bp',
    subcategory: 'blood-pressure',
    internalClass: 'BP + Diuretic',
    conditions: ['high-blood-pressure', 'water-retention'],
    rxRequired: true,
  },
  Antianginal: {
    category: 'heart-and-bp',
    subcategory: 'angina',
    internalClass: 'Antianginal',
    conditions: ['angina', 'chest-pain'],
    rxRequired: true,
  },
  Antiarrhythmic: {
    category: 'heart-and-bp',
    subcategory: 'heart-rhythm',
    internalClass: 'Antiarrhythmic',
    conditions: ['arrhythmia', 'irregular-heartbeat'],
    rxRequired: true,
  },
  Anticoagulant: {
    category: 'heart-and-bp',
    subcategory: 'blood-thinners',
    internalClass: 'Anticoagulant',
    conditions: ['blood-clot', 'dvt', 'stroke-prevention'],
    rxRequired: true,
  },
  Antiplatelet: {
    category: 'heart-and-bp',
    subcategory: 'blood-thinners',
    internalClass: 'Antiplatelet',
    conditions: ['stroke-prevention', 'heart-attack-prevention'],
    rxRequired: true,
  },
  Antihyperlipidemic: {
    category: 'heart-and-bp',
    subcategory: 'cholesterol',
    internalClass: 'Statin',
    conditions: ['high-cholesterol', 'ldl', 'triglycerides'],
    rxRequired: true,
  },
  Diuretic: {
    category: 'heart-and-bp',
    subcategory: 'water-retention',
    internalClass: 'Diuretic',
    conditions: ['water-retention', 'edema', 'high-blood-pressure'],
    rxRequired: true,
  },
  'Pulmonary hypertension': {
    category: 'heart-and-bp',
    subcategory: 'blood-pressure',
    internalClass: 'PAH Therapy',
    conditions: ['pulmonary-hypertension'],
    rxRequired: true,
  },

  /* DIABETES ------------------------------------------------------------- */
  Antidiabetic: {
    category: 'diabetes-care',
    subcategory: 'oral-tablets',
    internalClass: 'Antidiabetic',
    conditions: ['diabetes', 'type-2-diabetes', 'blood-sugar'],
    rxRequired: true,
  },

  /* BONE / JOINT / MUSCLE ----------------------------------------------- */
  'Muscle relaxant': {
    category: 'bone-joint-and-muscle',
    subcategory: 'muscle-relaxants',
    internalClass: 'Muscle Relaxant',
    conditions: ['muscle-spasm', 'back-pain', 'stiff-neck'],
    rxRequired: false,
  },
  Antirheumatic: {
    category: 'bone-joint-and-muscle',
    subcategory: 'arthritis-and-rheumatism',
    internalClass: 'DMARD',
    conditions: ['rheumatoid-arthritis', 'arthritis'],
    rxRequired: true,
  },
  Antigout: {
    category: 'bone-joint-and-muscle',
    subcategory: 'gout',
    internalClass: 'Antigout',
    conditions: ['gout', 'high-uric-acid'],
    rxRequired: true,
  },
  Immunosuppressant: {
    category: 'bone-joint-and-muscle',
    subcategory: 'inflammation',
    internalClass: 'Immunosuppressant',
    conditions: ['autoimmune', 'transplant-rejection'],
    rxRequired: true,
  },
  Corticosteroid: {
    category: 'bone-joint-and-muscle',
    subcategory: 'inflammation',
    internalClass: 'Corticosteroid',
    conditions: ['inflammation', 'autoimmune', 'severe-allergy', 'asthma-flare'],
    rxRequired: true,
  },
  'Neuropathic pain': {
    category: 'bone-joint-and-muscle',
    subcategory: 'nerve-pain',
    internalClass: 'Neuropathic Pain',
    conditions: ['nerve-pain', 'diabetic-neuropathy'],
    rxRequired: true,
  },
  'Anticonvulsant / Neuropathic pain': {
    category: 'bone-joint-and-muscle',
    subcategory: 'nerve-pain',
    internalClass: 'Gabapentinoid',
    conditions: ['nerve-pain', 'neuropathy', 'seizures'],
    rxRequired: true,
  },

  /* SKIN ----------------------------------------------------------------- */
  'Topical antibiotic': {
    category: 'skin-care',
    subcategory: 'antibacterial-creams',
    internalClass: 'Topical Antibiotic',
    conditions: ['skin-infection', 'wound-infection'],
    rxRequired: false,
  },
  'Topical steroid': {
    category: 'skin-care',
    subcategory: 'steroid-creams',
    internalClass: 'Topical Steroid',
    conditions: ['eczema', 'dermatitis', 'itching', 'psoriasis'],
    rxRequired: false,
  },
  'Topical anti-acne': {
    category: 'skin-care',
    subcategory: 'acne-treatment',
    internalClass: 'Topical Acne',
    conditions: ['acne', 'pimples'],
    rxRequired: false,
  },
  Antiscabies: {
    category: 'skin-care',
    subcategory: 'parasite-treatment',
    internalClass: 'Antiscabies',
    conditions: ['scabies', 'lice', 'itching'],
    rxRequired: false,
  },

  /* EYE & EAR ------------------------------------------------------------ */
  Ophthalmic: {
    category: 'eye-and-ear-care',
    subcategory: 'eye-drops',
    internalClass: 'Ophthalmic',
    conditions: ['red-eye', 'dry-eye', 'eye-allergy', 'eye-infection'],
    rxRequired: false,
  },
  Otic: {
    category: 'eye-and-ear-care',
    subcategory: 'ear-drops',
    internalClass: 'Otic',
    conditions: ['ear-pain', 'ear-infection', 'ear-wax'],
    rxRequired: false,
  },

  /* RESPIRATORY ---------------------------------------------------------- */
  'Anti-asthmatic': {
    category: 'respiratory-and-asthma',
    subcategory: 'asthma-and-copd',
    internalClass: 'Bronchodilator',
    conditions: ['asthma', 'wheezing', 'breathing-difficulty', 'copd'],
    rxRequired: true,
  },

  /* MENTAL --------------------------------------------------------------- */
  Antipsychotic: {
    category: 'mental-wellness',
    subcategory: 'serious-mental-illness',
    internalClass: 'Antipsychotic',
    conditions: ['schizophrenia', 'bipolar', 'psychosis'],
    rxRequired: true,
  },
  Antidepressant: {
    category: 'mental-wellness',
    subcategory: 'depression',
    internalClass: 'SSRI / SNRI',
    conditions: ['depression', 'low-mood', 'anxiety'],
    rxRequired: true,
  },
  Anxiolytic: {
    category: 'mental-wellness',
    subcategory: 'anxiety',
    internalClass: 'Benzodiazepine',
    conditions: ['anxiety', 'stress', 'panic-attack'],
    rxRequired: true,
  },
  'Anxiolytic / Anticonvulsant': {
    category: 'mental-wellness',
    subcategory: 'anxiety',
    internalClass: 'Benzodiazepine',
    conditions: ['anxiety', 'seizures'],
    rxRequired: true,
  },
  Anticonvulsant: {
    category: 'mental-wellness',
    subcategory: 'epilepsy',
    internalClass: 'Anticonvulsant',
    conditions: ['epilepsy', 'seizures'],
    rxRequired: true,
  },
  Antiparkinsonian: {
    category: 'mental-wellness',
    subcategory: 'parkinson-and-dementia',
    internalClass: 'Antiparkinsonian',
    conditions: ['parkinson', 'tremor'],
    rxRequired: true,
  },
  'Anti-dementia': {
    category: 'mental-wellness',
    subcategory: 'parkinson-and-dementia',
    internalClass: 'Anti-dementia',
    conditions: ['dementia', 'alzheimer'],
    rxRequired: true,
  },
  Antivertigo: {
    category: 'mental-wellness',
    subcategory: 'vertigo-and-dizziness',
    internalClass: 'Antivertigo',
    conditions: ['vertigo', 'dizziness', 'motion-sickness'],
    rxRequired: false,
  },

  /* WOMEN'S / HORMONAL --------------------------------------------------- */
  Contraceptive: {
    category: 'womens-health',
    subcategory: 'contraception',
    internalClass: 'Contraceptive',
    conditions: ['birth-control', 'contraception'],
    rxRequired: true,
  },
  'Sex hormone': {
    category: 'womens-health',
    subcategory: 'hormonal-health',
    internalClass: 'Sex Hormone',
    conditions: ['hormone-replacement', 'menopause'],
    rxRequired: true,
  },
  'Anti-estrogen': {
    category: 'womens-health',
    subcategory: 'breast-cancer',
    internalClass: 'Anti-estrogen',
    conditions: ['breast-cancer'],
    rxRequired: true,
  },
  Antithyroid: {
    category: 'womens-health',
    subcategory: 'thyroid',
    internalClass: 'Antithyroid',
    conditions: ['hyperthyroidism', 'thyroid'],
    rxRequired: true,
  },
  Urology: {
    category: 'womens-health',
    subcategory: 'urinary-care',
    internalClass: 'Urology',
    conditions: ['overactive-bladder', 'urinary-issues', 'enlarged-prostate'],
    rxRequired: true,
  },

  /* INFECTION ------------------------------------------------------------ */
  Antibiotic: {
    category: 'infection-care',
    subcategory: 'antibiotics',
    internalClass: 'Antibiotic',
    conditions: ['bacterial-infection', 'infection'],
    rxRequired: true,
  },
  'Antibiotic / Antiprotozoal': {
    category: 'infection-care',
    subcategory: 'antibiotics',
    internalClass: 'Antibiotic + Antiprotozoal',
    conditions: ['bacterial-infection', 'amoebiasis', 'giardiasis'],
    rxRequired: true,
  },
  Antiviral: {
    category: 'infection-care',
    subcategory: 'antivirals',
    internalClass: 'Antiviral',
    conditions: ['viral-infection', 'hiv', 'herpes', 'hepatitis'],
    rxRequired: true,
  },
  Antifungal: {
    category: 'infection-care',
    subcategory: 'antifungals',
    internalClass: 'Antifungal',
    conditions: ['fungal-infection', 'ringworm', 'candidiasis'],
    rxRequired: true,
  },
  'Anti-tubercular': {
    category: 'infection-care',
    subcategory: 'tuberculosis',
    internalClass: 'Anti-TB',
    conditions: ['tuberculosis', 'tb'],
    rxRequired: true,
  },
  Antimalarial: {
    category: 'infection-care',
    subcategory: 'malaria-and-parasites',
    internalClass: 'Antimalarial',
    conditions: ['malaria'],
    rxRequired: true,
  },
  Anthelmintic: {
    category: 'infection-care',
    subcategory: 'malaria-and-parasites',
    internalClass: 'Anthelmintic',
    conditions: ['intestinal-worms', 'deworming'],
    rxRequired: false,
  },
  'Anti-cancer': {
    category: 'infection-care',
    subcategory: 'anti-cancer',
    internalClass: 'Anti-cancer',
    conditions: ['cancer'],
    rxRequired: true,
  },
  'Anti-cancer / Immunosuppressant': {
    category: 'infection-care',
    subcategory: 'anti-cancer',
    internalClass: 'Anti-cancer / Immunosuppressant',
    conditions: ['cancer', 'autoimmune'],
    rxRequired: true,
  },
  Vaccine: {
    category: 'infection-care',
    subcategory: 'vaccines',
    internalClass: 'Vaccine',
    conditions: ['immunization', 'prevention'],
    rxRequired: true,
  },
  'IV fluid': {
    category: 'infection-care',
    subcategory: 'iv-fluids',
    internalClass: 'IV Fluid',
    conditions: ['dehydration', 'fluid-replacement'],
    rxRequired: true,
  },

  /* VITAMINS ------------------------------------------------------------- */
  Vitamin: {
    category: 'vitamins-and-supplements',
    subcategory: 'multivitamins',
    internalClass: 'Vitamin',
    conditions: ['nutrition', 'deficiency', 'immunity'],
    rxRequired: false,
  },
  Mineral: {
    category: 'vitamins-and-supplements',
    subcategory: 'minerals',
    internalClass: 'Mineral',
    conditions: ['nutrition', 'deficiency'],
    rxRequired: false,
  },
  'Vitamin / Mineral': {
    category: 'vitamins-and-supplements',
    subcategory: 'multivitamins',
    internalClass: 'Multivitamin',
    conditions: ['nutrition', 'deficiency', 'energy'],
    rxRequired: false,
  },

  /* FIRST AID ------------------------------------------------------------ */
  Antiseptic: {
    category: 'first-aid-and-personal-care',
    subcategory: 'antiseptics',
    internalClass: 'Antiseptic',
    conditions: ['cuts', 'wounds', 'disinfection'],
    rxRequired: false,
  },
  Adsorbent: {
    category: 'first-aid-and-personal-care',
    subcategory: 'emergency',
    internalClass: 'Adsorbent',
    conditions: ['poisoning', 'gas', 'overdose'],
    rxRequired: false,
  },
  Hemostatic: {
    category: 'first-aid-and-personal-care',
    subcategory: 'wound-care',
    internalClass: 'Hemostatic',
    conditions: ['bleeding', 'wound-care'],
    rxRequired: true,
  },
};

/* -------------------------------------------------------------------------- */
/* 3. SEARCH ALIASES & TYPO MAP                                               */
/* -------------------------------------------------------------------------- */

/**
 * Generic-name → list of common search aliases.
 * Includes brand names, abbreviations, and frequent misspellings.
 * Keys are lowercased generic names. The medicine importer uses this
 * to populate `aliases` on each Product.
 */
export const BRAND_ALIASES: Record<string, string[]> = {
  paracetamol: [
    'paracitamol',
    'paracetmol',
    'pcm',
    'dolo',
    'dolo 650',
    'crocin',
    'calpol',
    'metacin',
    'paracip',
  ],
  ibuprofen: ['brufen', 'combiflam', 'ibugesic', 'advil'],
  aspirin: ['ecosprin', 'disprin', 'asprin'],
  diclofenac: ['voveran', 'voltaren', 'diclomol'],
  ketorolac: ['ketorol', 'ketanov', 'toradol'],
  metformin: ['glycomet', 'glucophage', 'gluconorm', 'glyciphage', 'metformine'],
  omeprazole: ['omez', 'prilosec', 'omeprazol'],
  pantoprazole: ['pantop', 'pan-d', 'pantosec', 'pantaprazole'],
  esomeprazole: ['nexium', 'esomez'],
  rabeprazole: ['rabium', 'razo'],
  cetirizine: ['cetzine', 'zyrtec', 'alerid', 'okacet', 'cetrizine'],
  fexofenadine: ['allegra', 'fexova'],
  loratadine: ['claritin'],
  azithromycin: ['azithral', 'azee', 'azithromicin'],
  amoxicillin: ['mox', 'novamox', 'amoxil', 'amoxicilin'],
  cefixime: ['taxim-o', 'cefix', 'zifi'],
  ciprofloxacin: ['cifran', 'ciplox'],
  ofloxacin: ['oflox', 'zenflox'],
  metronidazole: ['flagyl', 'metrogyl'],
  ondansetron: ['emeset', 'ondem', 'vomikind'],
  domperidone: ['domstal'],
  ranitidine: ['rantac', 'aciloc', 'zinetac'],
  amlodipine: ['amlong', 'amlokind', 'stamlo'],
  telmisartan: ['telma', 'tazloc'],
  losartan: ['losar', 'covance'],
  atorvastatin: ['atorva', 'lipitor'],
  rosuvastatin: ['rosuvas', 'crestor'],
  metoprolol: ['metolar'],
  glimepiride: ['amaryl'],
  insulin: ['lantus', 'huminsulin', 'humalog', 'mixtard'],
  salbutamol: ['asthalin', 'levolin'],
  budesonide: ['budecort'],
  montelukast: ['montair', 'montek'],
  sertraline: ['zoloft', 'serta', 'sertima'],
  escitalopram: ['lexapro', 'cipralex'],
  alprazolam: ['restyl', 'alpax'],
  clonazepam: ['rivotril', 'klonopin'],
  vitaminD3: ['cholecalciferol', 'd3', 'vit d'],
  cholecalciferol: ['vitamin d3', 'd-rise', 'd3 60k'],
  hydroxychloroquine: ['hcqs', 'plaquenil'],
  levothyroxine: ['thyronorm', 'eltroxin', 'thyrofit'],
  prednisolone: ['wysolone', 'omnacortil'],
  diazepam: ['valium', 'calmpose'],
  zolpidem: ['stilnoct', 'zolfresh'],
  fluconazole: ['forcan', 'fluka'],
  itraconazole: ['itrahart'],
  acyclovir: ['herpex', 'zovirax'],
  oseltamivir: ['tamiflu'],
};

/**
 * Common typos — applied as a normalizer before search. The importer ALSO
 * pulls these into per-product aliases when they match the generic.
 */
export const COMMON_TYPOS: Record<string, string> = {
  paracitamol: 'paracetamol',
  paracetmol: 'paracetamol',
  pcm: 'paracetamol',
  asprin: 'aspirin',
  ibuprofine: 'ibuprofen',
  metformine: 'metformin',
  omeprazol: 'omeprazole',
  cetrizine: 'cetirizine',
  azithromicin: 'azithromycin',
  amoxicilin: 'amoxicillin',
  pantaprazole: 'pantoprazole',
  ondonsetron: 'ondansetron',
};

/**
 * Normalise a search query — lowercase, trim, expand common typos.
 */
export function normaliseSearch(input: string): string {
  const trimmed = input.trim().toLowerCase();
  return COMMON_TYPOS[trimmed] ?? trimmed;
}

/* -------------------------------------------------------------------------- */
/* 4. FALLBACK MAPPING                                                        */
/* -------------------------------------------------------------------------- */

export const FALLBACK_MAPPING: PharmaMapping = {
  category: 'fever-and-pain-relief',
  subcategory: 'body-pain',
  internalClass: 'General Medicine',
  conditions: ['general'],
  rxRequired: false,
};

export function mapPharmaClass(rawCategory: string): PharmaMapping {
  return PHARMA_CLASS_MAP[rawCategory.trim()] ?? FALLBACK_MAPPING;
}
