#!/usr/bin/env python3
"""
GIZ-SLOCAT Transport Tracker — Database Fetcher (Option B: CKAN API)

Downloads the latest database Excel from the Transport Data Commons CKAN
instance and saves it as data/GIZ-SLOCAT_Transport-Tracker-database.xlsx,
ready for pipeline/update_data.py.

How it works (standard CKAN flow):
  1. GET  {CKAN_BASE}/api/action/resource_show?id={RESOURCE_ID}
     → JSON: { "success": true, "result": { "url": "...", "last_modified": ... } }
  2. Download result["url"] (the actual .xlsx file)
  3. Validate it opens with openpyxl before replacing anything

Resilience:
  - Any failure (network, API change, invalid file) leaves the existing
    Excel in data/ untouched and exits non-zero, so a scheduled run that
    fails simply keeps serving the last good data.

Usage:
    python pipeline/fetch_database.py            # download via API
    python pipeline/fetch_database.py --check    # only print API metadata

Configuration: edit the two constants below, or override with the
environment variables CKAN_BASE / CKAN_RESOURCE_ID.
"""

import json
import os
import sys
import tempfile
import urllib.request
from pathlib import Path

CKAN_BASE = os.environ.get(
    "CKAN_BASE", "https://ckan.tdc.prod.datopian.com")
RESOURCE_ID = os.environ.get(
    "CKAN_RESOURCE_ID", "d8b96248-2379-4c64-bf02-7a8a57757347")

DEST = Path("data/GIZ-SLOCAT_Transport-Tracker-database.xlsx")
UA = {"User-Agent": "GIZ-SLOCAT-Transport-Tracker-pipeline/1.0"}


def api(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    show_url = f"{CKAN_BASE}/api/action/resource_show?id={RESOURCE_ID}"
    print(f"🔌  CKAN resource_show: {show_url}")
    try:
        meta = api(show_url)
    except Exception as exc:
        print(f"❌  API request failed: {exc}")
        print("    Keeping the existing local Excel (Option A fallback).")
        return 1

    if not meta.get("success"):
        print(f"❌  API returned success=false: {meta.get('error')}")
        return 1

    res = meta["result"]
    file_url = res.get("url")
    print(f"    name:          {res.get('name')}")
    print(f"    format:        {res.get('format')}")
    print(f"    last_modified: {res.get('last_modified')}")
    print(f"    url:           {file_url}")

    if "--check" in sys.argv:
        return 0
    if not file_url:
        print("❌  Resource has no download URL.")
        return 1

    print("⬇️   Downloading database …")
    try:
        req = urllib.request.Request(file_url, headers=UA)
        with urllib.request.urlopen(req, timeout=300) as r, \
                tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
            tmp.write(r.read())
            tmp_path = Path(tmp.name)
    except Exception as exc:
        print(f"❌  Download failed: {exc}")
        return 1

    # Validate before replacing the committed file
    try:
        import openpyxl
        wb = openpyxl.load_workbook(tmp_path, read_only=True)
        sheets = set(wb.sheetnames)
        wb.close()
        required = {"Document", "Mitigation", "Targets", "Country"}
        missing = required - sheets
        if missing:
            print(f"❌  Downloaded file is missing sheets: {missing}")
            tmp_path.unlink()
            return 1
    except Exception as exc:
        print(f"❌  Downloaded file is not a valid tracker database: {exc}")
        tmp_path.unlink(missing_ok=True)
        return 1

    DEST.parent.mkdir(parents=True, exist_ok=True)
    tmp_path.replace(DEST)
    print(f"✅  Database saved → {DEST} ({DEST.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
