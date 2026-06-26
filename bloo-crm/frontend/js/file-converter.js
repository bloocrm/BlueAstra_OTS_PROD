/* =====================================================
   MULTI-FORMAT FILE CONVERTER
   Converts PDF, Excel, ODS files to CSV format
   ===================================================== */

class FileConverter {
    constructor() {
        this.supportedFormats = ['csv', 'xlsx', 'xls', 'ods', 'pdf'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
    }

    /**
     * Validate file before processing
     */
    validateFile(file) {
        if (!file) {
            throw new Error('No file provided');
        }

        const fileName = file.name;
        const extension = fileName.split('.').pop().toLowerCase();

        if (!this.supportedFormats.includes(extension)) {
            throw new Error(
                `Unsupported file format: .${extension}. ` +
                `Supported formats: ${this.supportedFormats.join(', ')}`
            );
        }

        if (file.size > this.maxFileSize) {
            throw new Error(`File size exceeds ${this.maxFileSize / 1024 / 1024}MB limit`);
        }

        return { valid: true, extension, fileName };
    }

    /**
     * Convert any supported format to CSV data
     */
    async convertToCSV(file) {
        const validation = this.validateFile(file);
        const extension = validation.extension;

        console.log(`Converting ${extension} file to CSV...`);

        switch (extension) {
            case 'csv':
                return await this.readCSV(file);
            case 'xlsx':
            case 'xls':
                return await this.convertExcelToCSV(file);
            case 'ods':
                return await this.convertODSToCSV(file);
            case 'pdf':
                return await this.convertPDFToCSV(file);
            default:
                throw new Error(`Unknown file format: ${extension}`);
        }
    }

    /**
     * Read CSV file
     */
    async readCSV(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    resolve(csv);
                } catch (error) {
                    reject(new Error(`Error reading CSV: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    /**
     * Convert Excel (XLSX/XLS) to CSV using SheetJS library
     */
    async convertExcelToCSV(file) {
        // Check if SheetJS library is loaded
        if (typeof XLSX === 'undefined') {
            throw new Error(
                'Excel support library not loaded. ' +
                'Please ensure SheetJS library is included in the page.'
            );
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Get first sheet
                    const firstSheet = workbook.SheetNames[0];
                    if (!firstSheet) {
                        throw new Error('No sheets found in Excel file');
                    }

                    // Convert to CSV
                    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
                    resolve(csv);
                } catch (error) {
                    reject(new Error(`Error converting Excel to CSV: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('Error reading Excel file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Convert ODS (LibreOffice Calc) to CSV
     */
    async convertODSToCSV(file) {
        // ODS is a ZIP file, we need to extract and parse the XML
        if (typeof JSZip === 'undefined') {
            throw new Error(
                'ODS support library not loaded. ' +
                'Please ensure JSZip library is included in the page.'
            );
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const zip = new JSZip();
                    const workbook = await zip.loadAsync(e.target.result);

                    // Read content.xml from ODS
                    const contentXml = await workbook.file('content.xml').async('text');
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(contentXml, 'application/xml');

                    // Parse spreadsheet content
                    const csv = this.parseODSContent(xmlDoc);
                    resolve(csv);
                } catch (error) {
                    reject(new Error(`Error converting ODS to CSV: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('Error reading ODS file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Parse ODS XML content to CSV
     */
    parseODSContent(xmlDoc) {
        const rows = [];
        const tables = xmlDoc.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'table');

        if (tables.length === 0) {
            throw new Error('No tables found in ODS file');
        }

        const table = tables[0]; // Use first table
        const tableRows = table.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'table-row');

        for (let row of tableRows) {
            const cells = row.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:table:1.0', 'table-cell');
            const rowData = [];

            for (let cell of cells) {
                const paragraphs = cell.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:text:1.0', 'p');
                let cellValue = '';

                if (paragraphs.length > 0) {
                    const textNodes = paragraphs[0].childNodes;
                    for (let node of textNodes) {
                        if (node.nodeType === 3) { // Text node
                            cellValue += node.textContent;
                        } else if (node.nodeName === 'text:span') {
                            cellValue += node.textContent;
                        }
                    }
                }

                rowData.push(this.escapeCSV(cellValue.trim()));
            }

            if (rowData.some(cell => cell.length > 0)) {
                rows.push(rowData.join(','));
            }
        }

        return rows.join('\n');
    }

    /**
     * Convert PDF to CSV (basic extraction of tables)
     */
    async convertPDFToCSV(file) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error(
                'PDF support library not loaded. ' +
                'Please ensure PDF.js library is included in the page.'
            );
        }

        // Set worker for PDF.js
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            let fullText = '';

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();

                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            // Convert extracted text to basic CSV format
            const lines = fullText.split('\n').filter(line => line.trim().length > 0);
            const csv = lines.map(line => this.escapeCSV(line.trim())).join('\n');

            return csv;
        } catch (error) {
            throw new Error(`Error converting PDF to CSV: ${error.message}`);
        }
    }

    /**
     * Escape CSV values
     */
    escapeCSV(value) {
        if (typeof value !== 'string') {
            value = String(value);
        }

        // If value contains comma, newline, or quotes, wrap in quotes
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            return '"' + value.replace(/"/g, '""') + '"';
        }

        return value;
    }

    /**
     * Get file type label
     */
    getFileTypeLabel(extension) {
        const labels = {
            'csv': 'CSV',
            'xlsx': 'Excel 2007+',
            'xls': 'Excel 97-2003',
            'ods': 'LibreOffice Calc',
            'pdf': 'PDF'
        };
        return labels[extension.toLowerCase()] || 'Unknown';
    }

    /**
     * Get file type icon
     */
    getFileTypeIcon(extension) {
        const icons = {
            'csv': '📄',
            'xlsx': '📊',
            'xls': '📊',
            'ods': '📊',
            'pdf': '📋'
        };
        return icons[extension.toLowerCase()] || '📁';
    }
}

// Create global instance
const fileConverter = new FileConverter();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileConverter;
}
