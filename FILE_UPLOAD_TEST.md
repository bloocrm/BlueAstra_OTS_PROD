# Multi-Format File Upload Testing Guide

## Test Setup

### Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:3000`
- Browser with DevTools (F12)

### Files Supported
✅ CSV (.csv)
✅ Excel 2007+ (.xlsx)
✅ Excel 97-2003 (.xls)
✅ LibreOffice Calc (.ods)
✅ PDF (.pdf)

---

## Test Case 1: CSV File Upload (Baseline)

**Steps:**
1. Open http://localhost:3000/index.html
2. Navigate to "Upload Source Data" tab
3. Click "Upload Client Data"
4. Select a valid CSV file
5. Click "Import Client Data"

**Expected Result:**
- ✅ File imports successfully
- ✅ Data displays in client list
- ✅ No errors in console

**Console Check:**
```javascript
// In browser console:
window.fileConverter.getFileTypeLabel('csv')  // Should return: "CSV"
window.fileConverter.supportedFormats          // Should include: ['csv', 'xlsx', 'xls', 'ods', 'pdf']
```

---

## Test Case 2: Excel (.xlsx) Upload

**Objective:** Verify XLSX conversion to CSV

**Steps:**
1. Open "Upload Source Data"
2. Click "Upload Client Data"
3. Select an Excel (.xlsx) file
4. Click "Import Client Data"
5. Check browser console

**Expected Result:**
- ✅ File converts to CSV
- ✅ Console shows: "Converting Excel 2007+ file to CSV format..."
- ✅ Data imports correctly
- ✅ No SheetJS errors

**Sample Console Output:**
```
Converting Excel 2007+ file to CSV format...
FileConverter.convertExcelToCSV: Processing XLSX file
✅ Data parsed successfully
```

---

## Test Case 3: Excel (.xls) Upload

**Objective:** Verify older XLS format support

**Steps:**
1. Create or find an .xls (Excel 97-2003) file
2. Upload through "Upload Lead Data"
3. Verify conversion

**Expected Result:**
- ✅ XLS files convert correctly
- ✅ Shows: "Converting Excel 97-2003 file to CSV format..."
- ✅ Data preserves through conversion

---

## Test Case 4: ODS (LibreOffice) Upload

**Objective:** Verify ODS to CSV conversion

**Prerequisites:**
- JSZip library loaded
- DOMParser available

**Steps:**
1. Create or obtain an ODS file
2. Upload through "Upload Client Data"
3. Monitor console for conversion process
4. Verify data integrity

**Expected Result:**
- ✅ File converts successfully
- ✅ Console shows: "Converting LibreOffice Calc file to CSV format..."
- ✅ No JSZip errors
- ✅ Data displays correctly

**Console Checks:**
```javascript
window.JSZip                              // Should be defined
typeof DOMParser                          // Should be "function"
window.fileConverter.convertODSToCSV      // Should be a function
```

---

## Test Case 5: PDF Upload

**Objective:** Verify PDF text extraction and CSV conversion

**Prerequisites:**
- PDF.js library loaded
- Worker file available
- PDF contains structured text

**Steps:**
1. Create or obtain a PDF with tabular data
2. Upload through "Upload Lead Data"
3. Check console for extraction process
4. Verify text conversion to CSV format

**Expected Result:**
- ✅ PDF extracts text successfully
- ✅ Console shows: "Converting PDF file to CSV format..."
- ✅ Text appears in CSV format
- ✅ No PDF.js worker errors

**Console Checks:**
```javascript
typeof pdfjsLib                                  // Should be "object"
pdfjsLib.GlobalWorkerOptions.workerSrc         // Should be set
window.fileConverter.convertPDFToCSV            // Should be a function
```

---

## Test Case 6: File Size Validation

**Objective:** Verify 10MB limit enforcement

**Steps:**
1. Create a file larger than 10MB
2. Attempt to upload
3. Check for error message

**Expected Result:**
- ❌ Upload blocked with error
- ✅ Error message: "File size exceeds 10MB limit"
- ✅ No partial upload attempted

---

## Test Case 7: Invalid Format Rejection

**Objective:** Verify unsupported formats are rejected

**Steps:**
1. Try to upload .doc, .txt, or .zip file
2. Verify file input restricts to valid formats
3. Check console for validation

**Expected Result:**
- ✅ File input accept attribute limits formats
- ✅ Error message for unsupported types
- ✅ Proper file validation

**Console Check:**
```javascript
window.fileConverter.validateFile({name: 'test.doc'})  // Should throw error
```

---

## Test Case 8: CSV Escaping Integrity

**Objective:** Verify CSV data with special characters

**Steps:**
1. Create CSV with commas, quotes, newlines in data
2. Upload file
3. Verify data integrity

**Sample Data:**
```csv
name,email,notes
John Doe,john@example.com,"123 Main St, Suite 100"
Jane Smith,jane@example.com,"CEO - ""Chief Executive Officer"""
```

**Expected Result:**
- ✅ Data parses correctly
- ✅ Special characters preserved
- ✅ No data corruption

---

## Test Case 9: Error Handling - Corrupted File

**Objective:** Verify graceful error handling

**Steps:**
1. Rename a .pdf to .xlsx
2. Attempt upload
3. Check error message

**Expected Result:**
- ❌ Conversion fails gracefully
- ✅ Error message displayed
- ✅ User can retry with correct file
- ✅ No application crash

---

## Test Case 10: Multiple Format Uploads in Sequence

**Objective:** Verify system stability with repeated uploads

**Steps:**
1. Upload CSV file → verify success
2. Upload XLSX file → verify success
3. Upload ODS file → verify success
4. Upload PDF file → verify success
5. All in quick succession

**Expected Result:**
- ✅ All uploads complete successfully
- ✅ Data integrity maintained
- ✅ No memory leaks or hang-ups
- ✅ Console clean (no errors)

---

## Browser Console Commands for Testing

```javascript
// Check file converter availability
window.fileConverter                    // Should be defined

// Test file validation
window.fileConverter.validateFile({
    name: 'test.xlsx',
    size: 1024 * 1024  // 1MB
})

// Check supported formats
window.fileConverter.supportedFormats   // ['csv', 'xlsx', 'xls', 'ods', 'pdf']

// Check library availability
typeof XLSX                             // Should be "object"
typeof JSZip                            // Should be "function"
typeof pdfjsLib                         // Should be "object"

// File type label
window.fileConverter.getFileTypeLabel('pdf')    // Should return "PDF"
window.fileConverter.getFileTypeIcon('xlsx')    // Should return "📊"

// Upload status tracking
console.log('Upload tests initialized')
```

---

## Performance Expectations

| File Type | File Size | Expected Time |
|-----------|-----------|----------------|
| CSV | 1MB | < 100ms |
| XLSX | 1MB | 200-500ms |
| XLS | 1MB | 200-500ms |
| ODS | 1MB | 300-600ms |
| PDF | 1MB | 400-800ms |

---

## Troubleshooting

### Issue: "fileConverter is not defined"
**Solution:** Check that file-converter.js loaded before upload.js
```html
<script src="js/file-converter.js"></script>
<script src="js/upload.js"></script>
```

### Issue: "XLSX is not defined"
**Solution:** Verify SheetJS library is loaded in index.html
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js"></script>
```

### Issue: "JSZip is not defined"
**Solution:** Verify JSZip library is loaded
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
```

### Issue: "pdfjsLib is not defined"
**Solution:** Verify PDF.js library is loaded
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
```

### Issue: PDF extraction returns empty
**Solution:** Ensure PDF contains selectable text (not image-based)

---

## Acceptance Criteria

✅ All test cases pass
✅ No console errors
✅ File inputs accept all 5 formats
✅ Data integrity maintained through conversion
✅ Error messages are clear and helpful
✅ Performance meets expectations
✅ No memory leaks
✅ Libraries load successfully

---

**Test Status:** Ready for manual testing
**Last Updated:** 2026-06-26
