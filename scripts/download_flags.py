#!/usr/bin/env python3
"""
Download all country flags once and commit them, so the profiles have no
external runtime dependency. Run locally (needs internet), then commit:

    python scripts/download_flags.py
    git add assets/flags && git commit -m "Self-host country flags"

The front end loads assets/flags/{iso2}.png first and only falls back to
flagcdn.com if a local file is missing.

Flag images: https://flagcdn.com (public domain).
"""

import json
import urllib.request
from pathlib import Path

OUT = Path("assets/flags")
INDEX = Path("profiles/data/countries/index.json")
SIZES = {"": "w160"}  # one size is enough; the <img> is rendered small


def main():
    if not INDEX.exists():
        print("Run update_data.py first — index.json not found.")
        return
    OUT.mkdir(parents=True, exist_ok=True)
    countries = json.loads(INDEX.read_text(encoding="utf-8"))["countries"]
    codes = sorted({c["iso2"] for c in countries if c.get("iso2")})
    ok = skip = fail = 0

    # GIZ corporate proxy
    proxy = urllib.request.ProxyHandler({'https': 'http://proxy.giz.de:83'})
    opener = urllib.request.build_opener(proxy)

    for iso2 in codes:
        dest = OUT / f"{iso2}.png"
        if dest.exists():
            skip += 1
            continue
        url = f"https://flagcdn.com/w160/{iso2}.png"
        try:
            with opener.open(url, timeout=20) as r:
                dest.write_bytes(r.read())
            ok += 1
            print(f"  ✓ {iso2}")
        except Exception as e:
            print(f"  ✗ {iso2}: {e}")
            fail += 1
    print(f"✅  Flags: {ok} downloaded, {skip} already present, {fail} failed → {OUT}/")


if __name__ == "__main__":
    main()