// ============================================================================
// NDC Comparison Dashboard — Updated with all requested features
// ============================================================================

let comparisonData = null;
let selectedCountry = null;
let selectedVersions = {
    gen1: 0,
    gen2: 0,
    gen3: 0
};

// Global category selection (synchronized across all columns)
let activeCategoryMitigation = 'Electrification';  // Global for all generations
let activeCategoryAdaptation = null;  // Global for all generations

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
        initializeCountrySelector();
        document.getElementById('country-select').addEventListener('change', handleCountryChange);
        document.getElementById('loading').classList.add('hidden');
    } catch (err) {
        console.error('Init error:', err);
        document.getElementById('loading').innerHTML =
            '<p style="color:#c0392b;font-family:sans-serif;padding:2rem">Error loading data. Please refresh the page.</p>';
    }
});

// ============================================================================
// Data Loading
// ============================================================================
async function loadComparisonData() {
    const res = await fetch('../data/processed/comparison-data.json');
    if (!res.ok) throw new Error('comparison-data.json not found');
    comparisonData = await res.json();
}

// ============================================================================
// Country Selector
// ============================================================================
function initializeCountrySelector() {
    const select = document.getElementById('country-select');
    const countries = Object.entries(comparisonData.countries)
        .map(([code, data]) => ({ code, name: data.country_name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    
    countries.forEach(({ code, name }) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        select.appendChild(option);
    });
}

function handleCountryChange(e) {
    selectedCountry = e.target.value;
    if (!selectedCountry) {
        document.getElementById('comparison-grid').innerHTML = '';
        return;
    }
    
    // Reset version selections
    selectedVersions = { gen1: 0, gen2: 0, gen3: 0 };
    
    // Reset to first available category
    const countryData = comparisonData.countries[selectedCountry];
    let firstCategory = null;
    
    for (const gen of ['gen1', 'gen2', 'gen3']) {
        const docs = countryData.generations[gen];
        if (docs.length > 0 && docs[0].mitigation_measures) {
            const cats = Object.keys(docs[0].mitigation_measures);
            if (cats.length > 0) {
                firstCategory = cats[0];
                break;
            }
        }
    }
    
    activeCategoryMitigation = firstCategory || 'Electrification';
    activeCategoryAdaptation = null;
    
    renderComparison();
    setupSynchronizedScrolling();
}

// ============================================================================
// Synchronized Scrolling
// ============================================================================
function setupSynchronizedScrolling() {
    const columns = document.querySelectorAll('.gen-content');
    let isSyncing = false;
    
    columns.forEach(column => {
        // Remove existing listeners to avoid duplicates
        column.replaceWith(column.cloneNode(true));
    });
    
    // Re-query after replacing
    const freshColumns = document.querySelectorAll('.gen-content');
    
    freshColumns.forEach(column => {
        column.addEventListener('scroll', function() {
            if (isSyncing) return;
            
            isSyncing = true;
            const scrollTop = this.scrollTop;
            
            freshColumns.forEach(otherColumn => {
                if (otherColumn !== this) {
                    otherColumn.scrollTop = scrollTop;
                }
            });
            
            setTimeout(() => { isSyncing = false; }, 10);
        });
    });
}

// ============================================================================
// Main Render
// ============================================================================
function renderComparison() {
    const grid = document.getElementById('comparison-grid');
    grid.innerHTML = '';
    
    if (!selectedCountry) return;
    
    const countryData = comparisonData.countries[selectedCountry];
    if (!countryData) return;
    
    ['gen1', 'gen2', 'gen3'].forEach(gen => {
        const column = createGenerationColumn(gen, countryData.generations[gen]);
        grid.appendChild(column);
    });
    
    equalizeColumnHeights();
}

// ============================================================================
// Equalize Column Heights
// ============================================================================
function equalizeColumnHeights() {
    requestAnimationFrame(() => {
        const contents = document.querySelectorAll('.gen-content');
        let maxHeight = 0;
        
        // Reset heights first
        contents.forEach(content => {
            content.style.minHeight = '';
        });
        
        // Find max height
        contents.forEach(content => {
            const height = content.scrollHeight;
            if (height > maxHeight) maxHeight = height;
        });
        
        // Apply max height to all
        contents.forEach(content => {
            content.style.minHeight = `${maxHeight}px`;
        });
    });
}

// ============================================================================
// Generation Column
// ============================================================================
function createGenerationColumn(gen, documents) {
    const config = GEN_CONFIG[gen];
    const column = document.createElement('div');
    column.className = 'gen-column';
    column.style.setProperty('--gen-color', config.color);
    
    // Header
    const header = document.createElement('div');
    header.className = 'gen-header';
    
    const title = document.createElement('h2');
    title.textContent = config.label;
    header.appendChild(title);
    
    const period = document.createElement('div');
    period.className = 'gen-period';
    period.textContent = config.period;
    header.appendChild(period);
    
    // Version selector if multiple versions
    if (documents.length > 1) {
        const versionNote = document.createElement('div');
        versionNote.className = 'version-note';
        versionNote.textContent = `${documents.length} versions submitted`;
        header.appendChild(versionNote);
        
        const versionSelect = document.createElement('select');
        versionSelect.className = 'version-selector';
        documents.forEach((doc, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = doc.version;
            if (idx === selectedVersions[gen]) option.selected = true;
            versionSelect.appendChild(option);
        });
        versionSelect.addEventListener('change', (e) => {
            selectedVersions[gen] = parseInt(e.target.value);
            renderComparison();
            setupSynchronizedScrolling();
        });
        header.appendChild(versionSelect);
    }
    
    column.appendChild(header);
    
    // Content
    const content = document.createElement('div');
    content.className = 'gen-content';
    
    if (documents.length === 0) {
        content.innerHTML = '<div class="no-data">No NDC submitted</div>';
    } else {
        const doc = documents[selectedVersions[gen]];
        content.appendChild(createDocumentContent(gen, doc));
    }
    
    column.appendChild(content);
    return column;
}

// ============================================================================
// Document Content
// ============================================================================
function createDocumentContent(gen, doc) {
    const container = document.createElement('div');
    
    // Summary Box
    container.appendChild(createSummaryBox(doc));
    
    // Date
    if (doc.date) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'doc-date';
        dateDiv.innerHTML = `<strong>Submitted:</strong> ${doc.date}`;
        container.appendChild(dateDiv);
    }
    
    // SECTION 1: TARGETS
    container.appendChild(createTargetsSection(doc));
    
    // SECTION 2: MEASURES
    container.appendChild(createMeasuresSection(gen, doc));
    
    return container;
}

// ============================================================================
// Summary Box
// ============================================================================
function createSummaryBox(doc) {
    const box = document.createElement('div');
    box.className = 'summary-box';
    
    const mitCount = doc.targets.filter(t => t.target_area === 'Transport sector mitigation target').length;
    const adaptCount = doc.targets.filter(t => t.target_area === 'Transport sector adaptation target').length;
    const netzeroCount = doc.targets.filter(t => t.target_area === 'Net zero target').length;
    
    const mitMeasuresCount = Object.values(doc.mitigation_measures).reduce((sum, arr) => sum + arr.length, 0);
    const adaptMeasuresCount = Object.values(doc.adaptation_measures).reduce((sum, arr) => sum + arr.length, 0);
    
    box.innerHTML = `
        <div class="summary-row">
            <strong>Targets:</strong> ${mitCount} mitigation • ${adaptCount} adaptation • ${netzeroCount} net zero
        </div>
        <div class="summary-row">
            <strong>Measures:</strong> ${mitMeasuresCount} mitigation • ${adaptMeasuresCount} adaptation
        </div>
    `;
    
    return box;
}

// ============================================================================
// TARGETS SECTION
// ============================================================================
function createTargetsSection(doc) {
    const section = document.createElement('div');
    section.className = 'section';
    
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Targets';
    section.appendChild(title);
    
    const mitigationTargets = doc.targets.filter(t => t.target_area === 'Transport sector mitigation target');
    const adaptationTargets = doc.targets.filter(t => t.target_area === 'Transport sector adaptation target');
    const netZeroTargets = doc.targets.filter(t => t.target_area === 'Net zero target');
    
    section.appendChild(createTargetSubsection('Transport Mitigation Targets', mitigationTargets, doc.url));
    section.appendChild(createTargetSubsection('Transport Adaptation Targets', adaptationTargets, doc.url));
    section.appendChild(createTargetSubsection('Net Zero Targets', netZeroTargets, doc.url));
    
    return section;
}

function createTargetSubsection(title, targets, docUrl) {
    const subsection = document.createElement('div');
    subsection.className = 'subsection';
    
    const subsectionTitle = document.createElement('div');
    subsectionTitle.className = 'subsection-title';
    subsectionTitle.textContent = title;
    subsection.appendChild(subsectionTitle);
    
    if (targets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-indicator';
        empty.textContent = '—';
        subsection.appendChild(empty);
    } else {
        targets.forEach(target => {
            const item = document.createElement('div');
            item.className = 'target-item';
            
            // Content/quote in italic
            const content = document.createElement('div');
            content.className = 'target-content';
            const em = document.createElement('em');
            em.textContent = target.content;
            content.appendChild(em);
            
            // Add page link if available
            if (target.page && target.page !== '' && docUrl) {
                const pageLink = document.createElement('a');
                pageLink.href = docUrl;
                pageLink.target = '_blank';
                pageLink.className = 'page-link';
                pageLink.textContent = ` (p. ${target.page})`;
                content.appendChild(pageLink);
            }
            
            item.appendChild(content);
            
            // Meta information
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
            subsection.appendChild(item);
        });
    }
    
    return subsection;
}

// ============================================================================
// MEASURES SECTION
// ============================================================================
function createMeasuresSection(gen, doc) {
    const section = document.createElement('div');
    section.className = 'section';
    
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Measures';
    section.appendChild(title);
    
    section.appendChild(createMitigationSubsection(gen, doc));
    section.appendChild(createAdaptationSubsection(gen, doc));
    
    return section;
}

function createMitigationSubsection(gen, doc) {
    const subsection = document.createElement('div');
    subsection.className = 'subsection';
    
    const subsectionTitle = document.createElement('div');
    subsectionTitle.className = 'subsection-title';
    subsectionTitle.textContent = 'Mitigation Measures';
    subsection.appendChild(subsectionTitle);
    
    const categories = Object.keys(doc.mitigation_measures);
    
    if (categories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-indicator';
        empty.textContent = '—';
        subsection.appendChild(empty);
        return subsection;
    }
    
    // Initialize global category if not set or not available
    if (!activeCategoryMitigation || !categories.includes(activeCategoryMitigation)) {
        activeCategoryMitigation = categories[0];
    }
    
    // Category tabs (global - changes all columns)
    const tabs = document.createElement('div');
    tabs.className = 'category-tabs';
    categories.forEach(cat => {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        if (cat === activeCategoryMitigation) tab.classList.add('active');
        tab.textContent = cat;
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            switchCategoryGlobal(cat, 'mitigation');
        });
        tabs.appendChild(tab);
    });
    subsection.appendChild(tabs);
    
    // Measures for active category
    const activeMeasures = doc.mitigation_measures[activeCategoryMitigation] || [];
    activeMeasures.forEach(measure => {
        const item = document.createElement('div');
        item.className = 'measure-item';
        
        // Quote in italic
        const quote = document.createElement('div');
        quote.className = 'measure-quote';
        const em = document.createElement('em');
        em.textContent = measure.quote;
        quote.appendChild(em);
        
        // Add page link if available
        if (measure.page && measure.page !== '' && doc.url) {
            const pageLink = document.createElement('a');
            pageLink.href = doc.url;
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
        subsection.appendChild(item);
    });
    
    return subsection;
}

function createAdaptationSubsection(gen, doc) {
    const subsection = document.createElement('div');
    subsection.className = 'subsection';
    
    const subsectionTitle = document.createElement('div');
    subsectionTitle.className = 'subsection-title';
    subsectionTitle.textContent = 'Adaptation Measures';
    subsection.appendChild(subsectionTitle);
    
    const categories = Object.keys(doc.adaptation_measures);
    
    if (categories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-indicator';
        empty.textContent = '—';
        subsection.appendChild(empty);
        return subsection;
    }
    
    // Initialize global category if needed
    if (!activeCategoryAdaptation || !categories.includes(activeCategoryAdaptation)) {
        activeCategoryAdaptation = categories[0];
    }
    
    // Category tabs (global - changes all columns)
    const tabs = document.createElement('div');
    tabs.className = 'category-tabs';
    categories.forEach(cat => {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        if (cat === activeCategoryAdaptation) tab.classList.add('active');
        tab.textContent = cat;
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            switchCategoryGlobal(cat, 'adaptation');
        });
        tabs.appendChild(tab);
    });
    subsection.appendChild(tabs);
    
    // Measures for active category
    const activeMeasures = doc.adaptation_measures[activeCategoryAdaptation] || [];
    activeMeasures.forEach(measure => {
        const item = document.createElement('div');
        item.className = 'measure-item';
        
        // Quote in italic
        const quote = document.createElement('div');
        quote.className = 'measure-quote';
        const em = document.createElement('em');
        em.textContent = measure.quote;
        quote.appendChild(em);
        
        // Add page link if available
        if (measure.page && measure.page !== '' && doc.url) {
            const pageLink = document.createElement('a');
            pageLink.href = doc.url;
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
        
        subsection.appendChild(item);
    });
    
    return subsection;
}

// ============================================================================
// Global Category Switching (affects all columns simultaneously)
// ============================================================================
function switchCategoryGlobal(category, type) {
    // Store current scroll position
    const columns = document.querySelectorAll('.gen-content');
    const scrollPos = columns[0] ? columns[0].scrollTop : 0;
    
    // Update global category
    if (type === 'mitigation') {
        activeCategoryMitigation = category;
    } else {
        activeCategoryAdaptation = category;
    }
    
    // Re-render to update all columns
    renderComparison();
    
    // Restore scroll position after render
    requestAnimationFrame(() => {
        const newColumns = document.querySelectorAll('.gen-content');
        newColumns.forEach(col => {
            col.scrollTop = scrollPos;
        });
        
        setupSynchronizedScrolling();
        equalizeColumnHeights();
    });
}