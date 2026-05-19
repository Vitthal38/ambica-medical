"""scripts/ocr-validate.py
=========================

OCR-based pre-flight for the medicine image bulk-import.

WHAT IT DOES
------------
For each image file in the supplied directory, this script:

  1. Detects the medicine ID from the filename (same convention as the
     bulk-import: ``{id}.{ext}`` or ``{id}--anything.{ext}`` or ``{slug}.{ext}``).
  2. Looks up the medicine in the catalog JSON (no DB needed).
  3. Runs Tesseract OCR on the image.
  4. Computes a quality signal (Laplacian variance over the grayscale).
  5. Writes a ``{stem}.ocr.json`` sidecar next to the image with the raw
     extracted text + per-signal scores + recommended action.

The bulk-import (``npm run images:import``) reads those sidecars and uses
``src/lib/medicine-images/confidence.ts`` to decide whether to auto-approve,
flag for review, or auto-reject the upload.

WHY OFFLINE
-----------
Tesseract is a native binary. Vercel functions cannot run it. Putting OCR
in the operator's hands also makes it cheap to iterate on a tricky pack
(retry with a sharper photo, change crop, etc.) without round-tripping
through deploy + upload + review.

INSTALL
-------
  pip install pytesseract pillow opencv-python-headless rapidfuzz
  # plus tesseract itself:
  #   macOS:   brew install tesseract
  #   Linux:   sudo apt install tesseract-ocr
  #   Windows: choco install tesseract  (or scoop install tesseract)

USAGE
-----
  python scripts/ocr-validate.py ./incoming
  python scripts/ocr-validate.py ./incoming --force          # re-OCR even if sidecar exists
  python scripts/ocr-validate.py ./incoming --lang=eng+hin   # multi-lang OCR

OUTPUTS
-------
For each ``MED-0042.jpg`` it writes ``MED-0042.ocr.json``:

  {
    "medicine_id": "MED-0042",
    "extracted_text": "CROCIN\\n500 mg\\nParacetamol Tablets IP\\n...",
    "ocr_engine": "tesseract 5.3.3",
    "ocr_language": "eng",
    "matched_facts": {
      "brand": "Crocin", "name": "Paracetamol 500mg", "manufacturer": "GSK",
      "dosage": "500 mg", "dosageForm": "tablet"
    },
    "scores": {
      "brand_exact": 1.0, "brand_fuzzy": 1.0, "strength_match": 1.0,
      "manufacturer_match": 1.0, "form_match": 1.0, "image_quality": 0.88
    },
    "composite_confidence": 0.97,
    "recommended_action": "auto_approve"
  }

HONEST CAVEAT
-------------
OCR on Indian generic packs lands around 60-75% character accuracy. Brand
text uses stylised fonts that Tesseract handles poorly; strength and Latin
generic names are far more reliable. The confidence formula reflects that —
brand contributes 30%, strength + manufacturer + form together contribute
50%, image quality the remaining 20%. A "low brand match" alone shouldn't
auto-reject.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

# Lazy imports — script gives a clear error when these aren't installed.
def _import_runtime():
    try:
        from PIL import Image  # noqa: F401
        import pytesseract  # noqa: F401
        import cv2  # noqa: F401
        import numpy as np  # noqa: F401
    except ImportError as e:
        print(
            "\nMissing dependency: " + str(e) + "\n\n"
            "Install with:\n"
            "  pip install pytesseract pillow opencv-python-headless rapidfuzz\n"
            "Plus the Tesseract binary for your OS — see the docstring at the top of this script.\n",
            file=sys.stderr,
        )
        sys.exit(2)


ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "src" / "data" / "products.json"
MEDICINES = ROOT / "src" / "data" / "medicines.json"

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


@dataclass
class CatalogIndex:
    """In-memory index of the catalog for quick lookup by id or slug."""

    by_id: dict[str, dict]
    by_slug: dict[str, dict]

    @classmethod
    def load(cls) -> "CatalogIndex":
        items: list[dict] = []
        items.extend(json.loads(PRODUCTS.read_text(encoding="utf-8")))
        items.extend(json.loads(MEDICINES.read_text(encoding="utf-8")))
        by_id = {p["id"]: p for p in items}
        by_slug = {p["slug"]: p for p in items if "slug" in p}
        return cls(by_id=by_id, by_slug=by_slug)

    def find(self, ident: str) -> dict | None:
        return self.by_id.get(ident) or self.by_slug.get(ident.lower())


# ---------------------------------------------------------------------------
#  Filename helpers (mirrors scripts/bulk-import-images.ts)
# ---------------------------------------------------------------------------

def identifier_from_filename(path: Path) -> str:
    stem = path.stem
    return stem.split("--", 1)[0].strip()


# ---------------------------------------------------------------------------
#  Text scoring helpers — keep parity with src/lib/medicine-images/confidence.ts
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"[^a-z0-9\s.+%/\-]+")
_WHITESPACE_RE = re.compile(r"\s+")
_STRENGTH_RE = re.compile(r"(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|iu|units?))", re.I)


def normalise(s: str) -> str:
    s = s.lower()
    s = _PUNCT_RE.sub(" ", s)
    s = _WHITESPACE_RE.sub(" ", s)
    return s.strip()


def dice(a: str, b: str) -> float:
    A, B = a.replace(" ", ""), b.replace(" ", "")
    if len(A) < 2 or len(B) < 2:
        return 1.0 if A == B else 0.0
    def bigrams(x: str) -> dict[str, int]:
        out: dict[str, int] = {}
        for i in range(len(x) - 1):
            k = x[i:i + 2]
            out[k] = out.get(k, 0) + 1
        return out
    ga, gb = bigrams(A), bigrams(B)
    overlap = 0
    for k, v in ga.items():
        u = gb.get(k)
        if u:
            overlap += min(v, u)
    total = (len(A) - 1) + (len(B) - 1)
    return (2 * overlap) / total if total > 0 else 0.0


def extract_strength(s: str) -> str | None:
    m = _STRENGTH_RE.search(s or "")
    return m.group(1).lower().replace(" ", "") if m else None


def score_brand(ocr_text: str, brand: str) -> tuple[float, float]:
    text = normalise(ocr_text)
    b = normalise(brand)
    if not b:
        return 0.0, 0.0
    exact = 1.0 if b in text else 0.0
    fuzzy = 0.0
    for token in (t for t in text.split() if len(t) >= 3):
        d = dice(b, token)
        if d > fuzzy:
            fuzzy = d
    return exact, fuzzy


def score_strength(ocr_text: str, dosage: str | None, name: str) -> float:
    expected = extract_strength(dosage or "") or extract_strength(name)
    if not expected:
        return 0.5
    ocr_compact = normalise(ocr_text).replace(" ", "")
    return 1.0 if expected in ocr_compact else 0.0


def score_manufacturer(ocr_text: str, mfr: str | None) -> float:
    if not mfr:
        return 0.5
    text = normalise(ocr_text)
    full = normalise(mfr)
    if full in text:
        return 1.0
    first = full.split()[0] if full else ""
    if len(first) >= 4 and first in text:
        return 0.7
    best = 0.0
    for tok in (t for t in text.split() if len(t) >= 4):
        d = dice(first, tok)
        if d > best:
            best = d
    return 0.5 if best >= 0.8 else 0.0


_FORM_SYNONYMS = {
    "tablet": ["tablet", "tablets", "tabs", "tab", "ip", "bp"],
    "capsule": ["capsule", "capsules", "caps"],
    "syrup": ["syrup", "oral solution", "liquid"],
    "suspension": ["suspension", "susp"],
    "injection": ["injection", "inj", "vial", "ampoule", "ampule"],
    "cream": ["cream", "ointment"],
    "gel": ["gel"],
    "lotion": ["lotion"],
    "ointment": ["ointment", "oint"],
    "drops": ["drops", "eye drops", "ear drops", "dropper"],
    "inhaler": ["inhaler", "mdi", "puff"],
    "sachet": ["sachet", "powder"],
}


def score_form(ocr_text: str, form: str | None) -> float:
    if not form:
        return 0.5
    text = normalise(ocr_text)
    fw = normalise(form).split()[0] if form else ""
    syns = _FORM_SYNONYMS.get(fw, [fw])
    return 1.0 if any(s in text for s in syns) else 0.0


# ---------------------------------------------------------------------------
#  Image quality
# ---------------------------------------------------------------------------

def image_quality_score(path: Path) -> float:
    """Combine resolution + sharpness into a 0..1 score.

    Resolution: lower of (width, height) / 1024, capped.
    Sharpness: Laplacian variance, normalised against an empirical maximum
    that distinguishes 'crisp pack-shot' (~500+) from 'phone-cam blur' (~50).
    """
    import cv2  # local import — see _import_runtime
    import numpy as np

    img = cv2.imread(str(path))
    if img is None:
        return 0.0
    h, w = img.shape[:2]
    res = min(w, h) / 1024.0
    res = max(0.0, min(1.0, res))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    # 50 = blurry, 500+ = crisp; sigmoid-ish saturation
    sharp = max(0.0, min(1.0, (lap_var - 50.0) / 450.0))
    # Weight: 40% resolution + 60% sharpness — sharpness dominates for legibility
    return round(0.4 * res + 0.6 * sharp, 3)


# ---------------------------------------------------------------------------
#  Main per-file driver
# ---------------------------------------------------------------------------

def ocr_one(
    path: Path, catalog: CatalogIndex, lang: str, force: bool
) -> tuple[str, bool, str]:
    """Returns (medicine_id, wrote_sidecar, status_msg)."""
    import pytesseract
    from PIL import Image

    ident = identifier_from_filename(path)
    med = catalog.find(ident)
    if not med:
        return ident, False, "no_match"

    sidecar_path = path.with_name(f"{path.stem}.ocr.json")
    if sidecar_path.exists() and not force:
        return med["id"], False, "sidecar_exists"

    # OCR
    try:
        img = Image.open(path)
        text = pytesseract.image_to_string(img, lang=lang)
    except Exception as e:  # noqa: BLE001
        return med["id"], False, f"ocr_failed:{e}"

    # Per-signal scores
    brand_exact, brand_fuzzy = score_brand(text, med.get("brand", ""))
    signals = {
        "brand_exact": brand_exact,
        "brand_fuzzy": round(brand_fuzzy, 3),
        "strength_match": score_strength(text, med.get("dosage"), med.get("name", "")),
        "manufacturer_match": score_manufacturer(text, med.get("manufacturer")),
        "form_match": score_form(text, med.get("dosageForm")),
        "image_quality": image_quality_score(path),
    }

    # Composite — keep formula in sync with src/lib/medicine-images/confidence.ts
    brand_signal = max(signals["brand_exact"], signals["brand_fuzzy"])
    composite = (
        0.30 * brand_signal
        + 0.20 * signals["strength_match"]
        + 0.20 * signals["manufacturer_match"]
        + 0.10 * signals["form_match"]
        + 0.20 * signals["image_quality"]
    )
    composite = round(composite, 3)

    if composite >= 0.85:
        action = "auto_approve"
    elif composite >= 0.50:
        action = "needs_review"
    else:
        action = "auto_reject"

    payload = {
        "medicine_id": med["id"],
        "extracted_text": text[:2048],  # cap at 2 KB — matches DB column comment
        "ocr_engine": f"tesseract {pytesseract.get_tesseract_version()}",
        "ocr_language": lang,
        "matched_facts": {
            "brand": med.get("brand"),
            "name": med.get("name"),
            "manufacturer": med.get("manufacturer"),
            "dosage": med.get("dosage"),
            "dosageForm": med.get("dosageForm"),
        },
        "scores": signals,
        "composite_confidence": composite,
        "recommended_action": action,
    }
    sidecar_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return med["id"], True, action


def main() -> None:
    _import_runtime()
    ap = argparse.ArgumentParser(description="OCR pre-flight for medicine images.")
    ap.add_argument("dir", help="Directory of images to scan (top-level only).")
    ap.add_argument("--force", action="store_true", help="Re-OCR even if sidecar exists.")
    ap.add_argument("--lang", default="eng", help="Tesseract languages (e.g. eng or eng+hin).")
    args = ap.parse_args()

    root = Path(args.dir).resolve()
    if not root.is_dir():
        print(f"Not a directory: {root}", file=sys.stderr)
        sys.exit(2)

    catalog = CatalogIndex.load()
    files = sorted(p for p in root.iterdir() if p.suffix.lower() in ALLOWED_EXTS)
    print(f"OCR pre-flight: {len(files)} candidate file(s) in {root}")
    print(f"  catalog size:   {len(catalog.by_id)} SKUs")
    print(f"  language pack:  {args.lang}")
    print(f"  force re-OCR:   {args.force}")
    print()

    tally = {
        "auto_approve": 0,
        "needs_review": 0,
        "auto_reject": 0,
        "sidecar_exists": 0,
        "no_match": 0,
        "ocr_failed": 0,
    }
    failures: list[str] = []

    for p in files:
        med_id, wrote, status = ocr_one(p, catalog, args.lang, args.force)
        if status.startswith("ocr_failed"):
            tally["ocr_failed"] += 1
            failures.append(f"{p.name}: {status}")
        elif status in tally:
            tally[status] += 1
        else:
            tally[status] = tally.get(status, 0) + 1
        flag = "*" if wrote else " "
        print(f"  {flag} {p.name:40s} -> {med_id:15s} {status}")

    print()
    print("Summary")
    for k, v in tally.items():
        print(f"  {k:20s} {v}")
    if failures:
        print()
        print("OCR failures (first 10):")
        for f in failures[:10]:
            print(f"  - {f}")


if __name__ == "__main__":
    main()
