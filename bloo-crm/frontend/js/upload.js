/* =====================================================
   FILE UPLOAD & IMPORT FUNCTIONALITY
   ===================================================== */

// Toggle template preview
function toggleTemplate(templateId) {
    const template = document.getElementById(templateId);
    if (template) {
        template.style.display = template.style.display === 'none' ? 'block' : 'none';
    }
}

// Update file name display
document.addEventListener('change', (e) => {
    if (e.target.type === 'file') {
        const fileNameSpan = e.target.nextElementSibling;
        if (fileNameSpan && fileNameSpan.classList.contains('file-name')) {
            fileNameSpan.textContent = e.target.files[0]?.name || 'Choose file...';
        }
    }
});

// Handle client data upload
function handleClientDataUpload(event) {
    event.preventDefault();

    const fileInput = document.getElementById('clientFileInput');
    const file = fileInput.files[0];
    const statusDiv = document.getElementById('clientUploadStatus');

    if (!file) {
        showUploadStatus(statusDiv, 'Please select a file', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5242880) {
        showUploadStatus(statusDiv, 'File size exceeds 5MB limit', 'error');
        return;
    }

    parseFile(file, 'client', statusDiv, fileInput);
}

// Handle lead data upload
function handleLeadDataUpload(event) {
    event.preventDefault();

    const fileInput = document.getElementById('leadFileInput');
    const file = fileInput.files[0];
    const statusDiv = document.getElementById('leadUploadStatus');

    if (!file) {
        showUploadStatus(statusDiv, 'Please select a file', 'error');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5242880) {
        showUploadStatus(statusDiv, 'File size exceeds 5MB limit', 'error');
        return;
    }

    parseFile(file, 'lead', statusDiv, fileInput);
}

// Parse file with format detection and conversion
async function parseFile(file, type, statusDiv, fileInput) {
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();

    try {
        showUploadStatus(statusDiv, `Converting ${fileConverter.getFileTypeLabel(fileExtension)} file to CSV format...`, 'info');

        // Validate and convert file
        const csvData = await fileConverter.convertToCSV(file);

        // Parse the CSV data
        parseCSVFromData(csvData, type, statusDiv, fileInput);
    } catch (error) {
        console.error('File conversion error:', error);
        showUploadStatus(
            statusDiv,
            `Error converting file: ${error.message}`,
            'error'
        );
    }
}

// Parse CSV data directly (without file)
function parseCSVFromData(csvData, type, statusDiv, fileInput) {
    try {
        const csv = csvData.trim();
        const lines = csv.split('\n');

        if (lines.length < 2) {
            showUploadStatus(statusDiv, 'File must contain header and at least one data row', 'error');
            return;
        }

        const headers = parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const row = parseCSVLine(lines[i]);
                const obj = {};

                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });

                data.push(obj);
            }
        }

        if (data.length === 0) {
            showUploadStatus(statusDiv, 'No data rows found in file', 'error');
            return;
        }

        processImportedData(data, type, statusDiv, fileInput);
    } catch (error) {
        showUploadStatus(statusDiv, `Error parsing file: ${error.message}`, 'error');
    }
}

// Parse CSV file (kept for backward compatibility)
function parseCSV(file, type, statusDiv, fileInput) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const csv = e.target.result;
            parseCSVFromData(csv, type, statusDiv, fileInput);
        } catch (error) {
            showUploadStatus(statusDiv, `Error parsing CSV: ${error.message}`, 'error');
        }
    };

    reader.readAsText(file);
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// Parse Excel file (simple parsing for basic Excel support)
function parseExcel(file, type, statusDiv, fileInput) {
    showUploadStatus(statusDiv, 'Parsing Excel file...', 'info');

    // Note: For full Excel support, you would need to include a library like SheetJS
    // For now, we'll show an informational message
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            // This is a simplified approach
            // In production, use a library like SheetJS (https://sheetjs.com/)
            showUploadStatus(statusDiv, 'Excel support requires additional library. Please use CSV format for now.', 'error');
        } catch (error) {
            showUploadStatus(statusDiv, `Error processing Excel: ${error.message}`, 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

// Process imported data
function processImportedData(data, type, statusDiv, fileInput) {
    try {
        let validation = null;
        let importedCount = 0;
        let skippedCount = 0;
        let errors = [];

        if (type === 'client') {
            validation = validateClientData(data);
            if (validation.valid) {
                importedCount = importClientData(data);
                skippedCount = data.length - importedCount;
            }
        } else if (type === 'lead') {
            validation = validateLeadData(data);
            if (validation.valid) {
                importedCount = importLeadData(data);
                skippedCount = data.length - importedCount;
            }
        }

        if (!validation.valid) {
            showUploadStatus(statusDiv,
                `Validation errors:\n${validation.errors.join('\n')}`,
                'error'
            );
            return;
        }

        let message = `Successfully imported ${importedCount} ${type}(s)`;
        if (skippedCount > 0) {
            message += ` (${skippedCount} duplicates skipped)`;
        }

        showUploadStatus(statusDiv, message, 'success');

        // Reset file input
        fileInput.value = '';
        fileInput.nextElementSibling.textContent = 'Choose file...';

        // Reload appropriate list
        if (type === 'client') {
            loadClientsList();
            loadClientDashboard();
            loadDashboardStats();
        } else if (type === 'lead') {
            loadLeadsList();
            loadDashboardStats();
        }

    } catch (error) {
        showUploadStatus(statusDiv, `Error importing data: ${error.message}`, 'error');
    }
}

// Validate client data
function validateClientData(data) {
    const requiredFields = ['name', 'email', 'phone', 'businessType', 'industry'];
    const errors = [];

    if (!data || data.length === 0) {
        return { valid: false, errors: ['No data provided'] };
    }

    // Check headers
    const firstRow = data[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));

    if (missingFields.length > 0) {
        return {
            valid: false,
            errors: [`Missing required fields: ${missingFields.join(', ')}`]
        };
    }

    // Validate each row
    data.forEach((row, index) => {
        if (!row.name || !row.name.trim()) {
            errors.push(`Row ${index + 1}: Name is required`);
        }
        if (!row.email || !row.email.trim()) {
            errors.push(`Row ${index + 1}: Email is required`);
        } else if (!isValidEmail(row.email)) {
            errors.push(`Row ${index + 1}: Invalid email format`);
        }
        if (!row.phone || !row.phone.trim()) {
            errors.push(`Row ${index + 1}: Phone is required`);
        }
        if (!row.businessType || !row.businessType.trim()) {
            errors.push(`Row ${index + 1}: Business Type is required`);
        }
        if (!row.industry || !row.industry.trim()) {
            errors.push(`Row ${index + 1}: Industry is required`);
        }
    });

    if (errors.length > 0) {
        return { valid: false, errors: errors.slice(0, 10) }; // Show first 10 errors
    }

    return { valid: true, errors: [] };
}

// Validate lead data
function validateLeadData(data) {
    const requiredFields = ['name', 'email', 'phone', 'leadStatus'];
    const errors = [];

    if (!data || data.length === 0) {
        return { valid: false, errors: ['No data provided'] };
    }

    // Check headers
    const firstRow = data[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));

    if (missingFields.length > 0) {
        return {
            valid: false,
            errors: [`Missing required fields: ${missingFields.join(', ')}`]
        };
    }

    // Validate each row
    data.forEach((row, index) => {
        if (!row.name || !row.name.trim()) {
            errors.push(`Row ${index + 1}: Name is required`);
        }
        if (!row.email || !row.email.trim()) {
            errors.push(`Row ${index + 1}: Email is required`);
        } else if (!isValidEmail(row.email)) {
            errors.push(`Row ${index + 1}: Invalid email format`);
        }
        if (!row.phone || !row.phone.trim()) {
            errors.push(`Row ${index + 1}: Phone is required`);
        }
        if (!row.leadStatus || !row.leadStatus.trim()) {
            errors.push(`Row ${index + 1}: Lead Status is required`);
        }
    });

    if (errors.length > 0) {
        return { valid: false, errors: errors.slice(0, 10) }; // Show first 10 errors
    }

    return { valid: true, errors: [] };
}

// Import client data
function importClientData(data) {
    const existingClients = getClients();
    let importedCount = 0;

    data.forEach(row => {
        // Check for duplicates
        const isDuplicate = existingClients.some(client =>
            client.email.toLowerCase() === row.email.toLowerCase()
        );

        if (isDuplicate) {
            return; // Skip duplicate
        }

        // Create client object with all fields
        const clientData = {
            name: row.name || '',
            email: row.email || '',
            phone: row.phone || '',
            altPhone: row.altPhone || '',
            address: row.address || '',
            officialAddress: row.officialAddress || '',
            businessType: row.businessType || '',
            industry: row.industry || '',
            lob: row.lob || '',
            ssn: row.ssn || '',
            spouseName: row.spouseName || '',
            childrenNames: row.childrenNames || '',
            beneficiaries: row.beneficiaries || '',
            insuranceDetails: row.insuranceDetails || '',
            investmentAccount1: row.investmentAccount1 || '',
            investmentAccount2: row.investmentAccount2 || '',
            officeAddress1: row.officeAddress1 || '',
            officeAddress2: row.officeAddress2 || '',
            accountant1Name: row.accountant1Name || '',
            accountant1Contact: row.accountant1Contact || '',
            accountant2Name: row.accountant2Name || '',
            accountant2Contact: row.accountant2Contact || '',
            attorney1Name: row.attorney1Name || '',
            attorney1Contact: row.attorney1Contact || '',
            attorney2Name: row.attorney2Name || '',
            attorney2Contact: row.attorney2Contact || '',
            details: row.details || '',
            documentName: null,
            retirementGoals: '',
            collegeFunding: '',
            estatePlanning: '',
            wealthAccumulation: '',
            majorLifeEvents: '',
            totalAUM: 0,
            accountBalances: 0,
            cashHoldings: 0,
            investmentAccounts: 0,
            totalLiabilities: 0
        };

        addClient(clientData);
        logWorkflowActivity('bulk_import', `Client imported: ${clientData.name}`);
        importedCount++;
    });

    return importedCount;
}

// Import lead data
function importLeadData(data) {
    const existingLeads = getLeads();
    let importedCount = 0;

    data.forEach(row => {
        // Check for duplicates
        const isDuplicate = existingLeads.some(lead =>
            lead.email.toLowerCase() === row.email.toLowerCase()
        );

        if (isDuplicate) {
            return; // Skip duplicate
        }

        // Create lead object
        const leadData = {
            name: row.name || '',
            email: row.email || '',
            phone: row.phone || '',
            company: row.company || '',
            status: row.leadStatus || 'new',
            source: row.leadSource || '',
            notes: row.notes || ''
        };

        addLead(leadData);
        logWorkflowActivity('bulk_import', `Lead imported: ${leadData.name}`);
        importedCount++;
    });

    return importedCount;
}

// Show upload status message
function showUploadStatus(statusDiv, message, type) {
    statusDiv.className = `upload-status show ${type}`;
    statusDiv.innerHTML = `<strong>${type === 'success' ? '✓ Success' : type === 'error' ? '✗ Error' : 'ℹ Info'}:</strong> ${message.replace(/\n/g, '<br>')}`;
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/* =====================================================
   ROCKET AI+ DATA MANAGEMENT FEATURES
   ===================================================== */

// ROCKET AI+ Upgrade Features for Upload Data
const uploadAIFeatures = {
    title: 'ROCKET AI+ Smart Data Management',
    subtitle: 'Intelligent Data Cleaning & Integration',
    tagline: 'Your data, perfected by artificial intelligence.',
    features: [
        {
            icon: 'fa-merge',
            title: 'AI Duplicate Elimination',
            description: 'Intelligent duplicate detection and cleaning system analyzes multiple data attributes to identify and merge duplicate entries'
        },
        {
            icon: 'fa-magnifying-glass',
            title: 'Intelligent Duplicate Analysis',
            description: 'AI highlights duplicate entries by analyzing name variations, email addresses, phone numbers, and company details'
        },
        {
            icon: 'fa-shield-halved',
            title: 'Smart Merge & Consolidation',
            description: 'AI consolidates duplicate records while preserving all valuable information from multiple entries'
        },
        {
            icon: 'fa-cube',
            title: 'SAP Ariba Integration',
            description: 'Direct integration with SAP Ariba for vendor and procurement data sourcing into RedCRM'
        },
        {
            icon: 'fa-link',
            title: '50+ Third-Party Integrations',
            description: 'Connect with Zapier, HubSpot, Salesforce, LinkedIn, and 50+ business applications'
        },
        {
            icon: 'fa-download',
            title: 'Automated Data Sourcing',
            description: 'AI automatically pulls data from connected sources, updates, and syncs to RedCRM in real-time'
        },
        {
            icon: 'fa-chart-mixed',
            title: 'Data Quality Scoring',
            description: 'AI assigns quality scores to each record, highlighting gaps and suggesting data enrichment'
        },
        {
            icon: 'fa-wand-magic-sparkles',
            title: 'Predictive Data Enrichment',
            description: 'AI predicts missing information using machine learning and external data sources'
        }
    ],
    thirdPartyApps: [
        { name: 'SAP Ariba', category: 'Procurement & Vendor Management', icon: 'fa-industry' },
        { name: 'HubSpot', category: 'CRM & Marketing', icon: 'fa-chart-pie' },
        { name: 'Salesforce', category: 'Enterprise CRM', icon: 'fa-database' },
        { name: 'LinkedIn', category: 'Business Intelligence', icon: 'fa-linkedin' },
        { name: 'QuickBooks', category: 'Accounting & Finance', icon: 'fa-calculator' },
        { name: 'Zapier', category: 'Workflow Automation', icon: 'fa-zap' },
        { name: 'Trello', category: 'Project Management', icon: 'fa-list' },
        { name: 'Slack', category: 'Team Communication', icon: 'fa-slack' }
    ]
};

// Load upload data upgrade section
function loadUploadUpgradeSection() {
    const user = getCurrentUser();
    const userPlan = user.plan || 'basic';
    const container = document.getElementById('uploadUpgradeContainer');

    if (!container) return;

    if (userPlan !== 'rocket-ai-plus') {
        container.innerHTML = `
            <div class="upload-ai-section">
                <div class="upload-ai-card">
                    <div class="upload-banner">
                        <div class="upload-icon-big">
                            <i class="fas fa-wand-magic-sparkles"></i>
                        </div>
                        <h3>${uploadAIFeatures.title}</h3>
                        <p class="upload-tagline">"${uploadAIFeatures.tagline}"</p>
                    </div>

                    <div class="upload-intro">
                        <h4>${uploadAIFeatures.subtitle}</h4>
                        <p>Data quality makes or breaks your business. ROCKET AI+ uses advanced machine learning to automatically detect
                        and eliminate duplicates, enrich incomplete records, and intelligently source data from your favorite business applications.
                        Upload messy data—get back clean, actionable intelligence. Your RedCRM becomes a single source of truth powered by AI.</p>
                    </div>

                    <div class="upload-features-grid">
                        ${uploadAIFeatures.features.map(feature => `
                            <div class="upload-feature-card">
                                <div class="upload-feature-icon">
                                    <i class="fas ${feature.icon}"></i>
                                </div>
                                <h5>${feature.title}</h5>
                                <p>${feature.description}</p>
                            </div>
                        `).join('')}
                    </div>

                    <div class="duplicate-showcase">
                        <h4><i class="fas fa-exclamation-triangle"></i> AI Duplicate Elimination In Action</h4>
                        <div class="duplicate-example">
                            <div class="duplicate-before">
                                <strong>Before AI Cleaning:</strong>
                                <div class="example-records">
                                    <div class="record">John Smith | john.smith@company.com | 555-1234</div>
                                    <div class="record duplicate-highlight">Jon Smith | jonsmith@company.com | 555-1234</div>
                                    <div class="record">John Smyth | john.smith@company.com | 555-1235</div>
                                </div>
                                <p class="example-note">❌ 3 Similar Records (Potential Duplicates)</p>
                            </div>
                            <div class="duplicate-arrow">
                                <i class="fas fa-arrow-right"></i>
                            </div>
                            <div class="duplicate-after">
                                <strong>After AI Cleaning:</strong>
                                <div class="example-records">
                                    <div class="record merged">
                                        <i class="fas fa-check-circle"></i>
                                        John Smith | john.smith@company.com | 555-1234
                                        <span class="merge-info">(2 duplicates merged)</span>
                                    </div>
                                </div>
                                <p class="example-note">✅ 1 Master Record (Clean & Unified)</p>
                            </div>
                        </div>
                    </div>

                    <div class="integrations-showcase">
                        <h4><i class="fas fa-plug"></i> Connect Your Data Sources</h4>
                        <p>ROCKET AI+ pulls data from your favorite business platforms and automatically keeps RedCRM updated.</p>
                        <div class="integrations-grid">
                            ${uploadAIFeatures.thirdPartyApps.map(app => `
                                <div class="integration-app">
                                    <i class="fas ${app.icon}"></i>
                                    <strong>${app.name}</strong>
                                    <small>${app.category}</small>
                                </div>
                            `).join('')}
                        </div>
                        <p class="integration-note">+ 42 more integrations available through Zapier & API</p>
                    </div>

                    <div class="upload-benefits">
                        <h4>Why Data Intelligence Matters</h4>
                        <div class="benefits-grid">
                            <div class="benefit-item">
                                <i class="fas fa-percent"></i>
                                <strong>80% Less Manual Work</strong>
                                <p>AI automates data cleaning and deduplication</p>
                            </div>
                            <div class="benefit-item">
                                <i class="fas fa-shield-check"></i>
                                <strong>100% Data Accuracy</strong>
                                <p>Intelligent validation catches errors before they matter</p>
                            </div>
                            <div class="benefit-item">
                                <i class="fas fa-bolt"></i>
                                <strong>Real-Time Sync</strong>
                                <p>Connected apps update automatically throughout the day</p>
                            </div>
                            <div class="benefit-item">
                                <i class="fas fa-brain"></i>
                                <strong>Actionable Insights</strong>
                                <p>AI enriches data with missing context and patterns</p>
                            </div>
                        </div>
                    </div>

                    <button class="btn btn-upload-upgrade" onclick="selectPlan('rocket-ai-plus')">
                        <i class="fas fa-rocket"></i> Upgrade to ROCKET AI+ Data Intelligence - $99/month
                    </button>
                    <p class="upload-cta-note">🧹 Let AI turn your messy data into your competitive advantage</p>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="upload-ai-section active">
                <div class="upload-active-banner">
                    <div class="upload-success-badge">
                        <i class="fas fa-check-circle"></i> ROCKET AI+ Data Intelligence Active
                    </div>
                    <h3>Your Data Just Got Smarter</h3>
                    <p>Every upload is now automatically cleaned, deduplicated, and enriched by AI. Your RedCRM is becoming your most powerful business asset.</p>
                </div>

                <div class="active-upload-features">
                    <div class="feature-column">
                        <h5><i class="fas fa-merge"></i> AI Duplicate Elimination</h5>
                        <ul>
                            <li>Intelligent duplicate detection</li>
                            <li>Smart merge capabilities</li>
                            <li>Duplicate analysis reports</li>
                            <li>Record consolidation</li>
                        </ul>
                    </div>
                    <div class="feature-column">
                        <h5><i class="fas fa-plug"></i> Data Source Integrations</h5>
                        <ul>
                            <li>SAP Ariba integration</li>
                            <li>50+ third-party apps</li>
                            <li>Real-time data sync</li>
                            <li>Automated updates</li>
                        </ul>
                    </div>
                    <div class="feature-column">
                        <h5><i class="fas fa-wand-magic-sparkles"></i> Data Enrichment</h5>
                        <ul>
                            <li>Quality scoring</li>
                            <li>Predictive enrichment</li>
                            <li>Gap analysis</li>
                            <li>Intelligence insights</li>
                        </ul>
                    </div>
                </div>

                <div class="upload-pro-tips">
                    <h5><i class="fas fa-lightbulb"></i> Pro Tips for Maximum Value</h5>
                    <ul>
                        <li>Enable auto-sync on high-value data sources for always-current information</li>
                        <li>Run duplicate analysis monthly to catch overlapping records early</li>
                        <li>Connect SAP Ariba to bring vendor data directly into your sales workflow</li>
                        <li>Use LinkedIn integration to automatically enrich client and prospect profiles</li>
                        <li>Let AI predict missing data—it's often more accurate than manual entry</li>
                    </ul>
                </div>
            </div>
        `;
    }
}

// Initialize upload AI features
function initializeUploadAI() {
    loadUploadUpgradeSection();
}
