# NDC Transport Tracker

Interactive dashboard for visualising transport commitments in national climate
policy documents (NDCs). Part of the
[Changing Transport](https://changing-transport.org/) initiative (GIZ · SLOCAT
· Mobilize Net-Zero).

## Live URLs

| Product | URL |
|---|---|
| Main dashboard | `https://belentdc.github.io/tracker/` |
| NDC Comparison | `https://belentdc.github.io/tracker/comparison/` |

Embed in WordPress via iframe:
```html
<iframe src="https://belentdc.github.io/tracker/"
        width="100%" style="border:none;" height="900"></iframe>
```

---

## Repository structure

```
tracker/
├── assets/
│   └── design-tokens.css          ← single source of brand (colours, font, tokens)
│
├── comparison/
│   ├── index_c.html               ← comparison dashboard HTML
│   ├── script_c.js                ← comparison JavaScript
│   └── styles_c.css               ← comparison styles (imports design-tokens)
│
├── data/
│   ├── GIZ-SLOCAT_Transport-Tracker-database.xlsx  ← UPLOAD THIS to update
│   ├── publications.xlsx          ← curated publications per country (edit manually)
│   └── processed/
│       ├── data.json              ← GENERATED — main dashboard data
│       ├── comparison-data.json   ← GENERATED — comparison data
│       └── countries_simplified.geojson  ← simplified world map (~850 KB)
│
├── pipeline/
│   ├── update_data.py             ← main pipeline: Excel → all JSON outputs
│   └── fetch_database.py          ← Option B: download database from TDC API
│
├── .github/workflows/
│   └── update-data.yml            ← GitHub Actions: auto-runs on push
│
├── index.html                     ← main dashboard HTML
├── script.js                      ← main dashboard JavaScript
└── styles.css                     ← main dashboard styles (imports design-tokens)
```

> **Never edit files in `data/processed/` manually** — they are auto-generated
> and will be overwritten on the next pipeline run.

---

## How to update the data

### Option A — Upload the Excel (recommended)

1. Replace `data/GIZ-SLOCAT_Transport-Tracker-database.xlsx` with the new file
   (GitHub Desktop → drag and drop, or GitHub web UI → Upload files)
2. Commit and push
3. GitHub Actions runs `pipeline/update_data.py` automatically
4. `data/processed/data.json` and `comparison-data.json` are regenerated and
   committed back
5. Changes go live on GitHub Pages in ~3–5 minutes

> The Excel file name must be exact: `GIZ-SLOCAT_Transport-Tracker-database.xlsx`

### Option B — Transport Data Commons API (automatic)

The pipeline can also fetch the latest database from the TDC CKAN instance:

```bash
python pipeline/fetch_database.py           # download + validate + save to data/
python pipeline/update_data.py              # then process as usual
```

Or trigger it from GitHub → Actions → "Update ecosystem data" → Run workflow →
source: api.

The scheduled workflow runs every **Monday 05:00 UTC** in API mode. If the API
is unreachable or the download fails, the run continues with the last committed
Excel — the site never breaks.

**Configuration** (no code change needed):
- Set repository variables `CKAN_BASE` and `CKAN_RESOURCE_ID` under
  Settings → Variables, or edit the two constants at the top of
  `pipeline/fetch_database.py`.

### Running locally

```bash
pip install openpyxl pycountry
python pipeline/update_data.py
```

Open with VS Code Live Server or `python -m http.server 8000`.

---

## Publications registry

`data/publications.xlsx` links Changing Transport publications to specific
country profiles. Edit it directly in Excel:

| Column | Description |
|---|---|
| `title` | Publication title as it appears on the profile page |
| `url` | Full URL on changing-transport.org/publications/… |
| `date` | YYYY-MM-DD (leave blank if unknown) |
| `type` | Publication / Report / Brief / Tool / Dataset / Article |
| `countries` | ISO-3 codes, comma-separated (e.g. `BRA,COL,MEX`). Use `GLOBAL` to show on all profiles |
| `notes` | Internal only — not shown on the site |
| `active` | `yes` to show · `no` to hide without deleting |

ISO-3 codes match the GIZ database exactly. The second sheet "ISO-3 Reference"
lists all 199 Parties. Key special codes: `EEU` = European Union collective
NDC, `XKX` = Kosovo.

---

## Design system

`assets/design-tokens.css` is the **only** place brand decisions live:
palette, generation colours, A-S-I colours, Source Sans 3 typography, radii,
shadows. Both `styles.css` and `comparison/styles_c.css` alias their local
variables to these tokens. Change a token once — all products follow.

**Brand colours:** `#9DBE3D` green · `#003D5C` navy · `#00A4BD` teal ·
`#E8821A` orange

**Generation colours:** Gen 1 = navy · Gen 2 = teal · Gen 3 = orange ·
Latest Active = green

---

## Dashboard features

### Tab 1 — Progress in Transport Targets

- Stacked bar chart: % of NDCs with transport targets across 3 generations
- Filter by region
- **Map view** — two options toggled via "Equal view / By CO₂":
  - **Equal view (Dots)** — borderless land silhouette, one equal dot per
    Party, coloured by transport target status. No administrative borders
    are drawn.
  - **By CO₂ (Dorling)** — circle area proportional to national transport
    CO₂e (EDGAR 2023). EU members shown individually. Borderless land
    silhouette as reference. Circle area note appears automatically in the
    legend.
  - Both views support **pan** (drag) and **zoom** (scroll/pinch) and
    **zoom-to-region** on region filter change.
- Colour legend: green = transport target in latest NDC · light blue = had
  target previously, not in latest · grey = no transport target · white/dashed
  = no NDC submitted
- Download PDF

### Tab 2 — Leading Measures for Decarbonisation

- Bar chart: top mitigation measure categories by number of NDCs
- Filter by generation (Latest Active / 1st / 2nd / 3rd) and region
- **Map view** — Dots only (borderless, equal dots), coloured by measure
  mention intensity (Few → Many heat scale). Supports pan, zoom, and
  zoom-to-region.
- Category filter pills
- Download PDF

### NDC Comparison (`/comparison/`)

Side-by-side view of up to three country × generation combinations.

- Country and generation selectors per column
- Version selector when a country submitted multiple NDCs in the same generation
- Summary bar: counts of targets, measures and net-zero commitments per NDC
- **Mitigation tab** — transport targets, net-zero targets, mitigation measures
  grouped by category (with A-S-I label, modes, verbatim quotes, page refs)
- **Adaptation tab** — adaptation targets and measures
- Filters: GHG / Non-GHG, A-S-I, transport modes
- Navigation links to Tab 1 (`../index.html`) and Tab 2 (`../index.html?tab=2`)
  both work correctly

---

## Map notes

Both map types use **schematic dot/circle positions** — no administrative
borders are drawn. This representation does not imply any opinion on the part
of GIZ concerning the legal status of any country, territory, or the
delimitation of frontiers or boundaries.

The map uses a simplified world silhouette (`data/processed/countries_simplified.geojson`,
~850 KB, simplified from Natural Earth data). To regenerate from a new source:

```bash
npx mapshaper source.geojson -simplify 8% keep-shapes \
  -filter-fields ISO_A3,ADM0_A3,BRK_A3,NAME,NAME_EN,ADMIN \
  -o precision=0.001 data/processed/countries_simplified.geojson
```

---

## Troubleshooting

**Dashboard not updating after uploading Excel?**
- Check the Actions tab → "Update ecosystem data" workflow
- The Excel file name must be exact
- Common fix: commit `pipeline/update_data.py` *before* uploading a new Excel

**Dashboard shows old data?**
- Clear browser cache (`Ctrl+Shift+R` / `Cmd+Shift+R`)
- Wait 3–5 minutes after pushing — GitHub Pages takes time to deploy
- Check `data/processed/data.json` directly to see if it was regenerated

**By CO₂ map shows equal circles?**
- The `ghg_transport` field is populated by pipeline in
  `pipeline/update_data.py`. Run it once locally or push an Excel update to
  regenerate `data/processed/data.json` with transport emissions per country.

**Comparison font looks different from the main dashboard?**
- `comparison/styles_c.css` must import `../assets/design-tokens.css` and
  use `var(--ct-font)` for `--font-sans`. Both are in the current files.

---

## Credits

**Data:** GIZ-SLOCAT Transport Tracker Database · Emissions: EDGAR 2023 ·
Map silhouette: Natural Earth (public domain)

**Built for:** GIZ · SLOCAT · Mobilize Net-Zero · Changing Transport
(changing-transport.org)