# Data Dictionary

This document says where every number on the tracker comes from. If you
see a number on screen and want to know which Excel column produced it,
look it up here.

Checked against the actual code and the actual data files in this repo.

---

## 1. The three source files

| File | Contains | Feeds |
|---|---|---|
| `data/GIZ-SLOCAT_Transport-Tracker-database.xlsx` | Countries, documents, targets, measures, adaptation, benefits | Main dashboard, Comparison, Country profiles |
| `data/publications.xlsx` | Publications linked to countries | Publications section on each profile |
| `data/ghg.csv` | EDGAR emissions, 1970-2024, per country | Emissions numbers and charts everywhere |

### Sheets inside the main Excel

| Sheet | Used for |
|---|---|
| Country | Name, region, income group, ISO-3 code |
| Document | One row per NDC/LTS/BTR: type, version, date, status, transport flags |
| Targets | One row per target: area, type, year, conditionality, quote |
| Mitigation | One row per mitigation measure: category, A-S-I, quote |
| Adaptation | Same as Mitigation, for adaptation measures |
| Benefits | Co-benefits mentioned per document |
| References | Extra document links per country |

---

## 2. Terms used everywhere

| Term | Meaning |
|---|---|
| Generation | Which NDC round a document belongs to: 1st (2015-2019), 2nd (2020-2024), 3rd (2024-ongoing). Comes from the version number, e.g. "NDC 2.1" is 2nd generation |
| Active / Archived | Whether a document is the country's current NDC/LTS/BTR, or a past version |
| A-S-I | Avoid, Shift, Improve — the three categories every mitigation measure is classified into |
| EU handling | EU member states report through one collective NDC (code `EEU`). A member's documents, targets and measures are the EU's, flagged `via_eu: true` |
| Transport target vs. other targets | A target only counts as a "transport target" if its area is Transport sector mitigation or Transport sector adaptation. Net zero, Overall mitigation, and Energy sector targets exist in the data but are **not** transport targets — see section 5 |

---

## 3. Main dashboard

Data file: `data/processed/data.json`

### Tab 1 — Progress in Transport Targets

| Element | Shows | Counting rule |
|---|---|---|
| Generation bar chart | NDCs submitted vs. NDCs with a transport target, per generation | From the Document sheet |
| World map | Green = transport target in the latest active NDC. Light blue = had one in an earlier NDC, not anymore. Grey = never had one | From the Document sheet, per country |
| By-CO2 map (circles) | Circle size = transport emissions | From `ghg.csv`, `transport_mt` |

### Tab 2 — Leading Measures for Decarbonisation

| Element | Shows | Counting rule |
|---|---|---|
| Category breakdown | Count of mitigation measures per category | From the Mitigation sheet |

Country names link to changing-transport.org using
`data/processed/country-urls.json`. A country with no entry there just
shows as plain text.

---

## 4. NDC Comparison

Data file: `data/processed/comparison-data.json`

| Element | Counting rule |
|---|---|
| Mitigation targets | Target area = Transport sector mitigation target |
| Mitigation measures | All mitigation measures in that document |
| Net zero | Target area = Net zero target |
| Adaptation targets | Target area = Transport sector adaptation target |
| Adaptation measures | All adaptation measures in that document |

---

## 5. Country profile page

Data file: `profiles/data/countries/<ISO3>.json`

The page has these sections, in this order:

### Overview
Story paragraph, then four emissions numbers (share of national emissions,
total transport Mt, per person, rank among sectors), then a trend chart
(1970-2024). **Net zero and Overall mitigation targets are mentioned here
only** — nowhere else on the page.

### Journey
Timeline of the country's documents (NDC/LTS/BTR), oldest to newest.
Green dot = active document. Grey dot = archived. Clicking a document
shows its mitigation/adaptation targets and measures, in that order.

### Targets
Transport targets only — mitigation and adaptation. **Net zero and
Overall mitigation targets are excluded from this count**, even though
they exist in the same Targets sheet. The number shown here always
matches the transport target count used everywhere else on the page.

### Measures
Mitigation measures, filterable by category, A-S-I, mode.

### Adaptation
Adaptation measures, grouped by type.

### Co-benefits
Non-emissions benefits mentioned in the documents (health, jobs, etc.),
with related SDGs.

### Initiatives
International coalitions and declarations the country has joined.

### Publications
Country-specific publications plus anything tagged `GLOBAL`, from
`publications.xlsx`.

### Data & downloads
CSV downloads (full dataset, targets only, measures only — these
**include every target and measure, unfiltered**, unlike the page
display above) and a link to the Transport Data Commons portal.

### Compare (similar countries)
Three ways to find comparable countries: same region, similar transport
emissions share, similar mix of measure categories. Never a ranking.

---

## 6. Country Explorer (list page)

Data file: `profiles/data/countries/index.json`

Per country: name, flag, region, income group, whether it has an LTS,
number of documents, number of measures, transport share of emissions.

---

## 7. Search

Data file: `data/processed/search-index.json`

One entry per target, measure, adaptation measure, or country. Each
entry has: what kind it is, which country, the text, and a link. Built
by `pipeline/build_search_index.py`.

---

## 8. Ask the Tracker

Data file: `data/processed/questions.json`

A fixed set of questions with precomputed answers, built at the same
time as the search index. *Still under development*

---

## 9. Reference counts

These numbers change every time a new database is uploaded — they are
not something to memorise, just a sense of scale as of this writing:

| What | Count |
|---|---|
| Countries on the main dashboard | 196 |
| Country profiles (includes EU and Kosovo) | 199 |
| Documents (NDC + LTS + BTR, all countries) | 695 |
| Active transport targets shown on profile pages | 619 |
| Active mitigation measures | 3,589 |
| Active adaptation measures | 410 |
| Publication entries (including GLOBAL, counted per country) | 1,709 |

---

*When you add a new number to any product, add its row here in the same
commit.*
