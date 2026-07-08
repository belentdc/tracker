#!/usr/bin/env python3
"""
Build the global search index and the Ask-the-Tracker question set.

Inputs (all already produced by update_data.py — run that first):
  data/processed/comparison-data.json   quotes, targets, measures per country
  profiles/data/countries/index.json    country list with slugs
  profiles/data/countries/<CODE>.json   documents (for LTS/BTR questions)

Outputs:
  data/processed/search-index.json      flat list of searchable entries
  data/processed/questions.json         precomputed guided answers

Both are static JSON consumed client-side (search/ and ask/), so the
tracker stays a pure GitHub Pages site with no backend.
"""

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
PROFILES = ROOT / "profiles" / "data" / "countries"

GEN_LABEL = {"gen1": "1st Generation", "gen2": "2nd Generation",
             "gen3": "3rd Generation"}


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def slugify(name):
    # Identical to pipeline/update_data.py so URLs match the static folders
    s = unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def profile_url(slug):
    # Relative from repo root; the client pages prefix as needed.
    return f"profiles/countries/{slug}/"


# ── Search index ─────────────────────────────────────────────────────────

def build_search_index(comparison, index_list):
    slug_by_code = {c["code"]: slugify(c["name"]) for c in index_list}
    name_by_code = {c["code"]: c["name"] for c in index_list}
    entries = []

    # Country names themselves are searchable
    for c in index_list:
        entries.append({
            "kind": "country",
            "code": c["code"],
            "country": c["name"],
            "text": c["name"],
            "url": profile_url(slug_by_code[c["code"]]),
        })

    for code, cdata in comparison["countries"].items():
        cname = cdata.get("country_name") or name_by_code.get(code, code)
        slug = slug_by_code.get(code)
        url = profile_url(slug) if slug else None
        for gen, docs in cdata.get("generations", {}).items():
            for doc in docs:
                meta = {
                    "code": code, "country": cname, "url": url,
                    "gen": GEN_LABEL.get(gen, gen),
                    "version": doc.get("version") or "",
                    "status": doc.get("status") or "",
                }
                for t in doc.get("targets", []):
                    entries.append({
                        "kind": "target", **meta,
                        "category": t.get("target_area") or "",
                        "text": t.get("content") or "",
                        "extra": " ".join(filter(None, [
                            t.get("target_scope"), t.get("target_type"),
                            t.get("conditionality"),
                            str(t.get("target_year") or "")])),
                    })
                for cat, ms in (doc.get("mitigation_measures") or {}).items():
                    for m in ms:
                        entries.append({
                            "kind": "measure", **meta,
                            "category": cat,
                            "text": m.get("quote") or "",
                            "extra": " ".join(filter(None, [
                                m.get("purpose"), m.get("instrument"),
                                m.get("asi"), m.get("modes")])),
                        })
                for cat, ms in (doc.get("adaptation_measures") or {}).items():
                    for m in ms:
                        entries.append({
                            "kind": "adaptation", **meta,
                            "category": cat,
                            "text": m.get("quote") or "",
                            "extra": " ".join(filter(None, [
                                m.get("measure"), m.get("modes")])),
                        })
    return entries


# ── Ask-the-Tracker questions ────────────────────────────────────────────

def _match(entries, kinds, pattern, active_only=True):
    """Countries whose entries of the given kinds match a regex."""
    rx = re.compile(pattern, re.IGNORECASE)
    hits = {}
    for e in entries:
        if e["kind"] not in kinds:
            continue
        if active_only and e.get("status") and e["status"].lower() != "active":
            continue
        hay = f"{e.get('text','')} {e.get('extra','')} {e.get('category','')}"
        if rx.search(hay):
            hits.setdefault(e["code"], {"code": e["code"],
                                        "country": e["country"],
                                        "url": e["url"], "n": 0})
            hits[e["code"]]["n"] += 1
    return sorted(hits.values(), key=lambda x: (-x["n"], x["country"]))


def build_questions(entries, index_list):
    def chip(code):
        c = next(x for x in index_list if x["code"] == code)
        return {"code": code, "country": c["name"],
                "url": profile_url(slugify(c["name"])), "n": None}

    questions = []

    q = _match(entries, {"target"}, r"conditional",)
    questions.append({
        "id": "conditional-targets",
        "question": "Which countries have conditional transport targets?",
        "note": "Targets whose classification or wording marks them as "
                "conditional (typically on international support or finance), "
                "in active documents.",
        "countries": q,
    })

    q = _match(entries, {"target"},
               r"Transport sector mitigation target")
    ghg = [c for c in q]  # refined below with GHG flag via extra text
    questions.append({
        "id": "transport-mitigation-targets",
        "question": "Which countries have transport mitigation targets in "
                    "active documents?",
        "note": "Countries with at least one target classified under "
                "'Transport sector mitigation target'.",
        "countries": ghg,
    })

    questions.append({
        "id": "net-zero",
        "question": "Which countries state a net zero target?",
        "note": "Targets classified as 'Net zero target' in active documents.",
        "countries": _match(entries, {"target"}, r"Net zero target"),
    })

    questions.append({
        "id": "gender",
        "question": "Which countries mention gender in transport content?",
        "note": "Keyword match on 'gender' across targets and measures "
                "in active documents.",
        "countries": _match(entries, {"target", "measure", "adaptation"},
                            r"\bgender\b"),
    })

    questions.append({
        "id": "freight",
        "question": "Which countries address freight?",
        "note": "Keyword match on freight-related terms across targets and "
                "measures in active documents.",
        "countries": _match(entries, {"target", "measure", "adaptation"},
                            r"\bfreight\b|\blogistics\b"),
    })

    questions.append({
        "id": "electric-mobility",
        "question": "Which countries include electric mobility measures?",
        "note": "Mitigation measures in the 'Electric mobility' category or "
                "mentioning electric vehicles, in active documents.",
        "countries": _match(entries, {"measure"},
                            r"electric mobility|electric vehicle|e-mobility|\bEVs?\b"),
    })

    questions.append({
        "id": "public-transport",
        "question": "Which countries commit to public transport measures?",
        "note": "Mitigation measures in public/collective transport "
                "categories or wording, in active documents.",
        "countries": _match(entries, {"measure"},
                            r"public transport|bus rapid transit|\bBRT\b|metro\b|collective transport"),
    })

    questions.append({
        "id": "adaptation",
        "question": "Which countries include transport adaptation measures?",
        "note": "Countries with at least one transport adaptation measure "
                "in active documents.",
        "countries": _match(entries, {"adaptation"}, r"."),
    })

    # Document-based questions straight from the profile index
    lts = sorted((chip(c["code"]) for c in index_list if c.get("has_lts")),
                 key=lambda x: x["country"])
    gen3 = sorted((chip(c["code"]) for c in index_list
                   if str(c.get("ndc_version", "")).startswith("NDC 3")),
                  key=lambda x: x["country"])

    questions.append({
        "id": "ndc3",
        "question": "Which countries have already submitted a 3rd generation NDC?",
        "note": "Countries with at least one NDC 3.x document in the database.",
        "countries": gen3,
    })
    questions.append({
        "id": "lts",
        "question": "Which countries have a Long-Term Strategy (LTS) in the tracker?",
        "note": "Countries with at least one LTS document recorded.",
        "countries": lts,
    })

    return questions


def main():
    comparison = load(PROCESSED / "comparison-data.json")
    index_list = load(PROFILES / "index.json")
    if isinstance(index_list, dict):
        index_list = index_list.get("countries", [])

    entries = build_search_index(comparison, index_list)
    out = {"generated": comparison.get("last_updated"),
           "count": len(entries), "entries": entries}
    (PROCESSED / "search-index.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8")
    print(f"🔎  search-index.json — {len(entries)} entries")

    questions = build_questions(entries, index_list)
    (PROCESSED / "questions.json").write_text(
        json.dumps({"generated": comparison.get("last_updated"),
                    "questions": questions},
                   ensure_ascii=False, indent=1),
        encoding="utf-8")
    n_ans = sum(len(q["countries"]) for q in questions)
    print(f"❓  questions.json — {len(questions)} questions, "
          f"{n_ans} country answers")

    # ── Category benchmarks ─────────────────────────────────────────
    # Global average emphasis per mitigation category: mean share of a
    # country's active measures that fall in each category, across all
    # countries that have measures. Lets profile charts show "typical
    # emphasis" markers without hardcoding anything.
    shares = {}
    n_countries = 0
    for c in index_list:
        f = PROFILES / f"{c['code']}.json"
        if not f.exists():
            continue
        cats = load(f).get("category_summary") or {}
        total = sum(cats.values())
        if not total:
            continue
        n_countries += 1
        for cat, n in cats.items():
            shares.setdefault(cat, 0.0)
            shares[cat] += n / total
    benchmarks = {cat: round(s / n_countries, 4)
                  for cat, s in shares.items()} if n_countries else {}

    # World transport emissions series (sum of all countries per year),
    # for the profiles' "compare growth" chart view. Same single source
    # of truth as everything else: data/ghg.csv via load_ghg_csv().
    global_trend = {}
    try:
        import sys
        sys.path.insert(0, str(ROOT / "pipeline"))
        from update_data import load_ghg_csv
        ghg = load_ghg_csv()
        sums = {}
        for v in ghg.values():
            t = v.get("trends") or {}
            for yr, val in zip(t.get("years") or [], t.get("transport") or []):
                if isinstance(val, (int, float)):
                    sums[yr] = sums.get(yr, 0.0) + val
        yrs = sorted(sums)
        global_trend = {"years": yrs,
                        "transport": [round(sums[y], 1) for y in yrs]}
    except Exception as exc:
        print(f"   ⚠ global transport trend skipped: {exc}")

    (PROCESSED / "benchmarks.json").write_text(
        json.dumps({"generated": comparison.get("last_updated"),
                    "countries": n_countries,
                    "category_share": benchmarks,
                    "global_transport": global_trend},
                   ensure_ascii=False, indent=1),
        encoding="utf-8")
    print(f"📐  benchmarks.json — {len(benchmarks)} categories "
          f"averaged over {n_countries} countries")


if __name__ == "__main__":
    main()
