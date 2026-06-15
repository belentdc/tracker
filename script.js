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
let labData       = null;
let tab1MapType   = "dots";
let tab2MapType   = "dots";

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
// Region zoom handled by zoomToRegionSvg (SVG maps)

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

        // Deep link: ?tab=2 from comparison nav
        const _params = new URLSearchParams(location.search);
        const _want = _params.get('tab');
        if (_want === '2') {
            document.querySelectorAll('.tab-button').forEach(b =>
                b.classList.toggle('active', b.dataset.tab === 'tab2'));
            document.querySelectorAll('.tab-content').forEach(c =>
                c.classList.toggle('active', c.id === 'tab2'));
            sendHeightDebounced();
        }

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
    const res = await fetch('data/processed/countries_simplified.geojson');
    if (!res.ok) throw new Error('countries_simplified.geojson not found');
    worldGeoJSON = await res.json();
    labData = await buildLabData();
}

async function buildLabData() {
    // Compute Dorling layout (circles sized by transport CO2e) from loaded data
    const allCountries = dashboardData ? dashboardData.tab1.countries : {};
    const W = 960, H = 520;

    function project(lon, lat) {
        return [(lon + 180) / 360 * W, (90 - lat) / 180 * H * 1.15 - 30];
    }
    function ringCentroid(coords) {
        const xs = coords.map(p => p[0]), ys = coords.map(p => p[1]);
        return [xs.reduce((a,b) => a+b,0)/xs.length, ys.reduce((a,b) => a+b,0)/ys.length];
    }
    function featCentroid(geom) {
        if (geom.type === 'Polygon') return ringCentroid(geom.coordinates[0]);
        const best = geom.coordinates.reduce((a,b) => a[0].length>b[0].length?a:b);
        return ringCentroid(best[0]);
    }

    const centroids = {};
    worldGeoJSON.features.forEach(f => {
        try {
            const c = featCentroid(f.geometry);
            ['ISO_A3','ADM0_A3','BRK_A3'].forEach(k => {
                const v = f.properties[k];
                if (v && v !== '-99') centroids[v] = centroids[v] || c;
            });
        } catch(e) {}
    });
    centroids['EEU'] = [10.0, 50.5];
    centroids['XKX'] = [20.9, 42.6];

    const worldTransport = Object.values(allCountries)
        .filter(c => c.iso3 !== 'EEU')
        .reduce((s,c) => s + (c.ghg_transport || 0), 0) || 7123;

    const maxMt = Math.max(...Object.values(allCountries).map(c => c.ghg_transport || 0));
    const K = 46 / Math.sqrt(maxMt || 1);

    const nodes = [];
    Object.entries(allCountries).forEach(([code, c]) => {
        if (code === 'EEU') return;  // skip collective EU — show members individually
        if (!centroids[code]) return;
        const mt = c.ghg_transport || 0;
        // If no CO2 data yet, use equal size (6px) as fallback
        const r = mt > 0 ? Math.max(2.5, K * Math.sqrt(mt)) : 6;
        const [x, y] = project(...centroids[code]);
        nodes.push({ code, x, y, r, mt });
    });

    // Collision relaxation
    for (let iter = 0; iter < 180; iter++) {
        let moved = false;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i+1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = b.x-a.x, dy = b.y-a.y;
                const d = Math.hypot(dx,dy) || 0.001;
                const overlap = a.r + b.r + 0.6 - d;
                if (overlap > 0) {
                    const ux = dx/d, uy = dy/d;
                    const wa = b.r/(a.r+b.r);
                    a.x -= ux*overlap*wa;   a.y -= uy*overlap*wa;
                    b.x += ux*overlap*(1-wa); b.y += uy*overlap*(1-wa);
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }

    const dorling = {};
    nodes.forEach(n => { dorling[n.code] = {x:n.x, y:n.y, r:n.r, mt:n.mt}; });

    return { centroids, dorling, worldTransport, W, H };
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

    // SVG maps — no Leaflet needed


    document.getElementById('tab1-region').addEventListener('change', renderTab1);
    document.getElementById('tab1-map-region').addEventListener('change', () => {
        const region = document.getElementById('tab1-map-region').value;
        renderTab1SvgMap(region);
        updateTab1MapLabel(region);
    });
    document.querySelectorAll('#tab1-map-type-toggle .map-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            tab1MapType = btn.dataset.maptype;
            document.querySelectorAll('#tab1-map-type-toggle .map-type-btn')
                .forEach(b => b.classList.toggle('active', b === btn));
            renderTab1SvgMap(document.getElementById('tab1-map-region').value);
        });
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
        // Sync toggle button to current mapType state
        document.querySelectorAll('#tab1-map-type-toggle .map-type-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.maptype === tab1MapType));
        setTimeout(() => {
            const region = document.getElementById('tab1-map-region').value;
            renderTab1SvgMap(region);
            updateTab1MapLabel(region);
        }, 60);
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
    renderTab1SvgMap(mapRegion);
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
                        font: { family: 'Source Sans 3', size: 13, weight: 600 },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                    },
                },
                tooltip: {
                    backgroundColor: 'rgba(0,61,92,0.95)',
                    titleFont: { family: 'Source Sans 3', size: 13, weight: 700 },
                    bodyFont:  { family: 'Source Sans 3', size: 13 },
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
                    ticks: { font: { family: 'Source Sans 3', size: 13 } },
                },
                y: {
                    stacked: true,
                    min: 0, max: 100,
                    grid: { color: '#E8ECF0' },
                    ticks: {
                        callback: v => v + '%',
                        font: { family: 'Source Sans 3', size: 12 },
                    },
                    title: {
                        display: true,
                        text: '% of NDCs submitted in that generation',
                        font: { family: 'Source Sans 3', size: 12, weight: 600 },
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

function renderTab1SvgMap(region) {
    if (!labData) return;
    const allCountries = dashboardData.tab1.countries;

    // update label counts
    const filtered = Object.values(allCountries).filter(c =>
        (region === 'all' || c.region === region) && !c.covered_by_eu && c.latest_active_gen);
    const euCd = allCountries['EEU'];
    const includeEU = euCd && (region === 'all' || region === 'Europe');
    const greenCount     = filtered.filter(c => c.latest_has_transport).length + (includeEU && euCd.latest_has_transport ? 1 : 0);
    const lightblueCount = filtered.filter(c => c.had_transport_previously).length;
    const greyCount      = filtered.filter(c => !c.latest_has_transport && !c.had_transport_previously).length + (includeEU && !euCd.latest_has_transport ? 1 : 0);
    const regionLine = region === 'all' ? 'Region: All regions' : `Region: ${region}`;
    const labelEl = document.getElementById('tab1-map-label');
    if (labelEl) labelEl.innerHTML = `<span class="cs-header">Currently showing</span>${regionLine}<br>Transport target in latest active NDC: <strong>${greenCount} NDCs</strong><br>Transport target in a previous NDC: <strong>${lightblueCount} NDCs</strong><br>No transport target in any NDC: <strong>${greyCount} NDCs</strong>`;

    const tipFn = (code, cd) => {
        if (!cd) return `<strong>${code}</strong><br><span class="tt-tag">No NDC submitted</span>`;
        const gens = cd.generations || {};
        const genLines = ['gen1','gen2','gen3'].filter(g => gens[g]).map(g => {
            const lbl = {gen1:'1st',gen2:'2nd',gen3:'3rd'}[g];
            const ok = gens[g].has_transport;
            return `${ok?'✓':'✗'} ${lbl} NDC: ${ok?'transport target':'no transport target'}`;
        }).join('<br>');
        let status = '';
        if (cd.latest_has_transport) status = '<span class="tt-tag">✓ Transport target in latest NDC</span>';
        else if (cd.had_transport_previously) status = '<span class="tt-tag">⚠ Had target previously, not in latest</span>';
        else if (cd.latest_active_gen) status = '<span class="tt-tag">✗ No transport target</span>';
        const euNote = cd.covered_by_eu ? '<br><em>Reports collectively through the EU NDC</em>' : '';
        // CO2 data — shown in Dorling view where size represents emissions
        const d = labData.dorling[code];
        const co2Line = (tab1MapType === 'dorling' && d && d.mt)
            ? `<br><strong>${d.mt.toLocaleString('en-US', {maximumFractionDigits:1})} Mt</strong> transport CO₂e · ${((d.mt / (labData.worldTransport||7123))*100).toFixed(1)}% of global transport`
            : '';
        return `<strong>${cd.name || code}</strong>${euNote}${co2Line}<br>${genLines}<br>${status}`;
    };

    const colorFn = (cd) => {
        if (!cd) return '#F2F2F2';
        if (cd.latest_has_transport) return '#9DBE3D';
        if (cd.had_transport_previously) return '#7EC8E3';
        if (cd.latest_active_gen) return '#C8D8E8';
        return '#ECECEC';
    };

    if (tab1MapType === 'dots') {
        renderDotsMap('tab1-svg-map', colorFn, tipFn, region, allCountries);
    } else {
        renderDorlingMap('tab1-svg-map', colorFn, null, tipFn, region, allCountries);
    }
    // Toggle the Dorling note in the legend
    const dorlingNote = document.getElementById('tab1-dorling-note');
    if (dorlingNote) dorlingNote.style.display = tab1MapType === 'dorling' ? '' : 'none';
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
            renderTab2SvgMap();
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
        renderTab2SvgMap();
        updateMapLabel();
    });

    document.getElementById('tab2-chart-region').addEventListener('change', renderTab2Chart);
    document.getElementById('tab2-map-region').addEventListener('change', () => {
        renderTab2SvgMap();
        updateMapLabel();
    });
    // Tab 2 always uses dots map — no toggle needed

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
            renderTab2SvgMap();
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
                    renderTab2SvgMap();
                    updateMapLabel();
                }, 60);
            }
        });
    });

    // SVG maps — no Leaflet needed


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
                    labels: { font: { family: 'Source Sans 3', size: 13, weight: 600 }, padding: 20, usePointStyle: true, pointStyle: 'rectRounded' },
                },
                tooltip: {
                    backgroundColor: 'rgba(0,61,92,0.95)',
                    titleFont: { family: 'Source Sans 3', size: 13, weight: 700 },
                    bodyFont:  { family: 'Source Sans 3', size: 13 },
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
                    ticks: { font: { family: 'Source Sans 3', size: 11 }, maxRotation: 25, minRotation: 0 },
                },
                y: {
                    beginAtZero: true, grid: { color: '#E8ECF0' },
                    ticks: { font: { family: 'Source Sans 3', size: 12 } },
                    title: { display: true, text: 'Total measures count', font: { family: 'Source Sans 3', size: 12, weight: 600 }, color: '#6B7280' },
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

function renderTab2SvgMap() {
    if (!labData) return;
    const allCountries   = dashboardData.tab1.countries;
    const countryGenCats = dashboardData.tab2.country_gen_cats;
    const clc            = dashboardData.tab2.country_latest_cats;
    const cfg            = GEN_CONFIG[mapActiveGen];
    const region         = document.getElementById('tab2-map-region')?.value || 'all';
    const showAll        = mapActiveCats.has('all');
    const selectedCats   = showAll ? CATEGORIES_ORDER : [...mapActiveCats];

    const countryTotals = {};
    Object.keys(allCountries).forEach(code => {
        const cd = allCountries[code];
        if (region !== 'all' && cd?.region !== region) return;
        const cats = mapActiveGen === 'latest'
            ? (clc[code] || {})
            : (countryGenCats[code]?.[mapActiveGen] || {});
        countryTotals[code] = selectedCats.reduce((s,c) => s + (cats[c] || 0), 0);
    });
    const maxVal = Math.max(...Object.values(countryTotals), 1);

    const hex = cfg.color.replace('#','');
    const tr=parseInt(hex.slice(0,2),16), tg=parseInt(hex.slice(2,4),16), tb=parseInt(hex.slice(4,6),16);
    function heat(val) {
        if (!val) return '#f0f0f0';
        const t = Math.pow(val/maxVal, 0.6);
        return `rgb(${Math.round(255+(tr-255)*t)},${Math.round(255+(tg-255)*t)},${Math.round(255+(tb-255)*t)})`;
    }

    const colorFn = (cd) => {
        if (!cd) return '#FFFFFF';
        const hasNdc = mapActiveGen === 'latest' ? !!cd.latest_active_gen : !!cd.generations?.[mapActiveGen];
        if (!hasNdc) return '#FFFFFF';
        const val = countryTotals[cd.iso3] || 0;
        if (!val) return '#E8E8E8';
        return heat(val);
    };

    const tipFn = (code, cd) => {
        if (!cd) return `<strong>${code}</strong><br><span class="tt-tag">No NDC submitted</span>`;
        const total = countryTotals[code] || 0;
        const hasNdc = mapActiveGen === 'latest' ? !!cd.latest_active_gen : !!cd.generations?.[mapActiveGen];
        const genLabel = GEN_LABELS[mapActiveGen];
        let body = hasNdc ? `<strong>Mentions: ${total}</strong>` : `<em>No ${genLabel} on record</em>`;
        if (hasNdc && total > 0) {
            const cats = mapActiveGen === 'latest' ? (clc[code] || {}) : (countryGenCats[code]?.[mapActiveGen] || {});
            body += '<br>' + selectedCats.filter(c => cats[c] > 0).map(c => `${c}: <b>${cats[c]}</b>`).join('<br>');
        }
        const euNote = cd.covered_by_eu ? '<br><em>Reports collectively through EU NDC</em>' : '';
        return `<strong>${cd.name || code}</strong> — ${genLabel}${euNote}<br>${body}`;
    };

    // Tab 2 always uses dots (no toggle)
    renderDotsMap('tab2-svg-map', colorFn, tipFn, region, allCountries);
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
// ============================================================================
// SVG MAP RENDERERS — Dorling + Dots (replaces Leaflet for both tabs)
// ============================================================================

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
    return el;
}

// Shared tooltip element
const mapTooltip = (() => {
    const el = document.createElement('div');
    el.className = 'svg-map-tooltip';
    document.body.appendChild(el);
    return el;
})();

function showMapTip(e, html) {
    mapTooltip.innerHTML = html;
    mapTooltip.style.display = 'block';
    mapTooltip.style.left = Math.min(e.clientX + 14, innerWidth - 260) + 'px';
    mapTooltip.style.top = (e.clientY + 14) + 'px';
}
function hideMapTip() { mapTooltip.style.display = 'none'; }

// Status colors for Tab 1
function tab1Color(cd) {
    if (!cd) return '#F2F2F2';
    if (cd.latest_has_transport) return '#9DBE3D';
    if (cd.had_transport_previously) return '#7EC8E3';
    if (cd.latest_active_gen) return '#C8D8E8';
    return '#ECECEC';
}

// Heat color for Tab 2
function heatColor(val, maxVal, genColor) {
    if (!val) return '#f0f0f0';
    const hex = genColor.replace('#','');
    const tr=parseInt(hex.slice(0,2),16), tg=parseInt(hex.slice(2,4),16), tb=parseInt(hex.slice(4,6),16);
    const t = Math.pow(val/maxVal, 0.6);
    return `rgb(${Math.round(255+(tr-255)*t)},${Math.round(255+(tg-255)*t)},${Math.round(255+(tb-255)*t)})`;
}

// ── Shared: pan+zoom SVG wrapper ─────────────────────────────────────────
function makePannable(svg) {
    let dragging = false, startX, startY, ox = 0, oy = 0, scale = 1;
    const g = svg.querySelector('g.pan-group');
    if (!g) return;

    const VW = parseFloat(svg.getAttribute('viewBox').split(' ')[2]);
    const VH = parseFloat(svg.getAttribute('viewBox').split(' ')[3]);

    function applyTransform() {
        g.setAttribute('transform', `translate(${ox},${oy}) scale(${scale})`);
    }

    svg.addEventListener('mousedown', e => {
        dragging = true; startX = e.clientX - ox; startY = e.clientY - oy;
        svg.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
        if (!dragging) return;
        ox = e.clientX - startX; oy = e.clientY - startY;
        applyTransform();
    });
    window.addEventListener('mouseup', () => {
        dragging = false; svg.style.cursor = 'grab';
    });

    // Touch pan
    let t0;
    svg.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        t0 = e.touches[0]; dragging = true;
        startX = t0.clientX - ox; startY = t0.clientY - oy;
    }, {passive:true});
    svg.addEventListener('touchmove', e => {
        if (!dragging || e.touches.length !== 1) return;
        ox = e.touches[0].clientX - startX; oy = e.touches[0].clientY - startY;
        applyTransform();
    }, {passive:true});
    svg.addEventListener('touchend', () => { dragging = false; });

    // Scroll to zoom
    svg.addEventListener('wheel', e => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width  * VW;
        const my = (e.clientY - rect.top)  / rect.height * VH;
        const delta = e.deltaY < 0 ? 1.15 : 0.87;
        const newScale = Math.min(8, Math.max(0.5, scale * delta));
        ox = mx - (mx - ox) * (newScale / scale);
        oy = my - (my - oy) * (newScale / scale);
        scale = newScale;
        applyTransform();
    }, {passive:false});

    svg.style.cursor = 'grab';
    applyTransform();
}

// Region bounding boxes for zoom-to-region
const REGION_BOUNDS = {
    'Africa':                         { x1: -20, y1: -35, x2: 52,  y2: 37  },
    'Asia':                           { x1: 25,  y1: -10, x2: 145, y2: 55  },
    'Europe':                         { x1: -10, y1: 35,  x2: 40,  y2: 70  },
    'Latin America and the Caribbean':{ x1: -85, y1: -55, x2: -34, y2: 25  },
    'Northern America':               { x1:-170, y1: 15,  x2: -55, y2: 72  },
    'Oceania':                        { x1: 110, y1: -47, x2: 180, y2: 5   },
};

function zoomToRegionSvg(svg, region, VW, VH) {
    const b = REGION_BOUNDS[region];
    if (!b) return; // 'all' — no zoom
    const g = svg.querySelector('g.pan-group');
    if (!g) return;

    const px1 = (b.x1 + 180) / 360 * VW;
    const px2 = (b.x2 + 180) / 360 * VW;
    const py1 = (90 - b.y2) / 180 * VH;
    const py2 = (90 - b.y1) / 180 * VH;
    const bw = px2 - px1, bh = py2 - py1;

    // Compute scale to fit bounding box with padding
    const pad = 0.85;
    const scale = Math.min(VW / bw, VH / bh) * pad;
    const ox = VW/2 - (px1 + bw/2) * scale;
    const oy = VH/2 - (py1 + bh/2) * scale;

    g.style.transition = 'transform 0.45s ease';
    g.setAttribute('transform', `translate(${ox},${oy}) scale(${scale})`);
    setTimeout(() => { g.style.transition = ''; }, 500);
}

// ── Dots renderer: borderless land + equal dots + pan/zoom ────────────────
function renderDotsMap(containerId, colorFn, tipFn, region, allCountries) {
    if (!worldGeoJSON || !labData) return;
    const W = 960, H = 480;
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const svg = svgEl('svg', {viewBox: `0 0 ${W} ${H}`, width: '100%',
        role: 'img', style: 'display:block'});
    const g = svgEl('g', {'class': 'pan-group'});
    svg.appendChild(g);

    const regionCodes = region === 'all' ? null :
        new Set(Object.values(allCountries).filter(c => c.region === region).map(c => c.iso3));

    const toPath = rings => rings.map(ring =>
        'M' + ring.map(p => {
            const x = (p[0] + 180) / 360 * W;
            const y = (90 - p[1]) / 180 * H;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join('L') + 'Z').join('');

    worldGeoJSON.features.forEach(f => {
        const iso = f.properties.ISO_A3 || f.properties.ADM0_A3;
        const inRegion = !regionCodes || regionCodes.has(iso);
        const polys = f.geometry.type === 'Polygon'
            ? [f.geometry.coordinates] : f.geometry.coordinates;
        polys.forEach(rings => {
            g.appendChild(svgEl('path', { d: toPath(rings),
                fill: '#E7ECEF', opacity: inRegion ? 1 : 0.35, stroke: 'none' }));
        });
    });

    Object.entries(allCountries).forEach(([code, cd]) => {
        if (code === 'EEU') return;  // skip collective — show members individually
        const cent = labData.centroids[code];
        if (!cent) return;
        const x = (cent[0] + 180) / 360 * W;
        const y = (90 - cent[1]) / 180 * H;
        const inRegion = region === 'all' || cd.region === region;
        const dot = svgEl('circle', {
            cx: x, cy: y, r: 5,
            fill: colorFn(cd), opacity: inRegion ? 1 : 0.25,
            stroke: '#fff', 'stroke-width': 1.2, style: 'cursor:pointer'
        });
        const tipHtml = tipFn(code, cd);
        dot.addEventListener('mousemove', e => showMapTip(e, tipHtml));
        dot.addEventListener('mouseleave', hideMapTip);
        g.appendChild(dot);
    });

    container.appendChild(svg);
    makePannable(svg);
    if (region !== 'all') zoomToRegionSvg(svg, region, W, H);
}

// ── Dorling renderer: land silhouette + CO₂-sized circles + pan/zoom ──────
function renderDorlingMap(containerId, colorFn, sizeFn, tipFn, region, allCountries) {
    if (!labData) return;
    const {dorling, W, H} = labData;
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const VH = H + 60;
    const svg = svgEl('svg', {viewBox: `0 0 ${W} ${VH}`, width: '100%',
        role: 'img', style: 'display:block'});
    const g = svgEl('g', {'class': 'pan-group'});
    svg.appendChild(g);

    const regionCodes = region === 'all' ? null :
        new Set(Object.values(allCountries).filter(c => c.region === region).map(c => c.iso3));

    // Land silhouette — same projection as Dots, offset by 30px vertically
    // to align with the Dorling circle positions
    if (worldGeoJSON) {
        worldGeoJSON.features.forEach(f => {
            const polys = f.geometry.type === 'Polygon'
                ? [f.geometry.coordinates] : f.geometry.coordinates;
            polys.forEach(rings => {
                const d = rings.map(ring =>
                    'M' + ring.map(p => {
                        const x = (p[0] + 180) / 360 * W;
                        const y = (90 - p[1]) / 180 * H * 1.15 - 30 + 30;
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                    }).join('L') + 'Z').join('');
                g.appendChild(svgEl('path', {
                    d, fill: '#EDF0F2', stroke: 'none', opacity: 0.65
                }));
            });
        });
    }

    // Circles — sorted largest first so small ones render on top
    const entries = Object.entries(dorling).sort((a,b) => b[1].r - a[1].r);
    entries.forEach(([code, d]) => {
        const cd = allCountries[code];
        const inRegion = !regionCodes || regionCodes.has(code);
        const r = sizeFn ? sizeFn(d, cd) : d.r;
        if (!r || r < 0.5) return;

        const circ = svgEl('circle', {
            cx: d.x, cy: d.y + 30, r,
            fill: colorFn(cd), 'fill-opacity': inRegion ? 0.9 : 0.2,
            stroke: '#fff', 'stroke-width': 1, style: 'cursor:pointer'
        });
        const tipHtml = tipFn(code, cd);
        circ.addEventListener('mousemove', e => showMapTip(e, tipHtml));
        circ.addEventListener('mouseleave', hideMapTip);
        g.appendChild(circ);

        if (r > 14 && inRegion) {
            const label = svgEl('text', {
                x: d.x, y: d.y + 33,
                'text-anchor': 'middle',
                'font-size': Math.min(12, r / 2.2).toFixed(1),
                fill: '#fff', 'font-weight': 700, 'pointer-events': 'none',
                'font-family': "'Source Sans 3', sans-serif"
            });
            label.textContent = code;
            g.appendChild(label);
        }
    });

    container.appendChild(svg);
    makePannable(svg);
    if (region !== 'all') zoomToRegionSvg(svg, region, W, H * 1.15);
}

// ── TAB 1 SVG map ──────────────────────────────────────────────────────────
