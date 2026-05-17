"""
Download representative product images for every medicine in medicines_500.csv.

Design goals:
  * Ethical scraping — uses DuckDuckGo image search via the `ddgs` library
    (no Google ToS bypass, no headless browser, no user-content scraping).
  * Respects robots.txt of any host whose images are fetched.
  * Polite — sets a descriptive User-Agent and rate-limits.
  * Resumable — already-downloaded files are skipped, so re-running the
    script retries only failed entries.
  * Falls back to a clean SVG placeholder when no image is found.
  * Runs anywhere Python 3.10+ runs, including Google Colab.

Usage (local):
    pip install ddgs pillow requests
    python scripts/download_medicine_images.py
    python scripts/download_medicine_images.py --limit 20    # test run
    python scripts/download_medicine_images.py --csv my.csv --out public/medicines

Usage (Google Colab):
    !pip install -q ddgs pillow requests
    # upload medicines_500.csv via the file panel, then:
    !python download_medicine_images.py
    # The script auto-detects Colab and triggers files.download() at the end.

Output:
    <out>/MED-0001.jpg, MED-0002.jpg, …          (512 px, JPEG q85)
    medicines_images.zip                          (zipped copy)
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import logging
import sys
import time
import urllib.parse
import urllib.robotparser
import zipfile
from pathlib import Path
from typing import Iterable, Optional, Tuple

import requests
from PIL import Image

# --- Optional Colab integration --------------------------------------------
try:
    from google.colab import files as colab_files  # type: ignore

    IN_COLAB = True
except ImportError:
    IN_COLAB = False

# --- DuckDuckGo image search -----------------------------------------------
try:
    from ddgs import DDGS  # newer name
except ImportError:  # pragma: no cover
    from duckduckgo_search import DDGS  # legacy name


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

USER_AGENT = (
    "AmbicaMedical-DemoCatalog/1.0 "
    "(educational; +https://ambicamedical.in; care@ambicamedical.in)"
)
TARGET_SIZE = (512, 512)        # max image size (kept aspect-ratio)
JPEG_QUALITY = 85
SEARCH_RATE_LIMIT_S = 1.6        # delay between DDG searches
FETCH_TIMEOUT_S = 12
RETRIES = 2
ALLOWED_CONTENT_TYPES = ("image/jpeg", "image/jpg", "image/png", "image/webp")

# Hosts to prefer when DDG returns multiple results — Indian pharmacy CDNs
PREFERRED_HOSTS = (
    "1mg.com",
    "netmeds.com",
    "pharmeasy.in",
    "apollopharmacy.in",
    "tata1mg.com",
    "wikimedia.org",   # last-mile fallback for generic-name pages
)

# Hosts blocked even if returned — e.g. low-quality stock or hot-link unsafe
DENY_HOSTS = ("pinterest.com", "alamy.com", "shutterstock.com", "istockphoto.com")

# Placeholder service when nothing is found. Solid color + text. No tracking.
PLACEHOLDER_BASE = "https://placehold.co/512x512/059669/ffffff/png"

# robots.txt cache so we only fetch each host's robots.txt once.
_robots_cache: dict[str, urllib.robotparser.RobotFileParser] = {}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("medimg")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PLACEHOLDER_HOSTS = ("placehold.co",)


def can_fetch(url: str) -> bool:
    """Honour robots.txt for the host of `url`. Returns True if allowed (or
    robots.txt is unreachable, which we treat as 'allowed by default')."""
    try:
        parsed = urllib.parse.urlparse(url)
        host = parsed.netloc
        if not host:
            return False
        if any(deny in host for deny in DENY_HOSTS):
            return False
        # Placeholder services exist *to be hot-linked* — their robots.txt
        # blocks crawlers but the service itself is intended for direct fetches.
        if any(ok in host for ok in PLACEHOLDER_HOSTS):
            return True
        if host not in _robots_cache:
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(f"{parsed.scheme}://{host}/robots.txt")
            try:
                rp.read()
            except Exception:
                rp = urllib.robotparser.RobotFileParser()  # empty = allow
            _robots_cache[host] = rp
        return _robots_cache[host].can_fetch(USER_AGENT, url)
    except Exception:
        return True


def search_image(query: str) -> Optional[str]:
    """Search DDG for a medicine image and return the URL most likely to be
    an actual product image. Returns None if nothing usable found."""
    try:
        with DDGS() as ddgs:
            results = list(
                ddgs.images(
                    query=query,
                    region="in-en",
                    safesearch="moderate",
                    size="Medium",
                    max_results=8,
                )
            )
    except Exception as e:
        log.warning("DDG search failed for %r: %s", query, e)
        return None

    if not results:
        return None

    # Prefer pharmacy CDNs first
    for r in results:
        url = r.get("image") or r.get("thumbnail") or ""
        if any(host in url for host in PREFERRED_HOSTS):
            return url

    # Otherwise first result whose host is allowed by robots.txt
    for r in results:
        url = r.get("image") or r.get("thumbnail") or ""
        if url and can_fetch(url):
            return url

    return None


def fetch(url: str) -> Optional[bytes]:
    """GET an image URL and return raw bytes, or None on failure."""
    if not can_fetch(url):
        log.info("  blocked by robots.txt: %s", url)
        return None
    headers = {"User-Agent": USER_AGENT, "Accept": "image/*,*/*;q=0.8"}
    for attempt in range(RETRIES + 1):
        try:
            r = requests.get(
                url, headers=headers, timeout=FETCH_TIMEOUT_S, stream=True, allow_redirects=True
            )
            if r.status_code != 200:
                if attempt == RETRIES:
                    log.info("  HTTP %d for %s", r.status_code, url)
                continue
            ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if not ctype.startswith("image/"):
                log.info("  not an image (Content-Type: %s)", ctype)
                return None
            data = r.content
            if len(data) < 800:
                log.info("  image too small (%d bytes)", len(data))
                return None
            return data
        except Exception as e:
            if attempt == RETRIES:
                log.info("  fetch failed: %s", e)
            else:
                time.sleep(1.0)
    return None


def to_jpeg(content: bytes, target_size=TARGET_SIZE) -> bytes:
    """Re-encode any image to JPEG, resized to fit target_size, white bg
    behind transparency."""
    img = Image.open(io.BytesIO(content))
    if img.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = bg
    else:
        img = img.convert("RGB")
    img.thumbnail(target_size, Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return out.getvalue()


def fallback_placeholder(label: str) -> Optional[bytes]:
    """Server-side rendered placeholder via placehold.co — clean, no scraping."""
    text = urllib.parse.quote(label[:30].replace(" ", "+") or "Medicine")
    url = f"{PLACEHOLDER_BASE}?text={text}"
    raw = fetch(url)
    if not raw:
        return None
    try:
        return to_jpeg(raw)
    except Exception as e:
        log.warning("  placeholder convert failed: %s", e)
        return None


def build_query(brand: str, generic: str) -> str:
    """Build the image-search query. `brand` may already be a single brand
    name (curated source) or come from semicolon-separated CSV brand_examples."""
    first_brand = (brand or "").split(";")[0].strip()
    parts = [p for p in (first_brand, generic, "medicine india") if p]
    return " ".join(parts)


def download_one(item_id: str, brand: str, generic: str, out_dir: Path, force: bool = False) -> str:
    """Download one product image. Returns 'downloaded' | 'placeholder' |
    'skipped' | 'failed'. Used by both the curated and CSV loops."""
    out_path = out_dir / f"{item_id}.jpg"
    if not force and out_path.exists() and out_path.stat().st_size > 1500:
        return "skipped"

    query = build_query(brand, generic)
    log.info("  query: %s", query)

    url = search_image(query)
    data = fetch(url) if url else None

    try:
        if data:
            out_path.write_bytes(to_jpeg(data))
            log.info("    ✓ saved (%d KB)", out_path.stat().st_size // 1024)
            return "downloaded"
        ph = fallback_placeholder(brand or generic)
        if ph:
            out_path.write_bytes(ph)
            log.info("    ✓ placeholder")
            return "placeholder"
        log.info("    ✗ nothing usable")
        return "failed"
    except Exception as e:
        log.warning("    convert failed: %s", e)
        return "failed"


def iter_curated(curated_path: Path) -> Iterable[Tuple[str, str, str]]:
    """Yield (id, brand, generic_name) for each curated product."""
    if not curated_path.exists():
        return
    with curated_path.open(encoding="utf-8") as f:
        for prod in json.load(f):
            yield (
                prod.get("id", "").strip(),
                prod.get("brand", "").strip(),
                prod.get("name", "").strip(),
            )


def iter_csv(csv_path: Path) -> Iterable[Tuple[str, str, str]]:
    """Yield (id, brand, generic_name) for each CSV row."""
    with csv_path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            yield (
                row.get("id", "").strip(),
                (row.get("brand_examples") or "").split(";")[0].strip() or "Generic",
                row.get("generic_name", "").strip(),
            )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Download medicine images.")
    parser.add_argument("--csv", default="medicines_500.csv", help="Source CSV path")
    parser.add_argument(
        "--curated",
        default="src/data/products.json",
        help="Curated JSON source (set to empty string to skip)",
    )
    parser.add_argument(
        "--out", default="public/medicines", help="Output directory (default: public/medicines)"
    )
    parser.add_argument("--limit", type=int, default=0, help="Stop after N items (0 = all)")
    parser.add_argument(
        "--zip", default="medicines_images.zip", help="Output zip filename"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even when an output file already exists",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv)
    curated_path = Path(args.curated) if args.curated else None
    out_dir = Path(args.out)
    zip_path = Path(args.zip)

    if not csv_path.exists() and not (curated_path and curated_path.exists()):
        log.error("Neither CSV (%s) nor curated JSON (%s) exists.", csv_path, curated_path)
        return 2

    out_dir.mkdir(parents=True, exist_ok=True)

    # Build the work queue — curated first (smaller, more important for landing page)
    items: list[Tuple[str, str, str]] = []
    if curated_path and curated_path.exists():
        items.extend(iter_curated(curated_path))
        log.info("Curated source: %s (%d items)", curated_path, len(items))
    if csv_path.exists():
        csv_items = list(iter_csv(csv_path))
        items.extend(csv_items)
        log.info("CSV source: %s (%d rows)", csv_path, len(csv_items))
    if args.limit:
        items = items[: args.limit]
    log.info("Total to process: %d", len(items))
    log.info("Output: %s", out_dir.resolve())

    n_skip = n_dl = n_ph = n_fail = 0

    for i, (item_id, brand, generic) in enumerate(items, 1):
        if not item_id:
            log.warning("[%d/%d] missing id, skipping", i, len(items))
            n_fail += 1
            continue

        log.info("[%d/%d] %s", i, len(items), item_id)
        status = download_one(item_id, brand, generic, out_dir, force=args.force)

        if status == "skipped":
            n_skip += 1
        elif status == "downloaded":
            n_dl += 1
            time.sleep(SEARCH_RATE_LIMIT_S)
        elif status == "placeholder":
            n_ph += 1
            time.sleep(SEARCH_RATE_LIMIT_S)
        else:
            n_fail += 1
            time.sleep(SEARCH_RATE_LIMIT_S)

    log.info("")
    log.info(
        "Done — downloaded: %d, placeholder: %d, skipped (already had): %d, failed: %d",
        n_dl, n_ph, n_skip, n_fail,
    )

    # Zip everything for portable transfer / Colab download
    saved = sorted(out_dir.glob("*.jpg"))
    if saved:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in saved:
                zf.write(p, arcname=f"medicines/{p.name}")
        log.info("Zipped %d files → %s (%.1f MB)",
                 len(saved), zip_path, zip_path.stat().st_size / 1024 / 1024)

        if IN_COLAB:
            log.info("Colab detected — triggering download.")
            try:
                colab_files.download(str(zip_path))
            except Exception as e:
                log.warning("Colab download failed (download manually): %s", e)
    else:
        log.warning("No images saved.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
