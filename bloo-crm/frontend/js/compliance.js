/* =====================================================
   COMPLIANCE TRACKING FUNCTIONALITY
   ===================================================== */

// Country to Region Mapping
const countryToRegion = {
    // Americas
    'US': 'Americas',
    'CA': 'Americas',
    'MX': 'Americas',
    'BR': 'Americas',
    'CL': 'Americas',
    'CO': 'Americas',
    'AR': 'Americas',
    'PE': 'Americas',
    // EMEA
    'UK': 'EMEA',
    'DE': 'EMEA',
    'FR': 'EMEA',
    'IT': 'EMEA',
    'ES': 'EMEA',
    'NL': 'EMEA',
    'CH': 'EMEA',
    'SE': 'EMEA',
    'IE': 'EMEA',
    'LU': 'EMEA',
    'UAE': 'EMEA',
    'SA': 'EMEA',
    'KW': 'EMEA',
    'ZA': 'EMEA',
    // APAC
    'HK': 'APAC',
    'SG': 'APAC',
    'JP': 'APAC',
    'KR': 'APAC',
    'IN': 'APAC',
    'MY': 'APAC',
    'ID': 'APAC',
    'TH': 'APAC',
    'PH': 'APAC',
    'VN': 'APAC',
    'TW': 'APAC',
    // Australia/New Zealand
    'AU': 'Australia/New Zealand',
    'NZ': 'Australia/New Zealand',
    'FJ': 'Australia/New Zealand'
};

// Comprehensive Compliance Standards by Country
const complianceStandards = {
    // AMERICAS
    'US': {
        country: 'United States',
        region: 'Americas',
        regulatory: [
            { name: 'SEC (Securities and Exchange Commission)', type: 'Primary', critical: true, description: 'Oversees investment advisers and securities' },
            { name: 'FINRA (Financial Industry Regulatory Authority)', type: 'Primary', critical: true, description: 'Regulates broker-dealers and financial professionals' },
            { name: 'CFTC (Commodity Futures Trading Commission)', type: 'Primary', critical: false, description: 'Oversees commodity and futures trading' },
            { name: 'FinCEN (Anti-Money Laundering)', type: 'Compliance', critical: true, description: 'AML and KYC requirements' },
            { name: 'CFPB (Consumer Financial Protection Bureau)', type: 'Consumer Protection', critical: true, description: 'Consumer financial protection' }
        ],
        standards: [
            { name: 'Dodd-Frank Act', category: 'Financial Reform', requirement: 'Mandatory' },
            { name: 'Regulation FD (Fair Disclosure)', category: 'Disclosure', requirement: 'Mandatory' },
            { name: 'Advisers Act Rules', category: 'Advisory', requirement: 'Mandatory' },
            { name: 'Form ADV Filing', category: 'Registration', requirement: 'Mandatory' },
            { name: 'SOX Compliance', category: 'Governance', requirement: 'If public' },
            { name: 'Custody Rule', category: 'Client Assets', requirement: 'If applicable' },
            { name: 'Performance Report Standards', category: 'Reporting', requirement: 'Mandatory' },
            { name: 'Privacy Rule (Gramm-Leach-Bliley)', category: 'Data Protection', requirement: 'Mandatory' }
        ]
    },
    'CA': {
        country: 'Canada',
        region: 'Americas',
        regulatory: [
            { name: 'IIROC (Investment Industry Regulatory Organization)', type: 'Primary', critical: true, description: 'Self-regulatory organization' },
            { name: 'CSA (Canadian Securities Administrators)', type: 'Primary', critical: true, description: 'Coordinates securities regulation' },
            { name: 'FINTRAC (Financial Transactions Reports)', type: 'Compliance', critical: true, description: 'AML/Counter-terrorism' },
            { name: 'OSFI (Office of the Superintendent of Financial Institutions)', type: 'Primary', critical: false, description: 'Bank and insurance regulation' }
        ],
        standards: [
            { name: 'National Instrument 31-103', category: 'Registration', requirement: 'Mandatory' },
            { name: 'PIPEDA (Privacy Act)', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'Know Your Client Rule', category: 'KYC', requirement: 'Mandatory' },
            { name: 'Suitability Rule', category: 'Advisory', requirement: 'Mandatory' },
            { name: 'AML/KYC Requirements', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Conflict of Interest Disclosure', category: 'Disclosure', requirement: 'Mandatory' }
        ]
    },
    'BR': {
        country: 'Brazil',
        region: 'Americas',
        regulatory: [
            { name: 'CVM (Comissão de Valores Mobiliários)', type: 'Primary', critical: true, description: 'Securities and capital market regulator' },
            { name: 'BC (Banco Central do Brasil)', type: 'Primary', critical: true, description: 'Central bank and monetary authority' },
            { name: 'COAF (Financial Intelligence Unit)', type: 'Compliance', critical: true, description: 'AML/Counter-terrorism' }
        ],
        standards: [
            { name: 'LGPD (Brazilian Data Protection Law)', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'Instruction CVM 539', category: 'Advisory', requirement: 'Mandatory' },
            { name: 'AML/KYC Requirements', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Client Account Segregation', category: 'Client Assets', requirement: 'Mandatory' }
        ]
    },
    'CL': {
        country: 'Chile',
        region: 'Americas',
        regulatory: [
            { name: 'SVS (Superintendencia de Valores y Seguros)', type: 'Primary', critical: true, description: 'Securities and insurance regulator' },
            { name: 'BCCh (Banco Central de Chile)', type: 'Primary', critical: false, description: 'Central bank' },
            { name: 'UIF (Financial Intelligence Unit)', type: 'Compliance', critical: true, description: 'AML/Counter-terrorism' }
        ],
        standards: [
            { name: 'DL 3500 (Securities Law)', category: 'Securities', requirement: 'Mandatory' },
            { name: 'AML Regulations', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Client Protection Rules', category: 'Client Protection', requirement: 'Mandatory' }
        ]
    },
    'MX': {
        country: 'Mexico',
        region: 'Americas',
        regulatory: [
            { name: 'CNBV (Comisión Nacional Bancaria y de Valores)', type: 'Primary', critical: true, description: 'Banking and securities regulator' },
            { name: 'Banco de México', type: 'Primary', critical: false, description: 'Central bank' },
            { name: 'FIU (Financial Intelligence Unit)', type: 'Compliance', critical: true, description: 'AML/Counter-terrorism' }
        ],
        standards: [
            { name: 'LMV (Securities Market Law)', category: 'Securities', requirement: 'Mandatory' },
            { name: 'AML/KYC Regulations', category: 'Compliance', requirement: 'Mandatory' }
        ]
    },

    // EMEA
    'UK': {
        country: 'United Kingdom',
        region: 'EMEA',
        regulatory: [
            { name: 'FCA (Financial Conduct Authority)', type: 'Primary', critical: true, description: 'Primary regulator for conduct' },
            { name: 'PRA (Prudential Regulation Authority)', type: 'Primary', critical: true, description: 'Prudential regulator (Bank of England)' },
            { name: 'NCA (National Crime Agency)', type: 'Compliance', critical: true, description: 'AML/CFT enforcement' }
        ],
        standards: [
            { name: 'FCA Handbook', category: 'Regulation', requirement: 'Mandatory' },
            { name: 'GDPR', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'FCA Senior Managers Regime', category: 'Governance', requirement: 'Mandatory' },
            { name: 'Markets in Financial Instruments Regulation 2 (MiFID II)', category: 'Markets', requirement: 'Mandatory' },
            { name: 'AML/CFT Regulations', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Client Money Rules', category: 'Client Assets', requirement: 'Mandatory' },
            { name: 'CASS (Client Assets) Rules', category: 'Client Protection', requirement: 'Mandatory' }
        ]
    },
    'DE': {
        country: 'Germany',
        region: 'EMEA',
        regulatory: [
            { name: 'BaFin (Bundesanstalt für Finanzdienstleistungsaufsicht)', type: 'Primary', critical: true, description: 'Federal Financial Supervisory Authority' },
            { name: 'Bundesbank', type: 'Primary', critical: true, description: 'Central bank' }
        ],
        standards: [
            { name: 'KWG (Banking Act)', category: 'Banking', requirement: 'Mandatory' },
            { name: 'GDPR', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'MiFID II', category: 'Markets', requirement: 'Mandatory' },
            { name: 'AML Law', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'WpHG (Securities Trading Act)', category: 'Securities', requirement: 'Mandatory' }
        ]
    },
    'FR': {
        country: 'France',
        region: 'EMEA',
        regulatory: [
            { name: 'AMF (Autorité des Marchés Financiers)', type: 'Primary', critical: true, description: 'Financial markets authority' },
            { name: 'ACPR (Prudential Supervision)', type: 'Primary', critical: true, description: 'Banking/Insurance regulator' },
            { name: 'Tracfin (AML Unit)', type: 'Compliance', critical: true, description: 'Financial Intelligence Unit' }
        ],
        standards: [
            { name: 'Monetary and Financial Code', category: 'Regulation', requirement: 'Mandatory' },
            { name: 'GDPR', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'MiFID II', category: 'Markets', requirement: 'Mandatory' },
            { name: 'AML/KYC Requirements', category: 'Compliance', requirement: 'Mandatory' }
        ]
    },
    'CH': {
        country: 'Switzerland',
        region: 'EMEA',
        regulatory: [
            { name: 'FINMA (Financial Market Supervisory Authority)', type: 'Primary', critical: true, description: 'Primary financial regulator' },
            { name: 'SNB (Swiss National Bank)', type: 'Primary', critical: false, description: 'Central bank' }
        ],
        standards: [
            { name: 'Financial Market Supervision Act', category: 'Regulation', requirement: 'Mandatory' },
            { name: 'Federal Act on Data Protection', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'AML/CFT Law', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Client Asset Segregation', category: 'Client Assets', requirement: 'Mandatory' }
        ]
    },
    'UAE': {
        country: 'United Arab Emirates',
        region: 'EMEA',
        regulatory: [
            { name: 'DFSA (Dubai Financial Services Authority)', type: 'Primary', critical: true, description: 'DIFC regulator' },
            { name: 'SCA (Securities and Commodities Authority)', type: 'Primary', critical: true, description: 'Federal securities regulator' },
            { name: 'CBU (Central Bank of the UAE)', type: 'Primary', critical: false, description: 'Central bank' }
        ],
        standards: [
            { name: 'DFSA Rulebook', category: 'Regulation', requirement: 'If DIFC' },
            { name: 'AML/CFT Regulations', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Client Money Rules', category: 'Client Assets', requirement: 'Mandatory' }
        ]
    },

    // APAC
    'HK': {
        country: 'Hong Kong',
        region: 'APAC',
        regulatory: [
            { name: 'SFC (Securities and Futures Commission)', type: 'Primary', critical: true, description: 'Securities regulator' },
            { name: 'HKMA (Hong Kong Monetary Authority)', type: 'Primary', critical: true, description: 'Banking regulator and central bank' },
            { name: 'ICAC (Independent Commission Against Corruption)', type: 'Compliance', critical: true, description: 'Anti-corruption and AML' }
        ],
        standards: [
            { name: 'Securities and Futures Ordinance', category: 'Securities', requirement: 'Mandatory' },
            { name: 'Code of Conduct for Persons Licensed by SFC', category: 'Conduct', requirement: 'Mandatory' },
            { name: 'AML/CFT Regulations', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Client Money Rules', category: 'Client Assets', requirement: 'Mandatory' },
            { name: 'PDPO (Personal Data Protection)', category: 'Data Protection', requirement: 'Mandatory' }
        ]
    },
    'SG': {
        country: 'Singapore',
        region: 'APAC',
        regulatory: [
            { name: 'MAS (Monetary Authority of Singapore)', type: 'Primary', critical: true, description: 'Central bank and financial regulator' }
        ],
        standards: [
            { name: 'Securities and Futures Act', category: 'Securities', requirement: 'Mandatory' },
            { name: 'Financial Advisers Act', category: 'Advisory', requirement: 'Mandatory' },
            { name: 'AML/CFT Regulations', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Personal Data Protection Act', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'Client Asset Management Rules', category: 'Client Assets', requirement: 'Mandatory' }
        ]
    },
    'JP': {
        country: 'Japan',
        region: 'APAC',
        regulatory: [
            { name: 'FSA (Financial Services Agency)', type: 'Primary', critical: true, description: 'Primary financial regulator' },
            { name: 'BOJ (Bank of Japan)', type: 'Primary', critical: false, description: 'Central bank' }
        ],
        standards: [
            { name: 'Financial Instruments and Exchange Act', category: 'Securities', requirement: 'Mandatory' },
            { name: 'Act on Prevention of Transfer of Criminal Proceeds', category: 'AML', requirement: 'Mandatory' },
            { name: 'Act on Protection of Personal Information', category: 'Data Protection', requirement: 'Mandatory' }
        ]
    },
    'IN': {
        country: 'India',
        region: 'APAC',
        regulatory: [
            { name: 'SEBI (Securities and Exchange Board of India)', type: 'Primary', critical: true, description: 'Securities regulator' },
            { name: 'RBI (Reserve Bank of India)', type: 'Primary', critical: true, description: 'Central bank and banking regulator' },
            { name: 'FIU-IND', type: 'Compliance', critical: true, description: 'AML/Counter-terrorism' }
        ],
        standards: [
            { name: 'Securities and Exchange Board of India Act', category: 'Securities', requirement: 'Mandatory' },
            { name: 'Prevention of Money Laundering Act', category: 'AML', requirement: 'Mandatory' },
            { name: 'KYC Norms', category: 'KYC', requirement: 'Mandatory' },
            { name: 'NISM Certifications', category: 'Professional', requirement: 'Recommended' }
        ]
    },
    'MY': {
        country: 'Malaysia',
        region: 'APAC',
        regulatory: [
            { name: 'SC (Securities Commission)', type: 'Primary', critical: true, description: 'Securities regulator' },
            { name: 'BNM (Bank Negara Malaysia)', type: 'Primary', critical: true, description: 'Central bank and banking regulator' }
        ],
        standards: [
            { name: 'Capital Markets and Services Act', category: 'Securities', requirement: 'Mandatory' },
            { name: 'AML/CFT Act', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Personal Data Protection Act', category: 'Data Protection', requirement: 'Mandatory' }
        ]
    },

    // Australia/New Zealand
    'AU': {
        country: 'Australia',
        region: 'Australia/New Zealand',
        regulatory: [
            { name: 'ASIC (Australian Securities and Investments Commission)', type: 'Primary', critical: true, description: 'Securities, credit and consumer regulator' },
            { name: 'APRA (Australian Prudential Regulation Authority)', type: 'Primary', critical: true, description: 'Banking and insurance regulator' },
            { name: 'RBA (Reserve Bank of Australia)', type: 'Primary', critical: false, description: 'Central bank' },
            { name: 'AUSTRAC', type: 'Compliance', critical: true, description: 'AML/CTF regulator' }
        ],
        standards: [
            { name: 'Corporations Act', category: 'Securities', requirement: 'Mandatory' },
            { name: 'Financial Services Laws', category: 'Regulation', requirement: 'Mandatory' },
            { name: 'AML/CTF Act', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Privacy Act', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'Australian Financial Complaints Authority', category: 'Disputes', requirement: 'Mandatory' },
            { name: 'Financial Advisers Code of Conduct', category: 'Conduct', requirement: 'Mandatory' }
        ]
    },
    'NZ': {
        country: 'New Zealand',
        region: 'Australia/New Zealand',
        regulatory: [
            { name: 'FMA (Financial Markets Authority)', type: 'Primary', critical: true, description: 'Securities and consumer regulator' },
            { name: 'RBNZ (Reserve Bank of New Zealand)', type: 'Primary', critical: false, description: 'Central bank and banking regulator' }
        ],
        standards: [
            { name: 'Financial Markets Conduct Act', category: 'Securities', requirement: 'Mandatory' },
            { name: 'AML/CFT Act', category: 'Compliance', requirement: 'Mandatory' },
            { name: 'Privacy Act', category: 'Data Protection', requirement: 'Mandatory' },
            { name: 'Financial Advisers Act', category: 'Advisory', requirement: 'Mandatory' }
        ]
    }
};

// Global Standards (Apply to all firms)
const globalStandards = [
    { name: 'FATF Recommendations', category: 'AML/CFT', requirement: 'Mandatory', description: 'International AML/CFT standards' },
    { name: 'Basel III/IV', category: 'Capital Adequacy', requirement: 'If applicable', description: 'Banking capital standards' },
    { name: 'GDPR/Similar Data Protection', category: 'Data Protection', requirement: 'If applicable', description: 'Privacy regulation' },
    { name: 'KYC (Know Your Customer)', category: 'Customer Due Diligence', requirement: 'Mandatory', description: 'Customer identification' },
    { name: 'AML (Anti-Money Laundering)', category: 'Compliance', requirement: 'Mandatory', description: 'Anti-money laundering' },
    { name: 'CTF (Counter-Terrorist Financing)', category: 'Compliance', requirement: 'Mandatory', description: 'Terrorist financing prevention' },
    { name: 'EDD (Enhanced Due Diligence)', category: 'Due Diligence', requirement: 'If applicable', description: 'Enhanced customer checks' },
    { name: 'Conflict of Interest Disclosure', category: 'Ethics', requirement: 'Mandatory', description: 'COI management' },
    { name: 'Client Asset Protection', category: 'Client Protection', requirement: 'Mandatory', description: 'Segregation requirements' }
];

// Handle compliance configuration
function handleComplianceConfiguration(event) {
    event.preventDefault();

    const country = document.getElementById('complianceCountry').value;
    const aum = document.getElementById('complianceAUM').checked;
    const ria = document.getElementById('complianceRIA').checked;
    const broker = document.getElementById('complianceBroker').checked;
    const crossBoard = document.getElementById('complianceCrossBoard').checked;

    if (!country) {
        showNotification('Please select your firm location', 'error');
        return;
    }

    // Get offshore selections
    const offshoreCountries = Array.from(document.querySelectorAll('.offshore-checkbox:checked'))
        .map(cb => cb.value);

    // Save compliance configuration
    const config = {
        primaryCountry: country,
        offshoreCountries: offshoreCountries,
        aum: aum,
        ria: ria,
        broker: broker,
        crossBoard: crossBoard,
        configuredAt: new Date().toISOString()
    };

    saveComplianceConfiguration(config);
    updateComplianceSummary(config);
    loadComplianceStandards(config);

    showNotification('Compliance configuration saved successfully!', 'success');
    closeModal('complianceSettingsModal');
}

// Save compliance configuration to localStorage
function saveComplianceConfiguration(config) {
    const user = getCurrentUser();
    user.complianceConfig = config;
    saveCurrentUser(user);
}

// Get compliance configuration
function getComplianceConfiguration() {
    const user = getCurrentUser();
    return user.complianceConfig || null;
}

// Update region based on country selection
function updateRegionFromCountry() {
    const country = document.getElementById('complianceCountry').value;
    if (country && countryToRegion[country]) {
        // Region will be used when saving
    }
}

// Populate offshore options
function populateOffshoreOptions() {
    const container = document.getElementById('offshoreOptions');
    const primaryCountry = document.getElementById('complianceCountry').value;

    if (!primaryCountry) {
        container.innerHTML = '<p style="color: var(--text-light); font-size: 0.9rem;">Select primary location first</p>';
        return;
    }

    const allCountries = Object.keys(complianceStandards).filter(c => c !== primaryCountry);
    const grouped = {};

    allCountries.forEach(code => {
        const region = countryToRegion[code];
        if (!grouped[region]) grouped[region] = [];
        grouped[region].push(code);
    });

    let html = '';
    Object.keys(grouped).forEach(region => {
        html += `<div style="margin-bottom: 1rem;"><strong style="color: var(--primary-blue);">${region}</strong><br>`;
        grouped[region].forEach(code => {
            html += `<label style="display: block; margin: 0.5rem 0;">
                <input type="checkbox" class="offshore-checkbox" value="${code}">
                ${complianceStandards[code].country}
            </label>`;
        });
        html += '</div>';
    });

    container.innerHTML = html;
}

// Update compliance summary
function updateComplianceSummary(config) {
    const primaryCountry = complianceStandards[config.primaryCountry];
    document.getElementById('firmCountry').textContent = primaryCountry.country;
    document.getElementById('firmRegion').textContent = primaryCountry.region;

    const offshoreCount = config.offshoreCountries.length;
    document.getElementById('firmOffshore').textContent = offshoreCount > 0
        ? `${offshoreCount} jurisdiction(s)`
        : 'None';
}

// Load compliance standards
function loadComplianceStandards(config) {
    const container = document.getElementById('complianceContainer');
    let html = '';

    // Primary country standards
    const primary = complianceStandards[config.primaryCountry];
    html += generateCountryComplianceSection(primary, 'PRIMARY');

    // Offshore standards
    if (config.offshoreCountries.length > 0) {
        config.offshoreCountries.forEach(countryCode => {
            const offshore = complianceStandards[countryCode];
            html += generateCountryComplianceSection(offshore, 'OFFSHORE');
        });
    }

    // Global standards
    html += generateGlobalStandardsSection();

    container.innerHTML = html;

    // Update standards count
    const totalStandards = (primary.regulatory?.length || 0) +
                          (primary.standards?.length || 0) +
                          globalStandards.length +
                          (config.offshoreCountries.reduce((sum, code) => {
                              const c = complianceStandards[code];
                              return sum + (c.regulatory?.length || 0) + (c.standards?.length || 0);
                          }, 0));

    document.getElementById('firmStandardsCount').textContent = totalStandards;
}

// Generate country compliance section
function generateCountryComplianceSection(country, type) {
    let html = `
        <div class="compliance-section ${type.toLowerCase()}">
            <div class="section-header">
                <h3>${country.country} (${type})</h3>
                <span class="section-badge">${country.region}</span>
            </div>

            <div class="regulatory-section">
                <h4><i class="fas fa-shield-alt"></i> Regulatory Bodies</h4>
                <div class="compliance-items">
    `;

    country.regulatory.forEach(reg => {
        html += `
            <div class="compliance-item regulatory">
                <div class="item-header">
                    <h5>${reg.name}</h5>
                    ${reg.critical ? '<span class="badge-critical">CRITICAL</span>' : '<span class="badge-standard">STANDARD</span>'}
                </div>
                <p class="item-description">${reg.description}</p>
                <label style="margin-top: 0.5rem;">
                    <input type="checkbox" class="compliance-checkbox" data-type="${reg.name}">
                    Compliance verified
                </label>
            </div>
        `;
    });

    html += `
                </div>
            </div>

            <div class="standards-section">
                <h4><i class="fas fa-list-check"></i> Standards & Requirements</h4>
                <div class="compliance-items">
    `;

    country.standards.forEach(std => {
        html += `
            <div class="compliance-item standard">
                <div class="item-header">
                    <h5>${std.name}</h5>
                    <span class="badge-requirement">${std.requirement}</span>
                </div>
                <p class="item-category">${std.category}</p>
                <label style="margin-top: 0.5rem;">
                    <input type="checkbox" class="compliance-checkbox" data-type="${std.name}">
                    Compliance implemented
                </label>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    return html;
}

// Generate global standards section
function generateGlobalStandardsSection() {
    let html = `
        <div class="compliance-section global">
            <div class="section-header">
                <h3>Global Standards & Requirements</h3>
                <span class="section-badge">WORLDWIDE</span>
            </div>
            <div class="compliance-items">
    `;

    globalStandards.forEach(std => {
        html += `
            <div class="compliance-item global-standard">
                <div class="item-header">
                    <h5>${std.name}</h5>
                    <span class="badge-requirement">${std.requirement}</span>
                </div>
                <p class="item-description">${std.description}</p>
                <p class="item-category">${std.category}</p>
                <label style="margin-top: 0.5rem;">
                    <input type="checkbox" class="compliance-checkbox" data-type="${std.name}">
                    Compliance implemented
                </label>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

// Filter compliance standards
function filterCompliance(filter) {
    const config = getComplianceConfiguration();
    if (!config) {
        showNotification('Please configure your firm first', 'info');
        return;
    }

    // Update active tab
    document.querySelectorAll('.compliance-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const container = document.getElementById('complianceContainer');
    const sections = container.querySelectorAll('.compliance-section');

    sections.forEach(section => {
        if (filter === 'all') {
            section.style.display = 'block';
        } else if (filter === 'primary' && section.classList.contains('primary')) {
            section.style.display = 'block';
        } else if (filter === 'global' && section.classList.contains('global')) {
            section.style.display = 'block';
        } else if (filter === 'offshore' && section.classList.contains('offshore')) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}

// Third-party integration providers
const thirdPartyProviders = {
    'orion': {
        name: 'Orion Advisors',
        description: 'Complete portfolio management and compliance data integration',
        icon: 'fa-database',
        features: ['Portfolio Data', 'Client Data', 'Compliance Reports']
    },
    'blackdiamond': {
        name: 'Black Diamond',
        description: 'Wealth management platform integration',
        icon: 'fa-gem',
        features: ['Portfolio Management', 'Client Information', 'Reporting']
    },
    'envestnet': {
        name: 'Envestnet',
        description: 'Multi-asset class and wealth management integration',
        icon: 'fa-chart-line',
        features: ['Account Data', 'Performance Metrics', 'Compliance Data']
    },
    'morningstar': {
        name: 'Morningstar',
        description: 'Investment research and fund data integration',
        icon: 'fa-star',
        features: ['Fund Data', 'Performance Data', 'ESG Ratings']
    },
    'emoney': {
        name: 'eMoney Advisor',
        description: 'Financial planning and analysis integration',
        icon: 'fa-chart-pie',
        features: ['Financial Plans', 'Client Data', 'Account Aggregation']
    }
};

// Check if user has premium plan access
function hasThirdPartyIntegrationAccess() {
    const user = getCurrentUser();
    const plan = user.plan || 'basic';
    return plan === 'swift-ai-plus' || plan === 'rocket-ai-plus';
}

// Get integration access level
function getIntegrationAccessLevel() {
    const user = getCurrentUser();
    const plan = user.plan || 'basic';
    return plan;
}

// Load third-party integrations section
function loadThirdPartyIntegrations() {
    const container = document.getElementById('thirdPartyIntegrationsContainer');
    if (!container) return;

    const hasAccess = hasThirdPartyIntegrationAccess();

    if (!hasAccess) {
        container.innerHTML = `
            <div class="upgrade-prompt">
                <div class="upgrade-icon">
                    <i class="fas fa-lock"></i>
                </div>
                <h3>Premium Feature: Third-Party Integrations</h3>
                <p>Connect with leading wealth management platforms and sync compliance data automatically.</p>
                <div class="integration-preview">
                    <h4>Available Integrations:</h4>
                    <ul style="list-style: none; padding: 0;">
                        ${Object.values(thirdPartyProviders).map(p => `
                            <li style="padding: 0.5rem 0; color: var(--text-light);">
                                <i class="fas ${p.icon}"></i> ${p.name}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <button class="btn btn-primary" onclick="selectPlan('swift-ai-plus')" style="margin-top: 1.5rem;">
                    <i class="fas fa-arrow-up"></i> Upgrade to SWIFT AI+
                </button>
                <p style="font-size: 0.85rem; color: var(--text-light); margin-top: 1rem;">
                    Starting at $50/month - Includes all integration features
                </p>
            </div>
        `;
        return;
    }

    // User has access - show integrations
    const integratedProviders = getIntegratedProviders();

    let html = `
        <div class="integrations-grid">
            <div class="integrations-header">
                <h3>Connected Integrations</h3>
                <button class="btn btn-secondary" onclick="showIntegrationModal()" style="float: right;">
                    <i class="fas fa-plus"></i> Add Integration
                </button>
            </div>
    `;

    if (integratedProviders.length === 0) {
        html += `
            <div class="empty-integrations">
                <i class="fas fa-plug"></i>
                <p>No integrations connected yet</p>
                <button class="btn btn-primary" onclick="showIntegrationModal()">
                    Connect First Provider
                </button>
            </div>
        `;
    } else {
        html += '<div class="provider-cards">';
        integratedProviders.forEach(provider => {
            const providerInfo = thirdPartyProviders[provider.id];
            html += `
                <div class="provider-card connected">
                    <div class="provider-header">
                        <i class="fas ${providerInfo.icon}" style="font-size: 2rem; color: var(--aqua);"></i>
                        <div class="provider-status">
                            <h4>${providerInfo.name}</h4>
                            <span class="status-badge connected"><i class="fas fa-check-circle"></i> Connected</span>
                        </div>
                    </div>
                    <div class="provider-details">
                        <p><strong>Account:</strong> ${provider.email || 'N/A'}</p>
                        <p><strong>Last Sync:</strong> ${formatDate(provider.lastSync)}</p>
                        <div class="provider-actions">
                            <button class="btn btn-sm btn-secondary" onclick="syncIntegration('${provider.id}')">
                                <i class="fas fa-sync"></i> Sync Now
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="disconnectIntegration('${provider.id}')">
                                <i class="fas fa-unlink"></i> Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

// Get integrated providers
function getIntegratedProviders() {
    const user = getCurrentUser();
    return user.integratedProviders || [];
}

// Show integration connection modal
function showIntegrationModal() {
    const modal = document.getElementById('addIntegrationModal');
    if (modal) {
        modal.classList.add('active');
    }

    let html = '<div class="integration-options">';

    Object.entries(thirdPartyProviders).forEach(([key, provider]) => {
        const isConnected = getIntegratedProviders().some(p => p.id === key);
        html += `
            <div class="integration-option ${isConnected ? 'connected' : ''}">
                <div class="option-icon">
                    <i class="fas ${provider.icon}"></i>
                </div>
                <div class="option-content">
                    <h4>${provider.name}</h4>
                    <p>${provider.description}</p>
                    <div class="option-features">
                        ${provider.features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
                    </div>
                </div>
                <div class="option-action">
                    ${isConnected ?
                        `<span class="status-badge connected"><i class="fas fa-check"></i> Connected</span>` :
                        `<button class="btn btn-primary btn-sm" onclick="initiateIntegration('${key}')">
                            <i class="fas fa-plug"></i> Connect
                        </button>`
                    }
                </div>
            </div>
        `;
    });

    html += '</div>';
    const integrationModalDiv = document.getElementById('integrationModal');
    if (integrationModalDiv) {
        integrationModalDiv.innerHTML = html;
    }
}

// Initiate integration with provider
function initiateIntegration(providerId) {
    const provider = thirdPartyProviders[providerId];

    // Create integration credentials modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'integrationCredsModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas ${provider.icon}"></i> Connect ${provider.name}</h2>
                <button class="btn-close" onclick="closeModal('integrationCredsModal')">×</button>
            </div>
            <form onsubmit="handleIntegrationConnect(event, '${providerId}')">
                <div class="form-group">
                    <label>Email/Account ID</label>
                    <input type="text" id="integrationEmail" placeholder="your-email@example.com" required>
                </div>
                <div class="form-group">
                    <label>API Key/Password</label>
                    <input type="password" id="integrationApiKey" placeholder="Secure credentials" required>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; margin-top: 1rem;">
                        <input type="checkbox" id="autoSync" checked>
                        <span style="margin-left: 0.5rem;">Auto-sync compliance data daily</span>
                    </label>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('integrationCredsModal')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Connect Account</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Handle integration connection
function handleIntegrationConnect(event, providerId) {
    event.preventDefault();

    const email = document.getElementById('integrationEmail').value;
    const apiKey = document.getElementById('integrationApiKey').value;
    const autoSync = document.getElementById('autoSync').checked;
    const provider = thirdPartyProviders[providerId];

    if (!email || !apiKey) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    // Show loading state
    showNotification(`Connecting to ${provider.name}...`, 'info');

    // Simulate connection process
    setTimeout(() => {
        const user = getCurrentUser();
        if (!user.integratedProviders) {
            user.integratedProviders = [];
        }

        // Remove if already exists
        user.integratedProviders = user.integratedProviders.filter(p => p.id !== providerId);

        // Add new integration
        user.integratedProviders.push({
            id: providerId,
            name: provider.name,
            email: email,
            autoSync: autoSync,
            connectedAt: new Date().toISOString(),
            lastSync: new Date().toISOString()
        });

        saveCurrentUser(user);

        // Log activity
        logWorkflowActivity('integration_connected', `Connected to ${provider.name} (${email})`);

        showNotification(`Successfully connected to ${provider.name}!`, 'success');
        closeModal('integrationCredsModal');
        loadThirdPartyIntegrations();
    }, 2000);
}

// Sync integration data
function syncIntegration(providerId) {
    const provider = thirdPartyProviders[providerId];

    showNotification(`Syncing data from ${provider.name}...`, 'info');

    setTimeout(() => {
        const user = getCurrentUser();
        const integration = user.integratedProviders?.find(p => p.id === providerId);

        if (integration) {
            integration.lastSync = new Date().toISOString();
            saveCurrentUser(user);
        }

        logWorkflowActivity('integration_synced', `Data synced from ${provider.name}`);
        showNotification(`Successfully synced data from ${provider.name}!`, 'success');
        loadThirdPartyIntegrations();
    }, 1500);
}

// Disconnect integration
function disconnectIntegration(providerId) {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
        return;
    }

    const user = getCurrentUser();
    const provider = thirdPartyProviders[providerId];

    user.integratedProviders = user.integratedProviders.filter(p => p.id !== providerId);
    saveCurrentUser(user);

    logWorkflowActivity('integration_disconnected', `Disconnected from ${provider.name}`);
    showNotification(`Disconnected from ${provider.name}`, 'success');
    loadThirdPartyIntegrations();
}

// Initialize compliance on page load
function initializeCompliance() {
    const config = getComplianceConfiguration();

    // Populate offshore options
    document.getElementById('complianceCountry').addEventListener('change', populateOffshoreOptions);

    if (config) {
        updateComplianceSummary(config);
        loadComplianceStandards(config);
    }

    // Load third-party integrations
    loadThirdPartyIntegrations();
}
