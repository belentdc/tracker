// ============================================================================
// NDC Transport Tracker - Main JavaScript
// ============================================================================

let dashboardData = null;
let tab1Chart = null;
let tab2Chart = null;
let tab1Map = null;
let tab2Map = null;

// ============================================================================
// Initialize Dashboard
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load data
        await loadData();
        
        // Initialize tabs
        initializeTabs();
        
        // Initialize tooltips
        initializeTooltips();
        
        // Initialize Tab 1
        initializeTab1();
        
        // Initialize Tab 2
        initializeTab2();
        
        // Hide loading
        document.getElementById('loading').classList.add('hidden');
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading dashboard data. Please refresh the page.');
    }
});

// ============================================================================
// Data Loading
// ============================================================================

async function loadData() {
    try {
        const response = await fetch('data/processed/data.json');
        dashboardData = await response.json();
        
        // Update last updated date
        const date = new Date(dashboardData.metadata.last_updated);
        document.getElementById('lastUpdated').textContent = 
            `Last updated: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// ============================================================================
// Tab Management
// ============================================================================

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// ============================================================================
// Tooltip Management
// ============================================================================

function initializeTooltips() {
    const tooltipButtons = document.querySelectorAll('.info-tooltip');
    
    tooltipButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tooltipId = `tooltip-${button.dataset.tooltip}`;
            const modal = document.getElementById(tooltipId);
            modal.classList.add('active');
        });
    });
    
    // Close tooltips
    const closeButtons = document.querySelectorAll('.tooltip-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.tooltip-modal').classList.remove('active');
        });
    });
    
    // Close on outside click
    document.querySelectorAll('.tooltip-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ============================================================================
// TAB 1: Progress in NDC Transport Targets
// ============================================================================

function initializeTab1() {
    // View toggle
    setupViewToggle('tab1');
    
    // Initialize chart
    updateTab1Chart();
    
    // Initialize map
    initializeTab1Map();
    
    // Filters
    document.getElementById('tab1-generation').addEventListener('change', updateTab1);
    document.getElementById('tab1-region').addEventListener('change', updateTab1);
    
    // Download
    document.getElementById('tab1-download').addEventListener('click', () => downloadPDF('tab1'));
}

function setupViewToggle(tabId) {
    const buttons = document.querySelectorAll(`#${tabId} .toggle-button`);
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.dataset.view;
            
            // Update buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show/hide views
            const chartView = document.getElementById(`${tabId}-chart-view`);
            const mapView = document.getElementById(`${tabId}-map-view`);
            
            if (view === 'chart') {
                chartView.classList.remove('hidden');
                mapView.classList.add('hidden');
            } else {
                chartView.classList.add('hidden');
                mapView.classList.remove('hidden');
                
                // Refresh map
                if (tabId === 'tab1' && tab1Map) {
                    setTimeout(() => tab1Map.invalidateSize(), 100);
                } else if (tabId === 'tab2' && tab2Map) {
                    setTimeout(() => tab2Map.invalidateSize(), 100);
                }
            }
        });
    });
}

function updateTab1Chart() {
    const ctx = document.getElementById('tab1-chart').getContext('2d');
    
    const generations = dashboardData.tab1.generations;
    const totalPossible = dashboardData.metadata.total_possible_ndcs;
    
    // Destroy existing chart
    if (tab1Chart) {
        tab1Chart.destroy();
    }
    
    // Create new chart
    tab1Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['First Generation\n(2015-2019)', 'Second Generation\n(2020-2024)', 'Third Generation\n(2024-ongoing)'],
            datasets: [
                {
                    label: 'NDCs Submitted',
                    data: [
                        (generations.gen1.total_submitted / totalPossible) * 100,
                        (generations.gen2.total_submitted / totalPossible) * 100,
                        (generations.gen3.total_submitted / totalPossible) * 100
                    ],
                    backgroundColor: '#DADADA',
                    borderRadius: 6,
                    barPercentage: 0.7,
                },
                {
                    label: 'With Transport Targets',
                    data: [
                        (generations.gen1.with_transport / generations.gen1.total_submitted) * 100,
                        (generations.gen2.with_transport / generations.gen2.total_submitted) * 100,
                        (generations.gen3.with_transport / generations.gen3.total_submitted) * 100
                    ],
                    backgroundColor: '#9DBE3D',
                    borderRadius: 6,
                    barPercentage: 0.7,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            family: 'IBM Plex Sans',
                            size: 14,
                            weight: 600
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'rect'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 61, 92, 0.95)',
                    titleFont: {
                        family: 'IBM Plex Sans',
                        size: 14,
                        weight: 600
                    },
                    bodyFont: {
                        family: 'IBM Plex Sans',
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const genKey = ['gen1', 'gen2', 'gen3'][context.dataIndex];
                            const gen = generations[genKey];
                            
                            if (context.dataset.label === 'NDCs Submitted') {
                                return `Submitted: ${gen.total_submitted} of ${totalPossible} NDCs (${context.parsed.y.toFixed(0)}%)`;
                            } else {
                                return `With transport: ${gen.with_transport} of ${gen.total_submitted} submitted (${context.parsed.y.toFixed(0)}%)`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'IBM Plex Sans',
                            size: 13
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            family: 'IBM Plex Sans',
                            size: 12
                        }
                    },
                    grid: {
                        color: '#E1E4E8'
                    }
                }
            }
        }
    });
}

function initializeTab1Map() {
    // Initialize map
    tab1Map = L.map('tab1-map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(tab1Map);
    
    updateTab1Map();
}

function updateTab1Map() {
    // This would need actual geolocation data
    // For now, showing placeholder
    console.log('Map update would happen here with real geodata');
}

function updateTab1() {
    updateTab1Chart();
    updateTab1Map();
}

// ============================================================================
// TAB 2: Leading Measures
// ============================================================================

function initializeTab2() {
    setupViewToggle('tab2');
    updateTab2Chart();
    initializeTab2Map();
    
    document.getElementById('tab2-generation').addEventListener('change', updateTab2);
    document.getElementById('tab2-region').addEventListener('change', updateTab2);
    document.getElementById('tab2-download').addEventListener('click', () => downloadPDF('tab2'));
}

function updateTab2Chart() {
    const ctx = document.getElementById('tab2-chart').getContext('2d');
    
    const categories = dashboardData.tab2.categories_latest;
    
    // Sort by NDC count
    const sorted = Object.entries(categories)
        .sort((a, b) => b[1].ndcs_count - a[1].ndcs_count)
        .slice(0, 6);
    
    // Destroy existing
    if (tab2Chart) {
        tab2Chart.destroy();
    }
    
    tab2Chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([cat, data]) => cat),
            datasets: [{
                label: 'NDCs',
                data: sorted.map(([cat, data]) => data.ndcs_count),
                backgroundColor: '#9DBE3D',
                borderRadius: 6,
                barPercentage: 0.7,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 61, 92, 0.95)',
                    titleFont: {
                        family: 'IBM Plex Sans',
                        size: 14,
                        weight: 600
                    },
                    bodyFont: {
                        family: 'IBM Plex Sans',
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const cat = sorted[context.dataIndex][0];
                            const data = categories[cat];
                            return [
                                `${data.ndcs_count} NDCs`,
                                `(${data.mentions} mitigation measures)`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            family: 'IBM Plex Sans',
                            size: 12
                        }
                    },
                    grid: {
                        color: '#E1E4E8'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'IBM Plex Sans',
                            size: 13
                        }
                    }
                }
            }
        }
    });
}

function initializeTab2Map() {
    tab2Map = L.map('tab2-map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(tab2Map);
    
    updateTab2Map();
}

function updateTab2Map() {
    console.log('Tab2 map update would happen here with real geodata');
}

function updateTab2() {
    updateTab2Chart();
    updateTab2Map();
}

// ============================================================================
// PDF Export
// ============================================================================

async function downloadPDF(tabId) {
    const button = document.getElementById(`${tabId}-download`);
    button.disabled = true;
    button.textContent = 'Generating PDF...';
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Add title
        pdf.setFontSize(20);
        pdf.text('NDC Transport Tracker', 20, 20);
        
        pdf.setFontSize(12);
        pdf.text(tabId === 'tab1' ? 'Progress in NDC Transport Targets' : 'Leading Measures for Decarbonisation', 20, 30);
        
        // Capture current view
        const element = document.querySelector(`#${tabId} .visualization-container:not(.hidden)`);
        const canvas = await html2canvas(element);
        const imgData = canvas.toDataURL('image/png');
        
        // Add image
        const imgWidth = 170;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 20, 40, imgWidth, imgHeight);
        
        // Save
        pdf.save(`ndc-tracker-${tabId}-${new Date().toISOString().split('T')[0]}.pdf`);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        button.disabled = false;
        button.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12l-5-5h3V3h4v4h3l-5 5zm-6 5h12v2H4v-2z"/></svg> Download PDF';
    }
}
