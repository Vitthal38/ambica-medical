/**
 * Composite confidence scoring for medicine images.
 *
 * Used in two places:
 *   - bulk-import-images.ts: reads {id}.ocr.json sidecars, applies this
 *     scorer to decide approval status before writing to the DB.
 *   - admin medicine-images route: re-computes when an admin uploads an
 *     image manually (no sidecar) so we still get a useful confidence.
 *
 * Inputs are intentionally MULTI-SIGNAL — no single feature is dispositive.
 * That is by design: OCR on Indian pharma packs is noisy on brand names
 * (stylised fonts) but accurate on Latin generic names and dosage strings,
 * so we weight the more reliable signals higher.
 *
 *   composite = 0.30 brand_match           (exact OR fuzzy)
 *             + 0.20 strength_match        (dosage like "500 mg")
 *             + 0.20 manufacturer_match
 *             + 0.10 dosage_form_match     (tablet vs syrup, etc.)
 *             + 0.20 image_quality
 *
 * Thresholds:
 *   >= 0.85  → auto_approve
 *   0.50–0.84 → needs_review
 *   <  0.50  → auto_reject (caller may still keep bytes; we just don't
 *              promote them to the storefront)
 */

/* -------------------------------------------------------------------------- */
/*  Public types                                                              */
/* -------------------------------------------------------------------------- */

export interface OcrSidecar {
  /** Raw text from Tesseract; may contain garbage tokens. */
  extracted_text: string;
  ocr_engine?: string;
  ocr_language?: string;
  /** Optional pre-computed per-signal scores from the OCR script. */
  scores?: Partial<ConfidenceSignals>;
  /** Optional pre-computed composite confidence (0..1). If absent we recompute. */
  composite_confidence?: number;
  /** Optional recommendation from the OCR script. We re-derive regardless. */
  recommended_action?: 'auto_approve' | 'needs_review' | 'auto_reject';
}

export interface ConfidenceSignals {
  /** 1.0 = exact substring match of brand inside OCR text. */
  brand_exact: number;
  /** 0..1 = best Dice-coefficient match against any OCR token. */
  brand_fuzzy: number;
  /** 1.0 = dosage string (e.g. "500 mg") appears verbatim in OCR text. */
  strength_match: number;
  /** 1.0 = manufacturer name appears (case-insensitive, partial OK). */
  manufacturer_match: number;
  /** 1.0 = dosage form (tablet/syrup/etc.) appears in OCR text. */
  form_match: number;
  /** 0..1 = sharpness / resolution / compression quality combined. */
  image_quality: number;
}

export interface ConfidenceResult {
  composite: number;        // 0..1
  composite_pct: number;    // 0..100, rounded — what we store in imageConfidence
  signals: ConfidenceSignals;
  action: 'auto_approve' | 'needs_review' | 'auto_reject';
  /** Human-readable reasons, useful for surfacing in the admin review queue. */
  notes: string[];
}

export interface MedicineFacts {
  brand: string;
  /** Generic name as it appears in the catalog ("Paracetamol 500mg"). */
  name: string;
  manufacturer?: string | null;
  dosage?: string | null;       // "500 mg"
  dosageForm?: string | null;   // "tablet"
}

/* -------------------------------------------------------------------------- */
/*  Weights + thresholds — exported so tests can re-derive expected results.  */
/* -------------------------------------------------------------------------- */

export const WEIGHTS: Record<keyof ConfidenceSignals, number> = {
  brand_exact: 0.30,    // brand_exact and brand_fuzzy SHARE this weight (max of them)
  brand_fuzzy: 0.0,     // not added separately; used inside the formula
  strength_match: 0.20,
  manufacturer_match: 0.20,
  form_match: 0.10,
  image_quality: 0.20,
};

export const THRESHOLDS = {
  auto_approve: 0.85,
  needs_review: 0.50,
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Lowercase + strip punctuation + collapse whitespace. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s.+%/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token n-gram Dice coefficient, 0..1. Fuzzy match for stylised brand fonts. */
function diceCoefficient(a: string, b: string): number {
  const A = a.replace(/\s+/g, '');
  const B = b.replace(/\s+/g, '');
  if (A.length < 2 || B.length < 2) return A === B ? 1 : 0;
  const bigrams = (s: string) => {
    const g = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bi = s.slice(i, i + 2);
      g.set(bi, (g.get(bi) ?? 0) + 1);
    }
    return g;
  };
  const ga = bigrams(A);
  const gb = bigrams(B);
  let overlap = 0;
  for (const [k, v] of ga) {
    const u = gb.get(k);
    if (u) overlap += Math.min(v, u);
  }
  const total = (A.length - 1) + (B.length - 1);
  return total > 0 ? (2 * overlap) / total : 0;
}

/** Strip strength suffix from a generic name. "Paracetamol 500mg" -> "paracetamol". */
function stripStrength(name: string): string {
  return normalise(name).replace(/\s+\d+(\.\d+)?\s*(mg|mcg|g|ml|%|iu|units?)\b.*$/, '');
}

/** Extract the primary strength token from a name or dosage. */
function extractStrength(s: string): string | null {
  const m = /(\d+(\.\d+)?\s*(mg|mcg|g|ml|%|iu|units?))/i.exec(s);
  return m ? m[1].toLowerCase().replace(/\s+/g, '') : null;
}

/* -------------------------------------------------------------------------- */
/*  Per-signal scorers — pure functions, easy to unit-test.                   */
/* -------------------------------------------------------------------------- */

export function scoreBrand(ocrText: string, facts: MedicineFacts): { exact: number; fuzzy: number } {
  const text = normalise(ocrText);
  const brand = normalise(facts.brand);
  if (!brand) return { exact: 0, fuzzy: 0 };
  const exact = text.includes(brand) ? 1 : 0;
  // Find the best fuzzy match across whitespace tokens of similar length.
  let fuzzy = 0;
  const tokens = text.split(' ').filter((t) => t.length >= 3);
  for (const t of tokens) {
    const d = diceCoefficient(brand, t);
    if (d > fuzzy) fuzzy = d;
  }
  return { exact, fuzzy };
}

export function scoreStrength(ocrText: string, facts: MedicineFacts): number {
  const expected = extractStrength(facts.dosage ?? '') ?? extractStrength(facts.name);
  if (!expected) return 0.5; // no strength to check (devices, masks) — neutral
  const ocrStr = normalise(ocrText).replace(/\s+/g, '');
  return ocrStr.includes(expected) ? 1 : 0;
}

export function scoreManufacturer(ocrText: string, facts: MedicineFacts): number {
  if (!facts.manufacturer) return 0.5; // unknown — neutral, don't penalise
  const text = normalise(ocrText);
  const mfrFull = normalise(facts.manufacturer);
  if (text.includes(mfrFull)) return 1;
  // Try the first word of the manufacturer ("Sun Pharma" → "sun").
  const first = mfrFull.split(' ')[0];
  if (first.length >= 4 && text.includes(first)) return 0.7;
  // Fuzzy fallback for misspelled OCR
  let best = 0;
  for (const tok of text.split(' ').filter((t) => t.length >= 4)) {
    const d = diceCoefficient(first, tok);
    if (d > best) best = d;
  }
  return best >= 0.8 ? 0.5 : 0;
}

export function scoreDosageForm(ocrText: string, facts: MedicineFacts): number {
  if (!facts.dosageForm) return 0.5;
  const text = normalise(ocrText);
  const formWord = normalise(facts.dosageForm).split(' ')[0];
  // Map our internal labels to OCR-visible terms on a real pack
  const synonyms: Record<string, string[]> = {
    tablet: ['tablet', 'tablets', 'tabs', 'tab', 'ip', 'bp'],
    capsule: ['capsule', 'capsules', 'caps'],
    syrup: ['syrup', 'oral solution', 'liquid'],
    suspension: ['suspension', 'susp'],
    injection: ['injection', 'inj', 'vial', 'ampoule', 'ampule'],
    cream: ['cream', 'ointment'],
    gel: ['gel'],
    lotion: ['lotion'],
    ointment: ['ointment', 'oint'],
    drops: ['drops', 'eye drops', 'ear drops', 'dropper'],
    inhaler: ['inhaler', 'mdi', 'puff'],
    sachet: ['sachet', 'powder'],
  };
  const candidates = synonyms[formWord] ?? [formWord];
  return candidates.some((c) => text.includes(c)) ? 1 : 0;
}

/** Quality is supplied by the OCR script (Laplacian variance, resolution etc.). */
export function clampQuality(q: number | undefined): number {
  if (q == null || Number.isNaN(q)) return 0.5;
  return Math.max(0, Math.min(1, q));
}

/* -------------------------------------------------------------------------- */
/*  Top-level scoring                                                         */
/* -------------------------------------------------------------------------- */

export function scoreFromOcr(sidecar: OcrSidecar, facts: MedicineFacts): ConfidenceResult {
  // If the sidecar provided pre-computed scores, trust them but recompute composite.
  const supplied = sidecar.scores ?? {};
  const text = sidecar.extracted_text ?? '';

  const brand = supplied.brand_exact != null && supplied.brand_fuzzy != null
    ? { exact: supplied.brand_exact, fuzzy: supplied.brand_fuzzy }
    : scoreBrand(text, facts);

  const signals: ConfidenceSignals = {
    brand_exact: brand.exact,
    brand_fuzzy: brand.fuzzy,
    strength_match: supplied.strength_match ?? scoreStrength(text, facts),
    manufacturer_match: supplied.manufacturer_match ?? scoreManufacturer(text, facts),
    form_match: supplied.form_match ?? scoreDosageForm(text, facts),
    image_quality: clampQuality(supplied.image_quality),
  };

  // Brand contributes the higher of exact (1.0) or fuzzy (0..1) — never both.
  const brandSignal = Math.max(signals.brand_exact, signals.brand_fuzzy);

  const composite =
    0.30 * brandSignal +
    0.20 * signals.strength_match +
    0.20 * signals.manufacturer_match +
    0.10 * signals.form_match +
    0.20 * signals.image_quality;

  const action: ConfidenceResult['action'] =
    composite >= THRESHOLDS.auto_approve
      ? 'auto_approve'
      : composite >= THRESHOLDS.needs_review
        ? 'needs_review'
        : 'auto_reject';

  const notes: string[] = [];
  if (signals.brand_exact === 1) notes.push(`brand "${facts.brand}" matched exactly in OCR text`);
  else if (signals.brand_fuzzy >= 0.7) notes.push(`brand fuzzy match ${(signals.brand_fuzzy * 100).toFixed(0)}%`);
  else notes.push(`brand "${facts.brand}" not found in OCR text`);

  if (signals.strength_match === 1) notes.push(`strength matched`);
  else if (signals.strength_match === 0) notes.push(`strength NOT found`);

  if (signals.manufacturer_match === 1) notes.push(`manufacturer matched`);
  else if (signals.manufacturer_match === 0 && facts.manufacturer) {
    notes.push(`manufacturer "${facts.manufacturer}" not found`);
  }

  if (signals.image_quality < 0.4) notes.push(`low image quality (${(signals.image_quality * 100).toFixed(0)}%)`);

  return {
    composite,
    composite_pct: Math.round(composite * 100),
    signals,
    action,
    notes,
  };
}

/**
 * When no OCR sidecar is present (manual admin upload, or operator skipped
 * the pre-flight), produce a neutral score that requires human review.
 */
export function neutralConfidence(): ConfidenceResult {
  return {
    composite: 0.5,
    composite_pct: 50,
    signals: {
      brand_exact: 0,
      brand_fuzzy: 0,
      strength_match: 0.5,
      manufacturer_match: 0.5,
      form_match: 0.5,
      image_quality: 0.5,
    },
    action: 'needs_review',
    notes: ['no OCR sidecar — defaulting to manual review'],
  };
}
