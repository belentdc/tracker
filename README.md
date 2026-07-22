# NDC Transport Tracker

Interactive dashboard for visualising transport commitments in national
climate policy documents (NDCs). Part of the Mobilize Net-Zero project.

This repository (`belentdc/tracker`) is the active development repo. The
public version is published through the Changing Transport website
(changing-transport.org).

---

## Products

| Product | URL | Accessed from |
|---|---|---|
| Main dashboard | `https://belentdc.github.io/tracker/` | Entry point, embedded via iframe on changing-transport.org |
| NDC Comparison | `https://belentdc.github.io/tracker/comparison/` | Linked from the main dashboard navigation |
| Country Explorer | `https://belentdc.github.io/tracker/profiles/` | Direct link. Also reached from the map on the main dashboard and from country names in the comparison tool (both open in a new tab) |
| Search | `https://belentdc.github.io/tracker/search/` | Linked from the Country Explorer page |
| Methodology | `https://belentdc.github.io/tracker/methodology/` | Direct link |
| Ask the Tracker | `https://belentdc.github.io/tracker/ask/` | Direct link *Still under development*|

Embed in WordPress via iframe:
```html
<iframe src="https://belentdc.github.io/tracker/"
        width="100%" style="border:none;" height="900"></iframe>
```

For what each dashboard shows and where every number comes from, see
[`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md).

---

## Repository structure

```
tracker/
├── index.html                     main dashboard
├── script.js
├── styles.css
│
├── comparison/                    NDC Comparison tool
│   ├── index_c.html
│   ├── script_c.js
│   └── styles_c.css
│
├── profiles/                      Country Explorer
│   ├── index.html                 list of all country profiles
│   ├── country.html                profile page template
│   ├── styles.css
│   ├── js/country.js
│   ├── countries/<slug>/          generated — static page per country
│   ├── data/countries/*.json      generated — one file per country (199) + index.json
│   └── factsheets/*.pdf           generated — per-country PDF, not currently linked in the profile page
│
├── search/                        global search across targets and measures
├── methodology/                   methodology, data sources, citation
├── ask/                           guided Q&A
│
├── assets/
│   ├── design-tokens.css          brand colours, font, shared tokens
│   └── flags/                     country flag images
│
├── data/
│   ├── GIZ-SLOCAT_Transport-Tracker-database.xlsx   source: policy data
│   ├── publications.xlsx                             source: publications
│   ├── publications.json                             generated — do not edit
│   ├── ghg.csv                                        source: EDGAR transport emissions
│   ├── ghg_metadata.json                              EDGAR version and year
│   └── processed/
│       ├── data.json                  generated — main dashboard
│       ├── comparison-data.json       generated — comparison tool
│       ├── search-index.json          generated — search
│       ├── questions.json             generated — ask the tracker
│       ├── benchmarks.json            generated — profile page context
│       ├── country-urls.json          hand-maintained, see below
│       └── countries_simplified.geojson
│
├── pipeline/
│   ├── update_data.py             main pipeline
│   ├── build_search_index.py      builds search-index.json, questions.json, benchmarks.json
│   ├── build_factsheets.py        builds the PDF factsheets
│   └── fetch_database.py          optional: download the database from the TDC API
│
├── scripts/
│   ├── build_data_files.py        publications.xlsx to publications.json
│   ├── build_ghg_csv.py           EDGAR source to data/ghg.csv
│   ├── smoke_test.py              validates outputs after the pipeline runs
│   └── download_flags.py          one-off: downloads flag images
│
├── taxonomy/
│   ├── TAXONOMY.md                full NDC taxonomy
│   ├── ndc_taxonomy.json
│   └── ndc_taxonomy.csv
│
├── docs/
│   └── DATA_DICTIONARY.md
│
└── .github/workflows/
    └── update-data.yml
```

Files marked "generated" are overwritten every time the pipeline runs.
Don't edit them directly. The one exception is `country-urls.json`, which
is hand-maintained (see below).

---

## Updating the data

There are three data sources. Upload whichever changed, alone or together,
in any order — GitHub Actions rebuilds everything else automatically.

```
data/GIZ-SLOCAT_Transport-Tracker-database.xlsx   policy data
data/publications.xlsx                             publications
data/ghg.csv                                       EDGAR emissions
```

### Updating the policy database
Replace `data/GIZ-SLOCAT_Transport-Tracker-database.xlsx`, commit, push.
The filename must match exactly.

### Updating publications
Edit or replace `data/publications.xlsx`, commit, push. CI regenerates
`publications.json` automatically.

### Updating GHG (EDGAR) data
Convert the new EDGAR source to the canonical CSV first:
```bash
python scripts/build_ghg_csv.py <new_edgar_source> data/ghg.csv
```
Then commit `data/ghg.csv` and push.

### Fetching the database from the TDC API (optional)
```bash
python pipeline/fetch_database.py
```
Downloads, validates and saves the database to `data/`. Commit and push
the result, or trigger the workflow manually from the Actions tab.
Configure `CKAN_BASE` and `CKAN_RESOURCE_ID` under Settings → Variables,
or edit the constants at the top of `pipeline/fetch_database.py`.

### Running locally
```bash
pip install -r requirements.txt
python scripts/build_data_files.py     # only if publications.xlsx changed
python pipeline/update_data.py
python scripts/smoke_test.py           # optional
```
Open with VS Code Live Server or `python -m http.server 8000`.

---

## How the pipeline runs

```
push a data file
        |
GitHub Actions (update-data.yml)
        1. rebuild publications.json
        2. run pipeline/update_data.py
        3. run scripts/smoke_test.py (stops here if outputs look broken)
        4. run pipeline/build_search_index.py
        5. run pipeline/build_factsheets.py
        6. commit everything regenerated
        |
Live on GitHub Pages in 3-5 minutes
```

Triggers on push to any of:

| File | |
|---|---|
| `data/GIZ-SLOCAT_Transport-Tracker-database.xlsx` | policy database |
| `data/publications.xlsx` | publications |
| `data/publications.json` | publications, direct edit |
| `data/ghg.csv` | emissions |
| `pipeline/update_data.py` | pipeline logic |
| `scripts/build_data_files.py` | publications build logic |
| `pipeline/build_search_index.py` | search / ask the tracker logic |
| `pipeline/build_factsheets.py` | factsheet PDF logic |

If any step fails, the workflow opens a GitHub issue labelled
`pipeline-failure` with a link to the failed run. The live site keeps
serving the last good data until it's fixed. The workflow can also be
triggered manually from Actions → "Update Dashboard Data" → Run workflow.

---

## Display rules

A few rules live in the code rather than the data itself:

**Net zero and overall mitigation targets** are mentioned once, in the
narrative text at the top of a country profile. Everything below that —
the Transport Targets section, its count, the type filters, and the
generation comparison chart — counts only transport mitigation and
transport adaptation targets. Energy sector targets are excluded
everywhere on the profile. If you add a new place that counts targets,
use `transportTargets(p, "Active")` in `profiles/js/country.js`, not
`p.targets` directly, which includes everything.

CSV downloads are the exception: they export every target with its `area`
column, unfiltered. The rule above only affects what's displayed on the
page.

**No country ranking.** Comparisons are always a country against its own
past generations, or aggregate and descriptive. Never a leaderboard.

---

## Publications registry

`data/publications.xlsx` links Changing Transport publications to
specific country profiles. Edit it in Excel, commit, push.

| Column | Description |
|---|---|
| `title` | Publication title as shown on the profile page |
| `url` | Full URL on changing-transport.org |
| `date` | YYYY-MM-DD, blank if unknown |
| `type` | Publication / Report / Brief / Tool / Dataset / Article |
| `countries` | ISO-3 codes, comma-separated. `GLOBAL` shows on all profiles |
| `notes` | Internal only, not shown on the site |
| `active` | yes to show, no to hide without deleting |

ISO-3 codes must match the GIZ database. The "ISO-3 Reference" sheet
lists all 199 Parties. Special codes: `EEU` is the European Union
collective NDC, `XKX` is Kosovo.

---

## Taxonomy

`taxonomy/` contains the full NDC Transport Tracker taxonomy (version 4.0,
licensed CC BY 4.0). It is the reference used by the dashboard and by the
Transport Policy Miner pipeline.

---

## Map

This representation does not imply any opinion on the part of GIZ
concerning the legal status of any country, territory, or the
delimitation of frontiers or boundaries.

The map uses a simplified world silhouette
(`data/processed/countries_simplified.geojson`, about 850 KB, simplified
from Natural Earth data). To regenerate from a new source:

```bash
npx mapshaper source.geojson -simplify 8% keep-shapes \
  -filter-fields ISO_A3,ADM0_A3,BRK_A3,NAME,NAME_EN,ADMIN \
  -o precision=0.001 data/processed/countries_simplified.geojson
```

---

## Troubleshooting

**Dashboard not updating after uploading a file?**
Check the Actions tab for the workflow run. Check Issues for an
auto-opened `pipeline-failure` issue. The database filename must match
exactly: `GIZ-SLOCAT_Transport-Tracker-database.xlsx`.

**Pipeline failed with "SCHEMA CHECK FAILED"?**
A sheet or column the pipeline expects was renamed or removed in the
Excel. The error lists which ones. Fix the Excel, or if the change was
intentional, update `REQUIRED_SCHEMA` in `pipeline/update_data.py`.

**Dashboard shows old data?**
Clear the browser cache. GitHub Pages can take 3-5 minutes to deploy
after a push. Check `data/processed/data.json` directly to confirm it
was regenerated.

**Map shows equal-sized circles?**
The emissions field comes from `data/ghg.csv`. Push a change to any
trigger file, or run the workflow manually, to regenerate it.

**Country profiles show stale data?**
Profiles regenerate in the same run as the main dashboard. Check that the
Actions workflow committed them (look for the commit titled
"Auto-update: Dashboard data refreshed").

**Publications not appearing on a country profile?**
Check the country's ISO-3 code in `publications.xlsx` matches the
database, and the row has `active = yes`.

**A country's name isn't a clickable link?**
Add its entry to `data/processed/country-urls.json` (see above).

**Comparison font looks different from the main dashboard?**
`comparison/styles_c.css` must import `../assets/design-tokens.css` and
use `var(--ct-font)` for `--font-sans`.

**Factsheet PDF exists but nothing links to it?**
The download button was removed from the profile page. The PDFs still
build in CI and live in `profiles/factsheets/`.

**Search or Ask the Tracker shows old results?**
Both read files built by `pipeline/build_search_index.py`. Check that
step ran in the Actions log.

---

## Credits

Data: GIZ-SLOCAT Transport Tracker Database. Emissions: EDGAR. Map
silhouette: Natural Earth (public domain).

Built for Mobilize Net-Zero Changing Transport (changing-transport.org).
