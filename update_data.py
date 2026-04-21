#!/usr/bin/env python3
"""
NDC Transport Tracker - Data Processing Script
Processes the GIZ-SLOCAT Excel database and generates:
  - data/processed/data.json
"""

import json
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

import openpyxl


# ============================================================================
# Helpers
# ============================================================================

def get_gen(version):
    """Map a version string like 'NDC 2.1' to 'gen1' / 'gen2' / 'gen3'."""
    v = str(version).strip()
    if v.startswith("NDC 1"): return "gen1"
    if v.startswith("NDC 2"): return "gen2"
    if v.startswith("NDC 3"): return "gen3"
    return None


# ============================================================================
# Main processing
# ============================================================================

def process_excel(excel_path):
    print("📊  Opening Excel file…")
    wb = openpyxl.load_workbook(excel_path, data_only=True, read_only=True)

    doc_sheet = wb["Document"]
    mit_sheet = wb["Mitigation"]

    EU_STATUSES = {"Covered by EU", "Covered by EU archived"}

    # Column positions (1-indexed → 0-indexed below)
    # Document sheet
    D_DOCID     = 0
    D_CODE      = 1
    D_NAME      = 2
    D_TYPE      = 4
    D_VERSION   = 7
    D_STATUS    = 9
    D_TRANSPORT = 10
    D_REGION    = 25

    # Mitigation sheet
    M_DOCID    = 0
    M_CODE     = 1
    M_VERSION  = 6
    M_CATEGORY = 9

    # ── Pass 1: Document sheet ─────────────────────────────────────────
    country_master = {}   # iso3 -> {name, region}
    doc_id_info    = {}   # doc_id -> {code, gen, status}

    for row in doc_sheet.iter_rows(min_row=2, values_only=True):
        if not row[D_DOCID]: break

        doc_id  = row[D_DOCID]
        code    = row[D_CODE]
        name    = row[D_NAME]
        dtype   = row[D_TYPE]
        version = row[D_VERSION]
        status  = row[D_STATUS]
        has_t   = row[D_TRANSPORT]
        region  = row[D_REGION]

        if dtype != "NDC" or not code or not version: continue
        if status in EU_STATUSES: continue

        gen = get_gen(version)
        if not gen: continue

        code   = str(code).strip()
        status = str(status).strip()

        if code not in country_master:
            country_master[code] = {
                "name":   str(name).strip() if name else code,
                "region": str(region).strip() if region else "Unknown",
            }

        doc_id_info[doc_id] = {
            "code":   code,
            "gen":    gen,
            "status": status,
        }

    print(f"   ✓ {len(country_master)} countries, {len(doc_id_info)} NDC documents")

    # ── Derive latest active doc per country ───────────────────────────
    GEN_PRIORITY = {"gen1": 1, "gen2": 2, "gen3": 3}
    country_best = {}  # code -> (priority, doc_id)

    for doc_id, info in doc_id_info.items():
        if info["status"] != "Active": continue
        code = info["code"]
        prio = GEN_PRIORITY[info["gen"]]
        if code not in country_best or prio > country_best[code][0]:
            country_best[code] = (prio, doc_id)

    latest_doc_ids = {v[1] for v in country_best.values()}
    latest_gen_map = {
        code: ["gen1", "gen2", "gen3"][prio - 1]
        for code, (prio, _) in country_best.items()
    }

    # ── Per-gen active/archived COUNTRY counts ─────────────────────────
    gen_active_codes   = {g: set() for g in ["gen1", "gen2", "gen3"]}
    gen_archived_codes = {g: set() for g in ["gen1", "gen2", "gen3"]}

    for info in doc_id_info.values():
        code = info["code"]; gen = info["gen"]
        if info["status"] == "Active":
            gen_active_codes[gen].add(code)
        else:
            gen_archived_codes[gen].add(code)

    gen_counts = {
        g: {
            "active":   len(gen_active_codes[g]),
            "archived": len(gen_archived_codes[g]),
        }
        for g in ["gen1", "gen2", "gen3"]
    }
    gen_counts["latest"] = {"active": len(latest_doc_ids), "archived": 0}

    print(f"   ✓ gen_counts: { {g: gen_counts[g] for g in ['gen1','gen2','gen3']} }")

    # ── TAB 1: per-generation stats + per-country data ─────────────────
    print("🔄  Computing Tab 1 data…")

    gen_submitted  = {g: set() for g in ["gen1", "gen2", "gen3"]}
    gen_transport  = {g: set() for g in ["gen1", "gen2", "gen3"]}
    gen_reg_sub    = {g: defaultdict(set) for g in ["gen1", "gen2", "gen3"]}
    gen_reg_tra    = {g: defaultdict(set) for g in ["gen1", "gen2", "gen3"]}
    countries_tab1 = {}

    for row in doc_sheet.iter_rows(min_row=2, values_only=True):
        if not row[D_DOCID]: break

        code    = row[D_CODE]
        dtype   = row[D_TYPE]
        version = row[D_VERSION]
        status  = row[D_STATUS]
        has_t   = row[D_TRANSPORT]
        region  = row[D_REGION]

        if dtype != "NDC" or not code or not version: continue
        if status in EU_STATUSES: continue

        gen = get_gen(version)
        if not gen: continue

        code    = str(code).strip()
        has_t_b = str(has_t).strip().lower() == "yes"
        region  = str(region).strip() if region else "Unknown"

        gen_submitted[gen].add(code)
        gen_reg_sub[gen][region].add(code)
        if has_t_b:
            gen_transport[gen].add(code)
            gen_reg_tra[gen][region].add(code)

        if code not in countries_tab1:
            countries_tab1[code] = {
                "iso3":                 code,
                "name":                 country_master[code]["name"],
                "region":               country_master[code]["region"],
                "latest_active_gen":    latest_gen_map.get(code),
                "latest_has_transport": None,
                "generations":          {},
            }

        gd = countries_tab1[code]["generations"]
        if gen not in gd:
            gd[gen] = {"has_transport": has_t_b, "version": str(version).strip()}
        elif has_t_b:
            gd[gen]["has_transport"] = True

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
        regions_out = {
            reg: {
                "total":          len(codes),
                "with_transport": len(gen_reg_tra[gen].get(reg, set())),
            }
            for reg, codes in gen_reg_sub[gen].items()
        }
        tab1_generations[gen] = {
            **GEN_META[gen],
            "total_submitted": len(gen_submitted[gen]),
            "with_transport":  len(gen_transport[gen]),
            "regions":         regions_out,
        }

    print(f"   ✓ Tab1 built for {len(countries_tab1)} countries")

    # ── TAB 2: mitigation measures ─────────────────────────────────────
    print("🔄  Computing Tab 2 data…")

    # cat_lgb[cat] = {gen1_count, gen2_count, gen3_count, mentions}
    # (for latest active bars — breakdown by gen)
    cat_lgb = {}

    # cat_gen_aa[gen][cat] = {active_countries, archived_countries, active_mentions, archived_mentions}
    cat_gen_aa = {g: {} for g in ["gen1", "gen2", "gen3"]}

    # For cat_gen_aa we need sets during processing
    cat_gen_aa_sets = {
        g: defaultdict(lambda: {
            "active_c": set(), "archived_c": set(),
            "active_m": 0,     "archived_m": 0,
        })
        for g in ["gen1", "gen2", "gen3"]
    }

    # cat_lgb gen sets (for counting unique countries)
    cat_lgb_sets = defaultdict(lambda: {
        "gen1": set(), "gen2": set(), "gen3": set(), "mentions": 0
    })

    # country_gen_cats[code][gen][cat] = count  (for map)
    country_gen_cats = {}

    # country_latest_cats[code][cat] = count  (for latest active map)
    country_latest_cats = {}

    for row in mit_sheet.iter_rows(min_row=2, values_only=True):
        if not row[M_DOCID]: break

        doc_id   = row[M_DOCID]
        code     = row[M_CODE]
        version  = row[M_VERSION]
        category = row[M_CATEGORY]

        if not category or not code or not version or not doc_id: continue
        if doc_id not in doc_id_info: continue

        code = str(code).strip()
        cat  = str(category).strip()
        gen  = get_gen(version)
        if not gen: continue

        info   = doc_id_info[doc_id]
        status = info["status"]

        # ── Latest active ──────────────────────────────────────────────
        if doc_id in latest_doc_ids:
            lat_gen = latest_gen_map.get(code)
            if lat_gen:
                cat_lgb_sets[cat][lat_gen].add(code)
                cat_lgb_sets[cat]["mentions"] += 1

            # country_latest_cats
            if code not in country_latest_cats:
                country_latest_cats[code] = {}
            country_latest_cats[code][cat] = country_latest_cats[code].get(cat, 0) + 1

        # ── Per gen active/archived ────────────────────────────────────
        s = cat_gen_aa_sets[gen][cat]
        if status == "Active":
            s["active_c"].add(code)
            s["active_m"] += 1
        else:
            s["archived_c"].add(code)
            s["archived_m"] += 1

        # ── country_gen_cats ───────────────────────────────────────────
        if code not in country_gen_cats:
            country_gen_cats[code] = {}
        if gen not in country_gen_cats[code]:
            country_gen_cats[code][gen] = {}
        country_gen_cats[code][gen][cat] = \
            country_gen_cats[code][gen].get(cat, 0) + 1

    # Serialize sets → counts
    cat_lgb_out = {
        cat: {
            "gen1_count": len(v["gen1"]),
            "gen2_count": len(v["gen2"]),
            "gen3_count": len(v["gen3"]),
            "mentions":   v["mentions"],
        }
        for cat, v in cat_lgb_sets.items()
    }

    cat_gen_aa_out = {
        gen: {
            cat: {
                "active_countries":   len(s["active_c"]),
                "archived_countries": len(s["archived_c"]),
                "active_mentions":    s["active_m"],
                "archived_mentions":  s["archived_m"],
            }
            for cat, s in cats.items()
        }
        for gen, cats in cat_gen_aa_sets.items()
    }

    # categories_latest (for backwards compat)
    categories_latest = {}
    for cat, v in cat_lgb_sets.items():
        total_countries = v["gen1"] | v["gen2"] | v["gen3"]
        categories_latest[cat] = {
            "countries_count": len(total_countries),
            "mentions":        v["mentions"],
        }

    print(f"   ✓ Tab2 built: {len(cat_lgb_out)} categories")

    # ── Assemble final output ──────────────────────────────────────────
    output = {
        "metadata": {
            "total_possible_ndcs": 169,
            "last_updated":        str(date.today()),
            "data_source":         "GIZ-SLOCAT Transport Tracker Database",
            "gen_counts":          gen_counts,
        },
        "tab1": {
            "generations": tab1_generations,
            "countries":   countries_tab1,
        },
        "tab2": {
            "categories_latest":         categories_latest,
            "cat_latest_gen_breakdown":  cat_lgb_out,
            "cat_gen_active_archived":   cat_gen_aa_out,
            "country_gen_cats":          country_gen_cats,
            "country_latest_cats":       country_latest_cats,
            "latest_gen_map":            latest_gen_map,
        },
    }

    wb.close()
    return output


# ============================================================================
# Entry point
# ============================================================================

def main():
    print("=" * 70)
    print("🚀  NDC Transport Tracker — Data Update")
    print("=" * 70)

    data_dir    = Path("data")
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

    json_path = output_dir / "data.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n💾  data.json saved ({json_path.stat().st_size:,} bytes)")
    print("\n" + "=" * 70)
    print("✅  Done!")
    print(f"   Countries:  {len(data['tab1']['countries'])}")
    print(f"   Categories: {len(data['tab2']['categories_latest'])}")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
