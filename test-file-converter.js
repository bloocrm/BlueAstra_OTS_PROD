/* =====================================================
   FILE CONVERTER SIMULATION TEST
   Tests FileConverter with actual file data
   ===================================================== */

const fs = require('fs');
const path = require('path');

// Mock classes for Node.js environment
global.FileReader = class FileReader {
    readAsText(file) {
        const data = fs.readFileSync(file.path, 'utf8');
        this.result = data;
        if (this.onload) {
            this.onload({ target: { result: data } });
        }
    }

    readAsArrayBuffer(file) {
        const data = fs.readFileSync(file.path);
        this.result = data.buffer.slice(0);
        if (this.onload) {
            this.onload({ target: { result: this.result } });
        }
    }

    onerror() {}
};

// Mock DOMParser
global.DOMParser = class DOMParser {
    parseFromString(xml, type) {
        const xmldom = require('xmldom');
        return new xmldom.DOMParser().parseFromString(xml, type);
    }
};

// Load libraries
global.XLSX = require('xlsx');
global.JSZip = require('jszip');

// Mock pdfjsLib
global.pdfjsLib = {
    GlobalWorkerOptions: {},
    getDocument: (buffer) => ({
        promise: Promise.reject(new Error('PDF.js not fully mocked'))
    })
};

// Load FileConverter
const FileConverterCode = fs.readFileSync(
    path.join(__dirname, 'bloo-crm/frontend/js/file-converter.js'),
    'utf8'
);
// Extract and evaluate the class definition
eval(FileConverterCode.replace(/^\/\*[\s\S]*?\*\//m, ''));

// Test Suite
class FileConverterSimulationTest {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    async test(name, fn) {
        try {
            await fn();
            this.passed++;
            this.results.push({ name, passed: true });
            console.log(`✅ ${name}`);
        } catch (error) {
            this.failed++;
            this.results.push({ name, passed: false, error: error.message });
            console.log(`❌ ${name}: ${error.message}`);
        }
    }

    async runTests() {
        console.log('\n🧪 File Converter Simulation Test Suite\n');

        // Test 1: CSV Conversion
        await this.test('CSV File Conversion', async () => {
            const converter = new FileConverter();
            const file = {
                name: 'test-data.csv',
                path: path.join(__dirname, 'test-data.csv'),
                size: fs.statSync(path.join(__dirname, 'test-data.csv')).size
            };

            const result = await converter.convertToCSV(file);
            if (!result || !result.includes('name,email')) {
                throw new Error('CSV not properly converted');
            }
        });

        // Test 2: XLSX Conversion
        await this.test('XLSX File Conversion', async () => {
            const converter = new FileConverter();
            const file = {
                name: 'test-data.xlsx',
                path: path.join(__dirname, 'test-data.xlsx'),
                size: fs.statSync(path.join(__dirname, 'test-data.xlsx')).size
            };

            const result = await converter.convertToCSV(file);
            if (!result || !result.includes('name,email')) {
                throw new Error('XLSX not properly converted');
            }
        });

        // Test 3: XLS Conversion
        await this.test('XLS File Conversion', async () => {
            const converter = new FileConverter();
            const file = {
                name: 'test-data.xls',
                path: path.join(__dirname, 'test-data.xls'),
                size: fs.statSync(path.join(__dirname, 'test-data.xls')).size
            };

            const result = await converter.convertToCSV(file);
            if (!result || !result.includes('name,email')) {
                throw new Error('XLS not properly converted');
            }
        });

        // Test 4: ODS Conversion
        await this.test('ODS File Conversion', async () => {
            const converter = new FileConverter();
            const file = {
                name: 'test-data.ods',
                path: path.join(__dirname, 'test-data.ods'),
                size: fs.statSync(path.join(__dirname, 'test-data.ods')).size
            };

            const result = await converter.convertToCSV(file);
            if (!result || !result.includes('name')) {
                throw new Error('ODS not properly converted');
            }
        });

        // Test 5: File Validation
        await this.test('File Size Validation', () => {
            const converter = new FileConverter();
            try {
                converter.validateFile({
                    name: 'test.xlsx',
                    size: 11 * 1024 * 1024
                });
                throw new Error('Should have thrown error');
            } catch (error) {
                if (!error.message.includes('exceeds')) {
                    throw new Error('Wrong error message');
                }
            }
        });

        // Test 6: CSV Escaping
        await this.test('CSV Escaping Function', () => {
            const converter = new FileConverter();
            const testCases = [
                { input: 'hello', expected: 'hello' },
                { input: 'hello,world', expected: '"hello,world"' },
                { input: 'hello"world', expected: '"hello""world"' },
                { input: 'hello\nworld', expected: '"hello\nworld"' }
            ];

            testCases.forEach(tc => {
                const result = converter.escapeCSV(tc.input);
                if (result !== tc.expected) {
                    throw new Error(`Escaping failed: ${result} !== ${tc.expected}`);
                }
            });
        });

        // Test 7: Type Labels
        await this.test('File Type Labels', () => {
            const converter = new FileConverter();
            const tests = [
                { ext: 'csv', expected: 'CSV' },
                { ext: 'xlsx', expected: 'Excel 2007+' },
                { ext: 'xls', expected: 'Excel 97-2003' },
                { ext: 'ods', expected: 'LibreOffice Calc' },
                { ext: 'pdf', expected: 'PDF' }
            ];

            tests.forEach(t => {
                const result = converter.getFileTypeLabel(t.ext);
                if (result !== t.expected) {
                    throw new Error(`Label mismatch: ${result} !== ${t.expected}`);
                }
            });
        });

        // Test 8: Supported Formats
        await this.test('Supported Formats Check', () => {
            const converter = new FileConverter();
            const expected = ['csv', 'xlsx', 'xls', 'ods', 'pdf'];
            expected.forEach(fmt => {
                if (!converter.supportedFormats.includes(fmt)) {
                    throw new Error(`Format ${fmt} not supported`);
                }
            });
        });

        // Print results
        console.log('\n' + '='.repeat(60));
        console.log('Test Summary');
        console.log('='.repeat(60));
        console.log(`Total: ${this.passed + this.failed}`);
        console.log(`✅ Passed: ${this.passed}`);
        console.log(`❌ Failed: ${this.failed}`);
        console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
        console.log('='.repeat(60));

        if (this.failed === 0) {
            console.log('\n🎉 All tests passed!\n');
        }
    }
}

// Run tests
const tester = new FileConverterSimulationTest();
tester.runTests().catch(console.error);
