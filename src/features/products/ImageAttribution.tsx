'use client';

import attribution from '@/data/medicine-image-attribution.json';

interface AttributionEntry {
  source_url: string;
  file_page: string;
  license: string;
  license_url?: string;
  author: string;
  wikipedia_article: string;
  fetched_at: string;
}

const RECORDS: Record<string, AttributionEntry> = attribution as Record<string, AttributionEntry>;

interface Props {
  medicineId: string;
  className?: string;
}

/**
 * Renders a small attribution caption under a medicine image.
 *
 * Wikimedia Commons content under CC-BY / CC-BY-SA requires VISIBLE
 * attribution (author + license + link to source). This component is the
 * minimum the licence asks for: author name, license short name with link,
 * and a link to the Commons file page. It renders nothing for SKUs whose
 * image came from a non-Commons source.
 *
 * The /image-credits page links every entry with full text — this caption
 * is the per-card supplementary credit so we satisfy the share-alike +
 * attribution requirements at the point of use, not just in a hidden
 * credits page.
 */
export function ImageAttribution({ medicineId, className }: Props) {
  const entry = RECORDS[medicineId];
  if (!entry) return null;

  return (
    <p className={['text-[10px] leading-tight text-neutral-400', className ?? ''].join(' ')}>
      Image:{' '}
      <a
        href={entry.file_page}
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline"
      >
        {entry.author || 'Wikimedia contributor'}
      </a>
      {', '}
      {entry.license_url ? (
        <a
          href={entry.license_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline"
        >
          {entry.license}
        </a>
      ) : (
        <span>{entry.license}</span>
      )}
      , via Wikimedia Commons
    </p>
  );
}
