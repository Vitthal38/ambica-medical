"""Generate a clean, browseable PDF of the full Ambica Medical catalog (516 SKUs).

Layout choices:
  - Cover page: title, total SKU count, generated-on date, table of contents
  - One section per category, in catalog order
  - Inside each section: a 5-column table (Sl. No. | Brand | Generic + Dose | Pack | Mfr.)
  - Rx items get a small red [Rx] badge next to the brand; OTC are unmarked
  - Repeating page header so the doc reads well at any page
  - Page footer with page number + total

Run:
  python scripts/build_catalog_pdf.py
Output: ambica-medical-catalog.pdf in the project root.
"""
from __future__ import annotations

import json
import datetime as dt
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "src" / "data" / "products.json"
MEDICINES = ROOT / "src" / "data" / "medicines.json"
OUT = ROOT / "ambica-medical-catalog.pdf"

# Pretty category labels (slug -> human title)
CATEGORY_LABEL = {
    "fever-and-pain-relief": "Fever & Pain Relief",
    "cold-cough-and-flu": "Cold, Cough & Flu",
    "allergy-relief": "Allergy Relief",
    "infection-care": "Infection Care (Antibiotics & Antivirals)",
    "heart-and-bp": "Heart & Blood Pressure",
    "diabetes-care": "Diabetes Care",
    "digestive-care": "Digestive Care",
    "respiratory-and-asthma": "Respiratory & Asthma",
    "eye-and-ear-care": "Eye & Ear Care",
    "skin-care": "Skin Care",
    "bone-joint-and-muscle": "Bone, Joint & Muscle",
    "vitamins-and-supplements": "Vitamins & Supplements",
    "womens-health": "Women's Health",
    "mental-wellness": "Mental Wellness",
    "baby-and-child-care": "Baby & Child Care",
    "first-aid-and-personal-care": "First Aid & Personal Care",
}

# Category display order (largest first; tweak as needed)
CATEGORY_ORDER = [
    "fever-and-pain-relief",
    "cold-cough-and-flu",
    "allergy-relief",
    "infection-care",
    "heart-and-bp",
    "diabetes-care",
    "digestive-care",
    "respiratory-and-asthma",
    "eye-and-ear-care",
    "skin-care",
    "bone-joint-and-muscle",
    "vitamins-and-supplements",
    "womens-health",
    "mental-wellness",
    "baby-and-child-care",
    "first-aid-and-personal-care",
]


def load_catalog() -> list[dict]:
    products = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    medicines = json.loads(MEDICINES.read_text(encoding="utf-8"))
    return products + medicines


def page_header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    # Header strip
    canvas.setFillColor(colors.HexColor("#059669"))
    canvas.rect(0, h - 16 * mm, w, 16 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(15 * mm, h - 10 * mm, "Ambica Medical — Product Catalogue")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(
        w - 15 * mm, h - 10 * mm, "Licensed pharmacy • Aurangabad"
    )
    # Footer
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(15 * mm, 10 * mm, "ambica-medical.vercel.app")
    canvas.drawRightString(w - 15 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def main() -> None:
    items = load_catalog()
    print(f"Loaded {len(items)} SKUs")

    # Bucket by category, preserving catalog order within each bucket
    by_cat: dict[str, list[dict]] = {c: [] for c in CATEGORY_ORDER}
    misc: list[dict] = []
    for p in items:
        c = p.get("category", "")
        if c in by_cat:
            by_cat[c].append(p)
        else:
            misc.append(p)

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=22 * mm,  # leave room for the header strip
        bottomMargin=15 * mm,
        title="Ambica Medical — Product Catalogue",
        author="Ambica Medical",
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "h1cat",
        parent=styles["Heading1"],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=8,
        spaceBefore=4,
    )
    sub = ParagraphStyle(
        "sub",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=10,
    )
    cover_h = ParagraphStyle(
        "coverh",
        parent=styles["Title"],
        fontSize=28,
        leading=34,
        alignment=1,
        textColor=colors.HexColor("#059669"),
        spaceAfter=12,
    )
    cover_meta = ParagraphStyle(
        "coverm",
        parent=styles["Normal"],
        fontSize=11,
        alignment=1,
        textColor=colors.HexColor("#475569"),
        spaceAfter=4,
    )
    toc_line = ParagraphStyle(
        "tocl",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
        leftIndent=4,
    )

    story: list = []

    # ---- Cover ---------------------------------------------------------
    story.append(Spacer(1, 30 * mm))
    story.append(Paragraph("Ambica Medical", cover_h))
    story.append(Paragraph("Product Catalogue", cover_h))
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph(f"<b>{len(items)} SKUs</b> across {len([c for c in by_cat if by_cat[c]])} categories", cover_meta))
    story.append(Paragraph(f"Generated: {dt.date.today().isoformat()}", cover_meta))
    story.append(Spacer(1, 18 * mm))
    story.append(
        Paragraph(
            "Jawahar Colony, Trimurti Chowk, Near Hegdewar Hospital,<br/>"
            "Chhatrapati Sambhajinagar (Aurangabad), Maharashtra 431001<br/>"
            "+91 94204 02595 • care@ambicamedical.in • Lic. No: MH-AUR-00001",
            cover_meta,
        )
    )

    story.append(PageBreak())

    # ---- TOC -----------------------------------------------------------
    story.append(Paragraph("Contents", h1))
    toc_rows = []
    for c in CATEGORY_ORDER:
        if not by_cat[c]:
            continue
        toc_rows.append(
            [
                Paragraph(f"<b>{CATEGORY_LABEL[c]}</b>", toc_line),
                Paragraph(f"{len(by_cat[c])} SKUs", toc_line),
            ]
        )
    if misc:
        toc_rows.append(
            [Paragraph("<b>Other / Uncategorised</b>", toc_line), Paragraph(f"{len(misc)} SKUs", toc_line)]
        )
    toc_tbl = Table(toc_rows, colWidths=[120 * mm, 40 * mm])
    toc_tbl.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ]
        )
    )
    story.append(toc_tbl)
    story.append(PageBreak())

    # ---- Sections ------------------------------------------------------
    sl = 0  # global serial number across the whole catalogue

    def write_section(slug: str, label: str, rows: list[dict]) -> None:
        nonlocal sl
        story.append(Paragraph(label, h1))
        story.append(Paragraph(f"{len(rows)} SKUs", sub))

        header = [
            "Sl.",
            "Brand",
            "Generic · Strength",
            "Pack",
            "Manufacturer",
        ]
        body: list[list] = [header]
        small = ParagraphStyle("td", parent=styles["Normal"], fontSize=8, leading=10)
        small_bold = ParagraphStyle("tdb", parent=small, fontName="Helvetica-Bold")

        rows_sorted = sorted(rows, key=lambda x: (x.get("brand") or "").lower())
        for p in rows_sorted:
            sl += 1
            brand = p.get("brand") or "—"
            rx = bool(p.get("rxRequired"))
            brand_html = (
                f'<font name="Helvetica-Bold">{brand}</font>'
                + (
                    '  <font color="#dc2626" size="6">● Rx</font>'
                    if rx
                    else ""
                )
            )
            generic = (p.get("name") or "").strip() or "—"
            pack = p.get("pack") or "—"
            mfr = p.get("manufacturer") or "—"
            body.append(
                [
                    Paragraph(str(sl), small),
                    Paragraph(brand_html, small),
                    Paragraph(generic, small),
                    Paragraph(pack, small),
                    Paragraph(mfr, small),
                ]
            )

        tbl = Table(
            body,
            colWidths=[12 * mm, 35 * mm, 60 * mm, 35 * mm, 38 * mm],
            repeatRows=1,
        )
        tbl.setStyle(
            TableStyle(
                [
                    # Header
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#059669")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 8),
                    ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    # Zebra striping for readability
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.HexColor("#f8fafc"), colors.white],
                    ),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(tbl)
        story.append(PageBreak())

    for c in CATEGORY_ORDER:
        if by_cat[c]:
            write_section(c, CATEGORY_LABEL[c], by_cat[c])

    if misc:
        write_section("misc", "Other / Uncategorised", misc)

    doc.build(story, onFirstPage=page_header_footer, onLaterPages=page_header_footer)
    print(f"Wrote {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
