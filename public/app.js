/**
 * Bloom Conference 2026 — Registration Form Logic
 *
 * Security model:
 *  - The Google Apps Script URL is loaded from `config.js` (gitignored).
 *  - This file contains NO secrets, no IDs, no real URLs.
 *  - config.js must set: window.APP_CONFIG = { googleScriptUrl: '...' }
 */

/* ─────────────────────────────────────────────────
   Constants & DOM refs
───────────────────────────────────────────────── */
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const form            = document.getElementById('registrationForm');
const statusBox       = document.getElementById('statusBox');
const submitBtn       = document.getElementById('submitBtn');
const btnSpinner      = document.getElementById('btnSpinner');
const btnText         = submitBtn.querySelector('.btn-text');
const successScreen   = document.getElementById('successScreen');
const registerAnotherBtn = document.getElementById('registerAnotherBtn');

// Church Plant "Others" conditional
const churchPlantSelect     = document.getElementById('churchPlant');
const churchPlantOtherGroup = document.getElementById('churchPlantOtherGroup');
const churchPlantOther      = document.getElementById('churchPlantOther');

// File upload
const paymentProofInput = document.getElementById('paymentProof');
const fileUploadZone    = document.getElementById('fileUploadZone');
const fileUploadUI      = fileUploadZone.querySelector('.file-upload-ui');
const filePreview       = document.getElementById('filePreview');
const filePreviewName   = document.getElementById('filePreviewName');
const fileRemoveBtn     = document.getElementById('fileRemoveBtn');

/* ─────────────────────────────────────────────────
   Config / backend URL
───────────────────────────────────────────────── */
function getGoogleScriptUrl() {
  if (window.APP_CONFIG && window.APP_CONFIG.googleScriptUrl) {
    return window.APP_CONFIG.googleScriptUrl;
  }
  return null;
}

/* ─────────────────────────────────────────────────
   Dynamic Config Loading — populate dropdowns from
   the 'Config' sheet via GET ?action=config
───────────────────────────────────────────────── */
async function loadConfig() {
  const url = getGoogleScriptUrl();
  if (!url || url.includes('YOUR_')) return;

  try {
    const response = await fetch(`${url}?action=config`);
    if (!response.ok) return;
    const result = await response.json();
    if (result.result !== 'success' || !result.config) return;

    const cfg = result.config;

    // Populate flat selects (no grouping)
    ['Age Range', 'Marital Status', 'Workshop'].forEach(key => {
      const fieldId = { 'Age Range': 'ageRange', 'Marital Status': 'maritalStatus', 'Workshop': 'workshop' }[key];
      if (cfg[key] && cfg[key].length) populateSelect(fieldId, cfg[key]);
    });

    // Church Plant needs optgroup support
    if (cfg['Church Plant'] && cfg['Church Plant'].length) {
      populateSelectWithGroups('churchPlant', cfg['Church Plant']);
    }

  } catch (err) {
    console.warn('Config load failed, using static options as fallback:', err);
  }
}

function populateSelect(fieldId, options) {
  const select = document.getElementById(fieldId);
  if (!select) return;
  const placeholder = select.options[0]; // keep first placeholder option
  select.innerHTML = '';
  select.appendChild(placeholder);
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    select.appendChild(el);
  });
}

function populateSelectWithGroups(fieldId, options) {
  const select = document.getElementById(fieldId);
  if (!select) return;
  const placeholder = select.options[0];
  select.innerHTML = '';
  select.appendChild(placeholder);

  const groups = {};
  const ungrouped = [];
  options.forEach(opt => {
    if (opt.group) {
      if (!groups[opt.group]) groups[opt.group] = [];
      groups[opt.group].push(opt);
    } else {
      ungrouped.push(opt);
    }
  });

  Object.keys(groups).forEach(groupName => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupName;
    groups[groupName].forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      optgroup.appendChild(el);
    });
    select.appendChild(optgroup);
  });

  ungrouped.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    select.appendChild(el);
  });
}

// Kick off on page load
loadConfig();

/* ─────────────────────────────────────────────────
   Church Plant — show/hide "Other" field
───────────────────────────────────────────────── */
churchPlantSelect.addEventListener('change', () => {
  const isOther = churchPlantSelect.value === 'Others';
  churchPlantOtherGroup.style.display = isOther ? '' : 'none';
  if (!isOther) {
    churchPlantOther.value = '';
    clearFieldError('churchPlantOther');
  }
});

/* ─────────────────────────────────────────────────
   File Upload — drag & drop + preview
───────────────────────────────────────────────── */
function showFilePreview(file) {
  fileUploadZone.classList.add('has-file');
  fileUploadZone.classList.remove('is-invalid');
  fileUploadUI.style.display = 'none';
  filePreview.style.display  = 'flex';
  filePreviewName.textContent = `${file.name} (${formatFileSize(file.size)})`;
}

function clearFilePreview() {
  fileUploadZone.classList.remove('has-file', 'is-invalid');
  fileUploadUI.style.display = '';
  filePreview.style.display  = 'none';
  filePreviewName.textContent = '';
  paymentProofInput.value    = '';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function validateFile(file) {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, GIF, and PDF files are accepted.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null; // valid
}

paymentProofInput.addEventListener('change', () => {
  const file = paymentProofInput.files[0];
  if (!file) return clearFilePreview();

  const err = validateFile(file);
  if (err) {
    showFieldError('paymentProof', err);
    fileUploadZone.classList.add('is-invalid');
    clearFilePreview();
    paymentProofInput.value = '';
    return;
  }
  clearFieldError('paymentProof');
  showFilePreview(file);
});

fileRemoveBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  clearFilePreview();
  clearFieldError('paymentProof');
});

// Drag & drop
fileUploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  fileUploadZone.classList.add('is-drag-over');
});

fileUploadZone.addEventListener('dragleave', () => {
  fileUploadZone.classList.remove('is-drag-over');
});

fileUploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  fileUploadZone.classList.remove('is-drag-over');
  const file = e.dataTransfer.files[0];
  if (!file) return;

  // inject into the input
  const dt = new DataTransfer();
  dt.items.add(file);
  paymentProofInput.files = dt.files;
  paymentProofInput.dispatchEvent(new Event('change'));
});

/* ─────────────────────────────────────────────────
   Validation helpers
───────────────────────────────────────────────── */
function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId) || form.querySelector(`[name="${fieldId}"]`);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (input) {
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('is-shown');
  }
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId) || form.querySelector(`[name="${fieldId}"]`);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (input) {
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
  }
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('is-shown');
  }
}

function validateForm(formData) {
  let isValid = true;

  // Clear all errors
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  form.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('is-shown');
  });

  // Full name
  if (!formData.get('fullName')?.trim()) {
    showFieldError('fullName', 'Please enter your full name.');
    isValid = false;
  }

  // Email
  const email = formData.get('emailAddress')?.trim();
  if (!email) {
    showFieldError('emailAddress', 'Please enter your email address.');
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('emailAddress', 'Please enter a valid email address.');
    isValid = false;
  }

  // Phone
  const phone = formData.get('phoneNumber')?.trim();
  if (!phone) {
    showFieldError('phoneNumber', 'Please enter your phone number.');
    isValid = false;
  } else if (!/^\+?[\d\s\-()]{7,20}$/.test(phone)) {
    showFieldError('phoneNumber', 'Please enter a valid phone number (e.g. +60123456789).');
    isValid = false;
  }

  // Age Range
  if (!formData.get('ageRange')) {
    showFieldError('ageRange', 'Please select your age range.');
    isValid = false;
  }

  // Marital Status
  if (!formData.get('maritalStatus')) {
    showFieldError('maritalStatus', 'Please select your marital status.');
    isValid = false;
  }

  // Church Plant
  if (!formData.get('churchPlant')) {
    showFieldError('churchPlant', 'Please select your church plant.');
    isValid = false;
  }

  // Church Plant Other
  if (formData.get('churchPlant') === 'Others' && !formData.get('churchPlantOther')?.trim()) {
    showFieldError('churchPlantOther', 'Please specify your church / organisation.');
    isValid = false;
  }

  // Workshop
  if (!formData.get('workshop')) {
    showFieldError('workshop', 'Please select a workshop.');
    isValid = false;
  }

  // Homes Code (mandatory — type NONE if not applicable)
  if (!formData.get('homesCode')?.trim()) {
    showFieldError('homesCode', 'Please enter your Homes Code, or type NONE if you are not part of one yet.');
    isValid = false;
  }

  // First Bloom
  if (!formData.get('firstBloom')) {
    showFieldError('firstBloom', 'Please indicate if this is your first Bloom Conference.');
    isValid = false;
  }

  // Payment proof
  const file = paymentProofInput.files[0];
  if (!file) {
    showFieldError('paymentProof', 'Please upload your proof of payment.');
    fileUploadZone.classList.add('is-invalid');
    isValid = false;
  } else {
    const fileErr = validateFile(file);
    if (fileErr) {
      showFieldError('paymentProof', fileErr);
      isValid = false;
    }
  }

  return isValid;
}

/* ─────────────────────────────────────────────────
   File → Base64
───────────────────────────────────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:image/jpeg;base64,XXXXX"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────────────────────────────────
   Status message
───────────────────────────────────────────────── */
function setStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.className = `status-box is-visible is-${type}`;
  if (message) {
    statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function clearStatus() {
  statusBox.textContent = '';
  statusBox.className = 'status-box';
}

/* ─────────────────────────────────────────────────
   Submit
───────────────────────────────────────────────── */
function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  if (isSubmitting) {
    btnText.textContent = 'Submitting… / 提交中… / Menghantar…';
    btnSpinner.classList.add('is-visible');
  } else {
    btnText.textContent = 'Submit Registration / 提交报名 / Hantar Pendaftaran';
    btnSpinner.classList.remove('is-visible');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();

  const formData = new FormData(form);
  if (!validateForm(formData)) {
    setStatus('Please fill in all required fields correctly before submitting.', 'error');
    // Scroll to first error
    const firstError = form.querySelector('.is-invalid');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const googleScriptUrl = getGoogleScriptUrl();
  if (!googleScriptUrl || googleScriptUrl.includes('YOUR_')) {
    setStatus(
      'Registration endpoint is not configured. Please contact the event organiser.',
      'error'
    );
    return;
  }

  setSubmitting(true);
  setStatus(
    '⏳ Submitting your registration…\n\n' +
    '📋 Please keep a copy of your bank-in slip and screenshot this page for your records. / 请保留你的转账凭证并截图保存此页面。 / Sila simpan salinan slip bank anda dan ambil tangkapan skrin halaman ini.\n\n' +
    '📧 Look out for a confirmation email from info@actschurchconference.com within 15 minutes — check your spam/junk/promotions tabs too. / 请留意来自 info@actschurchconference.com 的确认邮件（约15分钟内），也查看垃圾邮件栏。 / Nantikan e-mel pengesahan dari info@actschurchconference.com dalam tempoh 15 minit — semak juga folder spam/junk anda.',
    'info'
  );

  try {
    const file = paymentProofInput.files[0];
    const fileBase64 = await fileToBase64(file);

    const payload = {
      fullName:          formData.get('fullName')?.trim(),
      emailAddress:      formData.get('emailAddress')?.trim(),
      phoneNumber:       formData.get('phoneNumber')?.trim(),
      ageRange:          formData.get('ageRange'),
      maritalStatus:     formData.get('maritalStatus'),
      churchPlant:       formData.get('churchPlant'),
      churchPlantOther:  formData.get('churchPlant') === 'Others' ? formData.get('churchPlantOther')?.trim() : '',
      homesCode:         formData.get('homesCode')?.trim() || '',
      workshop:          formData.get('workshop'),
      firstBloom:        formData.get('firstBloom'),
      remarks:           formData.get('remarks')?.trim() || '',
      // File as base64
      fileName:          file.name,
      fileType:          file.type,
      fileData:          fileBase64,
    };

    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();

    if (result && result.result === 'success') {
      showSuccessScreen();
      return;
    }

    throw new Error(result?.error || 'The server rejected the submission. Please try again.');

  } catch (err) {
    setStatus(
      err.message || 'Something went wrong. Please try again or contact the organiser.',
      'error'
    );
  } finally {
    setSubmitting(false);
  }
});

/* ─────────────────────────────────────────────────
   Success screen
───────────────────────────────────────────────── */
function showSuccessScreen() {
  form.closest('.panel').style.display = 'none';
  successScreen.style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

registerAnotherBtn.addEventListener('click', () => {
  form.reset();
  clearFilePreview();
  clearStatus();
  churchPlantOtherGroup.style.display = 'none';
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  form.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('is-shown');
  });
  successScreen.style.display = 'none';
  form.closest('.panel').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ─────────────────────────────────────────────────
   Inline validation on blur
───────────────────────────────────────────────── */
['fullName', 'emailAddress', 'phoneNumber'].forEach(fieldId => {
  const input = document.getElementById(fieldId);
  if (!input) return;

  input.addEventListener('blur', () => {
    const val = input.value.trim();
    if (!val) {
      showFieldError(fieldId, 'This field is required.');
    } else if (fieldId === 'emailAddress' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      showFieldError(fieldId, 'Please enter a valid email address.');
    } else if (fieldId === 'phoneNumber' && !/^\+?[\d\s\-()]{7,20}$/.test(val)) {
      showFieldError(fieldId, 'Please enter a valid phone number.');
    } else {
      clearFieldError(fieldId);
    }
  });

  input.addEventListener('input', () => {
    if (input.classList.contains('is-invalid')) {
      clearFieldError(fieldId);
    }
  });
});

['ageRange', 'maritalStatus', 'churchPlant', 'workshop'].forEach(fieldId => {
  const select = document.getElementById(fieldId);
  if (!select) return;
  select.addEventListener('change', () => {
    if (select.value) clearFieldError(fieldId);
  });
});
