#!/usr/bin/env python3
"""
Generate a 2-page PDF factsheet per country from the profile JSONs.

Run AFTER update_data.py (reads profiles/data/countries/*.json).
Outputs profiles/factsheets/{CODE}.pdf — one per country, Changing
Transport branding, reproducible builds (invariant=1) so unchanged data
produces byte-identical PDFs and clean git diffs.

Requires: reportlab (see requirements.txt)
"""

import json
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen.canvas import Canvas

ROOT = Path(__file__).resolve().parent.parent
PROFILES = ROOT / "profiles" / "data" / "countries"
OUT = ROOT / "profiles" / "factsheets"

# Changing Transport brand
NAVY = HexColor("#003D5C")
TEAL = HexColor("#00A4BD")
GREEN = HexColor("#9DBE3D")
ORANGE = HexColor("#E8821A")
BG = HexColor("#F4F6F8")
MUTED = HexColor("#6B7280")
TEXT = HexColor("#2C3E50")
BORDER = HexColor("#E1E4E8")

W, H = A4
M = 40  # page margin


def txt(c, x, y, s, size=9, color=TEXT, bold=False, max_w=None):
    font = "Helvetica-Bold" if bold else "Helvetica"
    c.setFont(font, size)
    c.setFillColor(color)
    if max_w:
        while c.stringWidth(s, font, size) > max_w and len(s) > 4:
            s = s[:-2]
        if c.stringWidth(s + "…", font, size) > max_w:
            pass
    c.drawString(x, y, s)


def wrap_text(c, s, font, size, max_w):
    words, lines, cur = str(s).split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if c.stringWidth(t, font, size) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def para(c, x, y, s, size=9, color=TEXT, bold=False, max_w=480, leading=None,
         max_lines=None):
    font = "Helvetica-Bold" if bold else "Helvetica"
    leading = leading or size + 3
    lines = wrap_text(c, s, font, size, max_w)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(".") + "…"
    c.setFont(font, size)
    c.setFillColor(color)
    for ln in lines:
        c.drawString(x, y, ln)
        y -= leading
    return y


def header(c, p, page_no):
    c.setFillColor(NAVY)
    c.rect(0, H - 92, W, 92, stroke=0, fill=1)
    c.setFillColor(GREEN)
    c.rect(0, H - 96, W, 4, stroke=0, fill=1)
    txt(c, M, H - 40, "GIZ-SLOCAT NDC TRANSPORT TRACKER", 8,
        HexColor("#9DBE3D"), bold=True)
    txt(c, M, H - 66, p["name"], 22, HexColor("#FFFFFF"), bold=True,
        max_w=W - 2 * M - 90)
    sub = ", ".join(filter(None, [p.get("region"), p.get("income")]))
    txt(c, M, H - 82, sub, 9, HexColor("#B8C9D4"))
    txt(c, W - M - 60, H - 40, f"Page {page_no}/2", 8, HexColor("#B8C9D4"))


def footer(c, p):
    c.setFillColor(BORDER)
    c.rect(M, 42, W - 2 * M, 0.7, stroke=0, fill=1)
    gen = (p.get("meta") or {}).get("generated") or ""
    txt(c, M, 30,
        f"GIZ and SLOCAT (2025). NDC Transport Tracker. "
        f"changing-transport.org/tracker. Data as of {gen}", 7, MUTED)
    txt(c, W - M - 150, 30, "Emissions: EDGAR. License: CC BY 4.0", 7, MUTED)


def kpi_card(c, x, y, w, h, value, label, color=NAVY):
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(BORDER)
    c.roundRect(x, y, w, h, 6, stroke=1, fill=1)
    txt(c, x + 10, y + h - 24, str(value), 15, color, bold=True, max_w=w - 20)
    yy = y + h - 38
    for ln in wrap_text(c, label, "Helvetica", 7, w - 20)[:2]:
        txt(c, x + 10, yy, ln, 7, MUTED)
        yy -= 9


def trend_chart(c, x, y, w, h, trends):
    years, tr = trends.get("years") or [], trends.get("transport") or []
    if not years:
        return
    i0 = years.index(1990) if 1990 in years else 0
    years, tr = years[i0:], tr[i0:]
    if len(tr) < 2:
        return
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(BORDER)
    c.roundRect(x, y, w, h, 6, stroke=1, fill=1)
    txt(c, x + 12, y + h - 18, "Transport CO2 emissions (Mt), "
        f"{years[0]}\u2013{years[-1]}, EDGAR", 8.5, NAVY, bold=True)
    px, py, pw, ph = x + 34, y + 26, w - 50, h - 56
    lo, hi = min(tr), max(tr)
    rng = (hi - lo) or 1
    pts = [(px + i * pw / (len(tr) - 1), py + (v - lo) / rng * ph)
           for i, v in enumerate(tr)]
    # area fill
    c.setFillColor(HexColor("#D7F0F4"))
    path = c.beginPath()
    path.moveTo(pts[0][0], py)
    for X, Y in pts:
        path.lineTo(X, Y)
    path.lineTo(pts[-1][0], py)
    path.close()
    c.drawPath(path, stroke=0, fill=1)
    # line
    c.setStrokeColor(TEAL)
    c.setLineWidth(1.6)
    path = c.beginPath()
    path.moveTo(*pts[0])
    for X, Y in pts[1:]:
        path.lineTo(X, Y)
    c.drawPath(path, stroke=1, fill=0)
    # axis labels
    txt(c, px - 2, py - 12, str(years[0]), 7, MUTED)
    txt(c, px + pw - 18, py - 12, str(years[-1]), 7, MUTED)
    txt(c, x + 8, py + ph - 4, f"{hi:g}", 7, MUTED)
    txt(c, x + 8, py, f"{lo:g}", 7, MUTED)


def bar_list(c, x, y, w, title, items, color=TEAL, max_rows=7):
    txt(c, x, y, title, 9.5, NAVY, bold=True)
    y -= 16
    if not items:
        txt(c, x, y, "No data in active documents.", 8, MUTED)
        return y - 14
    mx = max(v for _, v in items) or 1
    for label, v in items[:max_rows]:
        lbl = label if len(label) <= 34 else label[:33] + "…"
        txt(c, x, y, lbl, 8, TEXT)
        bw = (w - 170) * v / mx
        c.setFillColor(color)
        c.roundRect(x + 150, y - 1.5, max(bw, 2), 7, 2, stroke=0, fill=1)
        txt(c, x + 155 + max(bw, 2), y, str(v), 8, NAVY, bold=True)
        y -= 15
    return y - 6


def doc_timeline(c, x, y, w, docs):
    txt(c, x, y, "Climate policy documents", 9.5, NAVY, bold=True)
    y -= 16
    shown = [d for d in docs if d.get("type") in ("NDC", "LTS", "BTR")][:8]
    if not shown:
        txt(c, x, y, "No documents recorded.", 8, MUTED)
        return y - 14
    for d in shown:
        col = {"NDC": TEAL, "LTS": GREEN, "BTR": ORANGE}.get(d.get("type"), MUTED)
        c.setFillColor(col)
        c.circle(x + 4, y + 2.5, 3, stroke=0, fill=1)
        label = ", ".join(filter(None, [
            d.get("type"), str(d.get("version") or ""),
            str(d.get("date") or ""), d.get("status")]))
        txt(c, x + 14, y, label, 8,
            TEXT if d.get("status") == "Active" else MUTED)
        y -= 14
    return y - 6


def build_one(p, out_path):
    c = Canvas(str(out_path), pagesize=A4, invariant=1)
    c.setTitle(f"{p['name']} — NDC Transport Tracker factsheet")
    c.setAuthor("GIZ and SLOCAT")

    # ── PAGE 1: overview ────────────────────────────────────────────
    header(c, p, 1)
    em = p.get("emissions") or {}
    y = H - 175
    cw = (W - 2 * M - 3 * 10) / 4
    T_AREAS = ("Transport sector mitigation target",
               "Transport sector adaptation target")
    n_active_t = len([t for t in (p.get("targets") or [])
                      if t.get("status") == "Active"
                      and t.get("area") in T_AREAS])
    n_active_m = len([m for m in (p.get("measures") or [])
                      if m.get("status") == "Active"])
    kpi_card(c, M, y, cw, 62,
             f"{em.get('transport_mt', '–')} Mt",
             f"Transport CO2 ({em.get('year', '')}, EDGAR)", TEAL)
    kpi_card(c, M + cw + 10, y, cw, 62,
             f"{em.get('transport_share_pct', '–')}%",
             "Transport share of national CO2", NAVY)
    kpi_card(c, M + 2 * (cw + 10), y, cw, 62, n_active_t,
             "Transport targets in active documents", GREEN)
    kpi_card(c, M + 3 * (cw + 10), y, cw, 62, n_active_m,
             "Transport mitigation measures (active)", ORANGE)

    if p.get("reports_via_eu"):
        y -= 26
        txt(c, M, y + 6,
            "Reports collectively through the EU NDC — content below refers "
            "to the joint EU submission.", 8, ORANGE, bold=True)

    y -= 160
    if p.get("trends"):
        trend_chart(c, M, y, W - 2 * M, 140, p["trends"])
    y -= 24

    y = doc_timeline(c, M, y, W - 2 * M, p.get("documents") or [])

    # Net-zero / ICE lines if present
    nz = p.get("net_zero_target")
    if nz:
        txt(c, M, y, f"Net zero target: {nz}", 8.5, NAVY, bold=True)
        y -= 14
    ice = p.get("ice_phaseout")
    if ice:
        txt(c, M, y, f"ICE phase-out: {ice}", 8.5, NAVY, bold=True)
        y -= 14

    footer(c, p)
    c.showPage()

    # ── PAGE 2: measures & targets detail ───────────────────────────
    header(c, p, 2)
    y = H - 130
    cats = sorted((p.get("category_summary") or {}).items(),
                  key=lambda kv: -kv[1])
    y = bar_list(c, M, y, W - 2 * M,
                 "Mitigation measures by category (active documents)",
                 cats, TEAL, max_rows=8)
    y -= 8
    asi = [(k, v) for k, v in (p.get("asi_summary") or {}).items() if v]
    y = bar_list(c, M, y, W - 2 * M, "Avoid – Shift – Improve profile",
                 asi, GREEN, max_rows=3)
    y -= 8

    # One highlighted target quote (first active transport target)
    tq = next((t for t in (p.get("targets") or [])
               if t.get("status") == "Active" and t.get("content")), None)
    if tq and y > 120:
        txt(c, M, y, "In their own words", 9.5, NAVY, bold=True)
        y -= 15
        c.setFillColor(BG)
        quote_lines = wrap_text(c, f"\u201c{tq['content']}\u201d",
                                "Helvetica-Oblique", 8.5, W - 2 * M - 30)[:5]
        box_h = len(quote_lines) * 12 + 26
        c.roundRect(M, y - box_h + 10, W - 2 * M, box_h, 6, stroke=0, fill=1)
        yy = y - 6
        c.setFont("Helvetica-Oblique", 8.5)
        c.setFillColor(TEXT)
        for ln in quote_lines:
            c.drawString(M + 14, yy, ln)
            yy -= 12
        src = ", ".join(filter(None, [
            str(tq.get("document") or ""), str(tq.get("version") or ""),
            f"p. {tq.get('page')}" if tq.get("page") else ""]))
        txt(c, M + 14, yy - 2, src, 7, MUTED)
        y = yy - 22

    txt(c, M, max(y, 70),
        "Full interactive profile: changing-transport.org/tracker "
        f"→ Country Explorer → {p['name']}", 8, TEAL, bold=True)

    footer(c, p)
    c.showPage()
    c.save()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(f for f in PROFILES.glob("*.json")
                   if f.stem != "index")
    n = 0
    for f in files:
        p = json.loads(f.read_text(encoding="utf-8"))
        try:
            build_one(p, OUT / f"{p['code']}.pdf")
            n += 1
        except Exception as exc:
            print(f"   ⚠ {p.get('code', f.stem)}: {exc}")
    print(f"📄  {n} factsheets → profiles/factsheets/")


if __name__ == "__main__":
    main()
