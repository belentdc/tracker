    # ── Widget summary (widget/widget-summary.json) ───────────────────
    # Small JSON consumed by the home-page iframe widget on changing-transport.org.
    # All three numbers come from gen3 active docs already computed above.
    # "with_transport_actions" = countries with at least one mitigation measure
    # in an active NDC 3.x doc (mirrors the Document sheet column
    # "Contains transport mitigation measures").

    # Count gen3 countries that have mitigation measures (actions)
    # by scanning doc_id_info for gen3 active docs and checking the
    # category_latest_gen_breakdown already in tab2 — or more directly,
    # counting countries with any entry in country_latest_cats where gen3
    # is their latest gen.
    gen3_with_actions = sum(
        1 for code, cd in data["tab1"]["countries"].items()
        if cd.get("latest_active_gen") == "gen3"
        and data["tab2"]["country_latest_cats"].get(code)
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
                "label": "With transport actions",
                "value": gen3_with_actions,
                "of":    f"of {n_submitted} NDCs",
                "pct":   round(gen3_with_actions / n_submitted * 100) if n_submitted else 0,
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
