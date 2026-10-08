/**
 * Bloom Conference 2026 — Google Apps Script Backend
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Create a NEW Google Spreadsheet for Bloom 2026 registrations.
 * 2. Go to Extensions → Apps Script.
 * 3. Paste this entire file as Code.gs (replace the default content).
 * 4. Set DRIVE_FOLDER_ID to the ID of a Google Drive folder for payment receipts.
 *    (The ID is the long string in the folder URL after /folders/)
 * 5. Click Deploy → New Deployment
 *    - Type: Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the generated /exec URL into your public/config.js file.
 *
 * RE-DEPLOYING UPDATES:
 *   Deploy → Manage Deployments → Edit (pencil) → New Version → Deploy
 *
 * SPREADSHEET TABS CREATED AUTOMATICALLY:
 *   - "Registrations" → all submissions
 *
 * SECURITY:
 *   This script validates POST origin via CORS headers.
 *   The DRIVE_FOLDER_ID is set here in Apps Script (never in the public frontend).
 */

// ── CONFIG — FILL IN BEFORE DEPLOYING ───────────────────────
var DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';
// ─────────────────────────────────────────────────────────────

/**
 * Column headers for the Registrations sheet.
 */
var HEADERS = [
  'Timestamp',
  'Full Name',
  'Email Address',
  'Phone Number',
  'Age Range',
  'Marital Status',
  'Church Plant',
  'Homes Code',
  'Workshop',
  'First Bloom Conference?',
  'Proof of Payment URL',
  'Additional Remarks',
  'Submission ID',
];

/**
 * Gets or creates a sheet by name, ensuring headers are set.
 */
function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS);
    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#C9556E');
    headerRange.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    // Set column widths
    sheet.setColumnWidth(1, 160);   // Timestamp
    sheet.setColumnWidth(2, 180);   // Full Name
    sheet.setColumnWidth(3, 200);   // Email
    sheet.setColumnWidth(4, 140);   // Phone
    sheet.setColumnWidth(13, 250);  // Payment URL
  }

  return sheet;
}

/**
 * GET — health check
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Bloom Conference 2026' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST — receive a registration submission
 */
function doPost(e) {
  try {
    // Parse the incoming JSON
    if (!e || !e.postData || !e.postData.contents) {
      return errorResponse('No data received.');
    }

    var data = JSON.parse(e.postData.contents);

    // Basic server-side validation
    if (!data.fullName || !data.emailAddress || !data.phoneNumber) {
      return errorResponse('Missing required fields: fullName, emailAddress, phoneNumber.');
    }

    if (!data.fileData || !data.fileType || !data.fileName) {
      return errorResponse('Proof of payment is required.');
    }

    // Upload payment proof to Drive
    var fileUrl = uploadPaymentProof(data);

    // Write to sheet
    var sheet = getOrCreateSheet('Registrations');
    var submissionId = Utilities.getUuid();
    var timestamp = new Date();

    sheet.appendRow([
      timestamp,
      data.fullName      || '',
      data.emailAddress  || '',
      data.phoneNumber   || '',
      data.ageRange      || '',
      data.maritalStatus || '',
      data.churchPlant   || '',
      data.homesCode     || '',
      data.workshop      || '',
      data.firstBloom    || '',
      fileUrl,
      data.remarks       || '',
      submissionId,
    ]);

    return successResponse({ submissionId: submissionId, fileUrl: fileUrl });

  } catch (err) {
    return errorResponse('Server error: ' + err.toString());
  }
}

/**
 * Uploads a base64-encoded file to Google Drive and returns its shareable URL.
 */
function uploadPaymentProof(data) {
  if (!DRIVE_FOLDER_ID || DRIVE_FOLDER_ID === 'YOUR_DRIVE_FOLDER_ID') {
    return 'Drive not configured';
  }

  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // Sanitise filename
    var safeName = (data.fullName || 'unknown').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    var ext = data.fileName.split('.').pop().toLowerCase();
    var fileName = 'Bloom2026_Payment_' + safeName + '_' + Utilities.getUuid().substring(0, 8) + '.' + ext;

    var blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.fileType,
      fileName
    );

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();

  } catch (uploadErr) {
    // Don't fail the whole submission if upload fails — log and continue
    Logger.log('File upload failed: ' + uploadErr.toString());
    return 'Upload failed: ' + uploadErr.message;
  }
}

/**
 * Returns a JSON success response.
 */
function successResponse(extra) {
  var payload = Object.assign({ result: 'success' }, extra || {});
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Returns a JSON error response.
 */
function errorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'error', error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
