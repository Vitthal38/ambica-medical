/**
 * Dosage-form silhouettes for the placeholder SVG.
 *
 * Each function returns a fragment of SVG markup (NOT a full document) that
 * draws a stylised, single-colour-with-highlights silhouette of the medicine
 * container appropriate to its `dosageForm`. The silhouettes sit BEHIND the
 * brand text in the placeholder card so the eye reads:
 *
 *   [shape hint] BRAND
 *               generic — strength
 *
 * Why hand-drawn paths and not stock icons?
 *   - Stock icon licences vary, vector-tracing competitor pack-shots loops
 *     us back to the legal problem we've been avoiding. These paths are
 *     original art generated programmatically.
 *   - Keeps the SVG completely self-contained — no external <image> refs,
 *     no font dependencies, no network fetches at render time.
 *   - Lets each silhouette tint to the medicine's category colour, so the
 *     full card reads as a coherent design instead of a clipart paste-in.
 *
 * Coordinate system: all paths are designed against a 480×480 viewBox with
 * the silhouette centred horizontally and vertically near y=180-340 — i.e.
 * the middle band, leaving the top stripe and bottom brand area clear.
 */

export type Silhouette =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'dropper'
  | 'tube'
  | 'vial'
  | 'inhaler'
  | 'sachet'
  | 'carton';

/**
 * Map the wide variety of `dosageForm` strings in the catalog down to a
 * small set of silhouettes. Defaults to `carton` for anything weird.
 */
export function classifyDosageForm(form?: string | null): Silhouette {
  const f = (form ?? '').toLowerCase().trim();
  if (!f) return 'carton';
  if (f.includes('capsule')) return 'capsule';
  if (f.includes('tablet') || f === 'effervescent tablet' || f.includes('chewable') || f.includes('dispersible')) return 'tablet';
  if (f.includes('syrup') || f.includes('suspension') || f === 'liquid' || f === 'solution' || f === 'mouthwash' || f === 'honey') return 'syrup';
  if (f.includes('drops')) return 'dropper';
  if (f.includes('cream') || f.includes('gel') || f.includes('lotion') || f.includes('ointment') || f === 'face wash' || f === 'shampoo') return 'tube';
  if (f.includes('injection') || f.includes('iv ')) return 'vial';
  if (f.includes('inhaler') || f.includes('respules') || f.includes('spray')) return 'inhaler';
  if (f.includes('sachet') || f.includes('powder')) return 'sachet';
  return 'carton';
}

/**
 * Render the silhouette as an SVG `<g>` fragment, tinted with the supplied
 * stroke / fill colours. Returns plain SVG markup (string).
 */
export function renderSilhouette(kind: Silhouette, accentColor: string): string {
  const stroke = accentColor;
  // Soft tint for the body — same colour as the accent stripe but at
  // 12% opacity so the silhouette reads as a quiet background motif,
  // not foreground content.
  const tint = `${accentColor}1F`; // hex + 1F (~12%) alpha
  const tintLight = `${accentColor}10`; // even softer for highlights

  switch (kind) {
    case 'tablet':
      // Classic oval pill, with a score line down the middle.
      return `
<g transform="translate(240,200)" opacity="0.95">
  <ellipse cx="0" cy="0" rx="120" ry="42" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <line x1="0" y1="-38" x2="0" y2="38" stroke="${stroke}" stroke-width="2.5" opacity="0.6"/>
  <ellipse cx="-30" cy="-10" rx="35" ry="10" fill="${tintLight}"/>
</g>`;

    case 'capsule':
      // Two-tone capsule, classic red/white-ish split rendered as accent + soft tint.
      return `
<g transform="translate(240,200)" opacity="0.95">
  <rect x="-115" y="-30" width="230" height="60" rx="30" fill="${tintLight}" stroke="${stroke}" stroke-width="3"/>
  <path d="M -115 -30 L 0 -30 L 0 30 L -115 30 A 30 30 0 0 1 -115 -30 Z" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <line x1="0" y1="-30" x2="0" y2="30" stroke="${stroke}" stroke-width="2.5" opacity="0.6"/>
  <ellipse cx="-60" cy="-12" rx="35" ry="6" fill="${tintLight}" opacity="0.8"/>
</g>`;

    case 'syrup':
      // Bottle with neck and shoulder, label band across the body.
      return `
<g transform="translate(240,140)" opacity="0.95">
  <rect x="-32" y="0" width="64" height="22" rx="4" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <path d="M -42 22 Q -42 32 -52 42 L -52 168 Q -52 188 -32 188 L 32 188 Q 52 188 52 168 L 52 42 Q 42 32 42 22 Z" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <rect x="-46" y="68" width="92" height="64" fill="${tintLight}" stroke="${stroke}" stroke-width="2"/>
  <line x1="-38" y1="88" x2="38" y2="88" stroke="${stroke}" stroke-width="2" opacity="0.45"/>
  <line x1="-38" y1="108" x2="20" y2="108" stroke="${stroke}" stroke-width="2" opacity="0.45"/>
  <rect x="-50" y="135" width="100" height="50" fill="${tintLight}" opacity="0.6"/>
</g>`;

    case 'dropper':
      // Bottle with a long pointed dropper top.
      return `
<g transform="translate(240,140)" opacity="0.95">
  <path d="M -8 0 L -8 24 L -28 36 L -28 76 L 28 76 L 28 36 L 8 24 L 8 0 Z" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <rect x="-44" y="76" width="88" height="120" rx="14" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <rect x="-38" y="104" width="76" height="58" fill="${tintLight}" stroke="${stroke}" stroke-width="2"/>
  <line x1="-30" y1="124" x2="30" y2="124" stroke="${stroke}" stroke-width="2" opacity="0.5"/>
  <circle cx="0" cy="216" r="6" fill="${stroke}" opacity="0.55"/>
</g>`;

    case 'tube':
      // Toothpaste-style tube on its side with a screw cap.
      return `
<g transform="translate(240,220)" opacity="0.95">
  <rect x="-140" y="-32" width="220" height="64" rx="6" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <path d="M 80 -32 L 110 -10 L 110 10 L 80 32 Z" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <rect x="110" y="-18" width="22" height="36" rx="3" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <rect x="-130" y="-18" width="180" height="36" fill="${tintLight}" stroke="${stroke}" stroke-width="2"/>
  <line x1="-126" y1="-2" x2="40" y2="-2" stroke="${stroke}" stroke-width="2" opacity="0.5"/>
  <rect x="-138" y="22" width="216" height="6" fill="${stroke}" opacity="0.18"/>
</g>`;

    case 'vial':
      // Glass injection vial with rubber septum cap.
      return `
<g transform="translate(240,150)" opacity="0.95">
  <rect x="-30" y="0" width="60" height="14" rx="2" fill="${stroke}" opacity="0.45"/>
  <rect x="-22" y="14" width="44" height="8" fill="${stroke}" opacity="0.6"/>
  <path d="M -38 22 L -38 180 Q -38 200 -18 200 L 18 200 Q 38 200 38 180 L 38 22 Z" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <rect x="-32" y="80" width="64" height="80" fill="${tintLight}" stroke="${stroke}" stroke-width="2"/>
  <line x1="-26" y1="100" x2="26" y2="100" stroke="${stroke}" stroke-width="2" opacity="0.5"/>
  <line x1="-26" y1="118" x2="14" y2="118" stroke="${stroke}" stroke-width="2" opacity="0.5"/>
</g>`;

    case 'inhaler':
      // L-shaped inhaler / pMDI silhouette.
      return `
<g transform="translate(240,160)" opacity="0.95">
  <rect x="-30" y="0" width="60" height="120" rx="6" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <rect x="-24" y="14" width="48" height="92" fill="${tintLight}" stroke="${stroke}" stroke-width="2"/>
  <path d="M -30 120 L -30 170 L 30 170 L 30 120 Z" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <path d="M 30 130 L 90 130 L 90 160 L 30 160 Z" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <circle cx="90" cy="145" r="6" fill="${stroke}" opacity="0.6"/>
</g>`;

    case 'sachet':
      // Foil-strip sachet with tear-notch.
      return `
<g transform="translate(240,200)" opacity="0.95">
  <path d="M -110 -60 L 110 -60 L 110 60 L -110 60 Z" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <path d="M -112 -60 L -100 -60 L -106 -52 L -100 -44 L -112 -44 Z" fill="${stroke}" opacity="0.55"/>
  <rect x="-100" y="-46" width="200" height="92" fill="${tintLight}" stroke="${stroke}" stroke-width="2"/>
  <line x1="-90" y1="-20" x2="90" y2="-20" stroke="${stroke}" stroke-width="2" opacity="0.45"/>
  <line x1="-90" y1="0" x2="60" y2="0" stroke="${stroke}" stroke-width="2" opacity="0.45"/>
  <line x1="-90" y1="20" x2="80" y2="20" stroke="${stroke}" stroke-width="2" opacity="0.45"/>
</g>`;

    case 'carton':
    default:
      // Generic medicine carton with a top stripe.
      return `
<g transform="translate(240,210)" opacity="0.95">
  <rect x="-130" y="-80" width="260" height="160" rx="8" fill="${tint}" stroke="${stroke}" stroke-width="3"/>
  <rect x="-130" y="-80" width="260" height="20" fill="${stroke}" opacity="0.35"/>
  <rect x="-110" y="-40" width="220" height="100" fill="${tintLight}" stroke="${stroke}" stroke-width="2"/>
  <line x1="-100" y1="-18" x2="100" y2="-18" stroke="${stroke}" stroke-width="2" opacity="0.45"/>
  <line x1="-100" y1="2" x2="60" y2="2" stroke="${stroke}" stroke-width="2" opacity="0.45"/>
  <line x1="-100" y1="22" x2="80" y2="22" stroke="${stroke}" stroke-width="2" opacity="0.45"/>
</g>`;
  }
}
