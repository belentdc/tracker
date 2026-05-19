// ============================================================================
// NDC Transport Tracker — Main JavaScript
// ============================================================================

let dashboardData = null;
let countryUrls   = {};
let worldGeoJSON  = null;
let tab1Chart     = null;
let tab2Chart     = null;
let tab1Map       = null;
let tab2Map       = null;
let tab1GeoLayer  = null;
let tab2GeoLayer  = null;

let chartActiveGens = ['latest'];
let mapActiveGen    = 'latest';
let lastChartGen    = 'latest';
let mapActiveCats   = new Set(['all']); // 'all' means all categories

const GEN_CONFIG = {
    latest: { label: 'Latest Active NDC', color: '#9DBE3D', border: '#7A9B2E' },
    gen1:   { label: '1st Generation',    color: '#003D5C', border: '#002840' },
    gen2:   { label: '2nd Generation',    color: '#00A4BD', border: '#007d8f' },
    gen3:   { label: '3rd Generation',    color: '#E8821A', border: '#b86010' },
};

const GEN_LABELS = {
    latest: 'Latest Active NDC',
    gen1:   '1st Generation',
    gen2:   '2nd Generation',
    gen3:   '3rd Generation',
};

const CATEGORIES_ORDER = [
    'Electrification',
    'Mode shift and demand management',
    'Transport system improvements',
    'Energy efficiency',
    'Alternative fuels',
    'Aviation and maritime',
];

const ALL_CATEGORIES_TEXT =
    'Electrification, Mode shift and demand management, Transport system improvements, ' +
    'Energy efficiency, Alternative fuels, Aviation and maritime';



function countryTitle(iso3, name) {
    const url = countryUrls[iso3];
    if (url) {
        return `<a href="${url}" target="_blank" rel="noopener" class="popup-country-link">${name} <span class="popup-link-icon">↗</span></a>`;
    }
    return name;
}


// Region bounding boxes [south, west, north, east]
const REGION_BOUNDS = {
    'Africa':                          [[-35, -20], [38, 52]],
    'Asia':                            [[0, 25], [55, 145]],
    'Europe':                          [[34, -25], [72, 45]],
    'Latin America and the Caribbean': [[-56, -92], [33, -32]],
    'Northern America':                [[14, -170], [72, -50]],
    'Oceania':                         [[-50, 110], [22, 180]],
};

function zoomToRegion(map, region) {
    if (region === 'all') {
        map.setView([20, 10], 2);
    } else if (REGION_BOUNDS[region]) {
        map.fitBounds(REGION_BOUNDS[region], { padding: [20, 20], maxZoom: 5 });
    }
}

// Normalize GeoJSON to ensure all features have ISO3 code and name
function normalizeWorldGeoJSON(geojson) {
    return {
        ...geojson,
        features: geojson.features.map(feature => {
            const props = feature.properties || {};
            return {
                ...feature,
                properties: {
                    ...props,
                    iso_a3: props.iso_a3 ?? props.ISO_A3 ?? props.ADM0_A3 ?? props.BRK_A3,
                    name: props.name ?? props.NAME ?? props.NAME_EN ?? props.ADMIN,
                },
            };
        }),
    };
}

// ============================================================================
// iframe auto-resize — sends height to WordPress parent
// ============================================================================
function sendHeight() {
    const height = document.body.scrollHeight;
    window.parent.postMessage({ type: 'ndcTrackerHeight', height }, '*');
}

// Call after any render that might change height
function sendHeightDebounced() {
    clearTimeout(window._sendHeightTimer);
    window._sendHeightTimer = setTimeout(sendHeight, 150);
}

// ============================================================================
// Boot
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadData(), loadGeoJSON(), loadCountryUrls()]);
        initializeTabs();
        initializeTooltips();
        initializeTab1();
        initializeTab2();
        document.getElementById('loading').classList.add('hidden');

        // Set print date dynamically
        window.addEventListener('beforeprint', () => {
            const dateStr = new Date().toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            document.querySelectorAll('.tab-content').forEach(el => {
                el.dataset.printDate = dateStr;
            });
        });

        // Auto-resize iframe in WordPress parent
        sendHeight();
        window.addEventListener('resize', sendHeight);
    } catch (err) {
        console.error('Init error:', err);
        document.getElementById('loading').innerHTML =
            '<p style="color:#c0392b;font-family:sans-serif;padding:2rem">Error loading data. Please refresh the page.</p>';
    }
});

// ============================================================================
// Loaders
// ============================================================================
async function loadData() {
    const res = await fetch('data/processed/data.json');
    if (!res.ok) throw new Error('data.json not found');
    dashboardData = await res.json();
}

async function loadCountryUrls() {
    try {
        const res = await fetch('data/processed/country-urls.json');
        if (res.ok) countryUrls = await res.json();
    } catch (e) {
        console.warn('country-urls.json not found, links disabled');
    }
}

async function loadGeoJSON() {
    const res = await fetch('data/processed/ne_10m_admin_0_countries_ukr.geojson');
    if (!res.ok) throw new Error('ne_10m_admin_0_countries_ukr.geojson not found');
    worldGeoJSON = normalizeWorldGeoJSON(await res.json());
}

// ============================================================================
// Tab switching
// ============================================================================
function initializeTabs() {
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            sendHeightDebounced();
        });
    });
}

// ============================================================================
// Tooltips
// ============================================================================
function initializeTooltips() {
    document.querySelectorAll('.info-tooltip').forEach(btn =>
        btn.addEventListener('click', () =>
            document.getElementById(`tooltip-${btn.dataset.tooltip}`).classList.add('active')));
    document.querySelectorAll('.tooltip-close').forEach(btn =>
        btn.addEventListener('click', () =>
            btn.closest('.tooltip-modal').classList.remove('active')));
    document.querySelectorAll('.tooltip-modal').forEach(modal =>
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.remove('active');
        }));
}

// ============================================================================
// ── TAB 1 ── Progress in NDC Transport Targets
// ============================================================================
function initializeTab1() {
    document.querySelectorAll('#tab1 .toggle-button').forEach(btn =>
        btn.addEventListener('click', () => switchTab1View(btn.dataset.view)));

    tab1Map = L.map('tab1-map', { zoomControl: true, scrollWheelZoom: false }).setView([20, 10], 2);
    tab1Map.attributionControl.setPrefix('Natural Earth (naturalearthdata.com) | For illustrative purposes only. Borders do not reflect GIZ\'s official position.');


    document.getElementById('tab1-region').addEventListener('change', renderTab1);
    document.getElementById('tab1-map-region').addEventListener('change', () => {
        const region = document.getElementById('tab1-map-region').value;
        renderTab1Map(region);
        updateTab1MapLabel(region);
        zoomToRegion(tab1Map, region);
    });
    document.getElementById('tab1-download').addEventListener('click', () => downloadPDF('tab1'));

    renderTab1();
}

function switchTab1View(view) {
    document.querySelectorAll('#tab1 .toggle-button').forEach(b =>
        b.classList.toggle('active', b.dataset.view === view));
    document.getElementById('tab1-chart-view').classList.toggle('hidden', view !== 'chart');
    document.getElementById('tab1-map-view').classList.toggle('hidden', view !== 'map');
    document.getElementById('tab1-chart-filters').classList.toggle('hidden', view !== 'chart');
    document.getElementById('tab1-map-filters').classList.toggle('hidden', view !== 'map');
    if (view === 'map') {
        setTimeout(() => {
            if (tab1Map) {
                tab1Map.invalidateSize();
                const region = document.getElementById('tab1-map-region').value;
                renderTab1Map(region);
                updateTab1MapLabel(region);
                zoomToRegion(tab1Map, region);
            }
        }, 120);
    }
}

function getTab1GenStats(region) {
    const gens   = dashboardData.tab1.generations;
    const result = {};

    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        const genData = gens[gen];
        if (region === 'all') {
            result[gen] = {
                name:          genData.name,
                period:        genData.period,
                submitted:     genData.total_submitted,
                withTransport: genData.with_transport,
            };
        } else {
            const rd = genData.regions?.[region] || { total: 0, with_transport: 0 };
            result[gen] = {
                name:          genData.name,
                period:        genData.period,
                submitted:     rd.total,
                withTransport: rd.with_transport,
            };
        }
    });
    return result;
}

function renderTab1() {
    const chartRegion = document.getElementById('tab1-region').value;
    const mapRegion   = document.getElementById('tab1-map-region')?.value || 'all';
    const genStats    = getTab1GenStats(chartRegion);
    renderTab1Subtitle(chartRegion, genStats);
    renderTab1Chart(genStats);
    renderTab1Map(mapRegion);
    updateTab1MapLabel(mapRegion);
}

function updateTab1MapLabel(region) {
    const el = document.getElementById('tab1-map-label');
    if (!el) return;
    const countries = dashboardData.tab1.countries;

    // Count the three categories for the selected region
    let green = 0, lightblue = 0, grey = 0;
    Object.values(countries).forEach(cd => {
        if (cd.covered_by_eu) return;
        if (region !== 'all' && cd.region !== region) return;
        if (!cd.latest_active_gen) return; // no NDC
        if (cd.latest_has_transport) green++;
        else if (cd.had_transport_previously) lightblue++;
        else grey++;
    });
    // Add EU as 1 for Europe if region is all or Europe
    if (region === 'all' || region === 'Europe') {
        const euCd = Object.values(countries).find(cd => cd.iso3 === 'EEU' || (cd.covered_by_eu === undefined && cd.region === 'Europe' && cd.iso3 === 'EEU'));
        // EU NDC has transport (gen3) - count as green
        const euEntry = countries['EEU'] || Object.values(countries).find(c => c.latest_active_gen && c.covered_by_eu === undefined && ['AUT','BEL'].includes(c.iso3));
        // Just add 1 green for EU NDC
        if (region === 'all' || region === 'Europe') green++; // EU NDC has transport target
    }

    const regionLine = region === 'all' ? 'Region: All regions' : `Region: ${region}`;
    el.innerHTML = `<span class="cs-header">Currently showing</span>${regionLine}<br>Transport target in latest active NDC: ${green}<br>Transport target in a previous NDC: ${lightblue}<br>No transport target in any NDC: ${grey}`;
}

function renderTab1Subtitle(region, genStats) {
    const el = document.getElementById('tab1-chart-subtitle');
    if (!el) return;
    const regionLine = region === 'all' ? 'Region: All regions' : `Region: ${region}`;
    el.innerHTML = `<span class="cs-header">Currently showing</span>${regionLine}<br>Each bar represents 100% of NDCs submitted in that generation`;
}

function renderTab1Chart(genStats) {
    const ctx = document.getElementById('tab1-chart').getContext('2d');
    if (tab1Chart) tab1Chart.destroy();

    const gens         = ['gen1', 'gen2', 'gen3'];
    const region       = document.getElementById('tab1-region').value;
    const regionSuffix = region === 'all' ? '' : ` in ${region}`;
    const possible     = region === 'all'
        ? dashboardData.metadata.total_possible_ndcs
        : (dashboardData.metadata.region_possible_ndcs?.[region] || '?');
    const labels       = gens.map(g => [
        `${genStats[g].name} (${genStats[g].period})`,
        `${genStats[g].submitted} out of ${possible} possible NDCs${regionSuffix}`,
    ]);

    // Percentages for 100% stacked bar
    const pctTransport  = gens.map(g =>
        genStats[g].submitted ? +((genStats[g].withTransport / genStats[g].submitted) * 100).toFixed(1) : 0
    );
    const pctNoTransport = gens.map((g, i) =>
        +(100 - pctTransport[i]).toFixed(1)
    );



    tab1Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'With transport targets',
                    data: pctTransport,
                    backgroundColor: '#9DBE3D',
                    borderColor: '#7A9B2E',
                    borderWidth: 1,
                    borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
                    barPercentage: 0.35,
                    stack: 'stack',
                },
                {
                    label: 'Without transport targets',
                    data: pctNoTransport,
                    backgroundColor: '#C8D8E8',
                    borderColor: '#8AAEC8',
                    borderWidth: 1,
                    borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 5, bottomRight: 5 },
                    barPercentage: 0.35,
                    stack: 'stack',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'IBM Plex Sans', size: 13, weight: 600 },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                    },
                },
                tooltip: {
                    backgroundColor: 'rgba(0,61,92,0.95)',
                    titleFont: { family: 'IBM Plex Sans', size: 13, weight: 700 },
                    bodyFont:  { family: 'IBM Plex Sans', size: 13 },
                    padding: 12, cornerRadius: 8,
                    callbacks: {
                        label(ctx) {
                            const g  = gens[ctx.dataIndex];
                            const gs = genStats[g];
                            if (ctx.dataset.label === 'With transport targets') {
                                return `  With transport: ${gs.withTransport} NDCs (${ctx.parsed.y}%)`;
                            }
                            return `  Without transport: ${gs.submitted - gs.withTransport} NDCs (${ctx.parsed.y}%)`;
                        },

                    },
                },
                // Custom plugin to draw % labels on bars
                datalabels: false,
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { family: 'IBM Plex Sans', size: 13 } },
                },
                y: {
                    stacked: true,
                    min: 0, max: 100,
                    grid: { color: '#E8ECF0' },
                    ticks: {
                        callback: v => v + '%',
                        font: { family: 'IBM Plex Sans', size: 12 },
                    },
                    title: {
                        display: true,
                        text: '% of NDCs submitted in that generation',
                        font: { family: 'IBM Plex Sans', size: 12, weight: 600 },
                        color: '#6B7280',
                    },
                },
            },
        },
        // Custom plugin: draw % value inside green bar
        plugins: [{
            id: 'tab1Labels',
            afterDatasetsDraw(chart) {
                const ctx2 = chart.ctx;
                const meta0 = chart.getDatasetMeta(0); // green bars

                ctx2.save();
                ctx2.font = 'bold 13px IBM Plex Sans, sans-serif';
                ctx2.textAlign = 'center';
                ctx2.textBaseline = 'middle';

                meta0.data.forEach((bar, i) => {
                    const pct = pctTransport[i];
                    if (pct < 5) return; // skip if too small
                    ctx2.fillStyle = 'white';
                    ctx2.fillText(pct + '%', bar.x, bar.y + (bar.height / 2));
                });



                ctx2.restore();
            },
        }],
    });
}

function renderTab1Map(region) {
    if (!worldGeoJSON) return;
    if (tab1GeoLayer) tab1GeoLayer.remove();

    const allCountries = dashboardData.tab1.countries;
    const regionCodes  = new Set(
        Object.values(allCountries)
            .filter(c => region === 'all' || c.region === region)
            .map(c => c.iso3)
    );

    // Compute counts for currently showing label
    const filtered = Object.values(allCountries).filter(c =>
        (region === 'all' || c.region === region) && !c.covered_by_eu && c.latest_active_gen
    );
    // Add EU as one entry if Europe or all
    const euCd = allCountries['EEU'];
    const includeEU = euCd && (region === 'all' || region === 'Europe');
    const greenCount    = filtered.filter(c => c.latest_has_transport).length + (includeEU && euCd.latest_has_transport ? 1 : 0);
    const lightblueCount = filtered.filter(c => c.had_transport_previously).length;
    const greyCount     = filtered.filter(c => !c.latest_has_transport && !c.had_transport_previously).length + (includeEU && !euCd.latest_has_transport ? 1 : 0);
    const regionLine    = region === 'all' ? 'Region: All regions' : `Region: ${region}`;

    const labelEl = document.getElementById('tab1-map-label');
    if (labelEl) {
        labelEl.innerHTML = `<span class="cs-header">Currently showing</span>${regionLine}<br>Transport target in latest active NDC: <strong>${greenCount} NDCs</strong><br>Transport target in a previous NDC: <strong>${lightblueCount} NDCs</strong><br>No transport target in any NDC: <strong>${greyCount} NDCs</strong>`;
    }

    tab1GeoLayer = L.geoJSON(worldGeoJSON, {
        style(feature) {
            const iso3     = feature.properties.iso_a3;
            const cd       = allCountries[iso3];
            const inRegion = region === 'all' || regionCodes.has(iso3);

            if (!cd) {
                // No NDC submitted — white with dashed border
                return {
                    fillColor: '#F2F2F2',
                    fillOpacity: inRegion ? 0.9 : 0.4,
                    color: '#bbb',
                    weight: 0.8,
                    dashArray: '3',
                };
            }

            let fillColor;
            if (cd.latest_has_transport) {
                fillColor = '#9DBE3D'; // green
            } else if (cd.had_transport_previously) {
                fillColor = '#7EC8E3'; // light blue
            } else {
                fillColor = '#C8D8E8'; // grey
            }

            return {
                fillColor,
                fillOpacity: inRegion ? 0.85 : 0.15,
                color:       inRegion ? '#888' : '#ccc',
                weight:      inRegion ? 0.7 : 0.4,
            };
        },

        onEachFeature(feature, layer) {
            const iso3 = feature.properties.iso_a3;
            const cd   = allCountries[iso3];
            const inRegion = region === 'all' || regionCodes.has(iso3);

            if (!cd) {
                layer.bindPopup(`
                    <div class="popup-title">${feature.properties.name}</div>
                    <div class="popup-info"><span class="popup-tag no">No NDC submitted</span></div>
                `);
                return;
            }

            const gens     = cd.generations || {};
            const genLines = ['gen1','gen2','gen3'].filter(g => gens[g]).map(g => {
                const lbl  = { gen1:'1st', gen2:'2nd', gen3:'3rd' }[g];
                const icon = gens[g].has_transport ? '&#10003;' : '&#10007;';
                const txt  = gens[g].has_transport ? 'transport target' : 'no transport target';
                return `<div>${icon} ${lbl} NDC: ${txt}</div>`;
            }).join('');

            let statusTag;
            if (cd.latest_has_transport) {
                statusTag = '<span class="popup-tag yes">&#10003; Transport target in latest NDC</span>';
            } else if (cd.had_transport_previously) {
                statusTag = '<span class="popup-tag prev">&#9888; Had target previously, not in latest</span>';
            } else {
                statusTag = '<span class="popup-tag no">&#10007; No transport target</span>';
            }

            const euNote = cd.covered_by_eu
                ? `<div style="font-size:0.8rem;color:#6B7280;margin-top:4px;font-style:italic">Reports collectively through the EU NDC</div>`
                : '';

            layer.bindPopup(`
                <div class="popup-title">${countryTitle(iso3, cd.name)}</div>
                <div class="popup-info">
                    ${genLines}
                    <div style="margin-top:6px">${statusTag}</div>
                    ${euNote}
                </div>
            `);

            layer.on({
                mouseover(e) {
                    if (!inRegion) return;
                    e.target.setStyle({ weight: 2, fillOpacity: 1 });
                    e.target.bringToFront();
                },
                mouseout() { tab1GeoLayer.resetStyle(layer); },
            });
        },
    }).addTo(tab1Map);
}

// ============================================================================
// ── TAB 2 ── Leading Measures for Decarbonisation
// ============================================================================
function initializeTab2() {
    // Chart generation toggles (multi-select)
    document.querySelectorAll('#tab2-gen-toggles .gen-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const gen = btn.dataset.gen;
            const idx = chartActiveGens.indexOf(gen);
            if (idx !== -1) {
                if (chartActiveGens.length === 1) return;
                chartActiveGens.splice(idx, 1);
                btn.classList.remove('active');
            } else {
                chartActiveGens.push(gen);
                lastChartGen = gen;
                btn.classList.add('active');
            }
            renderTab2Chart();
        });
    });

    // Map generation toggles (single-select)
    document.querySelectorAll('#tab2-map-gen-toggles .gen-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            mapActiveGen = btn.dataset.gen;
            document.querySelectorAll('#tab2-map-gen-toggles .gen-toggle').forEach(b =>
                b.classList.toggle('active', b.dataset.gen === mapActiveGen));
            updateMapGradientColor();
            renderTab2Map();
            updateMapLabel();
        });
    });

    // Reset button
    document.getElementById('tab2-map-reset').addEventListener('click', () => {
        mapActiveGen  = 'latest';
        mapActiveCats = new Set(['all']);
        document.querySelectorAll('#tab2-map-gen-toggles .gen-toggle').forEach(b =>
            b.classList.toggle('active', b.dataset.gen === 'latest'));
        document.querySelectorAll('#tab2-map-cat-toggles .cat-toggle').forEach(b =>
            b.classList.toggle('active', b.dataset.cat === 'all'));
        document.getElementById('tab2-map-region').value = 'all';
        updateMapGradientColor();
        renderTab2Map();
        zoomToRegion(tab2Map, 'all');
        updateMapLabel();
    });

    document.getElementById('tab2-chart-region').addEventListener('change', renderTab2Chart);
    document.getElementById('tab2-map-region').addEventListener('change', () => {
        const region = document.getElementById('tab2-map-region').value;
        renderTab2Map();
        zoomToRegion(tab2Map, region);
    });

    // Category toggle buttons (multi-select)
    document.querySelectorAll('#tab2-map-cat-toggles .cat-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.cat;
            if (cat === 'all') {
                // All button — deselect everything else
                mapActiveCats = new Set(['all']);
                document.querySelectorAll('#tab2-map-cat-toggles .cat-toggle').forEach(b =>
                    b.classList.toggle('active', b.dataset.cat === 'all'));
            } else {
                // Remove 'all' if it was active
                mapActiveCats.delete('all');
                document.querySelector('#tab2-map-cat-toggles .cat-toggle[data-cat="all"]').classList.remove('active');
                // Toggle this category
                if (mapActiveCats.has(cat)) {
                    mapActiveCats.delete(cat);
                    btn.classList.remove('active');
                    // If nothing selected, go back to all
                    if (mapActiveCats.size === 0) {
                        mapActiveCats = new Set(['all']);
                        document.querySelector('#tab2-map-cat-toggles .cat-toggle[data-cat="all"]').classList.add('active');
                    }
                } else {
                    mapActiveCats.add(cat);
                    btn.classList.add('active');
                }
            }
            renderTab2Map();
            updateMapLabel();
        });
    });

    // View toggle
    document.querySelectorAll('#tab2 .toggle-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('#tab2 .toggle-button').forEach(b =>
                b.classList.toggle('active', b.dataset.view === view));
            document.getElementById('tab2-chart-view').classList.toggle('hidden', view !== 'chart');
            document.getElementById('tab2-map-view').classList.toggle('hidden', view !== 'map');
            document.getElementById('tab2-chart-filters').classList.toggle('hidden', view !== 'chart');
            document.getElementById('tab2-map-filters').classList.toggle('hidden', view !== 'map');

            if (view === 'map') {
                mapActiveGen = lastChartGen;
                document.querySelectorAll('#tab2-map-gen-toggles .gen-toggle').forEach(b =>
                    b.classList.toggle('active', b.dataset.gen === mapActiveGen));
                updateMapGradientColor();
                setTimeout(() => {
                    if (tab2Map) {
                        tab2Map.invalidateSize();
                        const region = document.getElementById('tab2-map-region')?.value || 'all';
                        renderTab2Map();
                        zoomToRegion(tab2Map, region);
                    }
                    updateMapLabel();
                }, 120);
            }
        });
    });

    tab2Map = L.map('tab2-map', { zoomControl: true, scrollWheelZoom: false }).setView([20, 10], 2);
    tab2Map.attributionControl.setPrefix('Natural Earth (naturalearthdata.com) | For illustrative purposes only. Borders do not reflect GIZ\'s official position.');


    document.getElementById('tab2-download').addEventListener('click', () => downloadPDF('tab2'));

    renderTab2Chart();
    updateMapLabel();
    updateMapGradientColor();
}

// ── Chart ──────────────────────────────────────────────────────────────────
function getTab2ChartData(selectedGens, region) {
    const allCountries   = dashboardData.tab1.countries;
    const countryGenCats = dashboardData.tab2.country_gen_cats;
    const clc            = dashboardData.tab2.country_latest_cats;

    const filteredCodes = Object.keys(allCountries).filter(code =>
        region === 'all' || allCountries[code]?.region === region);

    const result = {};
    selectedGens.forEach(gen => {
        const catMap = {};
        filteredCodes.forEach(code => {
            const country = allCountries[code];
            if (!country) return;
            const cats = gen === 'latest'
                ? (clc[code] || {})
                : (countryGenCats[code]?.[gen] || {});
            Object.entries(cats).forEach(([cat, count]) => {
                if (!catMap[cat]) catMap[cat] = { countries: new Set(), mentions: 0 };
                catMap[cat].countries.add(code);
                catMap[cat].mentions += count;
            });
        });
        result[gen] = catMap;
    });
    return result;
}

function buildChartSubtitle(selectedGens) {
    const region     = document.getElementById('tab2-chart-region').value;
    const regionLine = region === 'all' ? 'Region: All regions' : `Region: ${region}`;

    // Fixed order: gen1 → gen2 → gen3 → latest
    const GEN_ORDER  = ['gen1', 'gen2', 'gen3', 'latest'];
    const orderedSel = GEN_ORDER.filter(g => selectedGens.includes(g));
    const genLine    = `Generation: ${orderedSel.map(g => GEN_LABELS[g]).join(', ')}`;

    const archiveNote = selectedGens.some(g => g !== 'latest')
        ? '<br>Includes active and archived NDCs from each generation round'
        : '';

    return `<span class="cs-header">Currently showing</span>${regionLine}<br>${genLine}${archiveNote}`;
}

function renderTab2Chart() {
    const region = document.getElementById('tab2-chart-region').value;
    const data   = getTab2ChartData(chartActiveGens, region);

    document.getElementById('tab2-chart-subtitle').innerHTML = buildChartSubtitle(chartActiveGens);

    const ctx = document.getElementById('tab2-chart').getContext('2d');
    if (tab2Chart) tab2Chart.destroy();

    const activeCats = CATEGORIES_ORDER.filter(cat =>
        chartActiveGens.some(gen => data[gen]?.[cat]?.countries?.size > 0));
    if (!activeCats.length) return;

    const catLgb   = dashboardData.tab2.cat_latest_gen_breakdown;
    const catGenAA = dashboardData.tab2.cat_gen_active_archived;

    // Fixed display order: gen1 → gen2 → gen3 → latest
    const GEN_ORDER    = ['gen1', 'gen2', 'gen3', 'latest'];
    const orderedGens  = GEN_ORDER.filter(g => chartActiveGens.includes(g));

    const datasets = orderedGens.map(gen => {
        const cfg = GEN_CONFIG[gen];
        return {
            label: cfg.label,
            data: activeCats.map(cat => data[gen]?.[cat]?.countries?.size || 0),
            backgroundColor: cfg.color + 'CC',
            borderColor: cfg.border,
            borderWidth: 1.5,
            borderRadius: 4,
            barPercentage: orderedGens.length === 1 ? 0.5 : 0.85,
        };
    });

    tab2Chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: activeCats, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { family: 'IBM Plex Sans', size: 13, weight: 600 }, padding: 20, usePointStyle: true, pointStyle: 'rectRounded' },
                },
                tooltip: {
                    backgroundColor: 'rgba(0,61,92,0.95)',
                    titleFont: { family: 'IBM Plex Sans', size: 13, weight: 700 },
                    bodyFont:  { family: 'IBM Plex Sans', size: 13 },
                    padding: 14, cornerRadius: 8,
                    callbacks: {
                        title(items) { return items[0].label; },
                        label(ctx) {
                            const gen   = orderedGens[ctx.datasetIndex];
                            const cat   = activeCats[ctx.dataIndex];
                            const entry = data[gen]?.[cat];
                            const ndcs  = entry?.countries?.size || 0;
                            const ment  = entry?.mentions || 0;
                            const lines = [];

                            if (gen === 'latest') {
                                // For Latest Active: breakdown by generation, region-filtered
                                lines.push(`  ${GEN_CONFIG[gen].label}: ${ndcs} NDCs`);
                                // Count from region-filtered data by latest_active_gen
                                const allC = dashboardData.tab1.countries;
                                const reg  = document.getElementById('tab2-chart-region').value;
                                let g1=0,g2=0,g3=0;
                                for (const [code, cd] of Object.entries(allC)) {
                                    if (reg !== 'all' && cd.region !== reg) continue;
                                    if (!entry?.countries?.has(code)) continue;
                                    if (cd.latest_active_gen === 'gen1') g1++;
                                    else if (cd.latest_active_gen === 'gen2') g2++;
                                    else if (cd.latest_active_gen === 'gen3') g3++;
                                }
                                if (g1) lines.push(`    · ${g1} from 1st generation`);
                                if (g2) lines.push(`    · ${g2} from 2nd generation`);
                                if (g3) lines.push(`    · ${g3} from 3rd generation`);
                            } else {
                                // For specific gen: active/archived, region-filtered
                                lines.push(`  ${GEN_CONFIG[gen].label}: ${ndcs} NDCs`);
                                const allC = dashboardData.tab1.countries;
                                const reg  = document.getElementById('tab2-chart-region').value;
                                const countryGenCats = dashboardData.tab2.country_gen_cats;
                                let activeCount=0, archivedCount=0;
                                for (const [code, cd] of Object.entries(allC)) {
                                    if (reg !== 'all' && cd.region !== reg) continue;
                                    if (!entry?.countries?.has(code)) continue;
                                    // Check if this country's gen NDC is active or archived
                                    const genData = cd.generations?.[gen];
                                    if (!genData) continue;
                                    // A gen NDC is active if it's their latest_active_gen
                                    if (cd.latest_active_gen === gen) activeCount++;
                                    else archivedCount++;
                                }
                                if (activeCount)   lines.push(`    · ${activeCount} from active NDCs`);
                                if (archivedCount) lines.push(`    · ${archivedCount} from archived NDCs`);
                            }
                            lines.push(`  Total measures count: ${ment}`);
                            return lines;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'IBM Plex Sans', size: 11 }, maxRotation: 25, minRotation: 0 },
                },
                y: {
                    beginAtZero: true, grid: { color: '#E8ECF0' },
                    ticks: { font: { family: 'IBM Plex Sans', size: 12 } },
                    title: { display: true, text: 'Total measures count', font: { family: 'IBM Plex Sans', size: 12, weight: 600 }, color: '#6B7280' },
                },
            },
        },
    });
}

// ── Map ────────────────────────────────────────────────────────────────────
function updateMapLabel() {
    const region     = document.getElementById('tab2-map-region')?.value || 'all';
    const regionLine = region === 'all' ? 'Region: All regions' : `Region: ${region}`;
    const genLine    = `Generation: ${GEN_LABELS[mapActiveGen]}`;
    let catLine;
    if (mapActiveCats.has('all')) {
        catLine = `Categories: All categories`;
    } else {
        catLine = `Categories: ${[...mapActiveCats].join(', ')}`;
    }
    document.getElementById('tab2-map-label').innerHTML =
        `<span class="cs-header">Currently showing</span>${regionLine}<br>${genLine}<br>${catLine}`;
}

function updateMapGradientColor() {
    const cfg = GEN_CONFIG[mapActiveGen];
    const bar = document.getElementById('tab2-gradient-bar');
    if (bar) bar.style.background = `linear-gradient(to right, #f0f0f0, ${cfg.color})`;
}

function renderTab2Map() {
    if (!worldGeoJSON) return;
    if (tab2GeoLayer) tab2GeoLayer.remove();

    const allCountries   = dashboardData.tab1.countries;
    const countryGenCats = dashboardData.tab2.country_gen_cats;
    const clc            = dashboardData.tab2.country_latest_cats;
    const cfg            = GEN_CONFIG[mapActiveGen];
    const region         = document.getElementById('tab2-map-region')?.value || 'all';
    const showAll        = mapActiveCats.has('all');
    const selectedCats   = showAll ? CATEGORIES_ORDER : [...mapActiveCats];

    const countryTotals = {};
    Object.keys(allCountries).forEach(code => {
        const country = allCountries[code];
        if (region !== 'all' && country?.region !== region) return;
        const cats = mapActiveGen === 'latest'
            ? (clc[code] || {})
            : (countryGenCats[code]?.[mapActiveGen] || {});
        const val = selectedCats.reduce((sum, c) => sum + (cats[c] || 0), 0);
        countryTotals[code] = val;
    });

    const maxVal = Math.max(...Object.values(countryTotals), 1);
    const regionCodes = new Set(
        Object.values(allCountries)
            .filter(c => region === 'all' || c.region === region)
            .map(c => c.iso3)
    );

    function hexToRgb(hex) {
        return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    }
    const [tr,tg,tb] = hexToRgb(cfg.color);

    function heatColor(val) {
        if (!val) return '#f0f0f0';
        const t = Math.pow(val / maxVal, 0.6);
        return `rgb(${Math.round(255+(tr-255)*t)},${Math.round(255+(tg-255)*t)},${Math.round(255+(tb-255)*t)})`;
    }

    tab2GeoLayer = L.geoJSON(worldGeoJSON, {
        style(feature) {
            const iso3     = feature.properties.iso_a3;
            const cd       = allCountries[iso3];
            const val      = countryTotals[iso3] || 0;

            // No data at all (territory or country with no NDC ever)
            if (!cd) {
                return {
                    fillColor:   '#FFFFFF',
                    fillOpacity: 1,
                    color:       '#ddd',
                    weight:      0.5,
                    dashArray:   null,
                };
            }

            // Check if country has NDC in selected generation
            const hasNdcInGen = mapActiveGen === 'latest'
                ? !!cd.latest_active_gen
                : !!cd.generations?.[mapActiveGen];

            // No NDC in selected generation → white (not applicable)
            if (!hasNdcInGen) {
                return {
                    fillColor:   '#FFFFFF',
                    fillOpacity: 1,
                    color:       '#ddd',
                    weight:      0.5,
                    dashArray:   null,
                };
            }

            // Has NDC but 0 mentions → light grey (submitted but no transport measures)
            if (val === 0) {
                return {
                    fillColor:   '#E8E8E8',
                    fillOpacity: 0.9,
                    color:       '#bbb',
                    weight:      0.5,
                    dashArray:   null,
                };
            }

            // Has NDC and has mentions → heat color
            return {
                fillColor:   heatColor(val),
                fillOpacity: 0.85,
                color:       cfg.border,
                weight:      0.7,
                dashArray:   null,
            };
        },
        onEachFeature(feature, layer) {
            const iso3 = feature.properties.iso_a3;
            const cd   = allCountries[iso3];

            // Countries not in dataset (Libya, Iran etc — no NDC ever)
            if (!cd) {
                const name = feature.properties.name || iso3;
                layer.bindPopup(`
                    <div class="popup-title">${name}</div>
                    <div class="popup-info"><span class="popup-tag no">No NDC submitted</span></div>
                `);
                layer.on({
                    mouseover(e) { e.target.setStyle({ weight: 2, fillOpacity: 1 }); e.target.bringToFront(); },
                    mouseout()   { tab2GeoLayer.resetStyle(layer); },
                });
                return;
            }

            const inRegion = region === 'all' || regionCodes.has(iso3);
            const total    = countryTotals[iso3] || 0;
            const genLabel = GEN_LABELS[mapActiveGen];

            const hasNdcInGen = mapActiveGen === 'latest'
                ? !!cd.latest_active_gen
                : !!cd.generations?.[mapActiveGen];

            const cats = mapActiveGen === 'latest'
                ? (clc[iso3] || {})
                : (countryGenCats[iso3]?.[mapActiveGen] || {});

            let popupBody;
            if (!hasNdcInGen) {
                const genLabel2 = mapActiveGen === 'latest' ? 'a latest active NDC' : `a ${GEN_LABELS[mapActiveGen]}`;
                popupBody = `<div style="color:#999;font-style:italic">No ${genLabel2} on record</div>`;
            } else {
                popupBody = `<div><strong>Total mentions: ${total}</strong></div>`;
                const catLines = selectedCats
                    .filter(c => cats[c] > 0)
                    .map(c => `<div style="font-size:0.8rem;color:#555">${c}: <b>${cats[c]}</b></div>`)
                    .join('');
                popupBody += catLines || '<div style="font-size:0.8rem;color:#999">No transport measure mentions</div>';
            }

            const euNote = cd.covered_by_eu
                ? `<div style="font-size:0.8rem;color:#6B7280;margin-top:4px;font-style:italic">Reports collectively through the EU NDC</div>`
                : '';

            layer.bindPopup(`
                <div class="popup-title">${countryTitle(iso3, cd.name)} <span style="font-weight:400;font-size:0.85em;color:#6B7280">— ${genLabel}</span></div>
                <div class="popup-info">${popupBody}${euNote}</div>
            `);

            layer.on({
                mouseover(e) {
                    if (!inRegion) return;
                    e.target.setStyle({ weight: 2, fillOpacity: 1 });
                    e.target.bringToFront();
                },
                mouseout() { tab2GeoLayer.resetStyle(layer); },
            });
        },
    }).addTo(tab2Map);
}

// ============================================================================
// Print / Export
// ============================================================================
function downloadPDF(tabId) {
    // Set date on tab content for CSS ::after
    const dateStr = new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    document.querySelectorAll('.tab-content').forEach(el => {
        el.dataset.printDate = dateStr;
    });

    // Trigger browser native print dialog
    window.print();
}