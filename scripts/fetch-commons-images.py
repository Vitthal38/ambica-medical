"""scripts/fetch-commons-images.py

Fetches CC-licensed medicine photos from Wikipedia + Wikimedia Commons and
writes them as public/medicines/{id}.jpg.

WHY THIS IS LEGAL
-----------------
Wikimedia Commons hosts media under verified free licenses. We accept:
    CC0, CC-BY, CC-BY-SA, public domain, US gov, no-restrictions.
We REJECT fair-use / non-commercial / unclear.

KEY DIFFERENCE FROM A NAIVE "main image" FETCH
----------------------------------------------
Drug articles on Wikipedia put a chemical structure diagram in the infobox,
NOT a pill photo. The naive approach (`prop=pageimages`) hands back the
molecule, which is useless for a pharmacy storefront.

Instead we walk EVERY image on the article, score each one, and pick the
best photo:
    + JPG is strongly preferred over SVG/PNG     (real photos vs diagrams)
    + Filename without "structure" / "skeletal" / "ball-and-stick" /
      "2D" / "3D" / "synthesis" / "Stereo" wins
    + Larger images win
    + Author "drug" / "pill" / "tablet" / "pack" / "blister" / "capsule"
      in filename or description gets a bonus
We also REJECT images whose license doesn't pass the allow-list.

ATTRIBUTION
-----------
public/medicines/_attribution.json maps medicine_id -> author + license +
source URL, so the site can render a small caption ("Image: <author>,
<license>, via Wikimedia Commons").

USAGE
-----
    pip install requests pillow
    python scripts/fetch-commons-images.py
    python scripts/fetch-commons-images.py --force
"""
from __future__ import annotations

import argparse
import io
import json
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path

try:
    import requests
    from PIL import Image
except ImportError as e:
    print(f"\nMissing dependency: {e}\n    pip install requests pillow\n", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
MEDICINES_DIR = ROOT / "public" / "medicines"
ATTRIB = MEDICINES_DIR / "_attribution.json"

WIKI_API = "https://en.wikipedia.org/w/api.php"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
UA = "AmbicaMedical-ImageFetcher/2.0 (https://ambica-medical.vercel.app; care@ambicamedical.in)"

# Accepted licenses -- substring match against Commons' LicenseShortName.
# Tolerant of both "CC-BY" (hyphen) and "CC BY" (space) variants.
ACCEPTED = ["cc0", "cc by", "cc-by", "public domain", "pd-", "no restrictions", "us government"]
REJECTED = ["fair use", "non-commercial", "non commercial", "all rights reserved", "non-free"]

# Filenames containing these tokens are strongly DOWNWEIGHTED (they're
# chemical structures, not pack/pill photos).
STRUCTURE_TOKENS = [
    "structure", "skeletal", "ball-and-stick", "ball_and_stick", "2d", "3d",
    "synthesis", "stereo", "molecule", "molecul", "spacefill", "wedge",
    "chirality", "ChemDraw", "Lewis", "kekule",
]
# Tokens that suggest the image IS a real photo of the drug/pack.
PHOTO_TOKENS = [
    "tablet", "tablets", "tab_", "pill", "pills", "capsule", "capsules",
    "blister", "pack", "packet", "bottle", "vial", "syrup", "ampoule",
    "inhaler", "monitor", "device", "drug_", "_50mg", "_500mg", "_5mg",
    "_10mg", "_20mg", "_25mg", "_100mg", "_250mg", "_in_", "stripe",
]


@dataclass
class ImageCandidate:
    file_title: str
    url: str
    thumb_url: str | None
    mime: str
    width: int
    height: int
    bytes: int
    license_short: str
    license_url: str
    author: str
    file_page: str
    score: float


# ---------------------------------------------------------------------------
#  Target mapping  -- medicine_id -> ordered list of (article title, search hints)
# ---------------------------------------------------------------------------
TARGETS: dict[str, list[str]] = {
    "p001":     ["Crocin (drug)", "Paracetamol"],
    "MED-0024": ["Crocin (drug)", "Paracetamol"],
    "p002":     ["Azithromycin"],
    "p003":     ["Omeprazole"],
    "p006":     ["Omron Healthcare", "Sphygmomanometer"],
    "p010":     ["Omega-3 fatty acid", "Fish oil"],
    "p015":     ["Telmisartan"],
    "MED-0249": ["Telmisartan"],
    "p020":     ["Centrum (multivitamin)", "Multivitamin"],
    "MED-0018": ["Aspirin"],
    "MED-0021": ["Diclofenac"],
    "MED-0020": ["Calpol", "Paracetamol"],
    "MED-0022": ["Calpol", "Paracetamol"],
    "MED-0047": ["Salbutamol"],
    "MED-0050": ["Salbutamol"],
    "MED-0043": ["Montelukast"],
    "MED-0044": ["Montelukast"],
    "MED-0045": ["Montelukast"],
    "MED-0055": ["Fluorouracil"],
    "MED-0059": ["Tamoxifen"],
    "MED-0068": ["Tamoxifen"],
    "MED-0062": ["Methotrexate"],

    # ---- Round 2: 34 SKUs the operator flagged as wrong/fake -------------
    # Oncology / endocrinology
    "MED-0058": ["Imatinib"],                            # Veenat
    "MED-0067": ["Letrozole"],                           # Letroz
    "MED-0066": ["Memantine"],                           # Admenta (operator wrote "Admeta")
    "MED-0069": ["Alendronic acid", "Fosamax"],          # Fosamax
    # Anti-TB
    "MED-0075": ["Pyrazinamide"],                        # Pyzina
    "MED-0078": ["Rifampicin", "Tuberculosis management"],  # AKuriT-3 (combo)
    # GI / acid
    "MED-0081": ["Famotidine"],                          # Famocid (operator wrote "Famoacid")
    "MED-0082": ["Famotidine"],                          # Famocid 40
    "MED-0086": ["Pantoprazole"],                        # Pan 20
    "MED-0088": ["Pantoprazole"],                        # Pan 40
    "MED-0093": ["Sucralfate"],                          # Sucrace
    "MED-0094": ["Isosorbide dinitrate"],                # Sorbitrate (operator wrote "Sobitrate")
    # Cardiac / neuro
    "MED-0103": ["Amiodarone"],                          # Cordarone 100 (op: "Coradarone")
    "MED-0104": ["Amiodarone"],                          # Cordarone 200
    "MED-0133": ["Carbamazepine"],                       # Tegrital 200 (op: "Tegriatl")
    "MED-0134": ["Carbamazepine"],                       # Tegrital CR 400
    "MED-0140": ["Phenobarbital"],                       # Gardenal
    # Diabetes
    "MED-0165": ["Gliclazide"],                          # Diamicron MR
    "MED-0166": ["Glimepiride"],                         # Amaryl 1
    "MED-0167": ["Glimepiride"],                         # Amaryl 4
    "MED-0168": ["Glimepiride", "Metformin"],            # Amaryl-M
    "MED-0172": ["Pioglitazone"],                        # Pioz
    # Other
    "MED-0177": ["Loperamide"],                          # Eldoper
    "MED-0187": ["Meclizine"],                           # Pregnacare (op: "Pregnare")
    "MED-0190": ["Ondansetron"],                         # Emeset 2 mg/ml
    "MED-0191": ["Ondansetron"],                         # Emeset 4 mg
    "MED-0192": ["Ondansetron"],                         # Emeset MD 4 mg
    "MED-0193": ["Ondansetron"],                         # Emeset 8 mg
    # Antifungals
    "MED-0194": ["Clotrimazole"],                        # Candid cream
    "MED-0195": ["Clotrimazole"],                        # Candid cream
    "MED-0196": ["Clotrimazole"],                        # Candid V pessary
    "MED-0200": ["Itraconazole"],                        # Itrasys
    "MED-0204": ["Terbinafine"],                         # Terbicip cream
    "MED-0205": ["Terbinafine"],                         # Terbicip tablet
    # Gout
    "MED-0208": ["Colchicine"],                          # Goutnil (op: "Gountnil")
}


# ---------------------------------------------------------------------------
#  Wikimedia API
# ---------------------------------------------------------------------------

def _get(url: str, params: dict) -> dict:
    r = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=15)
    r.raise_for_status()
    return r.json()


def list_article_images(article_title: str) -> list[str]:
    """Return list of 'File:...' titles for ALL images on the article."""
    files: list[str] = []
    cont: dict = {}
    for _ in range(3):  # at most 3 continuations -- avoid runaway
        params = {
            "action": "query", "format": "json", "prop": "images",
            "titles": article_title, "imlimit": 50, "redirects": 1,
        }
        params.update(cont)
        data = _get(WIKI_API, params)
        pages = data.get("query", {}).get("pages", {})
        for _, page in pages.items():
            for im in page.get("images", []) or []:
                title = im.get("title", "")
                if title.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".tif", ".svg")):
                    files.append(title)
        cont = data.get("continue", {}) or {}
        if not cont:
            break
    return files


def fetch_image_meta(file_title: str) -> dict | None:
    data = _get(COMMONS_API, {
        "action": "query", "format": "json", "titles": file_title,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime|size",
        "iiurlwidth": 1024,
    })
    pages = data.get("query", {}).get("pages", {})
    for _, page in pages.items():
        if "imageinfo" not in page:
            return None
        info = page["imageinfo"][0]
        em = info.get("extmetadata", {})
        return {
            "url": info.get("url"),
            "thumb_url": info.get("thumburl") or info.get("url"),
            "mime": info.get("mime", ""),
            "width": int(info.get("width") or 0),
            "height": int(info.get("height") or 0),
            "bytes": int(info.get("size") or 0),
            "license_short": (em.get("LicenseShortName", {}) or {}).get("value", ""),
            "license_url": (em.get("LicenseUrl", {}) or {}).get("value", ""),
            "author_raw": (em.get("Artist", {}) or {}).get("value", ""),
            "description_raw": (em.get("ImageDescription", {}) or {}).get("value", ""),
            "file_page": f"https://commons.wikimedia.org/wiki/{file_title.replace(' ', '_')}",
        }
    return None


def license_acceptable(short: str) -> bool:
    s = (short or "").lower()
    if any(p in s for p in REJECTED):
        return False
    return any(p in s for p in ACCEPTED)


def _strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", s).strip()[:200]


def score_image(file_title: str, meta: dict) -> float:
    """Higher is better. Heuristic to prefer real pack/pill photos."""
    score = 0.0
    name = file_title.lower()
    desc = (meta.get("description_raw") or "").lower()

    # MIME / format: JPG is the strongest signal it's a real photo
    mime = meta.get("mime", "")
    if mime in ("image/jpeg",):
        score += 8
    elif mime in ("image/png",):
        score += 3
    elif mime in ("image/webp",):
        score += 4
    elif mime in ("image/svg+xml",):
        score += -8   # nearly always a chemical diagram
    elif mime in ("image/gif",):
        score += -2

    # Structure / molecule penalty
    for t in STRUCTURE_TOKENS:
        if t in name:
            score -= 6
            break

    # Real-photo bonus
    for t in PHOTO_TOKENS:
        if t in name:
            score += 4
            break

    # Resolution bonus -- favor reasonable size, not thumbnails
    w, h = meta.get("width", 0), meta.get("height", 0)
    if w >= 800 and h >= 600:
        score += 2
    elif w >= 400 and h >= 300:
        score += 1

    # Heavy filesize bonus (real photos are tens-of-KB+, diagrams a few KB)
    b = meta.get("bytes", 0)
    if b > 200_000:
        score += 2
    elif b > 50_000:
        score += 1
    elif b < 5_000:
        score -= 2

    # Description hints
    for t in PHOTO_TOKENS:
        if t in desc:
            score += 1
            break

    return score


# ---------------------------------------------------------------------------
#  Download
# ---------------------------------------------------------------------------

def download_and_save(url: str, out: Path) -> bool:
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=30, stream=True)
        r.raise_for_status()
        chunks: list[bytes] = []
        total = 0
        for ch in r.iter_content(64 * 1024):
            chunks.append(ch)
            total += len(ch)
            if total > 6 * 1024 * 1024:
                return False
        raw = b"".join(chunks)
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
        img.thumbnail((1024, 1024), Image.LANCZOS)
        out.parent.mkdir(parents=True, exist_ok=True)
        img.save(out, "JPEG", quality=85, optimize=True)
        return True
    except Exception as e:  # noqa: BLE001
        print(f"      download failed: {e}", file=sys.stderr)
        return False


# ---------------------------------------------------------------------------
#  Per-target driver
# ---------------------------------------------------------------------------

def pick_best_image(article_title: str) -> ImageCandidate | None:
    """Return the highest-scoring usable image on the article, or None."""
    try:
        files = list_article_images(article_title)
    except Exception as e:  # noqa: BLE001
        print(f"    article-images fetch failed: {e}")
        return None
    if not files:
        return None

    candidates: list[ImageCandidate] = []
    for ft in files:
        try:
            m = fetch_image_meta(ft)
        except Exception as e:  # noqa: BLE001
            print(f"    meta fetch failed for {ft}: {e}")
            continue
        if not m:
            continue
        if not license_acceptable(m.get("license_short", "")):
            continue
        sc = score_image(ft, m)
        candidates.append(ImageCandidate(
            file_title=ft,
            url=m["url"],
            thumb_url=m.get("thumb_url"),
            mime=m.get("mime", ""),
            width=m.get("width", 0),
            height=m.get("height", 0),
            bytes=m.get("bytes", 0),
            license_short=m.get("license_short", ""),
            license_url=m.get("license_url", ""),
            author=_strip_html(m.get("author_raw", "")),
            file_page=m["file_page"],
            score=sc,
        ))
        time.sleep(0.25)  # be polite to Commons
    if not candidates:
        return None
    candidates.sort(key=lambda c: c.score, reverse=True)
    # Show the top 3 so we can see what we picked
    for c in candidates[:3]:
        print(f"    candidate score={c.score:5.1f}  {c.mime:14}  {c.width}x{c.height}  {c.file_title}")
    best = candidates[0]
    # Quality gate: require a JPG OR a high-scoring non-JPG.
    # Without this we ship 3D ball-and-stick molecule cartoons as "real" photos.
    is_jpg = best.mime == "image/jpeg"
    if not is_jpg and best.score < 5:
        print(f"    best candidate score {best.score:.1f} non-JPG -- skipping (would be a diagram)")
        return None
    if best.score < 2:
        print(f"    best candidate score {best.score:.1f} too low -- skipping")
        return None
    return best


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    attribution: dict[str, dict] = {}
    if ATTRIB.exists():
        try:
            attribution = json.loads(ATTRIB.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            attribution = {}

    summary: list[tuple[str, str, str, str]] = []  # (id, status, license, title)

    for med_id, titles in TARGETS.items():
        print(f"{med_id}:")
        if med_id in attribution and not args.force:
            summary.append((med_id, "cached", attribution[med_id]["license"], attribution[med_id]["wikipedia_article"]))
            print(f"  already have an attribution -- skipping (use --force to redo)")
            continue

        picked: ImageCandidate | None = None
        picked_article: str | None = None
        for title in titles:
            print(f"  try article: {title}")
            picked = pick_best_image(title)
            if picked:
                picked_article = title
                break

        if not picked:
            summary.append((med_id, "no_real_photo", "", ""))
            print(f"  -> no real photo found in any candidate article")
            continue

        out = MEDICINES_DIR / f"{med_id}.jpg"
        print(f"  download winner: {picked.file_title}  ({picked.license_short})")
        if not download_and_save(picked.thumb_url or picked.url, out):
            summary.append((med_id, "download_failed", picked.license_short, picked_article or ""))
            continue

        attribution[med_id] = {
            "source_url": picked.thumb_url or picked.url,
            "file_page": picked.file_page,
            "license": picked.license_short,
            "license_url": picked.license_url,
            "author": picked.author,
            "wikipedia_article": picked_article,
            "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        summary.append((med_id, "ok", picked.license_short, picked_article or ""))

    ATTRIB.write_text(json.dumps(attribution, indent=2, ensure_ascii=False), encoding="utf-8")

    print()
    print("=" * 72)
    print(f"{'MEDICINE':10}  {'STATUS':16}  {'LICENSE':16}  {'WIKIPEDIA ARTICLE':30}")
    n_ok = n_skip = n_fail = 0
    for med_id, status, lic, title in summary:
        print(f"{med_id:10}  {status:16}  {(lic or '')[:16]:16}  {(title or '')[:30]:30}")
        if status == "ok": n_ok += 1
        elif status == "cached": n_skip += 1
        else: n_fail += 1
    print()
    print(f"  Downloaded:        {n_ok}")
    print(f"  Already had:       {n_skip}")
    print(f"  Failed / no photo: {n_fail}")
    print(f"  Attribution file:  {ATTRIB.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
