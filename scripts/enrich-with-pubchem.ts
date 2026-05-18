/**
 * scripts/enrich-with-pubchem.ts
 *
 * One-shot catalog enrichment: for every medicine in src/data/{products,medicines}.json,
 * look up the active ingredient on PubChem (US NIH, CC0 public domain), download
 * the 2-D molecule structure PNG, and write the PubChem CID back into the
 * catalog as `moleculeCid`. The placeholder SVG embeds the PNG as a faint
 * watermark behind the brand text.
 *
 * Run:
 *   npm run images:pubchem            # default
 *   npm run images:pubchem -- --force # re-download even if CID already set
 *
 * Why PubChem specifically:
 *   - US National Institutes of Health, public domain (CC0). No licence issue.
 *   - Stable URL pattern: /rest/pug/compound/name/{name}/cids/JSON
 *   - High coverage of pharmaceutical INNs (the international generic names
 *     that all our `name` fields are based on).
 *   - Free, no API key, generous-enough rate limit if we throttle.
 *
 * Safety:
 *   - Throttled to 4 req/sec by inserting 250 ms sleeps between calls. Stays
 *     well under PubChem's 5 req/sec limit even with bursty network.
 *   - HTTP errors don't crash the whole run — each medicine is independent.
 *     The script records failures in a "skipped" list and prints them at end.
 *   - Output PNGs are size-capped (read max 500 KB into memory) and stored
 *     under public/molecules/{cid}.png. PNG magic bytes verified before write.
 *   - Re-runnable: a medicine with `moleculeCid` already set is skipped
 *     unless --force is passed.
 *
 * Output:
 *   - public/molecules/{cid}.png        — committed to repo (~5 KB each)
 *   - src/data/products.json            — gets `moleculeCid` field
 *   - src/data/medicines.json           — gets `moleculeCid` field
 *   - public/molecules/_inventory.json  — manifest of cid -> {name, sha256}
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const ROOT = process.cwd();
const PRODUCTS = join(ROOT, 'src/data/products.json');
const MEDICINES = join(ROOT, 'src/data/medicines.json');
const MOLECULE_DIR = join(ROOT, 'public/molecules');
const INVENTORY = join(MOLECULE_DIR, '_inventory.json');

const FORCE = process.argv.includes('--force');
const MAX_PNG_BYTES = 500 * 1024;
const THROTTLE_MS = 250;

interface CatalogItem {
  name?: string;
  moleculeCid?: number | null;
}

interface Inventory {
  [cid: string]: { name: string; sha256: string; bytes: number };
}

/**
 * Extract the primary INN from a catalog `name` field.
 *
 * Examples:
 *   "Paracetamol 500 mg"            -> "Paracetamol"
 *   "Aceclofenac + Paracetamol"     -> "Aceclofenac"   (first of a combo)
 *   "Telmisartan 40 mg"             -> "Telmisartan"
 *   "Surgical Face Mask 3-Ply"      -> null            (not a drug)
 *   "Activated Charcoal 250 mg"     -> "Activated Charcoal"
 */
function extractInn(name?: string): string | null {
  if (!name) return null;
  const first = name.split(/[+&,]/)[0].trim();
  // Strip trailing dosage/strength suffix like "500 mg", "5 mg/ml", "10%", "200 IU".
  const cleaned = first
    .replace(/\s+\d+(\.\d+)?\s*(mg|mcg|g|ml|%|iu|units?|mg\/ml|mcg\/ml)\b.*$/i, '')
    .trim();
  // Reject obvious non-drug terms by length / odd characters
  if (cleaned.length < 3 || cleaned.length > 60) return null;
  if (/face mask|bandage|device|patch|honey/i.test(cleaned)) return null;
  return cleaned;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function lookupCid(inn: string): Promise<number | null> {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(inn)}/cids/JSON`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { IdentifierList?: { CID?: number[] } };
    const cid = data.IdentifierList?.CID?.[0];
    return typeof cid === 'number' ? cid : null;
  } catch {
    return null;
  }
}

async function downloadPng(cid: number): Promise<Buffer | null> {
  // ?image_size=300x300 is supported by PubChem's PUG-View — small + crisp.
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=300x300`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const cl = parseInt(res.headers.get('content-length') ?? '0', 10);
    if (cl > MAX_PNG_BYTES) return null;
    const arr = new Uint8Array(await res.arrayBuffer());
    if (arr.length > MAX_PNG_BYTES) return null;
    // Magic byte check — PubChem returns text/html on a soft 404, not PNG.
    if (!(arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47)) return null;
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

async function loadInventory(): Promise<Inventory> {
  if (!existsSync(INVENTORY)) return {};
  try {
    return JSON.parse(await readFile(INVENTORY, 'utf-8')) as Inventory;
  } catch {
    return {};
  }
}

async function main() {
  console.log('Enriching catalog with PubChem CIDs + molecule PNGs');
  console.log(`  force re-fetch: ${FORCE ? 'YES' : 'no'}`);
  await mkdir(MOLECULE_DIR, { recursive: true });
  const inventory = await loadInventory();

  // Load both catalogs into one list, remember which file each item came from
  const products = JSON.parse(await readFile(PRODUCTS, 'utf-8')) as CatalogItem[];
  const medicines = JSON.parse(await readFile(MEDICINES, 'utf-8')) as CatalogItem[];
  const all: { item: CatalogItem; source: string }[] = [
    ...products.map((item) => ({ item, source: 'products' })),
    ...medicines.map((item) => ({ item, source: 'medicines' })),
  ];
  console.log(`  catalog: ${products.length} products + ${medicines.length} medicines = ${all.length}`);

  // De-duplicate work — same INN appearing in multiple SKUs only hits PubChem once.
  const innToCid = new Map<string, number | null>();
  const skipped: string[] = [];

  let withInn = 0;
  let cidHits = 0;
  let pngDownloaded = 0;
  let pngReused = 0;
  let alreadyHadCid = 0;

  for (const { item } of all) {
    if (!FORCE && typeof item.moleculeCid === 'number') {
      alreadyHadCid++;
      continue;
    }
    const inn = extractInn(item.name);
    if (!inn) {
      skipped.push(`(no INN) ${item.name ?? '?'}`);
      continue;
    }
    withInn++;

    let cid = innToCid.get(inn.toLowerCase());
    if (cid === undefined) {
      cid = await lookupCid(inn);
      innToCid.set(inn.toLowerCase(), cid);
      await sleep(THROTTLE_MS);
    }
    if (cid == null) {
      skipped.push(`(no CID) ${inn}`);
      continue;
    }
    cidHits++;
    item.moleculeCid = cid;

    // Download PNG once per CID
    const pngPath = join(MOLECULE_DIR, `${cid}.png`);
    if (!FORCE && existsSync(pngPath)) {
      pngReused++;
    } else {
      const png = await downloadPng(cid);
      if (!png) {
        skipped.push(`(no PNG) cid=${cid} (${inn})`);
        // Still keep the CID for the SVG label even if PNG failed
        continue;
      }
      const sha = createHash('sha256').update(png).digest('hex');
      await writeFile(pngPath, png);
      inventory[cid] = { name: inn, sha256: sha, bytes: png.length };
      pngDownloaded++;
      await sleep(THROTTLE_MS);
    }
  }

  // Write back catalogs with `moleculeCid` populated
  await writeFile(PRODUCTS, JSON.stringify(products, null, 2) + '\n', 'utf-8');
  await writeFile(MEDICINES, JSON.stringify(medicines, null, 2) + '\n', 'utf-8');
  await writeFile(INVENTORY, JSON.stringify(inventory, null, 2) + '\n', 'utf-8');

  console.log();
  console.log('Report');
  console.log(`  already had CID:      ${alreadyHadCid}`);
  console.log(`  with extractable INN: ${withInn}`);
  console.log(`  CID matched:          ${cidHits}`);
  console.log(`  PNG downloaded fresh: ${pngDownloaded}`);
  console.log(`  PNG reused on disk:   ${pngReused}`);
  console.log(`  total molecules:      ${Object.keys(inventory).length}`);
  console.log(`  skipped:              ${skipped.length}`);
  if (skipped.length) {
    console.log('  first 10 skipped:');
    for (const s of skipped.slice(0, 10)) console.log(`    - ${s}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
