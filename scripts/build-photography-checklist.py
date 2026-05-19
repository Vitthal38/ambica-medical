"""scripts/build-photography-checklist.py

Generates a printable PDF the operator can carry around the pharmacy while
photographing in-stock packs. Output: ambica-medical-photography-checklist.pdf

PRIORITY ORDER
--------------
Highest-priority SKUs appear first so that even if the operator only finishes
the first 100 lines, they've covered the most-visible cards on the storefront:

  1. Rx items in `infection-care` (antibiotics — top-prescribed in India)
  2. Rx items in `heart-and-bp` + `diabetes-care` (chronic, frequent dispense)
  3. Rx items in `mental-wellness`, `respiratory-and-asthma` (chronic)
  4. All other Rx items, by category
  5. OTC items: vitamins + first-aid + cold/cough (high traffic on landing)
  6. Everything else

CONTENT
-------
- Cover page with pharmacy details + today's date + total SKU count.
- Shooting guide page (equipment, framing, naming convention).
- Checklist tables grouped by category, each with a "Done" tick column.
- Rx items are visually distinguished from OTC.

Run:
  python scripts/build-photography-checklist.py
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

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "src" / "data" / "products.json"
MEDICINES = ROOT / "src" / "data" / "medicines.json"
OUT = ROOT / "ambica-medical-photography-checklist.pdf"

CATEGORY_LABEL = {
    "fever-and-pain-relief": "Fever & Pain Relief",
    "cold-cough-and-flu": "Cold, Cough & Flu",
    "allergy-relief": "Allergy Relief",
    "infection-care": "Infection Care",
    "heart-and-bp": "Heart & BP",
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


def priority_key(item: dict) -> tuple[int, int, str]:
    """Lower tuple sorts first. Drives the photography order."""
    cat = item.get("category", "")
    rx = bool(item.get("rxRequired"))
    # Tier 1: Rx infection-care (antibiotics — top dispensed)
    if rx and cat == "infection-care":
        tier, sub = 0, 0
    # Tier 2: Rx chronic conditions
    elif rx and cat in ("heart-and-bp", "diabetes-care"):
        tier, sub = 1, 0
    elif rx and cat in ("mental-wellness", "respiratory-and-asthma"):
        tier, sub = 2, 0
    # Tier 3: Other Rx items
    elif rx:
        tier, sub = 3, 0
    # Tier 4: OTC high-traffic
    elif cat in ("vitamins-and-supplements", "first-aid-and-personal-care",
                 "cold-cough-and-flu", "fever-and-pain-relief"):
        tier, sub = 4, 0
    else:
        tier, sub = 5, 0
    # Within a tier, group by category then brand for a stable walk through
    # the actual store shelves.
    return tier, sub, (cat + "|" + item.get("brand", "")).lower()


def page_header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(colors.HexColor("#0ea5e9"))
    canvas.rect(0, h - 16 * mm, w, 16 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(15 * mm, h - 10 * mm, "Ambica Medical — Photography Checklist")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(w - 15 * mm, h - 10 * mm, dt.date.today().isoformat())
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(15 * mm, 10 * mm, "Photograph in-stock pack -> save as {id}.jpg -> drop in incoming/")
    canvas.drawRightString(w - 15 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def write_cover(story, styles, total: int) -> None:
    h1 = ParagraphStyle("ch1", parent=styles["Title"], fontSize=28, alignment=1,
                        textColor=colors.HexColor("#0369a1"), spaceAfter=12)
    p = ParagraphStyle("cp", parent=styles["Normal"], fontSize=11, alignment=1,
                       textColor=colors.HexColor("#475569"), spaceAfter=4)
    story.append(Spacer(1, 35 * mm))
    story.append(Paragraph("Photography Checklist", h1))
    story.append(Paragraph("Pack-shots for the Ambica Medical catalogue", p))
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph(f"<b>{total} SKUs</b> in priority order", p))
    story.append(Paragraph(f"Generated: {dt.date.today().isoformat()}", p))
    story.append(Spacer(1, 14 * mm))
    story.append(Paragraph(
        "Tick off each pack as you photograph it. Save files as <code>{medicineId}.jpg</code> "
        "(e.g. <code>MED-0042.jpg</code>) into a folder called <code>incoming/</code> in the "
        "project. Then run <code>npm run images:import -- ./incoming --source=own_photo</code>.",
        p,
    ))
    story.append(PageBreak())


def write_shooting_guide(story, styles) -> None:
    h1 = ParagraphStyle("sgh", parent=styles["Heading1"], fontSize=18,
                        textColor=colors.HexColor("#0369a1"), spaceAfter=8)
    body = ParagraphStyle("sgb", parent=styles["Normal"], fontSize=10, leading=14,
                          textColor=colors.HexColor("#0f172a"), spaceAfter=8)
    sub = ParagraphStyle("sgs", parent=styles["Heading2"], fontSize=12,
                         textColor=colors.HexColor("#059669"), spaceAfter=4, spaceBefore=8)

    story.append(Paragraph("Shooting guide", h1))
    story.append(Paragraph(
        "Two to three minutes per SKU is enough once you have the lightbox set up. "
        "The single most important thing is consistency across all SKUs - any phone camera works.",
        body,
    ))

    story.append(Paragraph("Setup", sub))
    story.append(Paragraph(
        "&bull; A clean A4 sheet of white paper as background, taped to the wall and the counter "
        "so it curves at the bottom (no visible seam).<br/>"
        "&bull; Daylight from a window, OR two cheap LED desk lamps placed 45deg to either side. "
        "Avoid direct overhead light - it casts hard shadows on glossy cartons.<br/>"
        "&bull; Phone in a cradle / stand. Hand-held is fine if you can stay steady.<br/>"
        "&bull; Tap the carton on-screen before shooting to lock focus + exposure.",
        body,
    ))

    story.append(Paragraph("Framing", sub))
    story.append(Paragraph(
        "&bull; Square crop. The card on the website is square; shoot square to avoid awkward crops later.<br/>"
        "&bull; Pack centred, with ~10% white space on all sides. Don't fill the frame edge to edge.<br/>"
        "&bull; Front face only. The brand + strength + manufacturer must all be readable.<br/>"
        "&bull; Single pack, not the strip behind it. Strips can be a follow-up batch.",
        body,
    ))

    story.append(Paragraph("Naming + saving", sub))
    story.append(Paragraph(
        "&bull; Save each file as <b>{medicineId}.jpg</b> - the ID is the first column of the "
        "checklist table on the next page (e.g. <code>MED-0042.jpg</code>).<br/>"
        "&bull; If you take more than one shot per pack, name extras <code>MED-0042--side.jpg</code>; "
        "everything after <code>--</code> is ignored by the import.<br/>"
        "&bull; Resolution: 1000-2000px on the longest side is plenty. The pipeline downscales to 1024 anyway.<br/>"
        "&bull; JPEG quality 80-90% is fine. The pipeline re-encodes to WebP.",
        body,
    ))

    story.append(Paragraph("Reject before upload", sub))
    story.append(Paragraph(
        "Don't upload a pack-shot that:<br/>"
        "&bull; is blurry (Tesseract can't read it = low confidence = manual review)<br/>"
        "&bull; has hands / wrappers / hair in frame<br/>"
        "&bull; shows the wrong strength (200 mg pack with the 500 mg shelf label)<br/>"
        "&bull; is expired / damaged (we never ship those; don't picture them)",
        body,
    ))

    story.append(Paragraph("After the shoot", sub))
    story.append(Paragraph(
        "1. Transfer the photos to the project's <code>incoming/</code> folder.<br/>"
        "2. (Optional but recommended) Run OCR pre-flight: "
        "<code>python scripts/ocr-validate.py ./incoming</code>. "
        "It produces a sidecar JSON per image with the extracted text and a confidence score.<br/>"
        "3. Run <code>npm run images:import -- ./incoming --source=own_photo --confidence=100</code>.<br/>"
        "4. Refresh /admin/medicine-images to see the new approvals queue.",
        body,
    ))

    story.append(PageBreak())


def write_checklist_table(story, styles, title: str, rows: list[dict]) -> None:
    h1 = ParagraphStyle("th1", parent=styles["Heading1"], fontSize=14,
                        textColor=colors.HexColor("#0369a1"), spaceBefore=4, spaceAfter=8)
    story.append(Paragraph(title, h1))

    header = ["Done", "ID", "Brand", "Generic + Strength", "Pack", "Cat.", "Rx"]
    small = ParagraphStyle("smk", parent=styles["Normal"], fontSize=8, leading=10)
    body: list[list] = [header]
    for it in rows:
        body.append([
            "[ ]",
            it["id"],
            it.get("brand", ""),
            (it.get("name") or "") + (f"  {it['dosage']}" if it.get("dosage") else ""),
            it.get("pack", ""),
            CATEGORY_LABEL.get(it.get("category", ""), "")[:18],
            "Rx" if it.get("rxRequired") else "OTC",
        ])
    tbl = Table(
        [body[0]] + [[Paragraph(str(c), small) for c in r] for r in body[1:]],
        colWidths=[10 * mm, 18 * mm, 24 * mm, 56 * mm, 30 * mm, 28 * mm, 12 * mm],
        repeatRows=1,
    )
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0ea5e9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (-1, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    # Colour Rx rows subtly so the operator catches the compliance signal
    for i, r in enumerate(body[1:], start=1):
        if r[-1] == "Rx":
            tbl.setStyle(TableStyle([
                ("TEXTCOLOR", (-1, i), (-1, i), colors.HexColor("#dc2626")),
                ("FONTNAME", (-1, i), (-1, i), "Helvetica-Bold"),
            ]))
    story.append(tbl)
    story.append(PageBreak())


def main() -> None:
    items: list[dict] = []
    items.extend(json.loads(PRODUCTS.read_text(encoding="utf-8")))
    items.extend(json.loads(MEDICINES.read_text(encoding="utf-8")))

    # Don't list SKUs that already have an approved real image. The catalog
    # JSON doesn't yet carry the approval status, so we approximate by:
    #   - skipping items with imageUrl set (legacy committed photos)
    # Once the DB-driven flag lands on the storefront, swap this for a
    # query against approvalStatus = APPROVED.
    pending = [p for p in items if not p.get("imageUrl")]

    pending.sort(key=priority_key)

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=22 * mm,
        bottomMargin=15 * mm,
        title="Ambica Medical - Photography Checklist",
    )
    styles = getSampleStyleSheet()
    story: list = []
    write_cover(story, styles, total=len(pending))
    write_shooting_guide(story, styles)

    # Group by tier with a labelled break between tiers
    tier_labels = {
        0: "Tier 1 - Rx antibiotics + infection care",
        1: "Tier 2 - Rx chronic (heart, BP, diabetes)",
        2: "Tier 3 - Rx chronic (mental wellness, respiratory)",
        3: "Tier 4 - Other Rx medicines",
        4: "Tier 5 - OTC high-traffic (vitamins, first-aid, cold)",
        5: "Tier 6 - Everything else",
    }
    by_tier: dict[int, list[dict]] = {i: [] for i in range(6)}
    for it in pending:
        t, _, _ = priority_key(it)
        by_tier[t].append(it)

    for t, rows in by_tier.items():
        if not rows:
            continue
        write_checklist_table(story, styles, tier_labels[t] + f"  -  {len(rows)} SKUs", rows)

    doc.build(story, onFirstPage=page_header_footer, onLaterPages=page_header_footer)
    print(f"Wrote {OUT}  ({OUT.stat().st_size / 1024:.1f} KB)")
    print(f"  total pending SKUs: {len(pending)}")
    for t, rows in by_tier.items():
        if rows:
            print(f"  {tier_labels[t]}: {len(rows)}")


if __name__ == "__main__":
    main()
