// ============================================================================
// NDC Transport Tracker — Main JavaScript
// ============================================================================

let dashboardData = null;
let worldGeoJSON    = null;
let tab1Chart       = null;
let tab2Chart       = null;
let tab1Map         = null;
let tab2Map         = null;
let tab1GeoLayer    = null;
let tab2GeoLayer    = null;

// Generation colour palette
const GEN_CONFIG = {
    latest : { label: 'Latest Active NDC', color: '#9DBE3D', border: '#7A9B2E' },
    gen1   : { label: '1st Generation',    color: '#003D5C', border: '#002840' },
    gen2   : { label: '2nd Generation',    color: '#00A4BD', border: '#007d8f' },
    gen3   : { label: '3rd Generation',    color: '#E8821A', border: '#b86010' },
};

const CATEGORIES_ORDER = [
    'Electrification',
    'Mode shift and demand management',
    'Transport system improvements',
    'Energy efficiency',
    'Alternative fuels',
    'Aviation and maritime',
];

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
            '<p style="color:#c0392b;font-family:sans-serif">Error loading data. Please refresh.</p>';
    }
});

// ============================================================================
// Data loaders
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
    document.querySelectorAll('.info-tooltip').forEach(btn => {
        btn.addEventListener('click', () =>
            document.getElementById(`tooltip-${btn.dataset.tooltip}`).classList.add('active'));
    });
    document.querySelectorAll('.tooltip-close').forEach(btn =>
        btn.addEventListener('click', () =>
            btn.closest('.tooltip-modal').classList.remove('active')));
    document.querySelectorAll('.tooltip-modal').forEach(modal =>
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.remove('active');
        }));
}

// ============================================================================
// View toggle (chart <-> map) — shared helper
// ============================================================================
function setupViewToggle(tabId) {
    document.querySelectorAll(`#${tabId} .toggle-button`).forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll(`#${tabId} .toggle-button`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const isMap = btn.dataset.view === 'map';
            document.getElementById(`${tabId}-chart-view`).classList.toggle('hidden', isMap);
            document.getElementById(`${tabId}-map-view`).classList.toggle('hidden', !isMap);
            if (isMap) {
                setTimeout(() => {
                    if (tabId === 'tab1' && tab1Map) tab1Map.invalidateSize();
                    if (tabId === 'tab2' && tab2Map) tab2Map.invalidateSize();
                }, 120);
            }
        });
    });
}

// ============================================================================
// TAB 1 — Progress in NDC Transport Targets
// ============================================================================
function initializeTab1() {
    setupViewToggle('tab1');

    tab1Map = L.map('tab1-map', { zoomControl: true, scrollWheelZoom: false }).setView([20, 10], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd', maxZoom: 19,
    }).addTo(tab1Map);

    document.getElementById('tab1-region').addEventListener('change', renderTab1);
    document.getElementById('tab1-download').addEventListener('click', () => downloadPDF('tab1'));

    renderTab1();
}

function getTab1GenStats(region) {
    const countries = dashboardData.tab1.countries;
    const gensMeta  = dashboardData.tab1.generations;
    const result    = {};

    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        let submitted = 0, withTransport = 0;
        Object.values(countries).forEach(c => {
            if (region !== 'all' && c.region !== region) return;
            if (!c.generations || !c.generations[gen]) return;
            submitted++;
            if (c.generations[gen].has_transport) withTransport++;
        });
        result[gen] = {
            name: gensMeta[gen].name,
            period: gensMeta[gen].period,
            total_submitted: submitted,
            with_transport: withTransport,
        };
    });
    return result;
}

function renderTab1() {
    const region   = document.getElementById('tab1-region').value;
    const genStats = getTab1GenStats(region);
    renderTab1Chart(genStats);
    renderTab1Map(region);
}

function renderTab1Chart(genStats) {
    const ctx = document.getElementById('tab1-chart').getContext('2d');
    if (tab1Chart) tab1Chart.destroy();

    const gens   = ['gen1', 'gen2', 'gen3'];
    const labels = gens.map(g => `${genStats[g].name}\n(${genStats[g].period})`);

    tab1Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'NDCs submitted',
                    data: gens.map(g => genStats[g].total_submitted),
                    backgroundColor: '#C8D8E8',
                    borderColor: '#8AAEC8',
                    borderWidth: 1,
                    borderRadius: 5,
                    barPercentage: 0.6,
                },
                {
                    label: 'With transport targets',
                    data: gens.map(g => genStats[g].with_transport),
                    backgroundColor: '#9DBE3D',
                    borderColor: '#7A9B2E',
                    borderWidth: 1,
                    borderRadius: 5,
                    barPercentage: 0.6,
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
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label(ctx) {
                            const gen = gens[ctx.dataIndex];
                            const gs  = genStats[gen];
                            if (ctx.dataset.label === 'NDCs submitted')
                                return `  Submitted: ${gs.total_submitted} NDCs`;
                            const pct = gs.total_submitted
                                ? ((gs.with_transport / gs.total_submitted) * 100).toFixed(0)
                                : 0;
                            return `  With transport: ${gs.with_transport} (${pct}% of submitted)`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'IBM Plex Sans', size: 13 } },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#E8ECF0' },
                    ticks: { font: { family: 'IBM Plex Sans', size: 12 } },
                    title: {
                        display: true,
                        text: 'Number of NDCs',
                        font: { family: 'IBM Plex Sans', size: 12, weight: 600 },
                        color: '#6B7280',
                    },
                },
            },
        },
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
                return { fillColor: '#ECECEC', fillOpacity: 0.5, color: '#ccc', weight: 0.5 };
            }
            const hasT = cd.latest_has_transport;
            return {
                fillColor:   hasT ? '#9DBE3D' : '#C8D8E8',
                fillOpacity: inRegion ? 0.85 : 0.15,
                color:       inRegion ? (hasT ? '#7A9B2E' : '#8AAEC8') : '#ccc',
                weight:      inRegion ? 0.8 : 0.4,
            };
        },

        onEachFeature(feature, layer) {
            const iso3     = feature.properties.iso_a3;
            const cd       = allCountries[iso3];
            if (!cd) return;

            const inRegion = region === 'all' || regionCodes.has(iso3);
            const gens     = cd.generations || {};

            const genLines = ['gen1', 'gen2', 'gen3']
                .filter(g => gens[g])
                .map(g => {
                    const lbl  = { gen1: '1st', gen2: '2nd', gen3: '3rd' }[g];
                    const icon = gens[g].has_transport ? '&#10003;' : '&#10007;';
                    const txt  = gens[g].has_transport ? 'transport target' : 'no transport target';
                    return `<div>${icon} ${lbl} NDC: ${txt}</div>`;
                }).join('');

            const tagCls  = cd.latest_has_transport ? 'yes' : 'no';
            const tagText = cd.latest_has_transport ? '&#10003; Transport target' : '&#10007; No transport target';

            layer.bindPopup(`
                <div class="popup-title">${cd.name}</div>
                <div class="popup-info">
                    ${genLines}
                    <span class="popup-tag ${tagCls}" style="margin-top:6px;display:inline-block">${tagText}</span>
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
// TAB 2 — Leading Measures for Decarbonisation
// ============================================================================

let activeGens = new Set(['latest']);

function initializeTab2() {
    setupViewToggle('tab2');

    document.querySelectorAll('.gen-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const gen = btn.dataset.gen;
            if (activeGens.has(gen)) {
                if (activeGens.size === 1) return; // always keep at least one
                activeGens.delete(gen);
                btn.classList.remove('active');
            } else {
                activeGens.add(gen);
                btn.classList.add('active');
            }
            renderTab2();
        });
    });

    tab2Map = L.map('tab2-map', { zoomControl: true, scrollWheelZoom: false }).setView([20, 10], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd', maxZoom: 19,
    }).addTo(tab2Map);

    document.getElementById('tab2-region').addEventListener('change', renderTab2);
    document.getElementById('tab2-download').addEventListener('click', () => downloadPDF('tab2'));

    renderTab2();
}

// Returns { genKey: { category: { countries: Set, mentions: int } } }
function getTab2Data(selectedGens, region) {
    const allCountries   = dashboardData.tab1.countries;
    const countryGenCats = dashboardData.tab2.country_gen_cats;

    const filteredCodes = Object.keys(allCountries).filter(code =>
        region === 'all' || allCountries[code]?.region === region
    );

    const result = {};
    selectedGens.forEach(gen => {
        const catMap = {};
        filteredCodes.forEach(code => {
            const country = allCountries[code];
            if (!country) return;
            const genKey = gen === 'latest' ? country.latest_active_gen : gen;
            if (!genKey) return;
            const cats = countryGenCats[code]?.[genKey] || {};
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

function renderTab2() {
    const region   = document.getElementById('tab2-region').value;
    const selected = [...activeGens];
    const data     = getTab2Data(selected, region);
    renderTab2Chart(data, selected);
    renderTab2Map(data, selected, region);
}

function renderTab2Chart(data, selectedGens) {
    const ctx = document.getElementById('tab2-chart').getContext('2d');
    if (tab2Chart) tab2Chart.destroy();

    const activeCats = CATEGORIES_ORDER.filter(cat =>
        selectedGens.some(gen => data[gen]?.[cat]?.countries?.size > 0)
    );
    if (!activeCats.length) return;

    const datasets = selectedGens.map(gen => {
        const cfg = GEN_CONFIG[gen];
        return {
            label: cfg.label,
            data: activeCats.map(cat => data[gen]?.[cat]?.countries?.size || 0),
            backgroundColor: cfg.color + 'CC',
            borderColor: cfg.border,
            borderWidth: 1.5,
            borderRadius: 4,
            barPercentage: selectedGens.length === 1 ? 0.5 : 0.85,
        };
    });

    tab2Chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: activeCats, datasets },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: selectedGens.length > 1,
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
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label(ctx) {
                            const gen   = selectedGens[ctx.datasetIndex];
                            const cat   = activeCats[ctx.dataIndex];
                            const entry = data[gen]?.[cat];
                            const ndcs  = entry?.countries?.size || 0;
                            const ment  = entry?.mentions || 0;
                            return [
                                `  ${GEN_CONFIG[gen].label}: ${ndcs} NDCs`,
                                `  Total measure mentions: ${ment}`,
                            ];
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#E8ECF0' },
                    ticks: { font: { family: 'IBM Plex Sans', size: 12 } },
                    title: {
                        display: true,
                        text: 'Number of NDCs',
                        font: { family: 'IBM Plex Sans', size: 12, weight: 600 },
                        color: '#6B7280',
                    },
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { family: 'IBM Plex Sans', size: 13 } },
                },
            },
        },
    });
}

function renderTab2Map(data, selectedGens, region) {
    if (!worldGeoJSON) return;
    if (tab2GeoLayer) tab2GeoLayer.remove();

    const allCountries   = dashboardData.tab1.countries;
    const countryGenCats = dashboardData.tab2.country_gen_cats;

    // Aggregate total mentions per country
    const countryTotals = {};
    Object.keys(allCountries).forEach(code => {
        const country = allCountries[code];
        if (region !== 'all' && country?.region !== region) return;
        let total = 0;
        selectedGens.forEach(gen => {
            const genKey = gen === 'latest' ? country?.latest_active_gen : gen;
            if (!genKey) return;
            const cats = countryGenCats[code]?.[genKey] || {};
            total += Object.values(cats).reduce((a, b) => a + b, 0);
        });
        countryTotals[code] = total;
    });

    const maxVal = Math.max(...Object.values(countryTotals), 1);

    const regionCodes = new Set(
        Object.values(allCountries)
            .filter(c => region === 'all' || c.region === region)
            .map(c => c.iso3)
    );

    function heatColor(val) {
        if (!val) return '#EDF4F7';
        const t = Math.pow(val / maxVal, 0.6);
        // light blue (#dff0f5) -> teal (#00A4BD)
        const r = Math.round(223 - 223 * t);
        const g = Math.round(240 - 76  * t);
        const b = Math.round(245 - 56  * t);
        return `rgb(${r},${g},${b})`;
    }

    tab2GeoLayer = L.geoJSON(worldGeoJSON, {
        style(feature) {
            const iso3     = feature.properties.iso_a3;
            const cd       = allCountries[iso3];
            const inRegion = region === 'all' || regionCodes.has(iso3);
            const val      = countryTotals[iso3] || 0;

            if (!cd) {
                return { fillColor: '#ECECEC', fillOpacity: 0.4, color: '#ccc', weight: 0.5 };
            }
            return {
                fillColor:   heatColor(val),
                fillOpacity: inRegion ? 0.85 : 0.15,
                color:       inRegion ? '#8AAEC8' : '#ccc',
                weight:      inRegion ? 0.7 : 0.4,
            };
        },

        onEachFeature(feature, layer) {
            const iso3 = feature.properties.iso_a3;
            const cd   = allCountries[iso3];
            if (!cd) return;

            const inRegion = region === 'all' || regionCodes.has(iso3);
            const total    = countryTotals[iso3] || 0;

            // Top-3 categories
            const catTotals = {};
            selectedGens.forEach(gen => {
                const genKey = gen === 'latest' ? cd.latest_active_gen : gen;
                if (!genKey) return;
                const cats = countryGenCats[iso3]?.[genKey] || {};
                Object.entries(cats).forEach(([cat, n]) => {
                    catTotals[cat] = (catTotals[cat] || 0) + n;
                });
            });

            const topCats = Object.entries(catTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cat, n]) => `<div style="font-size:0.8rem;color:#555">${cat}: <b>${n}</b></div>`)
                .join('');

            layer.bindPopup(`
                <div class="popup-title">${cd.name}</div>
                <div class="popup-info">
                    <div><strong>Total mentions: ${total}</strong></div>
                    ${topCats}
                </div>
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
        const pdf = new jsPDF('l', 'mm', 'a4');

        const title = tabId === 'tab1'
            ? 'Progress in NDC Transport Targets'
            : 'Leading Measures for Decarbonisation';

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(0, 61, 92);
        pdf.text(title, 14, 16);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(110, 110, 110);
        const dateStr = new Date().toLocaleDateString('en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' });
        pdf.text(`${dateStr} — GIZ-SLOCAT Transport Tracker`, 14, 23);

        const el      = document.querySelector(`#${tabId} .visualization-container:not(.hidden)`);
        const canvas  = await html2canvas(el, { scale: 1.5, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const pageW   = 297 - 28;
        const imgH    = (canvas.height * pageW) / canvas.width;
        pdf.addImage(imgData, 'PNG', 14, 28, pageW, imgH);

        pdf.save(`ndc-tracker-${tabId}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
        console.error('PDF error:', err);
        alert('Could not generate PDF. Please try again.');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = origHTML;
    }
}
