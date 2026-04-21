#!/usr/bin/env python3
"""
NDC Transport Tracker - Data Processing Script
Processes the GIZ-SLOCAT Excel database and generates:
  - data/processed/data.json
  - data/processed/countries.geojson   (world map polygons with ISO-3 codes)
"""

import json
import subprocess
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

import openpyxl


# ============================================================================
# Helpers
# ============================================================================

def get_gen(version: str) -> str | None:
    """Map a version string like 'NDC 2.1' to 'gen1' / 'gen2' / 'gen3'."""
    v = str(version).strip()
    if v.startswith("NDC 1"):
        return "gen1"
    if v.startswith("NDC 2"):
        return "gen2"
    if v.startswith("NDC 3"):
        return "gen3"
    return None


# ============================================================================
# Main processing
# ============================================================================

def process_excel(excel_path: Path) -> dict:
    print("📊  Opening Excel file…")
    wb = openpyxl.load_workbook(excel_path, data_only=True, read_only=True)

    doc_sheet = wb["Document"]
    mit_sheet = wb["Mitigation"]

    # ---- Column positions (1-indexed) --------------------------------
    # Document sheet
    D_DOCID    = 1
    D_CODE     = 2
    D_NAME     = 3
    D_TYPE     = 5
    D_VERSION  = 8
    D_STATUS   = 10
    D_TRANSPORT= 11   # "yes" / "no"
    D_REGION   = 26

    # Mitigation sheet
    M_DOCID    = 1
    M_CODE     = 2
    M_VERSION  = 7
    M_CATEGORY = 10

    EU_STATUSES = {"Covered by EU", "Covered by EU archived"}

    # ------------------------------------------------------------------
    # Pass 1: build country master + NDC row list from Document sheet
    # ------------------------------------------------------------------
    country_master = {}   # iso3 -> {name, region}
    ndc_rows       = []   # list of dicts
    doc_id_info    = {}   # doc_id -> {code, gen, status}

    for row in doc_sheet.iter_rows(min_row=2, values_only=True):
        if not row[0]:
            break
        doc_id  = row[D_DOCID  - 1]
        code    = row[D_CODE   - 1]
        name    = row[D_NAME   - 1]
        dtype   = row[D_TYPE   - 1]
        version = row[D_VERSION- 1]
        status  = row[D_STATUS - 1]
        has_t   = row[D_TRANSPORT - 1]
        region  = row[D_REGION - 1]

        if dtype != "NDC" or not code or not version:
            continue
        if status in EU_STATUSES:
            continue

        gen = get_gen(version)
        if not gen:
            continue

        code    = str(code).strip()
        status  = str(status).strip()
        has_t_b = str(has_t).strip().lower() == "yes"

        if code not in country_master:
            country_master[code] = {
                "name":   str(name).strip() if name else code,
                "region": str(region).strip() if region else "Unknown",
            }

        ndc_rows.append({
            "doc_id":        doc_id,
            "code":          code,
            "version":       str(version).strip(),
            "status":        status,
            "has_transport": has_t_b,
            "region":        str(region).strip() if region else "Unknown",
            "gen":           gen,
        })

        doc_id_info[doc_id] = {"code": code, "gen": gen, "status": status}

    print(f"   ✓ {len(country_master)} countries, {len(ndc_rows)} NDC rows")

    # ------------------------------------------------------------------
    # Derive latest active doc per country (highest gen, Active status)
    # ------------------------------------------------------------------
    GEN_PRIORITY = {"gen1": 1, "gen2": 2, "gen3": 3}
    country_best_doc = {}   # code -> (priority, doc_id)

    for doc_id, info in doc_id_info.items():
        if info["status"] != "Active":
            continue
        code  = info["code"]
        prio  = GEN_PRIORITY[info["gen"]]
        if code not in country_best_doc or prio > country_best_doc[code][0]:
            country_best_doc[code] = (prio, doc_id)

    latest_active_doc_ids = {v[1] for v in country_best_doc.values()}
    latest_active_gen_map = {
        code: ["gen1", "gen2", "gen3"][prio - 1]
        for code, (prio, _) in country_best_doc.items()
    }

    # ------------------------------------------------------------------
    # TAB 1: per-generation stats + per-country data
    # ------------------------------------------------------------------
    print("🔄  Computing Tab 1 data…")

    gen_submitted   = {g: set() for g in ["gen1", "gen2", "gen3"]}
    gen_transport   = {g: set() for g in ["gen1", "gen2", "gen3"]}
    gen_reg_sub     = {g: defaultdict(set) for g in ["gen1", "gen2", "gen3"]}
    gen_reg_tra     = {g: defaultdict(set) for g in ["gen1", "gen2", "gen3"]}
    countries_tab1  = {}

    for r in ndc_rows:
        code, gen, region = r["code"], r["gen"], r["region"]

        gen_submitted[gen].add(code)
        gen_reg_sub[gen][region].add(code)
        if r["has_transport"]:
            gen_transport[gen].add(code)
            gen_reg_tra[gen][region].add(code)

        if code not in countries_tab1:
            countries_tab1[code] = {
                "iso3":               code,
                "name":               country_master[code]["name"],
                "region":             country_master[code]["region"],
                "latest_active_gen":  latest_active_gen_map.get(code),
                "latest_has_transport": None,
                "generations":        {},
            }

        gd = countries_tab1[code]["generations"]
        if gen not in gd:
            gd[gen] = {"has_transport": r["has_transport"], "version": r["version"]}
        elif r["has_transport"]:
            gd[gen]["has_transport"] = True   # any 'yes' row wins

    # Fill latest_has_transport
    for code, cd in countries_tab1.items():
        lat_gen = cd["latest_active_gen"]
        if lat_gen and lat_gen in cd["generations"]:
            cd["latest_has_transport"] = cd["generations"][lat_gen]["has_transport"]

    GEN_META = {
        "gen1": {"name": "First Generation",  "period": "2015–2019"},
        "gen2": {"name": "Second Generation", "period": "2020–2024"},
        "gen3": {"name": "Third Generation",  "period": "2024–ongoing"},
    }

    tab1_generations = {}
    for gen in ["gen1", "gen2", "gen3"]:
        regions_out = {}
        for reg, codes in gen_reg_sub[gen].items():
            regions_out[reg] = {
                "total":         len(codes),
                "with_transport": len(gen_reg_tra[gen].get(reg, set())),
            }
        tab1_generations[gen] = {
            **GEN_META[gen],
            "total_submitted": len(gen_submitted[gen]),
            "with_transport":  len(gen_transport[gen]),
            "regions":         regions_out,
        }

    # ------------------------------------------------------------------
    # TAB 2: mitigation measures
    # ------------------------------------------------------------------
    print("🔄  Computing Tab 2 data…")

    cat_latest   = defaultdict(lambda: {"countries": set(), "mentions": 0})
    cat_by_gen   = {g: defaultdict(lambda: {"countries": set(), "mentions": 0})
                    for g in ["gen1", "gen2", "gen3"]}
    country_gen_cats = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    # country_gen_cats[code][gen][cat] = count

    for row in mit_sheet.iter_rows(min_row=2, values_only=True):
        if not row[0]:
            break
        doc_id   = row[M_DOCID    - 1]
        code     = row[M_CODE     - 1]
        version  = row[M_VERSION  - 1]
        category = row[M_CATEGORY - 1]

        if not category or not code or not version or not doc_id:
            continue
        if doc_id not in doc_id_info:
            continue   # not an NDC we track

        code = str(code).strip()
        cat  = str(category).strip()
        gen  = get_gen(version)
        if not gen:
            continue

        # Latest active
        if doc_id in latest_active_doc_ids:
            cat_latest[cat]["countries"].add(code)
            cat_latest[cat]["mentions"] += 1

        # By generation (all submitted, not just active)
        cat_by_gen[gen][cat]["countries"].add(code)
        cat_by_gen[gen][cat]["mentions"] += 1

        # Per-country per-gen (for region filtering in Tab 2)
        country_gen_cats[code][gen][cat] += 1

    print(f"   ✓ {len(cat_latest)} categories, "
          f"{sum(v['mentions'] for v in cat_latest.values()):,} latest-active mentions")

    # ------------------------------------------------------------------
    # Assemble output
    # ------------------------------------------------------------------
    output = {
        "metadata": {
            "total_possible_ndcs": 169,
            "last_updated":        str(date.today()),
            "data_source":         "GIZ-SLOCAT Transport Tracker Database",
        },
        "tab1": {
            "generations": tab1_generations,
            "countries":   countries_tab1,
        },
        "tab2": {
            "categories_latest": {
                cat: {
                    "countries_count": len(v["countries"]),
                    "mentions":        v["mentions"],
                }
                for cat, v in cat_latest.items()
            },
            "categories_by_generation": {
                gen: {
                    cat: {
                        "countries_count": len(v["countries"]),
                        "mentions":        v["mentions"],
                    }
                    for cat, v in cats.items()
                }
                for gen, cats in cat_by_gen.items()
            },
            "country_gen_cats": {
                code: {
                    gen: dict(cats)
                    for gen, cats in gens.items()
                }
                for code, gens in country_gen_cats.items()
            },
        },
    }

    wb.close()
    return output


# ============================================================================
# GeoJSON generation (requires R + rnaturalearthdata + sf)
# ============================================================================

def generate_geojson(output_path: Path) -> bool:
    """
    Generate a slimmed world GeoJSON using R's rnaturalearthdata package.
    Returns True on success, False if R / packages are unavailable.
    """
    r_script = r"""
suppressPackageStartupMessages({
  library(rnaturalearthdata)
  library(sf)
})
data(countries110)
slim <- countries110[, c("iso_a3", "name", "geometry")]
st_write(slim, commandArgs(trailingOnly=TRUE)[1], delete_dsn=TRUE, quiet=TRUE)
"""
    try:
        result = subprocess.run(
            ["Rscript", "--vanilla", "-e", r_script, str(output_path)],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            print(f"   ⚠  R error: {result.stderr[-300:]}")
            return False
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"   ⚠  R not available ({e}); skipping GeoJSON regeneration")
        return False

    # Fix known ISO-code issues in 110m Natural Earth data
    import json
    with open(output_path) as f:
        data = json.load(f)

    FIXES = {"Norway": "NOR", "France": "FRA"}
    for feat in data["features"]:
        if feat["properties"]["iso_a3"] == "-99":
            name = feat["properties"].get("name", "")
            if name in FIXES:
                feat["properties"]["iso_a3"] = FIXES[name]

    # Round coordinates to 3 dp to reduce file size
    def round_coords(coords):
        if isinstance(coords[0], (int, float)):
            return [round(c, 3) for c in coords]
        return [round_coords(c) for c in coords]

    for feat in data["features"]:
        geom = feat["geometry"]
        if geom:
            geom["coordinates"] = round_coords(geom["coordinates"])

    with open(output_path, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"   ✓ GeoJSON written ({output_path.stat().st_size:,} bytes, "
          f"{len(data['features'])} features)")
    return True


# ============================================================================
# Entry point
# ============================================================================

def main() -> int:
    print("=" * 70)
    print("🚀  NDC Transport Tracker — Data Update")
    print("=" * 70)

    data_dir = Path("data")
    excel_files = list(data_dir.glob("*.xlsx"))
    if not excel_files:
        print("❌  No .xlsx file found in data/")
        return 1

    excel_path = excel_files[0]
    print(f"\n📂  Excel file: {excel_path.name}")

    try:
        data = process_excel(excel_path)
    except Exception as exc:
        print(f"\n❌  Processing error: {exc}")
        raise

    output_dir = data_dir / "processed"
    output_dir.mkdir(exist_ok=True)

    # Save data.json
    json_path = output_dir / "data.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\n💾  data.json saved ({json_path.stat().st_size:,} bytes)")

    # Save / regenerate countries.geojson
    geo_path = output_dir / "countries.geojson"
    print("\n🗺   Generating countries.geojson…")
    ok = generate_geojson(geo_path)
    if not ok:
        if geo_path.exists():
            print("   ℹ  Keeping existing countries.geojson")
        else:
            print("   ⚠  countries.geojson not available — maps will not render")

    print("\n" + "=" * 70)
    print("✅  Done!")
    print(f"   Countries:  {len(data['tab1']['countries'])}")
    print(f"   Categories: {len(data['tab2']['categories_latest'])}")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
