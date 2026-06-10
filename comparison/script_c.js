// ============================================================================
// NDC Comparison Dashboard — Flexible Column Layout
// ============================================================================

let comparisonData = null;

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
        initializeDefaultSelection();
        renderComparison();
        setupInfoModal();
        document.getElementById('loading').classList.add('hidden');
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
// Main Render — FLEXIBLE COLUMN LAYOUT
// ============================================================================
function renderComparison() {
    const grid = document.getElementById('comparison-grid');
    grid.innerHTML = '';
    
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