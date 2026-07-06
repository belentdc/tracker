// ============================================================================
// NDC Comparison Dashboard — Flexible Column Layout
// ============================================================================

let comparisonData = null;

// iframe auto-resize — sends height to WordPress parent
function sendHeight() {
    const height = document.body.scrollHeight;
    window.parent.postMessage({ type: 'ndcTrackerHeight', height }, '*');
}
function sendHeightDebounced() {
    clearTimeout(window._sendHeightTimer);
    window._sendHeightTimer = setTimeout(sendHeight, 150);
}

// Column configurations (independent)
let columns = [
    { country: null, generation: 'gen1', versionIndex: 0 },
    { country: null, generation: 'gen2', versionIndex: 0 },
    { country: null, generation: 'gen3', versionIndex: 0 }
];

// Global tab selection
let activeTab = 'mitigation-targets';  // 4 options: mitigation-targets, mitigation-measures, adaptation-targets, adaptation-measures

// Filter state per tab
let filters = {
    'mitigation-targets': { ghg: [] },
    'mitigation-measures': { asi: [], modes: [] },
    'adaptation-targets': { ghg: [] },
    'adaptation-measures': { asi: [], modes: [] }
};

// Mode groupings for filtering
const MODE_GROUPS = {
    'Active mobility': ['Walking', 'Cycling', 'Active mobility'],
    'Road': ['Two-/Three-wheelers', 'Cars', 'Private cars', 'Taxis', 'Truck', 'Bus', 'Road'],
    'Rail': ['Heavy rail', 'High-speed rail', 'Transit rail', 'Rail'],
    'Water': ['Coastal shipping', 'Inland shipping', 'International maritime', 'Water'],
    'Aviation': ['Domestic aviation', 'International aviation', 'Aviation']
};

// EU member states — report collectively through the EU NDC (EEU code)
const EU_MEMBERS = new Set([
    'AUT','BEL','BGR','CYP','CZE','DEU','DNK','ESP','EST','FIN',
    'FRA','GRC','HRV','HUN','IRL','ITA','LTU','LUX','LVA','MLT',
    'NLD','POL','PRT','ROU','SVK','SVN','SWE'
]);

// Returns EEU for any EU member state, otherwise returns the code as-is
function resolveCountryCode(code) {
    return EU_MEMBERS.has(code) ? 'EEU' : code;
}

const GEN_CONFIG = {
    gen1: { label: '1st Generation', period: '2015–2019', color: '#003D5C' },
    gen2: { label: '2nd Generation', period: '2020–2024', color: '#00A4BD' },
    gen3: { label: '3rd Generation', period: '2024–ongoing', color: '#E8821A' },
};

// ============================================================================
// Boot
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadComparisonData();
        // Apply URL deep-link params first; fall back to random selection
        const hadParams = applyUrlParams();
        if (!hadParams) initializeDefaultSelection();
        renderComparison();
        setupInfoModal();
        document.getElementById('loading').classList.add('hidden');

        // Auto-resize iframe in WordPress parent
        sendHeight();
        window.addEventListener('resize', sendHeightDebounced);
        new ResizeObserver(sendHeightDebounced).observe(document.body);
    } catch (err) {
        console.error('Init error:', err);
        document.getElementById('loading').innerHTML =
            '<p style="color:#c0392b;font-family:sans-serif;padding:2rem">Error loading data. Please refresh the page.</p>';
    }
});

// ============================================================================
// Info Modal
// ============================================================================
function setupInfoModal() {
    const infoButton = document.getElementById('info-button');
    const modal = document.getElementById('info-modal');
    const closeButton = document.getElementById('info-modal-close');
    
    if (infoButton) {
        infoButton.addEventListener('click', () => {
            modal.classList.add('active');
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// ============================================================================
// Data Loading
// ============================================================================
async function loadComparisonData() {
    const res = await fetch('../data/processed/comparison-data.json');
    if (!res.ok) throw new Error('comparison-data.json not found');
    comparisonData = await res.json();
}

// ============================================================================
// Initialize Default Selection (random country, 3 generations)
// ============================================================================

// ============================================================================
// URL Parameter Support — deep links from country profiles
// ============================================================================
// ?mode=track&c=COL          → COL gen1 / gen2 / gen3
// ?mode=compare&c1=COL&c2=KEN&c3=MAR&gen=latest  → compare across countries
function applyUrlParams() {
    const p = new URLSearchParams(location.search);
    const mode = p.get('mode');
    if (!mode) return false; // no params, use random default

    if (mode === 'track') {
        const c = p.get('c');
        if (!c || !comparisonData.countries[c]) return false;
        columns[0] = { country: c, generation: 'gen1', versionIndex: 0 };
        columns[1] = { country: c, generation: 'gen2', versionIndex: 0 };
        columns[2] = { country: c, generation: 'gen3', versionIndex: 0 };
        return true;
    }

    if (mode === 'compare') {
        const gen = p.get('gen') || 'latest';
        const codes = [p.get('c1'), p.get('c2'), p.get('c3')];
        let any = false;
        codes.forEach((c, i) => {
            if (!c) return;
            const dataCode = resolveCountryCode(c);
            if (!comparisonData.countries[dataCode]) return;
            const resolvedGen = gen === 'latest' ? getLatestActiveGen(c) : gen;
            columns[i] = { country: c, generation: resolvedGen, versionIndex: 0 };
            any = true;
        });
        return any;
    }

    return false;
}

function initializeDefaultSelection() {
    const countries = Object.keys(comparisonData.countries);
    if (countries.length === 0) return;
    
    // Pick a random country
    const randomCountry = countries[Math.floor(Math.random() * countries.length)];
    
    // Set all 3 columns to same country, different generations
    columns[0] = { country: randomCountry, generation: 'gen1', versionIndex: 0 };
    columns[1] = { country: randomCountry, generation: 'gen2', versionIndex: 0 };
    columns[2] = { country: randomCountry, generation: 'gen3', versionIndex: 0 };
}

// ============================================================================
// Helpers: country list, status, latest-active generation
// ============================================================================

// Sorted list of selectable countries (mirrors the per-column dropdown)
function getCountryList() {
    return Object.entries(comparisonData.countries)
        .map(([code, data]) => ({ code, name: data.country_name }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

// Reads the Status field from a document and normalises it.
// The Excel uses four values: Active, Archived, "Covered by EU"
// (active, EU members) and "Covered by EU archived" (archived, EU members).
function getDocStatus(doc) {
    if (!doc) return null;
    const s = (doc.status || '').toString().trim().toLowerCase();
    if (s === 'active' || s === 'covered by eu') return 'active';
    if (s === 'archived' || s === 'covered by eu archived') return 'archived';
    return null;
}

// Returns the latest "active" generation for a country.
// Prefers a document whose Status = Active; otherwise falls back to the
// highest generation that has any NDC submitted.
function getLatestActiveGen(countryCode) {
    const dataCode = resolveCountryCode(countryCode);
    const countryData = comparisonData.countries[dataCode];
    if (!countryData) return 'gen1';

    const order = ['gen3', 'gen2', 'gen1'];

    // 1. Prefer an explicitly Active document (highest gen first)
    for (const gen of order) {
        const docs = countryData.generations[gen] || [];
        if (docs.some(d => getDocStatus(d) === 'active')) return gen;
    }
    // 2. Fallback: highest generation that has any document
    for (const gen of order) {
        if ((countryData.generations[gen] || []).length > 0) return gen;
    }
    return 'gen1';
}

// ============================================================================
// Main Render — FLEXIBLE COLUMN LAYOUT
// ============================================================================
function renderComparison() {
    const grid = document.getElementById('comparison-grid');
    grid.innerHTML = '';

    // SECTION 0: Quick-start bar (convenience — fills columns, stays editable)
    grid.appendChild(createQuickStartBar());

    // SECTION 1: Column Headers with Selectors
    const headersRow = document.createElement('div');
    headersRow.className = 'section-row headers-row';
    
    columns.forEach((col, index) => {
        const headerCell = createHeaderCell(col, index);
        headersRow.appendChild(headerCell);
    });
    grid.appendChild(headersRow);
    
    // SECTION 2: Summary boxes
    const summaryRow = document.createElement('div');
    summaryRow.className = 'section-row summary-row';
    
    columns.forEach((col, index) => {
        const summaryCell = createSummaryCell(col, index);
        summaryRow.appendChild(summaryCell);
    });
    grid.appendChild(summaryRow);
    
    // SECTION 3: Tab navigation (5 tabs)
    const tabSection = document.createElement('div');
    tabSection.className = 'tab-section';
    
    const tabs = [
        { id: 'mitigation-targets',  label: 'Mitigation targets' },
        { id: 'mitigation-measures', label: 'Mitigation measures' },
        { id: 'net-zero',            label: 'Net zero' },
        { id: 'adaptation-targets',  label: 'Adaptation targets' },
        { id: 'adaptation-measures', label: 'Adaptation measures' }
    ];
    
    tabs.forEach(tab => {
        const button = document.createElement('button');
        button.className = 'content-tab-button' + (activeTab === tab.id ? ' active' : '');
        button.textContent = tab.label;
        button.addEventListener('click', () => switchTab(tab.id));
        tabSection.appendChild(button);
    });
    
    grid.appendChild(tabSection);
    
    // SECTION 3.5: Filter Section (appears below active tab)
    const filterSection = createFilterSection();
    if (filterSection) {
        grid.appendChild(filterSection);
    }

    // SECTION 3.6: Export (download what's currently shown, below filters)
    grid.appendChild(createExportSection());

    // SECTION 4: Content
    const contentRow = document.createElement('div');
    contentRow.className = 'section-row content-row';
    
    columns.forEach((col, index) => {
        const contentCell = createContentCell(col, index);
        contentRow.appendChild(contentCell);
    });
    grid.appendChild(contentRow);
}

// ============================================================================
// SECTION 0: Quick-Start Bar
// Convenience shortcuts that fill the 3 columns. Columns stay fully editable
// afterwards via their own dropdowns — nothing is locked.
// ============================================================================
function createQuickStartBar() {
    const bar = document.createElement('div');
    bar.className = 'quick-start';

    const countryOptions = getCountryList()
        .map(c => `<option value="${c.code}">${c.name}</option>`)
        .join('');

    bar.innerHTML = `
        <span class="quick-start-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Quick start
        </span>

        <div class="qs-group">
            <span class="qs-group-title">Track one country</span>
            <select class="qs-select" id="qs-track-country">
                <option value="">Select country…</option>
                ${countryOptions}
            </select>
            <button class="qs-apply" id="qs-track-apply">Show evolution</button>
        </div>

        <div class="qs-group">
            <span class="qs-group-title">Compare countries</span>
            <select class="qs-select" id="qs-cmp-gen">
                <option value="latest">Latest active</option>
                <option value="gen1">1st Generation</option>
                <option value="gen2">2nd Generation</option>
                <option value="gen3">3rd Generation</option>
            </select>
            <select class="qs-select" id="qs-cmp-c1"><option value="">Country 1…</option>${countryOptions}</select>
            <select class="qs-select" id="qs-cmp-c2"><option value="">Country 2…</option>${countryOptions}</select>
            <select class="qs-select" id="qs-cmp-c3"><option value="">Country 3…</option>${countryOptions}</select>
            <button class="qs-apply" id="qs-cmp-apply">Compare</button>
        </div>
    `;

    // — Track one country: same country across gen1 / gen2 / gen3 —
    bar.querySelector('#qs-track-apply').addEventListener('click', () => {
        const country = bar.querySelector('#qs-track-country').value;
        if (!country) return;
        columns[0] = { country, generation: 'gen1', versionIndex: 0 };
        columns[1] = { country, generation: 'gen2', versionIndex: 0 };
        columns[2] = { country, generation: 'gen3', versionIndex: 0 };
        renderComparison();
    });

    // — Compare countries: chosen generation (or latest active) across columns —
    bar.querySelector('#qs-cmp-apply').addEventListener('click', () => {
        const gen = bar.querySelector('#qs-cmp-gen').value;
        const picks = [
            bar.querySelector('#qs-cmp-c1').value,
            bar.querySelector('#qs-cmp-c2').value,
            bar.querySelector('#qs-cmp-c3').value
        ];
        picks.forEach((country, i) => {
            if (!country) return; // leave that column untouched if empty
            // "latest" resolves to each country's own active generation
            const resolvedGen = gen === 'latest' ? getLatestActiveGen(country) : gen;
            columns[i] = { country, generation: resolvedGen, versionIndex: 0 };
        });
        renderComparison();
    });

    return bar;
}

// ============================================================================
// SECTION 1: Header Cell with Selectors
// ============================================================================
function createHeaderCell(col, colIndex) {
    const cell = document.createElement('div');
    cell.className = 'header-cell';
    
    if (!col.country) {
        cell.innerHTML = '<div class="no-selection">No country selected</div>';
        return cell;
    }
    
    const isEuMember = EU_MEMBERS.has(col.country);
    const dataCode = resolveCountryCode(col.country);
    const countryData = comparisonData.countries[dataCode];
    const config = GEN_CONFIG[col.generation];
    
    cell.style.setProperty('--gen-color', config.color);
    
    // Country Selector
    const countrySelect = document.createElement('select');
    countrySelect.className = 'country-selector';
    
    const countriesSorted = Object.entries(comparisonData.countries)
        .map(([code, data]) => ({ code, name: data.country_name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    countriesSorted.forEach(({ code, name }) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        // Mark selected: match either the exact code or any EU member when EEU is the data source
        if (code === col.country) option.selected = true;
        countrySelect.appendChild(option);
    });
    
    countrySelect.addEventListener('change', (e) => {
        columns[colIndex].country = e.target.value;
        columns[colIndex].versionIndex = 0;
        renderComparison();
    });
    
    cell.appendChild(countrySelect);
    
    // Generation Selector
    const genSelect = document.createElement('select');
    genSelect.className = 'generation-selector';
    
    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        const option = document.createElement('option');
        option.value = gen;
        option.textContent = GEN_CONFIG[gen].label;
        if (gen === col.generation) option.selected = true;
        genSelect.appendChild(option);
    });
    
    genSelect.addEventListener('change', (e) => {
        columns[colIndex].generation = e.target.value;
        columns[colIndex].versionIndex = 0;
        renderComparison();
    });
    
    cell.appendChild(genSelect);
    
    // Version Selector (if multiple versions)
    const documents = countryData.generations[col.generation];
    
    if (documents.length > 1) {
        const versionSelect = document.createElement('select');
        versionSelect.className = 'version-selector';
        
        documents.forEach((doc, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = doc.version;
            if (idx === col.versionIndex) option.selected = true;
            versionSelect.appendChild(option);
        });
        
        versionSelect.addEventListener('change', (e) => {
            columns[colIndex].versionIndex = parseInt(e.target.value);
            renderComparison();
        });
        
        cell.appendChild(versionSelect);
    }
    
    // Date
    if (documents.length > 0) {
        const doc = documents[col.versionIndex];
        if (doc.date) {
            const dateDiv = document.createElement('div');
            dateDiv.className = 'header-date';
            dateDiv.innerHTML = `<strong>Submitted:</strong> ${doc.date}`;
            cell.appendChild(dateDiv);
        }
        // Status badge (Active / Archived) — reads doc.status from the data
        const status = getDocStatus(doc);
        if (status) {
            const badge = document.createElement('span');
            badge.className = 'status-badge status-' + status;
            badge.textContent = status === 'active' ? 'Currently active' : 'Archived';
            cell.appendChild(badge);
        }
    }

    // EU collective reporting note
    if (isEuMember) {
        const euNote = document.createElement('div');
        euNote.style.cssText = 'font-size:0.8rem;color:rgba(255,255,255,0.75);margin-top:4px;font-style:italic;';
        euNote.textContent = 'Reports collectively through the EU NDC';
        cell.appendChild(euNote);
    }

    return cell;
}

// ============================================================================
// SECTION 2: Summary Cell
// ============================================================================
function createSummaryCell(col, colIndex) {
    const cell = document.createElement('div');
    cell.className = 'summary-cell';
    
    if (!col.country) {
        cell.innerHTML = '<div class="no-data-summary">—</div>';
        return cell;
    }
    
    const dataCode = resolveCountryCode(col.country);
    const countryData = comparisonData.countries[dataCode];
    const documents = countryData.generations[col.generation];
    
    if (documents.length === 0) {
        const isEuMember = EU_MEMBERS.has(col.country);
        cell.innerHTML = isEuMember
            ? '<div class="no-data-summary">No EU NDC in this generation</div>'
            : '<div class="no-data-summary">No NDC submitted</div>';
        return cell;
    }
    
    const doc = documents[col.versionIndex];
    
    const mitCount = doc.targets.filter(t => t.target_area === 'Transport sector mitigation target').length;
    const adaptCount = doc.targets.filter(t => t.target_area === 'Transport sector adaptation target').length;
    const netzeroCount = doc.targets.filter(t => t.target_area === 'Net zero target').length;
    
    const mitMeasuresCount = Object.values(doc.mitigation_measures).reduce((sum, arr) => sum + arr.length, 0);
    const adaptMeasuresCount = Object.values(doc.adaptation_measures).reduce((sum, arr) => sum + arr.length, 0);
    
    const euNote = EU_MEMBERS.has(col.country)
        ? `<div class="summary-eu-note">Reports collectively through the EU NDC</div>`
        : '';

    const kpis = [
        { count: mitCount,         label: 'Mit. targets',     tab: 'mitigation-targets'  },
        { count: mitMeasuresCount, label: 'Mit. measures',    tab: 'mitigation-measures' },
        { count: netzeroCount,     label: 'Net zero',         tab: 'net-zero'            },
        { count: adaptCount,       label: 'Adapt. targets',   tab: 'adaptation-targets'  },
        { count: adaptMeasuresCount, label: 'Adapt. measures', tab: 'adaptation-measures' },
    ];

    cell.innerHTML = `
        <div class="summary-kpi-grid">
            ${kpis.map(k => `
                <button class="kpi-card ${k.count > 0 ? 'kpi-active' : 'kpi-empty'}" data-tab="${k.tab}">
                    <span class="kpi-number">${k.count}</span>
                    <span class="kpi-label">${k.label}</span>
                </button>
            `).join('')}
        </div>
        ${euNote}
    `;

    // Make KPI cards clickable
    cell.querySelectorAll('.kpi-card').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    return cell;
}

// ============================================================================
// SECTION 4: Content Cell
// ============================================================================
function createContentCell(col, colIndex) {
    const cell = document.createElement('div');
    cell.className = 'content-cell';
    
    if (!col.country) {
        cell.innerHTML = '<div class="no-data">No country selected</div>';
        return cell;
    }
    
    const dataCode = resolveCountryCode(col.country);
    const countryData = comparisonData.countries[dataCode];
    const documents = countryData.generations[col.generation];
    
    if (documents.length === 0) {
        const isEuMember = EU_MEMBERS.has(col.country);
        cell.innerHTML = isEuMember
            ? '<div class="no-data">No EU NDC submitted in this generation</div>'
            : '<div class="no-data">No NDC submitted</div>';
        return cell;
    }
    
    const doc = documents[col.versionIndex];

    // Context label — repeats country + generation + status so you always
    // know which column you're reading as you scroll down (replaces sticky)
    const config = GEN_CONFIG[col.generation];
    const countryName = countryData.country_name || col.country;
    const status = getDocStatus(doc);
    const labelBadge = status
        ? `<span class="content-label-badge content-label-${status}">${status === 'active' ? 'Active' : 'Archived'}</span>`
        : '';
    const labelEl = document.createElement('div');
    labelEl.className = 'content-cell-label';
    if (config) labelEl.style.setProperty('--gen-color', config.color);
    labelEl.innerHTML = `
        <span class="content-label-country">${countryName}</span>
        <span class="content-label-gen">${config ? config.label : ''}</span>
        ${labelBadge}
    `;
    cell.appendChild(labelEl);

    // Render based on active tab
    if (activeTab === 'mitigation-targets') {
        cell.appendChild(createMitigationTargetsContent(doc));
    } else if (activeTab === 'mitigation-measures') {
        cell.appendChild(createMitigationMeasuresContent(doc));
    } else if (activeTab === 'net-zero') {
        cell.appendChild(createNetZeroContent(doc));
    } else if (activeTab === 'adaptation-targets') {
        cell.appendChild(createAdaptationTargetsContent(doc));
    } else if (activeTab === 'adaptation-measures') {
        cell.appendChild(createAdaptationMeasuresContent(doc));
    }
    
    return cell;
}

// ============================================================================
// Tab Switching
// ============================================================================
function switchTab(tab) {
    activeTab = tab;
    renderComparison();
}

// ============================================================================
// SECTION 3.5: Filter Section
// ============================================================================
function createFilterSection() {
    const section = document.createElement('div');
    section.className = 'filter-section';
    
    if (activeTab === 'net-zero') {
        return null; // No filters for net zero tab
    }
    
    if (activeTab === 'mitigation-targets' || activeTab === 'adaptation-targets') {
        // GHG / Non-GHG filters
        const row = document.createElement('div');
        row.className = 'filter-row';
        
        const label = document.createElement('span');
        label.className = 'filter-label';
        label.textContent = 'Filter by:';
        row.appendChild(label);
        
        const ghgCheckbox = createFilterCheckbox('GHG targets', 'ghg', activeTab, 'GHG');
        const nonGhgCheckbox = createFilterCheckbox('Non-GHG targets', 'ghg', activeTab, 'Non GHG');
        
        row.appendChild(ghgCheckbox);
        row.appendChild(nonGhgCheckbox);
        
        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn-reset-filters';
        resetBtn.innerHTML = '&#8635; Reset filters';
        resetBtn.addEventListener('click', () => {
            filters[activeTab].ghg = [];
            renderComparison();
        });
        row.appendChild(resetBtn);
        
        section.appendChild(row);
        
    } else if (activeTab === 'mitigation-measures' || activeTab === 'adaptation-measures') {
        // A-S-I filters (mitigation measures only — not applicable to adaptation)
        if (activeTab === 'mitigation-measures') {
            const asiRow = document.createElement('div');
            asiRow.className = 'filter-row';
            
            const asiLabel = document.createElement('span');
            asiLabel.className = 'filter-label';
            asiLabel.textContent = 'A-S-I:';
            asiRow.appendChild(asiLabel);
            
            ['Avoid', 'Shift', 'Improve'].forEach(asi => {
                asiRow.appendChild(createFilterCheckbox(asi, 'asi', activeTab, asi));
            });
            section.appendChild(asiRow);
        }
        
        // Mode filters
        const modeRow = document.createElement('div');
        modeRow.className = 'filter-row';
        
        const modeLabel = document.createElement('span');
        modeLabel.className = 'filter-label';
        modeLabel.textContent = 'Mode:';
        modeRow.appendChild(modeLabel);
        
        ['Not defined', 'Informal transport', 'Active mobility', 'Road', 'Rail', 'Water', 'Aviation'].forEach(mode => {
            modeRow.appendChild(createFilterCheckbox(mode, 'modes', activeTab, mode));
        });
        
        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'btn-reset-filters';
        resetBtn.innerHTML = '&#8635; Reset filters';
        resetBtn.addEventListener('click', () => {
            filters[activeTab].asi = [];
            filters[activeTab].modes = [];
            renderComparison();
        });
        modeRow.appendChild(resetBtn);
        
        section.appendChild(modeRow);
    }
    
    return section;
}

function createFilterCheckbox(label, filterType, tab, value) {
    const wrapper = document.createElement('label');
    wrapper.className = 'filter-checkbox';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = value || label;
    
    // Check if this filter is active
    const currentFilters = filters[tab][filterType];
    if (currentFilters && currentFilters.includes(checkbox.value)) {
        checkbox.checked = true;
    }
    
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            if (!filters[tab][filterType].includes(e.target.value)) {
                filters[tab][filterType].push(e.target.value);
            }
        } else {
            filters[tab][filterType] = filters[tab][filterType].filter(v => v !== e.target.value);
        }
        renderComparison();
    });
    
    const span = document.createElement('span');
    span.textContent = label;
    
    wrapper.appendChild(checkbox);
    wrapper.appendChild(span);
    
    return wrapper;
}

// ============================================================================
// SECTION 3.6: Export — download currently displayed comparison as Excel
// ============================================================================
function createExportSection() {
    const section = document.createElement('div');
    section.className = 'export-section';
    section.innerHTML = `
        <button class="btn-export" id="export-excel-btn">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12l-5-5h3V3h4v4h3l-5 5zm-6 5h12v2H4v-2z"/></svg>
            Download all data (Excel)
        </button>
    `;
    section.querySelector('#export-excel-btn').addEventListener('click', exportComparisonData);
    return section;
}

// Resolves a column to its currently-displayed document, or null if the
// column has no country selected / no NDC in the chosen generation.
function getColumnDocContext(col) {
    if (!col.country) return null;
    const dataCode = resolveCountryCode(col.country);
    const countryData = comparisonData.countries[dataCode];
    if (!countryData) return null;
    const documents = countryData.generations[col.generation] || [];
    if (documents.length === 0) return null;
    const doc = documents[col.versionIndex] || documents[0];
    return { doc, countryName: countryData.country_name || col.country };
}

// Builds export rows for a given tab, applying that tab's own stored filters
// (each tab keeps independent filter state) — so every sheet reflects the
// filters set for that category, whether or not it's the one on screen.
// Column headers mirror the original GIZ-SLOCAT database sheets verbatim
// (Targets / Mitigation / Adaptation) rather than inventing new labels.
function buildExportRowsForTab(tab) {
    const rows = [];

    columns.forEach(col => {
        const ctx = getColumnDocContext(col);
        if (!ctx) return;
        const { doc, countryName } = ctx;
        const config = GEN_CONFIG[col.generation];
        const status = getDocStatus(doc);

        const base = {
            Country: countryName,
            Generation: config ? config.label : col.generation,
            'Version number': doc.version || '',
            Date: doc.date || '',
            Status: status === 'active' ? 'Active' : (status === 'archived' ? 'Archived' : (doc.status || '')),
        };

        const pushTarget = t => rows.push({
            ...base,
            'Target area': t.target_area || '',
            'Target scope': t.target_scope || '',
            'GHG target?': t.ghg_target || '',
            'Target type': t.target_type || '',
            Conditionality: t.conditionality || '',
            'Target Year': t.target_year || '',
            Content: t.content || '',
            'Page Number': t.page || '',
        });

        const pushMitigationMeasure = (category, m) => rows.push({
            ...base,
            Category: category,
            Purpose: m.purpose || '',
            Instrument: m.instrument || '',
            Quote: m.quote || '',
            'A-S-I': m.asi || '',
            Modes: m.modes || '',
            'Page Number': m.page || '',
        });

        const pushAdaptationMeasure = (category, m) => rows.push({
            ...base,
            Category: category,
            Measure: m.measure || '',
            Quote: m.quote || '',
            Modes: m.modes || '',
            'Page Number': m.page || '',
        });

        if (tab === 'mitigation-targets') {
            doc.targets
                .filter(t => t.target_area === 'Transport sector mitigation target')
                .filter(t => matchesFilters(t, 'mitigation-targets'))
                .forEach(pushTarget);
            doc.targets
                .filter(t => t.target_area === 'Net zero target')
                .filter(t => matchesFilters(t, 'mitigation-targets'))
                .forEach(pushTarget);

        } else if (tab === 'net-zero') {
            doc.targets
                .filter(t => t.target_area === 'Net zero target')
                .forEach(pushTarget);

        } else if (tab === 'adaptation-targets') {
            doc.targets
                .filter(t => t.target_area === 'Transport sector adaptation target')
                .filter(t => matchesFilters(t, 'adaptation-targets'))
                .forEach(pushTarget);

        } else if (tab === 'mitigation-measures') {
            Object.keys(doc.mitigation_measures).sort().forEach(category => {
                (doc.mitigation_measures[category] || [])
                    .filter(m => matchesFilters(m, 'mitigation-measures'))
                    .forEach(m => pushMitigationMeasure(category, m));
            });

        } else if (tab === 'adaptation-measures') {
            Object.keys(doc.adaptation_measures).sort().forEach(category => {
                (doc.adaptation_measures[category] || [])
                    .filter(m => matchesFilters(m, 'adaptation-measures'))
                    .forEach(m => pushAdaptationMeasure(category, m));
            });
        }
    });

    return rows;
}

// The 5 content categories, each becoming its own sheet in the workbook.
const EXPORT_TABS = [
    { id: 'mitigation-targets',  sheet: 'Mitigation targets'  },
    { id: 'net-zero',            sheet: 'Net zero targets'    },
    { id: 'adaptation-targets',  sheet: 'Adaptation targets'  },
    { id: 'mitigation-measures', sheet: 'Mitigation measures' },
    { id: 'adaptation-measures', sheet: 'Adaptation measures' },
];

// Builds a filename from the countries currently selected + today's date,
// e.g. ndc-comparison_Kenya-Colombia-Morocco_2026-07-06.xlsx
function buildExportFilename() {
    const countryNames = columns
        .map(getColumnDocContext)
        .filter(Boolean)
        .map(ctx => ctx.countryName);
    const uniqueNames = [...new Set(countryNames)];
    const countryPart = uniqueNames.length > 0
        ? uniqueNames.map(n => n.replace(/[^a-zA-Z0-9]+/g, '-')).join('_')
        : 'comparison';
    const dateStr = new Date().toISOString().slice(0, 10);
    return `ndc-comparison_${countryPart}_${dateStr}.xlsx`;
}

function exportComparisonData() {
    const wb = XLSX.utils.book_new();
    let totalRows = 0;

    EXPORT_TABS.forEach(({ id, sheet }) => {
        const rows = buildExportRowsForTab(id);
        if (rows.length === 0) return; // skip empty categories
        totalRows += rows.length;
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sheet);
    });

    if (totalRows === 0) {
        alert('No data to export for the current selection and filters.');
        return;
    }

    XLSX.writeFile(wb, buildExportFilename());
}

// ============================================================================
// Filter Logic
// ============================================================================
function matchesFilters(item, tab) {
    const tabFilters = filters[tab];
    
    if (tab === 'mitigation-targets' || tab === 'adaptation-targets') {
        // Target filtering
        if (tabFilters.ghg.length === 0) {
            return true; // No GHG filter active, show all
        }
        // Match directly against the dataset value: "GHG" or "Non GHG"
        return tabFilters.ghg.includes(item.ghg_target);
    }
    
    if (tab === 'mitigation-measures' || tab === 'adaptation-measures') {
        // Measure filtering
        let matchesAsi = true;
        let matchesModes = true;
        
        // A-S-I filter
        if (tabFilters.asi.length > 0) {
            matchesAsi = false;
            if (item.asi && item.asi !== '—') {
                const itemAsi = item.asi.toUpperCase();
                matchesAsi = tabFilters.asi.some(filter => 
                    itemAsi.includes(filter.toUpperCase())
                );
            }
        }
        
        // Mode filter with groupings
        if (tabFilters.modes.length > 0) {
            matchesModes = false;
            if (item.modes && item.modes !== '—') {
                const itemModes = item.modes;
                matchesModes = tabFilters.modes.some(filter => {
                    // Check if filter is a group
                    if (MODE_GROUPS[filter]) {
                        return MODE_GROUPS[filter].some(mode => 
                            itemModes.includes(mode)
                        );
                    }
                    // Direct match
                    return itemModes.includes(filter);
                });
            }
        }
        
        return matchesAsi && matchesModes;
    }
    
    return true;
}

// ============================================================================
// CONTENT CREATORS (4 types) - Updated with filtering
// ============================================================================

// 1. MITIGATION TARGETS
function createMitigationTargetsContent(doc) {
    const container = document.createElement('div');
    
    let mitigationTargets = doc.targets.filter(t => t.target_area === 'Transport sector mitigation target');
    let netZeroTargets = doc.targets.filter(t => t.target_area === 'Net zero target');
    
    // Apply filters
    mitigationTargets = mitigationTargets.filter(t => matchesFilters(t, 'mitigation-targets'));
    netZeroTargets = netZeroTargets.filter(t => matchesFilters(t, 'mitigation-targets'));
    
    if (mitigationTargets.length > 0) {
        const section = document.createElement('div');
        section.className = 'content-section-block';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Transport Mitigation Targets';
        section.appendChild(title);
        
        mitigationTargets.forEach(target => {
            section.appendChild(createTargetItem(target, doc.url));
        });
        
        container.appendChild(section);
    }
    
    if (netZeroTargets.length > 0) {
        const section = document.createElement('div');
        section.className = 'content-section-block';
        
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Net Zero Targets';
        section.appendChild(title);
        
        netZeroTargets.forEach(target => {
            section.appendChild(createTargetItem(target, doc.url));
        });
        
        container.appendChild(section);
    }
    
    if (mitigationTargets.length === 0 && netZeroTargets.length === 0) {
        container.innerHTML = '<div class="no-data">No mitigation targets match the selected filters</div>';
    }
    
    return container;
}

// 1b. NET ZERO TARGETS
function createNetZeroContent(doc) {
    const container = document.createElement('div');
    const targets = doc.targets.filter(t => t.target_area === 'Net zero target');

    if (targets.length === 0) {
        container.innerHTML = '<div class="no-data">No net zero targets</div>';
        return container;
    }

    const section = document.createElement('div');
    section.className = 'content-section-block';

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Net Zero Targets';
    section.appendChild(title);

    targets.forEach(target => {
        section.appendChild(createTargetItem(target, doc.url));
    });

    container.appendChild(section);
    return container;
}

// 2. MITIGATION MEASURES
function createMitigationMeasuresContent(doc) {
    const container = document.createElement('div');
    const categories = Object.keys(doc.mitigation_measures).sort();
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="no-data">No mitigation measures</div>';
        return container;
    }
    
    const section = document.createElement('div');
    section.className = 'content-section-block';
    
    let hasVisibleMeasures = false;
    
    categories.forEach(category => {
        let measures = doc.mitigation_measures[category] || [];
        
        // Apply filters
        measures = measures.filter(m => matchesFilters(m, 'mitigation-measures'));
        
        if (measures.length > 0) {
            hasVisibleMeasures = true;
            
            const catHeader = document.createElement('div');
            catHeader.className = 'category-header';
            catHeader.textContent = category;
            section.appendChild(catHeader);
            
            measures.forEach(measure => {
                section.appendChild(createMeasureItem(measure, doc.url));
            });
        }
    });
    
    if (hasVisibleMeasures) {
        container.appendChild(section);
    } else {
        container.innerHTML = '<div class="no-data">No mitigation measures match the selected filters</div>';
    }
    
    return container;
}

// 3. ADAPTATION TARGETS
function createAdaptationTargetsContent(doc) {
    const container = document.createElement('div');
    let adaptationTargets = doc.targets.filter(t => t.target_area === 'Transport sector adaptation target');
    
    // Apply filters
    adaptationTargets = adaptationTargets.filter(t => matchesFilters(t, 'adaptation-targets'));
    
    if (adaptationTargets.length === 0) {
        container.innerHTML = '<div class="no-data">No adaptation targets match the selected filters</div>';
        return container;
    }
    
    const section = document.createElement('div');
    section.className = 'content-section-block';
    
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Transport Adaptation Targets';
    section.appendChild(title);
    
    adaptationTargets.forEach(target => {
        section.appendChild(createTargetItem(target, doc.url));
    });
    
    container.appendChild(section);
    return container;
}

// 4. ADAPTATION MEASURES
function createAdaptationMeasuresContent(doc) {
    const container = document.createElement('div');
    const categories = Object.keys(doc.adaptation_measures).sort();
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="no-data">No adaptation measures</div>';
        return container;
    }
    
    const section = document.createElement('div');
    section.className = 'content-section-block';
    
    let hasVisibleMeasures = false;
    
    categories.forEach(category => {
        let measures = doc.adaptation_measures[category] || [];
        
        // Apply filters
        measures = measures.filter(m => matchesFilters(m, 'adaptation-measures'));
        
        if (measures.length > 0) {
            hasVisibleMeasures = true;
            
            const catHeader = document.createElement('div');
            catHeader.className = 'category-header';
            catHeader.textContent = category;
            section.appendChild(catHeader);
            
            measures.forEach(measure => {
                section.appendChild(createAdaptationMeasureItem(measure, doc.url));
            });
        }
    });
    
    if (hasVisibleMeasures) {
        container.appendChild(section);
    } else {
        container.innerHTML = '<div class="no-data">No adaptation measures match the selected filters</div>';
    }
    
    return container;
}

// ============================================================================
// HELPER: Create Target Item
// ============================================================================
function createTargetItem(target, docUrl) {
    const item = document.createElement('div');
    item.className = 'target-item';
    
    const content = document.createElement('div');
    content.className = 'target-content';
    const em = document.createElement('em');
    em.textContent = target.content;
    content.appendChild(em);
    
    if (target.page && target.page !== '' && docUrl) {
        const pageLink = document.createElement('a');
        pageLink.href = docUrl;
        pageLink.target = '_blank';
        pageLink.className = 'page-link';
        pageLink.textContent = ` (p. ${target.page})`;
        content.appendChild(pageLink);
    }
    
    item.appendChild(content);
    
    const meta = document.createElement('div');
    meta.className = 'target-meta';
    
    const addMetaRow = (label, value) => {
        if (value && value !== '—') {
            const row = document.createElement('div');
            row.className = 'target-meta-row';
            row.innerHTML = `<span class="target-meta-label">${label}:</span><span>${value}</span>`;
            meta.appendChild(row);
        }
    };
    
    addMetaRow('GHG Target', target.ghg_target);
    addMetaRow('Target Type', target.target_type);
    addMetaRow('Conditionality', target.conditionality);
    addMetaRow('Target Year', target.target_year);
    
    item.appendChild(meta);
    return item;
}

// ============================================================================
// HELPER: Create Measure Item (Mitigation)
// ============================================================================
function createMeasureItem(measure, docUrl) {
    const item = document.createElement('div');
    item.className = 'measure-item';
    
    const quote = document.createElement('div');
    quote.className = 'measure-quote';
    const em = document.createElement('em');
    em.textContent = measure.quote;
    quote.appendChild(em);
    
    if (measure.page && measure.page !== '' && docUrl) {
        const pageLink = document.createElement('a');
        pageLink.href = docUrl;
        pageLink.target = '_blank';
        pageLink.className = 'page-link';
        pageLink.textContent = ` (p. ${measure.page})`;
        quote.appendChild(pageLink);
    }
    
    item.appendChild(quote);
    
    const meta = document.createElement('div');
    meta.className = 'measure-meta';
    
    if (measure.asi && measure.asi !== '—') {
        const asiRow = document.createElement('div');
        asiRow.className = 'measure-meta-row';
        asiRow.innerHTML = `<span class="measure-meta-label">A-S-I:</span><span>${measure.asi}</span>`;
        meta.appendChild(asiRow);
    }
    
    if (measure.modes && measure.modes !== '—') {
        const modesRow = document.createElement('div');
        modesRow.className = 'measure-meta-row';
        modesRow.innerHTML = `<span class="measure-meta-label">Modes:</span><span>${measure.modes}</span>`;
        meta.appendChild(modesRow);
    }
    
    item.appendChild(meta);
    return item;
}

// ============================================================================
// HELPER: Create Measure Item (Adaptation)
// ============================================================================
function createAdaptationMeasureItem(measure, docUrl) {
    const item = document.createElement('div');
    item.className = 'measure-item';
    
    const quote = document.createElement('div');
    quote.className = 'measure-quote';
    const em = document.createElement('em');
    em.textContent = measure.quote;
    quote.appendChild(em);
    
    if (measure.page && measure.page !== '' && docUrl) {
        const pageLink = document.createElement('a');
        pageLink.href = docUrl;
        pageLink.target = '_blank';
        pageLink.className = 'page-link';
        pageLink.textContent = ` (p. ${measure.page})`;
        quote.appendChild(pageLink);
    }
    
    item.appendChild(quote);
    
    if (measure.modes && measure.modes !== '—') {
        const meta = document.createElement('div');
        meta.className = 'measure-meta';
        const modesRow = document.createElement('div');
        modesRow.className = 'measure-meta-row';
        modesRow.innerHTML = `<span class="measure-meta-label">Modes:</span><span>${measure.modes}</span>`;
        meta.appendChild(modesRow);
        item.appendChild(meta);
    }
    
    return item;
}