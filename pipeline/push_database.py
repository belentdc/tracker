#!/usr/bin/env python3
"""
GIZ-SLOCAT Transport Tracker — Database Pusher (CKAN API)

The reverse of fetch_database.py: uploads the current
data/GIZ-SLOCAT_Transport-Tracker-database.xlsx as a resource on the
Transport Data Commons (TDC) portal, so the TDC dataset entry always
mirrors the latest Excel used by this pipeline.

How it works (standard CKAN flow):
  1. GET  {CKAN_BASE}/api/action/package_show?id={DATASET_ID}
     → find the resource (if any) that already holds our Excel, by format
       and name, so we update it in place instead of piling up duplicates.
  2. If a matching resource exists: POST resource_update (multipart, new
     file replaces the old one, same resource_id — download URL and any
     existing citations to it stay valid).
     If not: POST resource_create (first-time upload).
  3. Print the resulting resource id/url so it can be pinned in
     .env / CI secrets for next time.

Authentication:
  Requires a CKAN API token with write access to DATASET_ID, passed via
  the CKAN_API_TOKEN environment variable. NEVER hardcode a token in this
  file or commit one to the repo — tokens pasted into chat, docs, or
  commits should be treated as compromised and revoked immediately from
  the TDC portal (your user icon → API Tokens).

Resilience:
  This step is intentionally non-fatal: if TDC is unreachable (e.g. the
  GIZ corporate proxy blocks the domain) or the API call fails, this
  script prints a warning and exits non-zero, but is designed to be
  called as an optional last step so it never blocks the rest of the
  pipeline (profiles, dashboards, widget) from building successfully.

Usage:
    export CKAN_API_TOKEN="..."          # required
    python pipeline/push_database.py

    # first run only, or if the resource was deleted on the TDC side:
    python pipeline/push_database.py --create

Configuration: edit the constants below, or override with environment
variables CKAN_BASE / CKAN_DATASET_ID / CKAN_API_TOKEN.
"""

import os
import sys
from pathlib import Path

CKAN_BASE = os.environ.get(
    "CKAN_BASE", "https://ckan.tdc.prod.datopian.com")

# The dataset's "Name" (slug) as set on the TDC portal — NOT the Title.
# Update this once the dataset is created/renamed on the portal.
CKAN_DATASET_ID = os.environ.get(
    "CKAN_DATASET_ID", "ndc-transport-tracker")

# Resource file name shown on the TDC "Downloads" tab. Used to find the
# existing resource to update, so re-runs replace it instead of
# duplicating it.
RESOURCE_NAME = "GIZ-SLOCAT Transport Tracker database (Excel)"

SRC = Path("data/GIZ-SLOCAT_Transport-Tracker-database.xlsx")
UA = {"User-Agent": "GIZ-SLOCAT-Transport-Tracker-pipeline/1.0"}


def main():
    token = os.environ.get("CKAN_API_TOKEN")
    if not token:
        print("❌  CKAN_API_TOKEN environment variable not set.")
        print("    Get one from portal.transport-data.org → your profile → API Tokens.")
        print("    Never hardcode it in this file or commit it — export it in your")
        print("    shell session, or store it as a GitHub Actions secret for CI.")
        return 1

    if not SRC.exists():
        print(f"❌  Source file not found: {SRC}")
        return 1

    try:
        import requests
    except ImportError:
        print("❌  The 'requests' package is required for this script.")
        print("    pip install -r requirements.txt")
        return 1

    headers = {"Authorization": token, **UA}

    # ── Find the existing resource, if any ────────────────────────────
    print(f"🔌  Looking up dataset '{CKAN_DATASET_ID}' on {CKAN_BASE} …")
    try:
        r = requests.get(
            f"{CKAN_BASE}/api/action/package_show",
            params={"id": CKAN_DATASET_ID}, headers=headers, timeout=60)
        r.raise_for_status()
        meta = r.json()
    except Exception as exc:
        print(f"❌  Could not reach TDC / dataset not found: {exc}")
        print("    If this is the first push, create the dataset on the portal")
        print("    first (Title/Name/Organisation/Description), then re-run this")
        print("    script with --create to add the first Excel resource to it.")
        return 1

    if not meta.get("success"):
        print(f"❌  API returned success=false: {meta.get('error')}")
        return 1

    existing = None
    for res in meta["result"].get("resources", []):
        if res.get("name") == RESOURCE_NAME:
            existing = res
            break

    # ── Upload ───────────────────────────────────────────────────────
    with open(SRC, "rb") as f:
        file_bytes = f.read()
    print(f"⬆️   Uploading {SRC} ({len(file_bytes):,} bytes) …")

    files = {
        "upload": (
            "GIZ-SLOCAT_Transport-Tracker-database.xlsx",
            file_bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }

    try:
        if existing and "--create" not in sys.argv:
            print(f"    Updating existing resource {existing['id']} …")
            r = requests.post(
                f"{CKAN_BASE}/api/action/resource_update",
                data={"id": existing["id"], "name": RESOURCE_NAME},
                files=files, headers=headers, timeout=300)
        else:
            print("    Creating a new resource …")
            r = requests.post(
                f"{CKAN_BASE}/api/action/resource_create",
                data={"package_id": CKAN_DATASET_ID, "name": RESOURCE_NAME,
                      "format": "XLSX"},
                files=files, headers=headers, timeout=300)
        r.raise_for_status()
        result = r.json()
    except Exception as exc:
        print(f"❌  Upload failed: {exc}")
        return 1

    if not result.get("success"):
        print(f"❌  API returned success=false: {result.get('error')}")
        return 1

    res = result["result"]
    print(f"✅  Resource live → {CKAN_BASE.replace('ckan.', '').replace('.prod.datopian.com', '')}"
          f"/dataset/{CKAN_DATASET_ID}")
    print(f"    resource_id: {res.get('id')}")
    print(f"    last_modified: {res.get('last_modified') or res.get('created')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
