import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/layout/LegalShell';
import attribution from '@/data/medicine-image-attribution.json';
import productsData from '@/data/products.json';
import medicinesData from '@/data/medicines.json';

export const metadata: Metadata = {
  title: 'Image Credits',
  description:
    'Attribution and licensing information for medicine product images used on Ambica Medical — sourced under free licenses from Wikimedia Commons.',
};

interface AttributionEntry {
  source_url: string;
  file_page: string;
  license: string;
  license_url?: string;
  author: string;
  wikipedia_article: string;
  fetched_at: string;
}

interface CatalogEntry {
  id: string;
  brand: string;
  name?: string;
  dosage?: string;
}

const RECORDS = attribution as Record<string, AttributionEntry>;
const CATALOG = [...(productsData as CatalogEntry[]), ...(medicinesData as CatalogEntry[])];
const BY_ID = new Map(CATALOG.map((p) => [p.id, p]));

export default function ImageCreditsPage() {
  // Sort by license then by author for a stable, browseable list
  const rows = Object.entries(RECORDS)
    .map(([id, info]) => ({
      id,
      product: BY_ID.get(id),
      info,
    }))
    .sort((a, b) => {
      const lc = a.info.license.localeCompare(b.info.license);
      if (lc !== 0) return lc;
      return a.info.author.localeCompare(b.info.author);
    });

  // Group by license for the table-of-contents
  const byLicense = new Map<string, typeof rows>();
  for (const row of rows) {
    const arr = byLicense.get(row.info.license) ?? [];
    arr.push(row);
    byLicense.set(row.info.license, arr);
  }

  return (
    <LegalShell
      eyebrow="📷 Credits"
      title="Image Credits"
      subtitle="Every product image we host under a free license is attributed here, as required by Creative Commons. Most images come from Wikimedia Commons; some are public domain."
      lastUpdated={new Date().toISOString().slice(0, 10)}
    >
      <h2>About these images</h2>
      <p>
        Many of the product photos on Ambica Medical were sourced from{' '}
        <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">
          Wikimedia Commons
        </a>{' '}
        — a repository of freely-licensed media. Each image below is credited
        to its original author and linked to the source file page on Commons.
        The license string links to the full text of the license.
      </p>
      <p>
        Wikipedia / Commons images are{' '}
        <strong>not photographs of the exact pack we will dispatch.</strong> They
        are representative photos of the same generic medicine or pharmaceutical
        category. The actual carton you receive may differ in packaging design,
        batch labelling, and manufacturer revision. Always verify the strip,
        strength, expiry, and dispensing label before consuming any medicine.
      </p>
      <p>
        Where no freely-licensed photo was available for a SKU, the storefront
        renders an original SVG card showing brand, generic name, strength,
        manufacturer, and dosage-form silhouette. See{' '}
        <Link href="/return-policy">our Return Policy</Link> for what to do if a
        delivery does not match the image shown.
      </p>

      <h2>Index by license</h2>
      <ul>
        {[...byLicense.entries()].map(([license, items]) => (
          <li key={license}>
            <strong>{license}</strong> — {items.length} image
            {items.length === 1 ? '' : 's'}
          </li>
        ))}
      </ul>

      {[...byLicense.entries()].map(([license, items]) => (
        <section key={license}>
          <h2>{license}</h2>
          <p style={{ marginBottom: 0 }}>
            {items.length} image{items.length === 1 ? '' : 's'} below are
            distributed under the{' '}
            {items[0].info.license_url ? (
              <a
                href={items[0].info.license_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {license}
              </a>
            ) : (
              license
            )}{' '}
            license. Click any source link to view the full Commons file page.
          </p>

          <ul>
            {items.map((row) => (
              <li key={row.id}>
                <Link href={`/products/${row.id}`}>
                  {row.product?.brand ?? row.id}
                  {row.product?.dosage ? ` ${row.product.dosage}` : ''}
                </Link>
                {row.product?.name ? <span> — {row.product.name}</span> : null}
                {' · '}
                <span>by {row.info.author || 'Wikimedia contributor'}</span>{' '}
                ·{' '}
                <a
                  href={row.info.file_page}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  source on Commons
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2>Reporting an issue</h2>
      <p>
        If you are the copyright holder of an image listed here and the
        attribution is incorrect, or if you would prefer the image be removed
        despite the indicated free license, please email{' '}
        <a href="mailto:care@ambicamedical.in">care@ambicamedical.in</a> with
        the product link and we'll act within one working day.
      </p>
    </LegalShell>
  );
}
