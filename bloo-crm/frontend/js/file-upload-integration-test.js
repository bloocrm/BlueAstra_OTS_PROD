/* =====================================================
   FILE UPLOAD INTEGRATION TEST SUITE
   Comprehensive end-to-end testing for multi-format uploads
   ===================================================== */

class FileUploadIntegrationTest {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    // Log test result
    logTest(name, passed, message = '') {
        this.totalTests++;
        if (passed) {
            this.passedTests++;
            console.log(`✅ PASS: ${name}`);
        } else {
            this.failedTests++;
            console.error(`❌ FAIL: ${name} - ${message}`);
        }
        this.testResults.push({ name, passed, message });
    }

    // Test 1: File Converter Initialization
    testFileConverterInit() {
        try {
            const converter = new FileConverter();

            // Check properties
            const hasFormats = converter.supportedFormats && Array.isArray(converter.supportedFormats);
            const hasMaxSize = converter.maxFileSize === 10 * 1024 * 1024;
            const hasMethods = typeof converter.validateFile === 'function' &&
                             typeof converter.convertToCSV === 'function' &&
                             typeof converter.readCSV === 'function' &&
                             typeof converter.convertExcelToCSV === 'function' &&
                             typeof converter.convertODSToCSV === 'function' &&
                             typeof converter.convertPDFToCSV === 'function';

            this.logTest('FileConverter Initialization', hasFormats && hasMaxSize && hasMethods);

            // Check supported formats
            const expectedFormats = ['csv', 'xlsx', 'xls', 'ods', 'pdf'];
            const allFormatsPresent = expectedFormats.every(f => converter.supportedFormats.includes(f));
            this.logTest('Supported Formats', allFormatsPresent,
                `Expected: ${expectedFormats.join(', ')}, Got: ${converter.supportedFormats.join(', ')}`);

            return converter;
        } catch (error) {
            this.logTest('FileConverter Initialization', false, error.message);
            return null;
        }
    }

    // Test 2: File Validation
    testFileValidation(converter) {
        if (!converter) {
            this.logTest('File Validation - Skip', false, 'FileConverter not initialized');
            return;
        }

        try {
            // Test valid CSV file
            const validFile = { name: 'test.csv', size: 1024 * 1024 };
            const validResult = converter.validateFile(validFile);
            this.logTest('File Validation - Valid CSV', validResult.valid && validResult.extension === 'csv');

            // Test unsupported format
            let unsupportedError = false;
            try {
                converter.validateFile({ name: 'test.doc', size: 1024 });
            } catch (error) {
                unsupportedError = error.message.includes('Unsupported');
            }
            this.logTest('File Validation - Unsupported Format', unsupportedError);

            // Test file size limit
            let fileSizeError = false;
            try {
                converter.validateFile({ name: 'test.csv', size: 11 * 1024 * 1024 });
            } catch (error) {
                fileSizeError = error.message.includes('exceeds');
            }
            this.logTest('File Validation - Size Limit', fileSizeError);

        } catch (error) {
            this.logTest('File Validation', false, error.message);
        }
    }

    // Test 3: CSV Escaping
    testCSVEscaping(converter) {
        if (!converter) {
            this.logTest('CSV Escaping - Skip', false, 'FileConverter not initialized');
            return;
        }

        try {
            // Test normal value
            const normal = converter.escapeCSV('hello');
            this.logTest('CSV Escaping - Normal Value', normal === 'hello');

            // Test value with comma
            const withComma = converter.escapeCSV('hello, world');
            this.logTest('CSV Escaping - With Comma',
                withComma === '"hello, world"',
                `Expected: "hello, world", Got: ${withComma}`);

            // Test value with quotes
            const withQuote = converter.escapeCSV('hello"world');
            this.logTest('CSV Escaping - With Quote',
                withQuote === '"hello""world"',
                `Expected: "hello""world", Got: ${withQuote}`);

            // Test value with newline
            const withNewline = converter.escapeCSV('hello\nworld');
            this.logTest('CSV Escaping - With Newline',
                withNewline === '"hello\nworld"',
                `Expected: "hello\\nworld", Got: ${withNewline}`);

        } catch (error) {
            this.logTest('CSV Escaping', false, error.message);
        }
    }

    // Test 4: File Type Labels
    testFileTypeLabels(converter) {
        if (!converter) {
            this.logTest('File Type Labels - Skip', false, 'FileConverter not initialized');
            return;
        }

        try {
            const labels = {
                'csv': 'CSV',
                'xlsx': 'Excel 2007+',
                'xls': 'Excel 97-2003',
                'ods': 'LibreOffice Calc',
                'pdf': 'PDF'
            };

            let allCorrect = true;
            for (const [ext, expectedLabel] of Object.entries(labels)) {
                const label = converter.getFileTypeLabel(ext);
                if (label !== expectedLabel) {
                    console.error(`Label mismatch for ${ext}: expected "${expectedLabel}", got "${label}"`);
                    allCorrect = false;
                }
            }
            this.logTest('File Type Labels', allCorrect);
        } catch (error) {
            this.logTest('File Type Labels', false, error.message);
        }
    }

    // Test 5: File Type Icons
    testFileTypeIcons(converter) {
        if (!converter) {
            this.logTest('File Type Icons - Skip', false, 'FileConverter not initialized');
            return;
        }

        try {
            const icons = {
                'csv': '📄',
                'xlsx': '📊',
                'xls': '📊',
                'ods': '📊',
                'pdf': '📋'
            };

            let allCorrect = true;
            for (const [ext, expectedIcon] of Object.entries(icons)) {
                const icon = converter.getFileTypeIcon(ext);
                if (icon !== expectedIcon) {
                    console.error(`Icon mismatch for ${ext}: expected "${expectedIcon}", got "${icon}"`);
                    allCorrect = false;
                }
            }
            this.logTest('File Type Icons', allCorrect);
        } catch (error) {
            this.logTest('File Type Icons', false, error.message);
        }
    }

    // Test 6: Library Availability
    testLibraryAvailability() {
        try {
            const xlsxAvailable = typeof XLSX !== 'undefined';
            this.logTest('Library Available - XLSX', xlsxAvailable,
                xlsxAvailable ? '' : 'XLSX not loaded');

            const jszipAvailable = typeof JSZip !== 'undefined';
            this.logTest('Library Available - JSZip', jszipAvailable,
                jszipAvailable ? '' : 'JSZip not loaded');

            const pdfjsAvailable = typeof pdfjsLib !== 'undefined';
            this.logTest('Library Available - PDF.js', pdfjsAvailable,
                pdfjsAvailable ? '' : 'PDF.js not loaded');

        } catch (error) {
            this.logTest('Library Availability', false, error.message);
        }
    }

    // Test 7: Global Instance
    testGlobalInstance() {
        try {
            const hasGlobalInstance = typeof fileConverter !== 'undefined';
            this.logTest('Global Instance - fileConverter', hasGlobalInstance,
                hasGlobalInstance ? '' : 'fileConverter not defined globally');

            if (hasGlobalInstance) {
                const isCorrectType = fileConverter instanceof FileConverter;
                this.logTest('Global Instance - Correct Type', isCorrectType);
            }
        } catch (error) {
            this.logTest('Global Instance', false, error.message);
        }
    }

    // Test 8: Upload JS Functions
    testUploadJSFunctions() {
        try {
            const hasParseFile = typeof parseFile === 'function';
            this.logTest('Upload JS - parseFile Function', hasParseFile,
                hasParseFile ? '' : 'parseFile not found');

            const hasParseCSVFromData = typeof parseCSVFromData === 'function';
            this.logTest('Upload JS - parseCSVFromData Function', hasParseCSVFromData,
                hasParseCSVFromData ? '' : 'parseCSVFromData not found');

            const hasParseCSVLine = typeof parseCSVLine === 'function';
            this.logTest('Upload JS - parseCSVLine Function', hasParseCSVLine,
                hasParseCSVLine ? '' : 'parseCSVLine not found');

        } catch (error) {
            this.logTest('Upload JS Functions', false, error.message);
        }
    }

    // Test 9: CSV Line Parsing
    testCSVLineParsing() {
        try {
            // Simple line
            const line1 = parseCSVLine('a,b,c');
            const pass1 = line1.length === 3 && line1[0] === 'a' && line1[1] === 'b' && line1[2] === 'c';
            this.logTest('CSV Line Parsing - Simple', pass1);

            // With quotes
            const line2 = parseCSVLine('"hello, world",b,c');
            const pass2 = line2.length === 3 && line2[0] === 'hello, world' && line2[1] === 'b';
            this.logTest('CSV Line Parsing - With Quotes', pass2,
                `Got: ${JSON.stringify(line2)}`);

            // With escaped quotes
            const line3 = parseCSVLine('"hello""world",b');
            const pass3 = line3.length === 2 && line3[0] === 'hello"world';
            this.logTest('CSV Line Parsing - Escaped Quotes', pass3,
                `Got: ${JSON.stringify(line3)}`);

        } catch (error) {
            this.logTest('CSV Line Parsing', false, error.message);
        }
    }

    // Test 10: HTML File Inputs
    testHTMLFileInputs() {
        try {
            const clientInput = document.getElementById('clientFileInput');
            const leadInput = document.getElementById('leadFileInput');

            const clientExists = clientInput !== null;
            this.logTest('HTML File Input - Client', clientExists);

            if (clientExists) {
                const clientAccept = clientInput.getAttribute('accept');
                const expectedAccept = '.csv,.xlsx,.xls,.ods,.pdf';
                const clientCorrect = clientAccept === expectedAccept;
                this.logTest('HTML File Input - Client Accept', clientCorrect,
                    `Expected: ${expectedAccept}, Got: ${clientAccept}`);
            }

            const leadExists = leadInput !== null;
            this.logTest('HTML File Input - Lead', leadExists);

            if (leadExists) {
                const leadAccept = leadInput.getAttribute('accept');
                const expectedAccept = '.csv,.xlsx,.xls,.ods,.pdf';
                const leadCorrect = leadAccept === expectedAccept;
                this.logTest('HTML File Input - Lead Accept', leadCorrect,
                    `Expected: ${expectedAccept}, Got: ${leadAccept}`);
            }

        } catch (error) {
            this.logTest('HTML File Inputs', false, error.message);
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('\n🧪 Starting File Upload Integration Test Suite...\n');

        // Initialize
        const converter = this.testFileConverterInit();

        // Test file converter
        this.testFileValidation(converter);
        this.testCSVEscaping(converter);
        this.testFileTypeLabels(converter);
        this.testFileTypeIcons(converter);

        // Test libraries
        this.testLibraryAvailability();

        // Test global instances
        this.testGlobalInstance();

        // Test upload functions
        this.testUploadJSFunctions();

        // Test CSV parsing
        this.testCSVLineParsing();

        // Test HTML
        this.testHTMLFileInputs();

        // Print summary
        this.printSummary();

        return this.failedTests === 0;
    }

    // Print test summary
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.totalTests}`);
        console.log(`✅ Passed: ${this.passedTests}`);
        console.log(`❌ Failed: ${this.failedTests}`);
        console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
        console.log('='.repeat(60));

        if (this.failedTests === 0) {
            console.log('🎉 ALL TESTS PASSED! Ready for end-to-end testing.\n');
        } else {
            console.log(`⚠️  ${this.failedTests} test(s) failed. Review errors above.\n`);
        }

        return this.failedTests === 0;
    }
}

// Auto-run tests when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        const tester = new FileUploadIntegrationTest();
        await tester.runAllTests();
        window.fileUploadTester = tester;
    });
} else {
    const tester = new FileUploadIntegrationTest();
    tester.runAllTests().then(() => {
        window.fileUploadTester = tester;
    });
}
