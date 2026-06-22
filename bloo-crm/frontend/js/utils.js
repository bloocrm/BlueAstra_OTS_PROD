/* =====================================================
   UTILITY FUNCTIONS
   ===================================================== */

// Data protection and security utilities
function encryptData(data, key = 'bloo-crm-key') {
    // Simple base64 encoding for demo (in production, use proper encryption)
    return btoa(JSON.stringify(data));
}

function decryptData(encryptedData, key = 'bloo-crm-key') {
    try {
        return JSON.parse(atob(encryptedData));
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

// Mask sensitive data
function maskSSN(ssn) {
    if (!ssn) return '';
    return ssn.slice(0, 2) + '*'.repeat(5) + ssn.slice(-2);
}

function maskEmail(email) {
    if (!email) return '';
    const [name, domain] = email.split('@');
    const maskedName = name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    return maskedName + '@' + domain;
}

// Validation utilities
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function validateSSN(ssn) {
    // Basic SSN format validation (XXX-XX-XXXX or XXXXXXXXX)
    const ssnRegex = /^(\d{3}-?\d{2}-?\d{4})$/;
    return ssnRegex.test(ssn);
}

// Format utilities
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
}

// Sorting utilities
function sortByName(items) {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function sortByDate(items, dateField = 'createdAt', descending = true) {
    return [...items].sort((a, b) => {
        const dateA = new Date(a[dateField]);
        const dateB = new Date(b[dateField]);
        return descending ? dateB - dateA : dateA - dateB;
    });
}

// Grouping utilities
function groupBy(items, key) {
    return items.reduce((groups, item) => {
        const groupKey = item[key];
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, {});
}

// Statistics utilities
function calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function calculatePercentage(value, total) {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(1);
}

// Unique utilities
function getUniqueValues(items, key) {
    return [...new Set(items.map(item => item[key]))];
}

function removeDuplicates(items, key = 'id') {
    const seen = new Set();
    return items.filter(item => {
        const value = item[key];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

// Export utilities
function exportAsJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    downloadFile(blob, filename || 'export.json');
}

function exportAsCSV(data, filename) {
    let csv = '';
    
    // Header
    if (data.length > 0) {
        csv = Object.keys(data[0]).join(',') + '\n';
    }
    
    // Rows
    data.forEach(row => {
        csv += Object.values(row).map(value => {
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return value;
        }).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, filename || 'export.csv');
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// Color utilities
function getStatusColor(status) {
    const colors = {
        'new': '#0066cc',
        'qualified': '#0080ff',
        'interested': '#00d9ff',
        'negotiating': '#00b8cc',
        'converted': '#10b981',
        'lost': '#ff8c00'
    };
    return colors[status] || '#6b7280';
}

function getTypeColor(type) {
    const colors = {
        'email': '#0066cc',
        'call': '#00d9ff',
        'meeting': '#ff8c00',
        'message': '#00d9ff',
        'other': '#6b7280'
    };
    return colors[type] || '#6b7280';
}

// String utilities
function truncateString(str, maxLength = 50) {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

function capitalizeWords(str) {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

// Debounce utility for search
function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Generate report
function generateReport(title, data) {
    const reportDate = new Date().toLocaleString();
    
    let reportContent = `
    <html>
    <head>
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #0066cc; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #0066cc; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .report-header { margin-bottom: 20px; }
            .report-date { color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="report-header">
            <h1>${title}</h1>
            <p class="report-date">Generated: ${reportDate}</p>
        </div>
        <table>
            <thead>
                <tr>
                    ${Object.keys(data[0] || {}).map(key => `<th>${key}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map(row => `
                    <tr>
                        ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;
    
    return reportContent;
}

// Print functionality
function printReport(title, data) {
    const reportContent = generateReport(title, data);
    const printWindow = window.open('', '', 'width=900,height=600');
    printWindow.document.write(reportContent);
    printWindow.document.close();
    printWindow.print();
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
    }
    
    start(label) {
        this.metrics[label] = performance.now();
    }
    
    end(label) {
        if (!this.metrics[label]) {
            console.warn(`No start time for ${label}`);
            return;
        }
        
        const duration = performance.now() - this.metrics[label];
        console.log(`${label}: ${duration.toFixed(2)}ms`);
        
        delete this.metrics[label];
    }
}

const perfMonitor = new PerformanceMonitor();

// Local storage backup/restore
function backupData() {
    const backup = {
        timestamp: new Date().toISOString(),
        data: JSON.parse(localStorage.getItem('currentUser') || '{}')
    };
    
    return backup;
}

function restoreData(backup) {
    if (!backup || !backup.data) {
        console.error('Invalid backup data');
        return false;
    }
    
    localStorage.setItem('currentUser', JSON.stringify(backup.data));
    return true;
}

// Initialize utilities on page load
window.addEventListener('load', () => {
    // Any initialization code
    console.log('Bloo CRM utilities loaded');
});
