/**
 * Bloom Conference 2026 — Registrants List Controller
 */

let allRegistrants = [];

function getGoogleScriptUrl() {
  if (window.APP_CONFIG && window.APP_CONFIG.googleScriptUrl) {
    return window.APP_CONFIG.googleScriptUrl;
  }
  return null;
}

async function fetchRegistrants() {
  const url = getGoogleScriptUrl();
  const lastUpdatedEl = document.getElementById('lastUpdatedText');
  const refreshBtn = document.getElementById('refreshBtn');
  const tableBody = document.getElementById('tableBody');

  if (!url || url.includes('YOUR_')) {
    lastUpdatedEl.textContent = 'Endpoint not configured in config.js';
    tableBody.innerHTML = '<tr><td colspan="4" class="state-box">Endpoint not configured.</td></tr>';
    return;
  }

  try {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Loading...';
    lastUpdatedEl.textContent = 'Fetching attendee directory...';

    const response = await fetch(`${url}?action=registrants`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(data.error || 'Failed to load registrants');
    }

    allRegistrants = data.registrants || [];
    populateFilterDropdowns(allRegistrants);
    renderTable();
    lastUpdatedEl.textContent = `Last updated: ${data.lastUpdated || new Date().toLocaleTimeString()}`;

  } catch (err) {
    console.error('Error loading registrants:', err);
    lastUpdatedEl.textContent = `Failed to load: ${err.message}`;
    tableBody.innerHTML = `<tr><td colspan="4" class="state-box" style="color: var(--bloom-error);">Failed to load registrants: ${escapeHtml(err.message)}</td></tr>`;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Refresh';
  }
}

function populateFilterDropdowns(registrants) {
  const cpSelect = document.getElementById('churchPlantFilter');
  const homesSelect = document.getElementById('homesCodeFilter');

  const selectedCp = cpSelect.value;
  const selectedHomes = homesSelect.value;

  const cpSet = new Set();
  const homesSet = new Set();

  registrants.forEach(r => {
    if (r.churchPlant && r.churchPlant !== '-') cpSet.add(r.churchPlant);
    if (r.homesCode && r.homesCode !== '-') homesSet.add(r.homesCode);
  });

  // Rebuild Church Plant
  cpSelect.innerHTML = '<option value="">All Church Plants</option>';
  Array.from(cpSet).sort().forEach(cp => {
    const opt = document.createElement('option');
    opt.value = cp;
    opt.textContent = cp;
    if (cp === selectedCp) opt.selected = true;
    cpSelect.appendChild(opt);
  });

  // Rebuild Homes Code
  homesSelect.innerHTML = '<option value="">All Homes Codes</option>';
  Array.from(homesSet).sort().forEach(hc => {
    const opt = document.createElement('option');
    opt.value = hc;
    opt.textContent = hc;
    if (hc === selectedHomes) opt.selected = true;
    homesSelect.appendChild(opt);
  });
}

function renderTable() {
  const tableBody = document.getElementById('tableBody');
  const countText = document.getElementById('countText');
  const searchVal = document.getElementById('nameSearchInput').value.trim().toLowerCase();
  const cpVal = document.getElementById('churchPlantFilter').value;
  const homesVal = document.getElementById('homesCodeFilter').value;

  const filtered = allRegistrants.filter(r => {
    // Name filter
    if (searchVal && !r.fullName.toLowerCase().includes(searchVal)) {
      return false;
    }
    // Church Plant filter
    if (cpVal && r.churchPlant !== cpVal) {
      return false;
    }
    // Homes Code filter
    if (homesVal && r.homesCode !== homesVal) {
      return false;
    }
    return true;
  });

  countText.textContent = `Showing ${filtered.length} of ${allRegistrants.length} registrants`;

  if (filtered.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="state-box">No matching registrants found.</td></tr>';
    return;
  }

  let html = '';
  filtered.forEach((r, idx) => {
    html += `
      <tr>
        <td style="color: var(--bloom-text-light);">${idx + 1}</td>
        <td><strong>${escapeHtml(r.fullName)}</strong></td>
        <td>${escapeHtml(r.churchPlant)}</td>
        <td><span style="font-family: ui-monospace, SFMono-Regular, monospace; background: var(--bloom-lavender-lt); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${escapeHtml(r.homesCode)}</span></td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('nameSearchInput').addEventListener('input', renderTable);
document.getElementById('churchPlantFilter').addEventListener('change', renderTable);
document.getElementById('homesCodeFilter').addEventListener('change', renderTable);
document.getElementById('refreshBtn').addEventListener('click', fetchRegistrants);

document.addEventListener('DOMContentLoaded', fetchRegistrants);
