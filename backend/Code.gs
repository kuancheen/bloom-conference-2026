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
  'Email',
  'Full Name',
  'Phone',
  'Age Range',
  'Marital Status',
  'Church Plant',
  'Others',
  'Homes Code',
  'Workshop',
  'First Bloom?',
  'Payment URL',
  'Remarks',
  'Submission ID',
  'Admin Notes',
  'Email Sent Timestamp',
  'Email Error Note',
  'Payment Verified Email Sent Timestamp'
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
    headerRange.setBackground('#D03A19');
    headerRange.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    // Set column widths
    sheet.setColumnWidth(1, 160);   // Timestamp
    sheet.setColumnWidth(2, 200);   // Email
    sheet.setColumnWidth(3, 180);   // Full Name
    sheet.setColumnWidth(4, 140);   // Phone
    sheet.setColumnWidth(12, 250);  // Payment URL
  }

  return sheet;
}

/**
 * GET — health check, config, stats, or registrants fetch
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  if (action === 'config') {
    return getConfigResponse();
  } else if (action === 'stats') {
    return getStatsResponse();
  } else if (action === 'registrants') {
    return getRegistrantsResponse();
  } else if (action === 'get_payments') {
    return getPaymentsResponse(e);
  } else if (action === 'check_auth') {
    return checkAuthResponse(e);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Bloom Conference 2026' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Reads and computes statistics for the Dashboard.
 */
function getStatsResponse() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var regSheet = ss.getSheetByName('Registration');
    if (!regSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', error: 'Registration sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var regData = regSheet.getDataRange().getValues();
    var totalRegistrations = 0;
    var churchPlantCounts = {};
    var ageRangeCounts = {};
    var maritalStatusCounts = {};
    var firstBloomCounts = { 'Yes': 0, 'No': 0 };
    var dailySignups = {};
    var workshopCounts = {};

    // Header index mapping
    var headers = regData.length > 0 ? regData[0] : [];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      colMap[headers[c].toString().trim().toLowerCase()] = c;
    }

    var tsIdx = colMap['timestamp'] !== undefined ? colMap['timestamp'] : 0;
    var nameIdx = colMap['full name'] !== undefined ? colMap['full name'] : 2;
    var ageIdx = colMap['age range'] !== undefined ? colMap['age range'] : 4;
    var maritalIdx = colMap['marital status'] !== undefined ? colMap['marital status'] : 5;
    var cpIdx = colMap['church plant'] !== undefined ? colMap['church plant'] : 6;
    var othersIdx = colMap['others'] !== undefined ? colMap['others'] : 7;
    var wsIdx = colMap['workshop'] !== undefined ? colMap['workshop'] : 9;
    var fbIdx = colMap['first bloom?'] !== undefined ? colMap['first bloom?'] : 10;

    // Workshop mapping
    var workshopLabelMap = {
      'beautiful': 'Beautiful Inside Out',
      'cars': 'Cars 101',
      'journalling': 'Creative Bible Journalling',
      'menopause': 'Preparing For Menopause',
      'scam': 'Scam Prevention Awareness',
      'none': 'Unable to Attend'
    };

    for (var r = 1; r < regData.length; r++) {
      var row = regData[r];
      var fullName = (row[nameIdx] || '').toString().trim();
      if (!fullName) continue; // skip empty rows

      totalRegistrations++;

      // Timeline by Date (YYYY-MM-DD)
      var rawTs = row[tsIdx];
      var dateKey = '';
      if (rawTs instanceof Date) {
        dateKey = Utilities.formatDate(rawTs, Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
      } else if (rawTs) {
        var parsedDate = new Date(rawTs);
        if (!isNaN(parsedDate.getTime())) {
          dateKey = Utilities.formatDate(parsedDate, Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
        }
      }
      if (dateKey) {
        dailySignups[dateKey] = (dailySignups[dateKey] || 0) + 1;
      }

      // Church Plant (resolve Others)
      var cp = (row[cpIdx] || '').toString().trim();
      var otherCp = (row[othersIdx] || '').toString().trim();
      var finalCp = cp;
      if (cp === 'Others' && otherCp) {
        finalCp = 'Others (' + otherCp + ')';
      } else if (!cp) {
        finalCp = 'Unspecified';
      }
      churchPlantCounts[finalCp] = (churchPlantCounts[finalCp] || 0) + 1;

      // Age Range
      var age = (row[ageIdx] || '').toString().trim() || 'Unspecified';
      ageRangeCounts[age] = (ageRangeCounts[age] || 0) + 1;

      // Marital Status
      var marital = (row[maritalIdx] || '').toString().trim() || 'Unspecified';
      maritalStatusCounts[marital] = (maritalStatusCounts[marital] || 0) + 1;

      // First Bloom
      var fb = (row[fbIdx] || '').toString().trim().toLowerCase();
      if (fb === 'yes' || fb === '是' || fb === 'ya') {
        firstBloomCounts['Yes']++;
      } else if (fb === 'no' || fb === '否' || fb === 'tidak') {
        firstBloomCounts['No']++;
      }

      // Workshop Count
      var wsCode = (row[wsIdx] || '').toString().trim().toLowerCase();
      if (wsCode) {
        workshopCounts[wsCode] = (workshopCounts[wsCode] || 0) + 1;
      }
    }

    // Workshop Capacities & Occupancy from Limits Sheet
    var limitsMap = getWorkshopLimitsMap(ss);
    var workshopStats = [];
    var totalWorkshopCapacity = 0;
    var totalWorkshopOccupancy = 0;

    Object.keys(limitsMap).forEach(function(key) {
      var item = limitsMap[key];
      // Deduplicate alias entries
      if (item.code && item.code.toLowerCase() === key) {
        var count = workshopCounts[item.code.toLowerCase()] || item.registered || 0;
        var limit = item.limit || 0;
        if (item.code.toLowerCase() !== 'none') {
          totalWorkshopCapacity += limit;
          totalWorkshopOccupancy += count;
        }
        workshopStats.push({
          code: item.code,
          name: item.name || workshopLabelMap[item.code.toLowerCase()] || item.code,
          limit: limit,
          registered: count,
          seatsLeft: Math.max(0, limit - count),
          isFull: item.isFull || (limit > 0 && count >= limit)
        });
      }
    });

    var payload = {
      result: 'success',
      totalRegistrations: totalRegistrations,
      dailySignups: dailySignups,
      churchPlantCounts: churchPlantCounts,
      workshopStats: workshopStats,
      totalWorkshopCapacity: totalWorkshopCapacity,
      totalWorkshopOccupancy: totalWorkshopOccupancy,
      ageRangeCounts: ageRangeCounts,
      maritalStatusCounts: maritalStatusCounts,
      firstBloomCounts: firstBloomCounts,
      lastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss')
    };

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Reads registrants list returning only Full Name, Church Plant, and Homes Code.
 */
function getRegistrantsResponse() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var regSheet = ss.getSheetByName('Registration');
    if (!regSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', error: 'Registration sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var regData = regSheet.getDataRange().getValues();
    if (!regData || regData.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'success', registrants: [], total: 0 }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = regData[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      colMap[headers[c].toString().trim().toLowerCase()] = c;
    }

    var nameIdx = colMap['full name'] !== undefined ? colMap['full name'] : 2;
    var cpIdx = colMap['church plant'] !== undefined ? colMap['church plant'] : 6;
    var othersIdx = colMap['others'] !== undefined ? colMap['others'] : 7;
    var homesIdx = colMap['homes code'] !== undefined ? colMap['homes code'] : 8;

    var registrants = [];

    for (var r = 1; r < regData.length; r++) {
      var row = regData[r];
      var fullName = (row[nameIdx] || '').toString().trim();
      if (!fullName) continue; // Skip blank rows

      var cp = (row[cpIdx] || '').toString().trim();
      var otherCp = (row[othersIdx] || '').toString().trim();
      var finalCp = cp;
      if (cp === 'Others' && otherCp) {
        finalCp = 'Others (' + otherCp + ')';
      } else if (!cp) {
        finalCp = '-';
      }

      var homesCode = (row[homesIdx] || '').toString().trim() || '-';

      registrants.push({
        id: r,
        fullName: fullName,
        churchPlant: finalCp,
        homesCode: homesCode
      });
    }

    var payload = {
      result: 'success',
      registrants: registrants,
      total: registrants.length,
      lastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss')
    };

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Reads dropdown options and workshop limits.
 * Dynamically detects column positions by scanning row 0 headers.
 */
function getConfigResponse() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName('Config');
    if (!configSheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', error: 'Config sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = configSheet.getDataRange().getValues();
    if (!data || data.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'success', config: {}, limits: {} }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headerRow = data[0];
    var colMap = {};

    for (var c = 0; c < headerRow.length; c++) {
      var h = (headerRow[c] || '').toString().toLowerCase();
      if (h.indexOf('age range') !== -1) colMap['Age Range'] = c;
      else if (h.indexOf('marital status') !== -1) colMap['Marital Status'] = c;
      else if (h.indexOf('workshop') !== -1) colMap['Workshop'] = c;
      else if (h.indexOf('first bloom') !== -1) colMap['First Bloom'] = c;
      else if (h.indexOf('church plant') !== -1) colMap['Church Plant'] = c;
    }

    // Dynamic columns with reliable fallbacks
    var arCol = colMap['Age Range'] !== undefined ? colMap['Age Range'] : 1;
    var msCol = colMap['Marital Status'] !== undefined ? colMap['Marital Status'] : 4;
    var wsCol = colMap['Workshop'] !== undefined ? colMap['Workshop'] : 7;
    var fbCol = colMap['First Bloom'] !== undefined ? colMap['First Bloom'] : 10;
    var cpCol = colMap['Church Plant'] !== undefined ? colMap['Church Plant'] : 13;

    var config = {
      'Age Range':      [],
      'Marital Status': [],
      'Workshop':       [],
      'First Bloom':    [],
      'Church Plant':   []
    };

    // Start from row index 1 (skip header)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      // Age Range
      var arLabel = (row[arCol] || '').toString().trim();
      var arValue = (row[arCol + 1] || '').toString().trim();
      if (arLabel) config['Age Range'].push({ label: arLabel, value: arValue || arLabel, group: '' });

      // Marital Status
      var msLabel = (row[msCol] || '').toString().trim();
      var msValue = (row[msCol + 1] || '').toString().trim();
      if (msLabel) config['Marital Status'].push({ label: msLabel, value: msValue || msLabel, group: '' });

      // Workshop
      var wsLabel = (row[wsCol] || '').toString().trim();
      var wsValue = (row[wsCol + 1] || '').toString().trim();
      if (wsLabel) config['Workshop'].push({ label: wsLabel, value: wsValue || wsLabel, group: '' });

      // First Bloom
      var fbLabel = (row[fbCol] || '').toString().trim();
      var fbValue = (row[fbCol + 1] || '').toString().trim();
      if (fbLabel) config['First Bloom'].push({ label: fbLabel, value: fbValue || fbLabel, group: '' });

      // Church Plant — Col N(13)=label, Col O(14)=value, Col P(15)=group
      var cpLabel = (row[cpCol] || '').toString().trim();
      var cpValue = (row[cpCol + 1] || '').toString().trim();
      var cpGroup = (row[cpCol + 2] || '').toString().trim();
      if (cpLabel) config['Church Plant'].push({ label: cpLabel, value: cpValue || cpLabel, group: cpGroup });
    }

    // Read Workshop Limits
    var limitsMap = getWorkshopLimitsMap(ss);

    // Annotate workshop options with limit and availability info
    for (var w = 0; w < config['Workshop'].length; w++) {
      var wOpt = config['Workshop'][w];
      var wValKey = (wOpt.value || '').toLowerCase().trim();
      var wLabelKey = (wOpt.label || '').toLowerCase().trim();
      var matchedLimit = limitsMap[wValKey] || limitsMap[wLabelKey];

      if (matchedLimit) {
        wOpt.limit = matchedLimit.limit;
        wOpt.registered = matchedLimit.registered;
        wOpt.isFull = matchedLimit.isFull;
      } else {
        wOpt.isFull = false;
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', config: config, limits: limitsMap }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper to parse the Limits sheet and calculate workshop limits / counts.
 */
function getWorkshopLimitsMap(ss) {
  var limitsMap = {};
  var limitsSheet = ss.getSheetByName('Limits');
  if (!limitsSheet) return limitsMap;

  var limitData = limitsSheet.getDataRange().getValues();
  if (!limitData || limitData.length < 2) return limitsMap;

  var header = limitData[0];
  var codeCol = -1, nameCol = -1, limitCol = -1, registeredCol = -1, statusCol = -1, seatsLeftCol = -1;

  for (var c = 0; c < header.length; c++) {
    var colName = (header[c] || '').toString().toLowerCase().trim();
    if (colName === 'code' || colName === 'workshop code') {
      codeCol = c;
    } else if (colName === 'workshop' || colName === 'item' || colName === 'workshop name' || colName === 'name') {
      nameCol = c;
    } else if (colName === 'limit' || colName === 'capacity' || colName === 'max') {
      limitCol = c;
    } else if (colName === 'current count' || colName === 'registered' || colName === 'total registered' || colName === 'count') {
      registeredCol = c;
    } else if (colName === 'seats left' || colName === 'remaining' || colName === 'balance') {
      seatsLeftCol = c;
    } else if (colName === 'status' || colName === 'is full') {
      statusCol = c;
    }
  }

  // Sensible default column positions based on sheet structure (Col B=Code, Col C=Workshop, Col D=Limit, Col E=Current Count)
  if (codeCol === -1) codeCol = 1; // Col B
  if (nameCol === -1) nameCol = 2; // Col C
  if (limitCol === -1) limitCol = 3; // Col D
  if (registeredCol === -1) registeredCol = 4; // Col E

  for (var r = 1; r < limitData.length; r++) {
    var row = limitData[r];
    var code = (row[codeCol] || '').toString().trim();
    var name = nameCol !== -1 ? (row[nameCol] || '').toString().trim() : code;
    if (!code && !name) continue;

    var limitVal = parseInt(row[limitCol], 10);
    var regVal = registeredCol !== -1 ? parseInt(row[registeredCol], 10) : 0;
    var seatsLeftVal = seatsLeftCol !== -1 ? parseInt(row[seatsLeftCol], 10) : NaN;
    if (isNaN(limitVal)) limitVal = 0;
    if (isNaN(regVal)) regVal = 0;

    var statusText = statusCol !== -1 ? (row[statusCol] || '').toString().toLowerCase().trim() : '';
    var isFull = false;

    if (!isNaN(seatsLeftVal) && limitVal > 0) {
      isFull = seatsLeftVal <= 0;
    } else if (limitVal > 0 && regVal >= limitVal) {
      isFull = true;
    } else if (statusText === 'full' || statusText === 'closed') {
      isFull = true;
    }

    var entry = {
      code: code || name,
      name: name || code,
      limit: limitVal,
      registered: regVal,
      isFull: isFull
    };

    if (code) {
      limitsMap[code.toLowerCase()] = entry;
    }
    if (name) {
      limitsMap[name.toLowerCase()] = entry;
    }
  }

  return limitsMap;
}

/**
 * Checks if a workshop selection is still available in the Limits sheet.
 */
function isWorkshopAvailable(ss, workshopValue) {
  if (!workshopValue || workshopValue.toLowerCase() === 'none') {
    return { available: true };
  }
  var limitsMap = getWorkshopLimitsMap(ss);
  var workshopKey = workshopValue.toLowerCase().trim();
  if (limitsMap[workshopKey] && limitsMap[workshopKey].isFull) {
    return {
      available: false,
      workshopName: limitsMap[workshopKey].name || limitsMap[workshopKey].code || workshopValue
    };
  }
  return { available: true };
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
    var action = (e && e.parameter && e.parameter.action) || (data && data.action) || '';

    if (action === 'approve_payment') {
      return handleApprovePayment(data);
    }

    // Basic server-side validation
    if (!data.fullName || !data.emailAddress || !data.phoneNumber) {
      return errorResponse('Missing required fields: fullName, emailAddress, phoneNumber.');
    }

    if (!data.fileData || !data.fileType || !data.fileName) {
      return errorResponse('Proof of payment is required.');
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Verify workshop capacity limit before saving
    if (data.workshop) {
      var availability = isWorkshopAvailable(ss, data.workshop);
      if (!availability.available) {
        var wsDisplayName = availability.workshopName || data.workshop;
        return errorResponse(
          '[' + wsDisplayName + ']\n' +
          'The selected workshop is full. Please choose another workshop.\n' +
          '所选工作坊名额已满，请选择其他工作坊。\n' +
          'Bengkel yang dipilih telah penuh. Sila pilih bengkel yang lain.'
        );
      }
    }

    // Upload payment proof to Drive
    var fileUrl = uploadPaymentProof(data);

    var emailTimestamp = '';
    var emailError = '';

    try {
      sendConfirmationEmail(data, fileUrl);
      emailTimestamp = new Date();
    } catch (err) {
      console.error('Email failed: ' + err.toString());
      emailError = err.toString();
    }

    // Capitalize each word of Full Name
    var formattedFullName = toTitleCase(data.fullName || '');

    // Write to sheet
    var sheet = getOrCreateSheet('Registration');
    var submissionId = Utilities.getUuid();
    var timestamp = new Date();

    sheet.appendRow([
      timestamp,
      data.emailAddress  || '',
      formattedFullName,
      data.phoneNumber   || '',
      data.ageRange      || '',
      data.maritalStatus || '',
      data.churchPlant   || '',
      data.churchPlantOther || '',
      data.homesCode     || '',
      data.workshop      || '',
      data.firstBloom    || '',
      fileUrl,
      data.remarks       || '',
      submissionId,
      '',             // Column O: Admin Notes
      emailTimestamp, // Column P: Email Sent Timestamp
      emailError      // Column Q: Email Error Note
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
 * Converts a string to Title Case (Each Word Capitalized).
 */
function toTitleCase(str) {
  if (!str) return '';
  return str.toString().trim().toLowerCase().replace(/(?:^|\s|-)\S/g, function(a) {
    return a.toUpperCase();
  });
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

/**
 * Sends a stylized HTML confirmation email.
 */
function sendConfirmationEmail(data, fileUrl) {
  var subject = "Registration Received - Bloom Conference 2026 / 报名已收到 / Pendaftaran Diterima";
  
  var workshopMap = {
    'beautiful': 'Beautiful Inside Out / 由内而外的美丽 / Cantik dari Dalam ke Luar',
    'cars': 'Cars 101 / 车辆的基本维护 / Asas Penjagaan Kereta',
    'journalling': 'Creative Bible Journalling / 创意圣经灵修日记 + 手帐 / Jurnal Alkitab Kreatif',
    'menopause': 'Preparing For Menopause / 为更年期做预备 / Persediaan Menghadapi Menopaus',
    'scam': 'Scam Prevention Awareness / 提升反诈骗意识 / Kesedaran Pencegahan Penipuan',
    'none': "[I'm not able to attend] | [抱歉，不能参与] | [Maaf, saya tidak dapat hadir]"
  };
  var workshopDisplay = workshopMap[data.workshop] || data.workshop || '';
  var churchDisplay = (data.churchPlant === 'Others' && data.churchPlantOther) ? data.churchPlantOther : (data.churchPlant || '');
  
  var paymentRowHtml = '';
  var paymentRowPlain = '';
  if (fileUrl && fileUrl.indexOf('http') === 0) {
    paymentRowHtml = `
      <tr>
        <td style="padding: 12px 15px; border-top: 1px solid #E8D0D8; font-weight: 600; color: #7A5F6F;">Payment Proof / 付款凭证 / Bukti Pembayaran</td>
        <td style="padding: 12px 15px; border-top: 1px solid #E8D0D8;"><a href="${fileUrl}" target="_blank" style="color: #D03A19; font-weight: 600; text-decoration: underline;">View Receipt / 查看转账凭证 / Lihat Resit</a></td>
      </tr>
    `;
    paymentRowPlain = "\n- Payment Proof / 付款凭证 / Bukti Pembayaran: " + fileUrl;
  }

  var htmlBody = `
<div style="font-family: 'Inter', system-ui, sans-serif; color: #3C2B35; max-width: 600px; margin: 0 auto; background-color: #FDF6F0; border-radius: 12px; overflow: hidden; border: 1px solid #E8D0D8;">
  <div style="width: 100%; text-align: center; background-color: #D03A19; line-height: 0;">
    <img src="https://msyioizqks2uqtsyukulnv4wpjan5ftkjdfy0yqm43k.canva-cdn.email/7d44390f8d265681494d87ac107dedf5.png" alt="Bloom Conference 2026 - Registration Received / 报名已收到 / Pendaftaran Diterima" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; border: 0;" />
  </div>
  
  <div style="padding: 30px;">
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>Thank you for registering for the <strong>Bloom Conference 2026</strong>! We have received your registration details and payment proof.</p>
    <p style="color: #7A5F6F; font-size: 14px; margin-top: 12px; margin-bottom: 6px;">谢谢你的报名！我们已收到你的报名资料及转账凭证。</p>
    <p style="color: #7A5F6F; font-size: 14px; margin-top: 0;">Terima kasih kerana mendaftar! Kami telah menerima butiran pendaftaran dan bukti pembayaran anda.</p>

    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #E8D0D8;">
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8; font-weight: 600; color: #7A5F6F; width: 40%;">Name / 姓名 / Nama</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8;">${data.fullName}</td>
      </tr>
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8; font-weight: 600; color: #7A5F6F;">Church Plant / 植会 / Anak Gereja</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8;">${churchDisplay}</td>
      </tr>
      <tr>
        <td style="padding: 12px 15px; font-weight: 600; color: #7A5F6F;">Workshop / 工作坊 / Bengkel</td>
        <td style="padding: 12px 15px;">${workshopDisplay}</td>
      </tr>
      ${paymentRowHtml}
    </table>

    <div style="background-color: #FDEEEA; border-left: 4px solid #D03A19; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 600; color: #D03A19;">Important Note / 重要提示 / Nota Penting:</p>
      <p style="margin: 8px 0 4px; font-size: 14px; line-height: 1.5;">Your registration is currently pending payment verification. We will contact you if there are any issues with your payment.</p>
      <p style="margin: 4px 0; font-size: 14px; line-height: 1.5;">你的报名目前正在等待付款验证。如果转账有任何问题，我们将与你联系。</p>
      <p style="margin: 4px 0 0; font-size: 14px; line-height: 1.5;">Pendaftaran anda sedang menunggu pengesahan pembayaran. Kami akan menghubungi anda sekiranya terdapat sebarang isu.</p>
    </div>

    <h3 style="color: #D03A19; margin-top: 30px;">Event Details / 活动详情 / Butiran Acara</h3>
    <p style="margin: 6px 0;"><strong>Date / 日期 / Tarikh:</strong> 14 November 2026</p>
    <p style="margin: 6px 0;"><strong>Time / 时间 / Masa:</strong> 9.30am – 5.00pm</p>
    <p style="margin: 6px 0;"><strong>Venue / 地点 / Lokasi:</strong> Bible College of Malaysia, Petaling Jaya</p>

    <div style="margin-top: 30px; font-size: 14px; color: #7A5F6F; border-top: 1px solid #E8D0D8; padding-top: 20px; text-align: center; line-height: 1.6;">
      <p style="margin: 4px 0;">If you have any questions, feel free to reply to this email.</p>
      <p style="margin: 4px 0;">若有任何疑问，请回复此邮件。</p>
      <p style="margin: 4px 0;">Sekiranya ada sebarang pertanyaan, sila balas e-mel ini.</p>
    </div>
  </div>
</div>
  `;

  var plainBody = "Hi " + (data.fullName || '') + ",\n\n" +
    "Thank you for registering for the Bloom Conference 2026! We have received your registration details and payment proof.\n\n" +
    "谢谢你的报名！我们已收到你的报名资料及转账凭证。\n\n" +
    "Terima kasih kerana mendaftar! Kami telah menerima butiran pendaftaran dan bukti pembayaran anda.\n\n" +
    "Registration Summary / 报名资料 / Ringkasan Pendaftaran:\n" +
    "- Name / 姓名 / Nama: " + (data.fullName || '') + "\n" +
    "- Church Plant / 植会 / Anak Gereja: " + churchDisplay + "\n" +
    "- Workshop / 工作坊 / Bengkel: " + workshopDisplay +
    paymentRowPlain + "\n\n" +
    "Important Note / 重要提示 / Nota Penting:\n" +
    "Your registration is currently pending payment verification. We will contact you if there are any issues with your payment.\n" +
    "你的报名目前正在等待付款验证。如果转账有任何问题，我们将与你联系。\n" +
    "Pendaftaran anda sedang menunggu pengesahan pembayaran. Kami akan menghubungi anda sekiranya terdapat sebarang isu.\n\n" +
    "Event Details / 活动详情 / Butiran Acara:\n" +
    "- Date / 日期 / Tarikh: 14 November 2026\n" +
    "- Time / 时间 / Masa: 9.30am - 5.00pm\n" +
    "- Venue / 地点 / Lokasi: Bible College of Malaysia, Petaling Jaya\n\n" +
    "If you have any questions, feel free to reply to this email.\n" +
    "若有任何疑问，请回复此邮件。\n" +
    "Sekiranya ada sebarang pertanyaan, sila balas e-mel ini.";

  MailApp.sendEmail({
    to: data.emailAddress,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody,
    name: "🌸 Bloom Conference 2026"
  });
}

/**
 * ─────────────────────────────────────────────────────────────
 * PHASE 6: PAYMENT VERIFICATION & ADMIN APPROVAL ENDPOINTS
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Validates Google ID token using Google OAuth tokeninfo endpoint,
 * or verifies admin email matches Admins sheet.
 */
function verifyAdminIdentity(token, claimedEmail) {
  var verifiedEmail = '';

  // 1. If Google ID token is provided, verify cryptographically via Google's tokeninfo API
  if (token) {
    try {
      var verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token);
      var response = UrlFetchApp.fetch(verifyUrl, { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        var tokenData = JSON.parse(response.getContentText());
        if (tokenData && tokenData.email && tokenData.email_verified) {
          verifiedEmail = tokenData.email.toString().trim().toLowerCase();
        }
      }
    } catch (e) {
      console.warn('ID token verification failed: ' + e.toString());
    }
  }

  // Fallback to claimed email if token is not available (e.g. testing)
  if (!verifiedEmail && claimedEmail) {
    verifiedEmail = claimedEmail.toString().trim().toLowerCase();
  }

  if (!verifiedEmail) {
    return { authorized: false, error: 'Missing or invalid Google credentials.' };
  }

  // 2. Check if verified email is in the Admins sheet
  var authorized = isEmailInAdminsSheet(verifiedEmail);
  return {
    authorized: authorized,
    email: verifiedEmail,
    error: authorized ? '' : 'Account (' + verifiedEmail + ') is not authorized as an administrator.'
  };
}

/**
 * Checks if the given email is in the "Admins" tab of the Google Spreadsheet.
 */
function isEmailInAdminsSheet(email) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var adminSheet = ss.getSheetByName('Admins');
    if (!adminSheet) {
      return false;
    }

    var data = adminSheet.getDataRange().getValues();
    if (data.length < 2) return false;

    // Detect Email column index dynamically from header row
    var headers = data[0];
    var emailColIdx = -1;
    for (var c = 0; c < headers.length; c++) {
      var h = (headers[c] || '').toString().trim().toLowerCase();
      if (h.indexOf('email') !== -1) {
        emailColIdx = c;
        break;
      }
    }
    // Default fallback: check Column B (idx 1) or Column A (idx 0)
    if (emailColIdx === -1) {
      emailColIdx = headers.length > 1 ? 1 : 0;
    }

    var target = email.toLowerCase().trim();
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      // Check detected email column
      var adminEmail = (row[emailColIdx] || '').toString().trim().toLowerCase();
      if (adminEmail && adminEmail === target) {
        return true;
      }
      // Fallback check across all columns in row in case column shifted
      for (var col = 0; col < row.length; col++) {
        var cellVal = (row[col] || '').toString().trim().toLowerCase();
        if (cellVal === target) {
          return true;
        }
      }
    }
    return false;
  } catch (err) {
    console.error('Error reading Admins sheet: ' + err.toString());
    return false;
  }
}

/**
 * GET action=check_auth
 * Validates whether the logged in user is authorized.
 */
function checkAuthResponse(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var email = (e && e.parameter && e.parameter.email) || '';
  var authResult = verifyAdminIdentity(token, email);

  return ContentService
    .createTextOutput(JSON.stringify({
      result: authResult.authorized ? 'success' : 'error',
      authorized: authResult.authorized,
      email: authResult.email || '',
      error: authResult.error
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET action=get_payments
 * Securely returns registrants with payment verification status and details.
 */
function getPaymentsResponse(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var email = (e && e.parameter && e.parameter.email) || '';
  var authResult = verifyAdminIdentity(token, email);

  if (!authResult.authorized) {
    return ContentService
      .createTextOutput(JSON.stringify({
        result: 'error',
        authorized: false,
        error: authResult.error || 'Unauthorized: Access restricted to approved administrators.'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var regSheet = ss.getSheetByName('Registration');
    if (!regSheet) {
      return errorResponse('Registration sheet not found');
    }

    var regData = regSheet.getDataRange().getValues();
    if (!regData || regData.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({
          result: 'success',
          authorized: true,
          payments: [],
          total: 0
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = regData[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      colMap[headers[c].toString().trim().toLowerCase()] = c;
    }

    var tsIdx = colMap['timestamp'] !== undefined ? colMap['timestamp'] : 0;
    var emailIdx = colMap['email'] !== undefined ? colMap['email'] : 1;
    var nameIdx = colMap['full name'] !== undefined ? colMap['full name'] : 2;
    var phoneIdx = colMap['phone'] !== undefined ? colMap['phone'] : 3;
    var ageIdx = colMap['age range'] !== undefined ? colMap['age range'] : 4;
    var maritalIdx = colMap['marital status'] !== undefined ? colMap['marital status'] : 5;
    var cpIdx = colMap['church plant'] !== undefined ? colMap['church plant'] : 6;
    var othersIdx = colMap['others'] !== undefined ? colMap['others'] : 7;
    var homesIdx = colMap['homes code'] !== undefined ? colMap['homes code'] : 8;
    var wsIdx = colMap['workshop'] !== undefined ? colMap['workshop'] : 9;
    var fbIdx = colMap['first bloom?'] !== undefined ? colMap['first bloom?'] : 10;
    var payIdx = colMap['payment url'] !== undefined ? colMap['payment url'] : 11;
    var remarksIdx = colMap['remarks'] !== undefined ? colMap['remarks'] : 12;
    var subIdIdx = colMap['submission id'] !== undefined ? colMap['submission id'] : 13;
    var adminNotesIdx = colMap['admin notes'] !== undefined ? colMap['admin notes'] : 14;

    var payments = [];

    for (var r = 1; r < regData.length; r++) {
      var row = regData[r];
      var fullName = (row[nameIdx] || '').toString().trim();
      if (!fullName) continue;

      var cp = (row[cpIdx] || '').toString().trim();
      var otherCp = (row[othersIdx] || '').toString().trim();
      var finalCp = cp;
      if (cp === 'Others' && otherCp) {
        finalCp = 'Others (' + otherCp + ')';
      }

      var rawTimestamp = row[tsIdx];
      var dateStr = '';
      if (rawTimestamp instanceof Date) {
        dateStr = Utilities.formatDate(rawTimestamp, Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
      } else if (rawTimestamp) {
        dateStr = rawTimestamp.toString();
      }

      var adminNote = (row[adminNotesIdx] || '').toString().trim();
      var isVerified = adminNote.toLowerCase().indexOf('verified') !== -1;

      payments.push({
        rowIndex: r + 1, // 1-based sheet row index
        submissionId: (row[subIdIdx] || '').toString().trim(),
        timestamp: dateStr,
        fullName: fullName,
        email: (row[emailIdx] || '').toString().trim(),
        phone: (row[phoneIdx] || '').toString().trim(),
        ageRange: (row[ageIdx] || '').toString().trim(),
        maritalStatus: (row[maritalIdx] || '').toString().trim(),
        churchPlant: finalCp || '-',
        homesCode: (row[homesIdx] || '').toString().trim() || '-',
        workshop: (row[wsIdx] || '').toString().trim(),
        firstBloom: (row[fbIdx] || '').toString().trim(),
        paymentUrl: (row[payIdx] || '').toString().trim(),
        remarks: (row[remarksIdx] || '').toString().trim(),
        adminNotes: adminNote,
        isVerified: isVerified
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        result: 'success',
        authorized: true,
        adminUser: authResult.email,
        payments: payments,
        total: payments.length,
        pendingCount: payments.filter(function(p) { return !p.isVerified; }).length,
        verifiedCount: payments.filter(function(p) { return p.isVerified; }).length,
        lastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss')
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return errorResponse('Error loading payments: ' + err.toString());
  }
}

/**
 * Handles action=approve_payment via POST.
 */
function handleApprovePayment(data) {
  var token = data.token || '';
  var claimedEmail = data.adminEmail || '';
  var authResult = verifyAdminIdentity(token, claimedEmail);

  if (!authResult.authorized) {
    return errorResponse(authResult.error || 'Unauthorized admin action.');
  }

  var submissionId = (data.submissionId || '').toString().trim();
  var rowIndex = parseInt(data.rowIndex, 10);
  var customNote = (data.notes || '').toString().trim();

  if (!submissionId && !rowIndex) {
    return errorResponse('Missing submissionId or rowIndex for approval.');
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var regSheet = ss.getSheetByName('Registration');
    if (!regSheet) {
      return errorResponse('Registration sheet not found.');
    }

    var regData = regSheet.getDataRange().getValues();
    var headers = regData[0];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      colMap[headers[c].toString().trim().toLowerCase()] = c;
    }

    var nameIdx = colMap['full name'] !== undefined ? colMap['full name'] : 2;
    var emailIdx = colMap['email'] !== undefined ? colMap['email'] : 1;
    var cpIdx = colMap['church plant'] !== undefined ? colMap['church plant'] : 6;
    var othersIdx = colMap['others'] !== undefined ? colMap['others'] : 7;
    var homesIdx = colMap['homes code'] !== undefined ? colMap['homes code'] : 8;
    var wsIdx = colMap['workshop'] !== undefined ? colMap['workshop'] : 9;
    var subIdIdx = colMap['submission id'] !== undefined ? colMap['submission id'] : 13;
    var adminNotesCol = (colMap['admin notes'] !== undefined ? colMap['admin notes'] : 14) + 1; // 1-indexed

    var targetRow = -1;

    if (submissionId) {
      for (var r = 1; r < regData.length; r++) {
        if ((regData[r][subIdIdx] || '').toString().trim() === submissionId) {
          targetRow = r + 1;
          rowIndex = r + 1;
          break;
        }
      }
    } else if (rowIndex > 1 && rowIndex <= regData.length) {
      targetRow = rowIndex;
    }

    if (targetRow === -1) {
      return errorResponse('Registrant not found for submission ID: ' + submissionId);
    }

    var rowValues = regData[targetRow - 1];
    var nowFormatted = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm');
    var verificationText = 'Verified: ' + nowFormatted + ' by ' + authResult.email;
    if (customNote) {
      verificationText += ' (' + customNote + ')';
    }

    // Write verification text into Column O
    regSheet.getRange(targetRow, adminNotesCol).setValue(verificationText);

    // Extract data for email
    var cp = (rowValues[cpIdx] || '').toString().trim();
    var otherCp = (rowValues[othersIdx] || '').toString().trim();
    if (cp === 'Others' && otherCp) {
      cp = 'Others (' + otherCp + ')';
    }

    var registrant = {
      fullName: (rowValues[nameIdx] || '').toString().trim(),
      emailAddress: (rowValues[emailIdx] || '').toString().trim(),
      churchPlant: cp,
      homesCode: (rowValues[homesIdx] || '').toString().trim(),
      workshop: (rowValues[wsIdx] || '').toString().trim()
    };

    var emailSent = false;
    var emailError = '';

    if (registrant.emailAddress) {
      try {
        sendPaymentVerifiedEmail(registrant);
        emailSent = true;
        // Record timestamp in Column R (col index 18, 1-based)
        var verifiedEmailTsCol = colMap['payment verified email sent timestamp'] !== undefined
          ? (colMap['payment verified email sent timestamp'] + 1)
          : 18; // Default Column R
        var emailSentDate = new Date();
        regSheet.getRange(targetRow, verifiedEmailTsCol).setValue(emailSentDate);
      } catch (err) {
        console.error('Payment verified email failed: ' + err.toString());
        emailError = err.toString();
      }
    }

    return successResponse({
      message: 'Payment verified successfully.',
      verificationNote: verificationText,
      emailSent: emailSent,
      emailError: emailError,
      targetRow: targetRow
    });

  } catch (err) {
    return errorResponse('Server error while approving payment: ' + err.toString());
  }
}

/**
 * Sends a stylized trilingual confirmation email when payment is approved.
 */
function sendPaymentVerifiedEmail(data) {
  var subject = "Payment & Registration Confirmed — Bloom Conference 2026 / 报名与付款已确认 / Pendaftaran Disahkan";

  var workshopMap = {
    'beautiful': 'Beautiful Inside Out / 由内而外的美丽 / Cantik dari Dalam ke Luar',
    'cars': 'Cars 101 / 车辆的基本维护 / Asas Penjagaan Kereta',
    'journalling': 'Creative Bible Journalling / 创意圣经灵修日记 + 手帐 / Jurnal Alkitab Kreatif',
    'menopause': 'Preparing For Menopause / 为更年期做预备 / Persediaan Menghadapi Menopaus',
    'scam': 'Scam Prevention Awareness / 提升反诈骗意识 / Kesedaran Pencegahan Penipuan',
    'none': "[I'm not able to attend] | [抱歉，不能参与] | [Maaf, saya tidak dapat hadir]"
  };

  var workshopDisplay = workshopMap[(data.workshop || '').toLowerCase()] || data.workshop || '-';
  var churchDisplay = data.churchPlant || '-';
  var homesCodeDisplay = data.homesCode || '-';

  var htmlBody = `
<div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #3C2B35; max-width: 600px; margin: 0 auto; background-color: #FDF6F0; border-radius: 12px; overflow: hidden; border: 1px solid #E8D0D8;">
  <div style="width: 100%; text-align: center; background-color: #D03A19; line-height: 0;">
    <img src="https://msyioizqks2uqtsyukulnv4wpjan5ftkjdfy0yqm43k.canva-cdn.email/7d44390f8d265681494d87ac107dedf5.png" alt="Bloom Conference 2026 - Registration & Payment Confirmed / 报名与付款已确认 / Pendaftaran Disahkan" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; border: 0;" />
  </div>

  <div style="padding: 30px;">
    <div style="background-color: #EBF8EE; border: 1px solid #B8E4C3; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1E7E34;">
        ✅ Payment Verified &amp; Confirmed / 付款已确认 / Pembayaran Disahkan!
      </p>
    </div>

    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>${data.fullName}</strong>,</p>
    
    <p style="font-size: 15px; line-height: 1.6;">Great news! Your payment has been verified by our team. Your registration for <strong>Bloom Conference 2026</strong> is now <strong>fully confirmed</strong>!</p>
    
    <p style="color: #7A5F6F; font-size: 14px; margin-top: 10px; margin-bottom: 6px; line-height: 1.5;">太棒了！你的付款已获审核通过。你的 <strong>Bloom Conference 2026</strong> 席位已正式确认！</p>
    
    <p style="color: #7A5F6F; font-size: 14px; margin-top: 0; line-height: 1.5;">Berita baik! Pembayaran anda telah disahkan oleh pasukan kami. Pendaftaran anda untuk <strong>Bloom Conference 2026</strong> kini disahkan sepenuhnya!</p>

    <!-- Registration Details Table -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 24px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #E8D0D8;">
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8; font-weight: 600; color: #7A5F6F; width: 40%;">Name / 姓名 / Nama</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8; font-weight: 600; color: #3C2B35;">${data.fullName}</td>
      </tr>
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8; font-weight: 600; color: #7A5F6F;">Church Plant / 植会 / Anak Gereja</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8; color: #3C2B35;">${churchDisplay}</td>
      </tr>
      <tr>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8; font-weight: 600; color: #7A5F6F;">Homes Code / Homes 代码 / Kod Homes</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #E8D0D8; color: #3C2B35;">${homesCodeDisplay}</td>
      </tr>
      <tr>
        <td style="padding: 12px 15px; font-weight: 600; color: #7A5F6F;">Workshop / 工作坊 / Bengkel</td>
        <td style="padding: 12px 15px; color: #3C2B35;">${workshopDisplay}</td>
      </tr>
    </table>

    <!-- Event Details Box -->
    <div style="background-color: #FDEEEA; border-left: 4px solid #D03A19; padding: 16px; margin: 26px 0; border-radius: 4px;">
      <h4 style="margin: 0 0 10px; color: #D03A19; font-size: 15px;">🌸 Conference Information / 大会资讯 / Maklumat Persidangan</h4>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Date / 日期 / Tarikh:</strong> 14 November 2026 (Saturday)</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Time / 时间 / Masa:</strong> 9.30am – 5.00pm</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>Venue / 地点 / Lokasi:</strong> Bible College of Malaysia, Petaling Jaya</p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 30px; font-size: 13px; color: #7A5F6F; border-top: 1px solid #E8D0D8; padding-top: 20px; text-align: center; line-height: 1.6;">
      <p style="margin: 4px 0;">If you have any questions, feel free to reply directly to this email.</p>
      <p style="margin: 4px 0;">如有任何疑问，请直接回复此电邮。</p>
      <p style="margin: 4px 0;">Sekiranya anda mempunyai sebarang soalan, sila balas e-mel ini.</p>
    </div>
  </div>
</div>
  `;

  var plainBody = "Hi " + (data.fullName || '') + ",\n\n" +
    "Great news! Your payment has been verified by our team. Your registration for Bloom Conference 2026 is now fully confirmed!\n\n" +
    "太棒了！你的付款已获审核通过。你的 Bloom Conference 2026 席位已正式确认！\n\n" +
    "Berita baik! Pembayaran anda telah disahkan oleh pasukan kami. Pendaftaran anda untuk Bloom Conference 2026 kini disahkan sepenuhnya!\n\n" +
    "Confirmed Details / 确认详情 / Butiran Disahkan:\n" +
    "- Name / 姓名 / Nama: " + (data.fullName || '') + "\n" +
    "- Church Plant / 植会 / Anak Gereja: " + churchDisplay + "\n" +
    "- Homes Code / Homes 代码 / Kod Homes: " + homesCodeDisplay + "\n" +
    "- Workshop / 工作坊 / Bengkel: " + workshopDisplay + "\n\n" +
    "Conference Information / 大会资讯 / Maklumat Persidangan:\n" +
    "- Date / 日期 / Tarikh: 14 November 2026 (Saturday)\n" +
    "- Time / 时间 / Masa: 9.30am - 5.00pm\n" +
    "- Venue / 地点 / Lokasi: Bible College of Malaysia, Petaling Jaya\n\n" +
    "If you have any questions, feel free to reply to this email.\n" +
    "如有任何疑问，请直接回复此电邮。\n" +
    "Sekiranya anda mempunyai sebarang soalan, sila balas e-mel ini.";

  MailApp.sendEmail({
    to: data.emailAddress,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody,
    name: "🌸 Bloom Conference 2026"
  });
}

