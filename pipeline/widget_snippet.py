# ── Widget summary (widget/widget-summary.json) ───────────────────
    # Small JSON consumed by the home-page iframe widget on changing-transport.org.
    # Numbers are derived from gen3 data already computed above — no extra
    # parsing. "with_transport_measures" = gen3 countries with at least one
    # mitigation measure in their latest active doc.
    #
    # IMPORTANT — EU bloc: the 27 EU member states each get a copy of the
    # EU's collective NDC data (see "Adding EU member states" in process()),
    # so a naive per-code count here counts the EU 27 times. total_submitted
    # (the denominator) counts the EU as a single bloc (code EEU), so the
    # numerator must match that scope or the percentage can exceed 100%.
    # We count EU members as at most 1 unit here, same as the denominator.
    # (EU_MEMBER_ISO3 is defined at module level in update_data.py; this
    # file is a standalone reference copy, so it's repeated here.)
    EU_MEMBER_ISO3 = {
        "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA",
        "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD",
        "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE",
    }
    _gen3_with_measures_codes = {
        code for code, cd in data["tab1"]["countries"].items()
        if cd.get("latest_active_gen") == "gen3"
        and data["tab2"]["country_latest_cats"].get(code)
    }
    _eu_in_count = _gen3_with_measures_codes & EU_MEMBER_ISO3
    gen3_with_measures = (
        len(_gen3_with_measures_codes - EU_MEMBER_ISO3)
        + (1 if _eu_in_count else 0)
    )

    gen3 = data["tab1"]["generations"].get("gen3", {})
    total_possible = data["metadata"]["total_possible_ndcs"]
    n_submitted    = gen3.get("total_submitted", 0)
    n_targets      = gen3.get("with_transport", 0)

    from datetime import date as _date
    today_label = _date.today().strftime("%-d %B %Y")   # e.g. "10 April 2026"

    widget_summary = {
        "as_of": today_label,
        "stats": [
            {
                "label": "NDCs 3.0 submitted",
                "value": n_submitted,
                "of":    f"of {total_possible} NDCs",
                "pct":   round(n_submitted / total_possible * 100) if total_possible else 0,
            },
            {
                "label": "With transport targets",
                "value": n_targets,
                "of":    f"of {n_submitted} NDCs",
                "pct":   round(n_targets / n_submitted * 100) if n_submitted else 0,
            },
            {
                "label": "With transport measures",
                "value": gen3_with_measures,
                "of":    f"of {n_submitted} NDCs",
                "pct":   min(round(gen3_with_measures / n_submitted * 100), 100) if n_submitted else 0,
            },
        ],
    }

    widget_dir = Path("widget")
    widget_dir.mkdir(exist_ok=True)
    (widget_dir / "widget-summary.json").write_text(
        json.dumps(widget_summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"🪟  widget-summary.json saved → widget/")