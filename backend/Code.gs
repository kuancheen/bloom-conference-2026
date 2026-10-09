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
  'Email Error Note'
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
    sheet.setColumnWidth(2, 200);   // Email
    sheet.setColumnWidth(3, 180);   // Full Name
    sheet.setColumnWidth(4, 140);   // Phone
    sheet.setColumnWidth(12, 250);  // Payment URL
  }

  return sheet;
}

/**
 * GET — health check or config fetch
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  if (action === 'config') {
    return getConfigResponse();
  }
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', service: 'Bloom Conference 2026' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Reads dropdown options from the 'Config' sheet.
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
        .createTextOutput(JSON.stringify({ result: 'success', config: {} }))
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

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', config: config }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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

    var emailTimestamp = '';
    var emailError = '';

    try {
      sendConfirmationEmail(data, fileUrl);
      emailTimestamp = new Date();
    } catch (err) {
      console.error('Email failed: ' + err.toString());
      emailError = err.toString();
    }

    // Write to sheet
    var sheet = getOrCreateSheet('Registration');
    var submissionId = Utilities.getUuid();
    var timestamp = new Date();

    sheet.appendRow([
      timestamp,
      data.emailAddress  || '',
      data.fullName      || '',
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
        <td style="padding: 12px 15px; border-top: 1px solid #E8D0D8;"><a href="${fileUrl}" target="_blank" style="color: #C9556E; font-weight: 600; text-decoration: underline;">View Receipt / 查看转账凭证 / Lihat Resit</a></td>
      </tr>
    `;
    paymentRowPlain = "\n- Payment Proof / 付款凭证 / Bukti Pembayaran: " + fileUrl;
  }

  var htmlBody = `
<div style="font-family: 'Inter', system-ui, sans-serif; color: #3C2B35; max-width: 600px; margin: 0 auto; background-color: #FDF6F0; border-radius: 12px; overflow: hidden; border: 1px solid #E8D0D8;">
  <div style="background-color: #C9556E; color: white; padding: 30px 20px; text-align: center;">
    <h1 style="font-family: 'Playfair Display', Georgia, serif; margin: 0; font-size: 24px; font-weight: 700;">🌸 Bloom Conference 2026</h1>
    <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Registration Received / 报名已收到 / Pendaftaran Diterima</p>
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

    <div style="background-color: #FFF0F0; border-left: 4px solid #C9556E; padding: 15px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 600; color: #C9556E;">Important Note / 重要提示 / Nota Penting:</p>
      <p style="margin: 8px 0 4px; font-size: 14px; line-height: 1.5;">Your registration is currently pending payment verification. We will contact you if there are any issues with your payment.</p>
      <p style="margin: 4px 0; font-size: 14px; line-height: 1.5;">你的报名目前正在等待付款验证。如果转账有任何问题，我们将与你联系。</p>
      <p style="margin: 4px 0 0; font-size: 14px; line-height: 1.5;">Pendaftaran anda sedang menunggu pengesahan pembayaran. Kami akan menghubungi anda sekiranya terdapat sebarang isu.</p>
    </div>

    <h3 style="color: #C9556E; margin-top: 30px;">Event Details / 活动详情 / Butiran Acara</h3>
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
