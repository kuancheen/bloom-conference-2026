/**
 * Bloom Conference 2026
 * Google Apps Script backend template
 *
 * IMPORTANT:
 * 1. Create a new Apps Script bound to your Google Sheet.
 * 2. Replace the DRIVE_FOLDER_ID value before you deploy.
 * 3. Deploy as a web app and use the generated /exec URL in public/config.js.
 */

var DRIVE_FOLDER_ID = "YOUR_DRIVE_FOLDER_ID";

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.registrationType === 'Adult 13+') {
      var adultsSheet = getOrCreateSheet('Adults');
      adultsSheet.appendRow([
        new Date(),
        data.registrationType,
        data.fullName || '',
        data.phoneNumber || '',
        data.emailAddress || '',
        data.churchPlant || '',
        data.homesCode || '',
        data.session1Workshop || '',
        data.session2Workshop || '',
        data.workshopTrack || '',
        data.remarks || ''
      ]);

      return ContentService
        .createTextOutput(JSON.stringify({ result: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var kidsSheet = getOrCreateSheet('Kids');
    var children = [];

    try {
      children = JSON.parse(data.children || '[]');
    } catch (error) {
      children = [];
    }

    if (!children.length) {
      children = [{
        name: '',
        dob: '',
        gender: '',
        allergies: '',
        plant: ''
      }];
    }

    var fileUrl = 'No receipt uploaded';
    if (data.fileData && data.fileType && data.fileName) {
      try {
        var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        var blob = Utilities.newBlob(
          Utilities.base64Decode(data.fileData),
          data.fileType,
          data.fileName
        );
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      } catch (fileErr) {
        fileUrl = 'Upload failed: ' + fileErr.toString();
      }
    }

    var parentUuid = Utilities.getUuid();

    for (var i = 0; i < children.length; i++) {
      var child = children[i] || {};
      kidsSheet.appendRow([
        new Date(),
        data.registrationType || 'Acts Kids (5-12)',
        data.parentName || '',
        data.parentPhone || '',
        data.parentEmail || '',
        data.parentRelationship || '',
        data.parentHomesCode || '',
        parentUuid,
        i + 1,
        child.name || '',
        child.dob || '',
        child.gender || '',
        child.allergies || '',
        child.plant || '',
        data.paymentAmount || 0,
        fileUrl,
        data.remarks || ''
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', fileUrl: fileUrl }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getDashboardMetadata() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = spreadsheet.getSheets();
  return sheets.map(function(sheet) {
    return sheet.getName();
  });
}
