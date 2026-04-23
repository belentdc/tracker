// ============================================================================
// NDC Transport Tracker — Main JavaScript
// ============================================================================

let dashboardData = null;
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

// ============================================================================
// Boot
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadData(), loadGeoJSON()]);
        initializeTabs();
        initializeTooltips();
        initializeTab1();
        initializeTab2();
        document.getElementById('loading').classList.add('hidden');
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

async function loadGeoJSON() {
    const res = await fetch('data/processed/countries.geojson');
    if (!res.ok) throw new Error('countries.geojson not found');
    worldGeoJSON = await res.json();
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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd', maxZoom: 19,
    }).addTo(tab1Map);

    document.getElementById('tab1-region').addEventListener('change', renderTab1);
    document.getElementById('tab1-download').addEventListener('click', () => downloadPDF('tab1'));

    renderTab1();
}

function switchTab1View(view) {
    document.querySelectorAll('#tab1 .toggle-button').forEach(b =>
        b.classList.toggle('active', b.dataset.view === view));
    document.getElementById('tab1-chart-view').classList.toggle('hidden', view !== 'chart');
    document.getElementById('tab1-map-view').classList.toggle('hidden', view !== 'map');
    if (view === 'map') setTimeout(() => tab1Map && tab1Map.invalidateSize(), 120);
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
    const region   = document.getElementById('tab1-region').value;
    const genStats = getTab1GenStats(region);
    renderTab1Subtitle(region, genStats);
    renderTab1Chart(genStats);
    renderTab1Map(region);
}

function renderTab1Subtitle(region, genStats) {
    const el = document.getElementById('tab1-chart-subtitle');
    if (!el) return;
    if (region === 'all') {
        el.textContent = 'Showing all regions — each bar represents 100% of NDCs submitted in that generation';
    } else {
        const parts = ['gen1','gen2','gen3'].map(g =>
            `${genStats[g].name}: ${genStats[g].submitted} NDCs`
        ).join(' · ');
        el.textContent = `Showing ${region} — ${parts}`;
    }
}

function renderTab1Chart(genStats) {
    const ctx = document.getElementById('tab1-chart').getContext('2d');
    if (tab1Chart) tab1Chart.destroy();

    const gens   = ['gen1', 'gen2', 'gen3'];
    const labels = gens.map(g => `${genStats[g].name}\n(${genStats[g].period})`);

    // Percentages for 100% stacked bar
    const pctTransport  = gens.map(g =>
        genStats[g].submitted ? +((genStats[g].withTransport / genStats[g].submitted) * 100).toFixed(1) : 0
    );
    const pctNoTransport = gens.map((g, i) =>
        +(100 - pctTransport[i]).toFixed(1)
    );

    // Growth annotations between bars
    const growth1to2 = (pctTransport[1] - pctTransport[0]).toFixed(1);
    const growth2to3 = (pctTransport[2] - pctTransport[1]).toFixed(1);
    const fmt = v => (v >= 0 ? `+${v}pp` : `${v}pp`);

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
                    barPercentage: 0.6,
                    stack: 'stack',
                },
                {
                    label: 'Without transport targets',
                    data: pctNoTransport,
                    backgroundColor: '#C8D8E8',
                    borderColor: '#8AAEC8',
                    borderWidth: 1,
                    borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 5, bottomRight: 5 },
                    barPercentage: 0.6,
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
                        afterBody(items) {
                            const idx = items[0].dataIndex;
                            if (idx === 1) return [`  Growth from 1st gen: ${fmt(growth1to2)}`];
                            if (idx === 2) return [`  Growth from 2nd gen: ${fmt(growth2to3)}`];
                            return [];
                        },
                    },
                },
                // Custom plugin to draw % labels on bars and growth arrows
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
        // Custom plugin: draw % value inside green bar + growth arrows between bars
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

                // Growth arrows between bars
                const drawGrowth = (i1, i2, label) => {
                    const b1 = meta0.data[i1];
                    const b2 = meta0.data[i2];
                    if (!b1 || !b2) return;
                    const x  = (b1.x + b2.x) / 2;
                    const y  = Math.min(b1.y, b2.y) - 22;
                    const val = parseFloat(label);
                    ctx2.fillStyle = val >= 0 ? '#5a7020' : '#c0392b';
                    ctx2.font = 'bold 12px IBM Plex Sans, sans-serif';
                    ctx2.fillText(label, x, y);
                };

                drawGrowth(0, 1, fmt(growth1to2));
                drawGrowth(1, 2, fmt(growth2to3));

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

    tab1GeoLayer = L.geoJSON(worldGeoJSON, {
        style(feature) {
            const iso3     = feature.properties.iso_a3;
            const cd       = allCountries[iso3];
            const inRegion = region === 'all' || regionCodes.has(iso3);

            if (!cd) {
                // No NDC submitted — white with dashed border
                return {
                    fillColor: '#FFFFFF',
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
                <div class="popup-title">${cd.name}</div>
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
        mapActiveGen = 'latest';
        document.querySelectorAll('#tab2-map-gen-toggles .gen-toggle').forEach(b =>
            b.classList.toggle('active', b.dataset.gen === 'latest'));
        document.getElementById('tab2-map-category').value = 'all';
        document.getElementById('tab2-map-region').value = 'all';
        updateMapGradientColor();
        renderTab2Map();
        updateMapLabel();
    });

    document.getElementById('tab2-chart-region').addEventListener('change', renderTab2Chart);
    document.getElementById('tab2-map-category').addEventListener('change', () => { renderTab2Map(); updateMapLabel(); });
    document.getElementById('tab2-map-region').addEventListener('change', renderTab2Map);

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
                setTimeout(() => { tab2Map && tab2Map.invalidateSize(); renderTab2Map(); updateMapLabel(); }, 120);
            }
        });
    });

    tab2Map = L.map('tab2-map', { zoomControl: true, scrollWheelZoom: false }).setView([20, 10], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd', maxZoom: 19,
    }).addTo(tab2Map);

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
    const genCounts = dashboardData.metadata.gen_counts;
    const parts     = selectedGens.map(gen => {
        const c = genCounts[gen];
        if (gen === 'latest') return `Latest Active: 169 NDCs`;
        return `${GEN_LABELS[gen]}: ${c.active + c.archived} NDCs (${c.active} active, ${c.archived} archived)`;
    });
    const suffix = selectedGens.some(g => g !== 'latest')
        ? ' — includes active and archived NDCs from each round' : '';
    return parts.join(' · ') + suffix;
}

function renderTab2Chart() {
    const region = document.getElementById('tab2-chart-region').value;
    const data   = getTab2ChartData(chartActiveGens, region);

    document.getElementById('tab2-chart-subtitle').textContent = buildChartSubtitle(chartActiveGens);

    const ctx = document.getElementById('tab2-chart').getContext('2d');
    if (tab2Chart) tab2Chart.destroy();

    const activeCats = CATEGORIES_ORDER.filter(cat =>
        chartActiveGens.some(gen => data[gen]?.[cat]?.countries?.size > 0));
    if (!activeCats.length) return;

    const catLgb   = dashboardData.tab2.cat_latest_gen_breakdown;
    const catGenAA = dashboardData.tab2.cat_gen_active_archived;

    const datasets = chartActiveGens.map(gen => {
        const cfg = GEN_CONFIG[gen];
        return {
            label: cfg.label,
            data: activeCats.map(cat => data[gen]?.[cat]?.countries?.size || 0),
            backgroundColor: cfg.color + 'CC',
            borderColor: cfg.border,
            borderWidth: 1.5,
            borderRadius: 4,
            barPercentage: chartActiveGens.length === 1 ? 0.5 : 0.85,
        };
    });

    tab2Chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: activeCats, datasets },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartActiveGens.length > 1,
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
                            const gen   = chartActiveGens[ctx.datasetIndex];
                            const cat   = activeCats[ctx.dataIndex];
                            const entry = data[gen]?.[cat];
                            const ndcs  = entry?.countries?.size || 0;
                            const ment  = entry?.mentions || 0;
                            const lines = [];
                            if (gen === 'latest') {
                                const lgb = catLgb[cat];
                                lines.push(`  ${GEN_CONFIG[gen].label}: ${ndcs} NDCs`);
                                if (lgb) {
                                    lines.push(`    · ${lgb.gen1_count} from 1st generation`);
                                    lines.push(`    · ${lgb.gen2_count} from 2nd generation`);
                                    lines.push(`    · ${lgb.gen3_count} from 3rd generation`);
                                }
                            } else {
                                const aa = catGenAA?.[gen]?.[cat];
                                lines.push(`  ${GEN_CONFIG[gen].label}: ${ndcs} NDCs`);
                                if (aa) {
                                    lines.push(`    · ${aa.active_countries} from active NDCs`);
                                    lines.push(`    · ${aa.archived_countries} from archived NDCs`);
                                }
                            }
                            lines.push(`  Total mentions: ${ment}`);
                            return lines;
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true, grid: { color: '#E8ECF0' },
                    ticks: { font: { family: 'IBM Plex Sans', size: 12 } },
                    title: { display: true, text: 'Number of NDCs', font: { family: 'IBM Plex Sans', size: 12, weight: 600 }, color: '#6B7280' },
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { family: 'IBM Plex Sans', size: 13 } },
                },
            },
        },
    });
}

// ── Map ────────────────────────────────────────────────────────────────────
function updateMapLabel() {
    const cat      = document.getElementById('tab2-map-category').value;
    const genLabel = GEN_LABELS[mapActiveGen];
    const catLabel = cat === 'all' ? `All categories (${ALL_CATEGORIES_TEXT})` : cat;
    document.getElementById('tab2-map-label').textContent =
        `Currently showing: ${genLabel} — ${catLabel}`;
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
    const cat            = document.getElementById('tab2-map-category').value;
    const region         = document.getElementById('tab2-map-region').value;
    const cfg            = GEN_CONFIG[mapActiveGen];

    const countryTotals = {};
    Object.keys(allCountries).forEach(code => {
        const country = allCountries[code];
        if (region !== 'all' && country?.region !== region) return;
        const cats = mapActiveGen === 'latest'
            ? (clc[code] || {})
            : (countryGenCats[code]?.[mapActiveGen] || {});
        const val = cat === 'all'
            ? Object.values(cats).reduce((a, b) => a + b, 0)
            : (cats[cat] || 0);
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
            const inRegion = region === 'all' || regionCodes.has(iso3);
            const val      = countryTotals[iso3] || 0;
            if (!cd) return { fillColor: '#ECECEC', fillOpacity: 0.4, color: '#ccc', weight: 0.5 };
            return {
                fillColor:   heatColor(val),
                fillOpacity: inRegion ? 0.85 : 0.15,
                color:       inRegion ? cfg.border : '#ccc',
                weight:      inRegion ? 0.7 : 0.4,
            };
        },
        onEachFeature(feature, layer) {
            const iso3 = feature.properties.iso_a3;
            const cd   = allCountries[iso3];
            if (!cd) return;

            const inRegion = region === 'all' || regionCodes.has(iso3);
            const total    = countryTotals[iso3] || 0;
            const genLabel = GEN_LABELS[mapActiveGen];

            let popupBody = '';
            if (cat === 'all') {
                const cats = mapActiveGen === 'latest'
                    ? (clc[iso3] || {})
                    : (countryGenCats[iso3]?.[mapActiveGen] || {});
                const topCats = Object.entries(cats)
                    .sort((a,b) => b[1]-a[1]).slice(0,3)
                    .map(([c,n]) => `<div style="font-size:0.8rem;color:#555">${c}: <b>${n}</b></div>`)
                    .join('');
                popupBody = `<div><strong>Total mentions: ${total}</strong></div>${topCats}`;
            } else {
                popupBody = `<div><strong>${cat}: ${total} mention${total !== 1 ? 's' : ''}</strong></div>`;
            }

            const euNote = cd.covered_by_eu
                ? `<div style="font-size:0.8rem;color:#6B7280;margin-top:4px;font-style:italic">Reports collectively through the EU NDC</div>`
                : '';

            layer.bindPopup(`
                <div class="popup-title">${cd.name} — ${genLabel}</div>
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
// PDF Export
// ============================================================================
async function downloadPDF(tabId) {
    const btn      = document.getElementById(`${tabId}-download`);
    const origHTML = btn.innerHTML;
    btn.disabled   = true;
    btn.textContent = 'Generating…';
    try {
        const { jsPDF } = window.jspdf;
        const pdf   = new jsPDF('l', 'mm', 'a4');
        const title = tabId === 'tab1'
            ? 'Progress in NDC Transport Targets'
            : 'Leading Measures for Decarbonisation';
        pdf.setFont('helvetica','bold'); pdf.setFontSize(16); pdf.setTextColor(0,61,92);
        pdf.text(title, 14, 16);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(110,110,110);
        pdf.text(`${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} — GIZ-SLOCAT Transport Tracker`, 14, 23);
        const el      = document.querySelector(`#${tabId} .visualization-container:not(.hidden)`);
        const canvas  = await html2canvas(el, { scale:1.5, useCORS:true, logging:false });
        const imgData = canvas.toDataURL('image/png');
        const pageW   = 297 - 28;
        const imgH    = (canvas.height * pageW) / canvas.width;
        pdf.addImage(imgData, 'PNG', 14, 28, pageW, imgH);
        pdf.save(`ndc-tracker-${tabId}-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
        console.error('PDF error:', err);
        alert('Could not generate PDF. Please try again.');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = origHTML;
    }
}
