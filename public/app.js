const DEFAULT_GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

const state = {
  mode: 'adult'
};

const modeButtons = document.querySelectorAll('.mode-btn');
const adultFields = document.getElementById('adultFields');
const kidsFields = document.getElementById('kidsFields');
const form = document.getElementById('registrationForm');
const statusBox = document.getElementById('statusBox');

function getGoogleScriptUrl() {
  if (window.APP_CONFIG && window.APP_CONFIG.googleScriptUrl) {
    return window.APP_CONFIG.googleScriptUrl;
  }

  return DEFAULT_GOOGLE_SCRIPT_URL;
}

function setMode(mode) {
  state.mode = mode;

  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  adultFields.classList.toggle('is-visible', mode === 'adult');
  kidsFields.classList.toggle('is-visible', mode === 'kids');
}

function setStatus(message, type = 'info') {
  statusBox.textContent = message;
  statusBox.classList.remove('is-error', 'is-success');

  if (type === 'success') {
    statusBox.classList.add('is-success');
  }

  if (type === 'error') {
    statusBox.classList.add('is-error');
  }
}

function normalizePayload(formData) {
  const payload = Object.fromEntries(formData.entries());

  if (state.mode === 'adult') {
    return {
      registrationType: 'Adult 13+',
      ...payload,
      remarks: payload.remarks || ''
    };
  }

  return {
    registrationType: 'Acts Kids (5-12)',
    parentName: payload.parentName || '',
    parentPhone: payload.parentPhone || '',
    parentEmail: payload.parentEmail || '',
    parentRelationship: payload.parentRelationship || '',
    parentHomesCode: payload.parentHomesCode || '',
    paymentAmount: Number(payload.paymentAmount || 0),
    children: JSON.stringify([
      {
        name: payload.childName || '',
        dob: payload.childDob || '',
        gender: payload.childGender || '',
        allergies: payload.childAllergies || '',
        plant: payload.childChurchPlant || ''
      }
    ]),
    remarks: payload.remarks || ''
  };
}

async function submitRegistration(payload) {
  const googleScriptUrl = getGoogleScriptUrl();

  if (!googleScriptUrl || googleScriptUrl.includes('YOUR_')) {
    throw new Error('Please replace the placeholder Google Apps Script URL in public/config.js before submitting data.');
  }

  const response = await fetch(googleScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('The registration request failed. Please try again.');
  }

  return response.json();
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Submitting registration...', 'info');

  try {
    const formData = new FormData(form);
    const payload = normalizePayload(formData);
    const result = await submitRegistration(payload);

    if (result && result.result === 'success') {
      setStatus('Registration submitted successfully.', 'success');
      form.reset();
      setMode('adult');
      return;
    }

    throw new Error(result && result.error ? result.error : 'The backend rejected the request.');
  } catch (error) {
    setStatus(error.message || 'Something went wrong. Please check your setup.', 'error');
  }
});

setMode('adult');
