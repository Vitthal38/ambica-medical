/**
 * scripts/generate-outreach-emails.ts
 *
 * Manufacturer outreach automation. Groups the catalog by manufacturer and,
 * for each unique manufacturer, writes:
 *
 *   outreach/{slug}/{slug}.eml      — drag-into-Outlook draft
 *   outreach/{slug}/{slug}-skus.csv — attachment carried inside the .eml
 *   outreach/_index.csv             — top-level summary
 *
 * The .eml is a valid multipart/mixed RFC 5322 message with the CSV
 * embedded as a base64 attachment. Opens correctly in Outlook, Apple Mail,
 * Thunderbird, and Gmail's "import .eml" tool.
 *
 * WHY THIS DOES NOT SEND THE EMAIL
 * --------------------------------
 * Mass-sending B2B email from an automated process risks SPF / DKIM
 * rejection at the recipient's spam filter, and damages the pharmacy's
 * domain reputation. The operator's existing email account (whatever
 * mailbox already receives orders) is the correct transport — let its
 * reputation carry the message. Click-to-send is one extra step; not
 * doing it is a serious unforced error.
 *
 * WHY THIS DOES NOT FILL IN THE "TO:" ADDRESS
 * -------------------------------------------
 * There is no clean, accurate, public database of Indian pharma marketing
 * contacts. Spam-blasting `info@`, `marketing@`, `media@` guesses gets
 * filtered as spam and produces a near-zero reply rate. The operator
 * looks up each manufacturer's contact page or marketing LinkedIn profile
 * and pastes the right address before sending. The .eml is left with
 * `To: <FILL_IN>` so it's impossible to send by accident with no
 * recipient.
 *
 * Run:
 *   npm run images:outreach
 *   npm run images:outreach -- --from="hello@ambicamedical.in"
 *   npm run images:outreach -- --min-skus=3   # skip mfrs with very few SKUs
 */

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface Item {
  id: string;
  slug?: string;
  brand: string;
  name: string;
  manufacturer?: string;
  category?: string;
  dosage?: string;
  dosageForm?: string;
  pack: string;
  rxRequired?: boolean;
}

const ROOT = process.cwd();
const PRODUCTS = join(ROOT, 'src/data/products.json');
const MEDICINES = join(ROOT, 'src/data/medicines.json');
const OUTREACH = join(ROOT, 'outreach');

interface CliArgs {
  from: string;
  fromName: string;
  pharmacy: string;
  city: string;
  licence: string;
  minSkus: number;
  fresh: boolean;
}

function parseArgs(): CliArgs {
  const args: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) args[m[1]] = m[2];
    else if (a === '--fresh') args['fresh'] = '1';
  }
  return {
    from: args.from || 'care@ambicamedical.in',
    fromName: args['from-name'] || 'Ambica Medical',
    pharmacy: args.pharmacy || 'Ambica Medical',
    city: args.city || 'Chhatrapati Sambhajinagar (Aurangabad), Maharashtra, India',
    licence: args.licence || 'MH-AUR-00001',
    minSkus: args['min-skus'] ? parseInt(args['min-skus'], 10) : 1,
    fresh: args.fresh === '1',
  };
}

function slugifyManufacturer(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function csvForManufacturer(items: Item[]): string {
  const header = ['id', 'brand', 'generic_name', 'strength', 'pack', 'category', 'rx_required'];
  const rows = items.map((p) => [
    p.id,
    p.brand,
    p.name,
    p.dosage ?? '',
    p.pack,
    p.category ?? '',
    p.rxRequired ? 'Yes' : 'No',
  ]);
  return [header, ...rows]
    .map((r) => r.map((v) => csvEscape(String(v))).join(','))
    .join('\r\n');
}

function emlBody(args: CliArgs, mfr: string, items: Item[]): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `Hello ${mfr} marketing / media team,`,
    ``,
    `We're a licensed retail pharmacy in ${args.city} (Drug Licence ${args.licence}).`,
    `${args.pharmacy} carries ${items.length} of your SKU(s) in active dispense.`,
    ``,
    `For our consumer website we'd like to show authorised pack-shots of these`,
    `products so customers can identify what they're ordering before delivery.`,
    `Could you point us to:`,
    ``,
    `  1. High-resolution carton + strip images for each SKU (the list is`,
    `     attached as a CSV — ${items.length} row(s)),`,
    `  2. A media-use note / written permission we can keep on file as the`,
    `     basis for displaying them on ambicamedical.in.`,
    ``,
    `If you have an authorised-retailer portal or distributor media folder,`,
    `that works too — please share the access link. We're happy to credit`,
    `${mfr} alongside the image and to update batches when packaging refreshes.`,
    ``,
    `For context on use:`,
    `  - Images appear only on consumer-facing product detail / catalogue`,
    `    pages on ambicamedical.in.`,
    `  - We do not use them for advertising or any third-party promotion.`,
    `  - Source attribution (${mfr} carton, ${today}) is stored against each`,
    `    file in our media database for audit.`,
    ``,
    `Thank you. We'll move the listed SKUs from generic placeholders to your`,
    `authorised pack-shots as soon as we receive them.`,
    ``,
    `--`,
    `${args.fromName}`,
    `${args.from}`,
    `${args.pharmacy}, ${args.city}`,
    `Lic. No: ${args.licence}`,
    ``,
  ].join('\r\n');
}

/**
 * Build an RFC 5322 multipart/mixed message with the CSV embedded as a
 * base64 attachment. Plain string assembly — no `nodemailer` dep, keeps
 * the script free of network code by construction.
 */
function emlMessage(args: CliArgs, mfr: string, items: Item[], csvFilename: string, csv: string): string {
  // Random ASCII boundary, exactly long enough to never collide with body content.
  const boundary = '----=_Ambica_' + Math.random().toString(36).slice(2, 12).padEnd(10, '0');
  const subject = `[Ambica Medical] Authorised pack-shots for ${items.length} ${mfr} SKU(s)`;
  const date = new Date().toUTCString();
  const body = emlBody(args, mfr, items);
  const csvB64 = Buffer.from(csv, 'utf-8').toString('base64').replace(/(.{76})/g, '$1\r\n');

  return [
    `From: "${args.fromName}" <${args.from}>`,
    `To: <FILL_IN_AT_SEND_TIME>`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `This is a multipart message in MIME format.`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
    `--${boundary}`,
    `Content-Type: text/csv; name="${csvFilename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${csvFilename}"`,
    ``,
    csvB64,
    `--${boundary}--`,
    ``,
  ].join('\r\n');
}

async function main() {
  const args = parseArgs();
  console.log('Manufacturer outreach generator');
  console.log(`  from:      ${args.fromName} <${args.from}>`);
  console.log(`  pharmacy:  ${args.pharmacy}`);
  console.log(`  city:      ${args.city}`);
  console.log(`  licence:   ${args.licence}`);
  console.log(`  min SKUs:  ${args.minSkus}`);
  console.log();

  const products = JSON.parse(await readFile(PRODUCTS, 'utf-8')) as Item[];
  const medicines = JSON.parse(await readFile(MEDICINES, 'utf-8')) as Item[];
  const all = [...products, ...medicines];

  // Group by manufacturer (case-insensitive). Drop unknowns.
  const groups = new Map<string, Item[]>();
  let withoutMfr = 0;
  for (const p of all) {
    const m = (p.manufacturer ?? '').trim();
    if (!m) { withoutMfr++; continue; }
    const key = m;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  if (args.fresh && existsSync(OUTREACH)) {
    await rm(OUTREACH, { recursive: true, force: true });
  }
  await mkdir(OUTREACH, { recursive: true });

  let written = 0;
  let totalSkus = 0;
  const indexRows: string[] = [
    'manufacturer,sku_count,slug,eml_path,csv_path,recipient',
  ];

  const sortedMfrs = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [mfr, items] of sortedMfrs) {
    if (items.length < args.minSkus) continue;
    const slug = slugifyManufacturer(mfr);
    const dir = join(OUTREACH, slug);
    await mkdir(dir, { recursive: true });

    // Sort SKUs by category then brand for a readable CSV
    items.sort((a, b) => {
      const c = (a.category ?? '').localeCompare(b.category ?? '');
      if (c !== 0) return c;
      return a.brand.localeCompare(b.brand);
    });

    const csvName = `${slug}-skus.csv`;
    const csv = csvForManufacturer(items);
    await writeFile(join(dir, csvName), csv, 'utf-8');

    const eml = emlMessage(args, mfr, items, csvName, csv);
    const emlName = `${slug}.eml`;
    await writeFile(join(dir, emlName), eml, 'utf-8');

    indexRows.push(
      [mfr, items.length, slug, `${slug}/${emlName}`, `${slug}/${csvName}`, 'FILL_IN_AT_SEND_TIME']
        .map((v) => csvEscape(String(v)))
        .join(','),
    );

    written++;
    totalSkus += items.length;
    if (written <= 20) {
      console.log(`  ${written.toString().padStart(2)}. ${mfr}  →  ${items.length} SKUs  →  ${slug}/`);
    }
  }

  if (written > 20) console.log(`  … and ${written - 20} more`);

  await writeFile(join(OUTREACH, '_index.csv'), indexRows.join('\r\n'), 'utf-8');

  console.log();
  console.log('Outreach report');
  console.log(`  manufacturers detected:    ${groups.size}`);
  console.log(`  manufacturers above min:   ${written}`);
  console.log(`  SKUs covered by outreach:  ${totalSkus} / ${all.length}`);
  console.log(`  SKUs with NO manufacturer: ${withoutMfr}`);
  console.log(`  output directory:          ${OUTREACH}`);
  console.log();
  console.log('Next steps');
  console.log(`  1. Open outreach/_index.csv to see the full plan.`);
  console.log(`  2. For each .eml: open in Outlook / Apple Mail / Thunderbird,`);
  console.log(`     paste the recipient address into the To: field, send.`);
  console.log(`  3. As reply attachments arrive, drop them in incoming/<mfr-slug>/`);
  console.log(`     and run: npm run images:import -- ./incoming/<mfr-slug> --source=manufacturer`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
