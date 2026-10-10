/**
 * Bloom Conference 2026 — Dashboard Logic
 */

let timelineChartInstance = null;

function getGoogleScriptUrl() {
  if (window.APP_CONFIG && window.APP_CONFIG.googleScriptUrl) {
    return window.APP_CONFIG.googleScriptUrl;
  }
  return null;
}

async function fetchStats() {
  const url = getGoogleScriptUrl();
  const lastUpdatedEl = document.getElementById('lastUpdatedText');
  const refreshBtn = document.getElementById('refreshBtn');

  if (!url || url.includes('YOUR_')) {
    lastUpdatedEl.textContent = 'Endpoint not configured in config.js';
    return;
  }

  try {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '⏳ Loading...';
    lastUpdatedEl.textContent = 'Fetching latest stats...';

    const response = await fetch(`${url}?action=stats`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(data.error || 'Failed to load stats');
    }

    renderDashboard(data);
    lastUpdatedEl.textContent = `Last updated: ${data.lastUpdated || new Date().toLocaleTimeString()}`;

  } catch (err) {
    console.error('Error loading dashboard stats:', err);
    lastUpdatedEl.textContent = `Failed to load stats: ${err.message}`;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = '🔄 Refresh';
  }
}

function renderDashboard(data) {
  const total = data.totalRegistrations || 0;
  document.getElementById('kpiTotal').textContent = total.toLocaleString();

  // Top church plant
  const cpCounts = data.churchPlantCounts || {};
  let topCp = '-';
  let topCpCount = 0;
  Object.keys(cpCounts).forEach(cp => {
    if (cpCounts[cp] > topCpCount) {
      topCpCount = cpCounts[cp];
      topCp = cp;
    }
  });
  document.getElementById('kpiTopChurch').textContent = topCp;
  document.getElementById('kpiTopChurchSub').textContent = topCpCount > 0 ? `${topCpCount} registered (${Math.round(topCpCount/total*100)}%)` : 'No signups yet';

  // Workshop Occupancy
  const cap = data.totalWorkshopCapacity || 0;
  const occ = data.totalWorkshopOccupancy || 0;
  const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
  document.getElementById('kpiWorkshopOccupancy').textContent = `${pct}%`;
  document.getElementById('kpiWorkshopSub').textContent = `${occ} / ${cap} seats filled`;

  // First Bloom
  const fbYes = (data.firstBloomCounts && data.firstBloomCounts.Yes) || 0;
  const fbPct = total > 0 ? Math.round((fbYes / total) * 100) : 0;
  document.getElementById('kpiFirstBloom').textContent = `${fbYes}`;
  document.getElementById('kpiFirstBloomSub').textContent = `${fbPct}% of total attendees`;

  // Render Timeline Chart
  renderTimelineChart(data.dailySignups || {});

  // Render Workshops
  renderWorkshops(data.workshopStats || []);

  // Render Church Plants
  renderChurchPlants(cpCounts, total);

  // Render Age Ranges
  renderSimpleBreakdown('ageRangeContainer', data.ageRangeCounts || {}, total);

  // Render Marital Status
  renderSimpleBreakdown('maritalStatusContainer', data.maritalStatusCounts || {}, total);
}

function renderTimelineChart(dailySignups) {
  const ctx = document.getElementById('timelineChart').getContext('2d');
  
  const dates = Object.keys(dailySignups).sort();
  const counts = dates.map(d => dailySignups[d]);

  if (dates.length === 0) {
    dates.push('No data');
    counts.push(0);
  }

  if (timelineChartInstance) {
    timelineChartInstance.destroy();
  }

  timelineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Daily Signups',
        data: counts,
        borderColor: '#D03A19',
        backgroundColor: 'rgba(208, 58, 25, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: '#AD2A0E',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#3C2B35',
          titleFont: { family: 'Inter' },
          bodyFont: { family: 'Inter' }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 }
        }
      }
    }
  });
}

function renderWorkshops(workshopStats) {
  const container = document.getElementById('workshopsContainer');
  if (!workshopStats || workshopStats.length === 0) {
    container.innerHTML = '<p style="color: var(--bloom-text-light); text-align: center;">No workshop capacity data found.</p>';
    return;
  }

  let html = '';
  workshopStats.forEach(ws => {
    const limit = ws.limit || 0;
    const registered = ws.registered || 0;
    const pct = limit > 0 ? Math.min(100, Math.round((registered / limit) * 100)) : 0;
    const isFull = ws.isFull || (limit > 0 && registered >= limit);

    html += `
      <div class="occupancy-item">
        <div class="occupancy-info">
          <span>${escapeHtml(ws.name)} ${isFull ? '<strong style="color: var(--bloom-rose-dk); font-size: 0.76rem;">(FULL)</strong>' : ''}</span>
          <span class="occupancy-count">${registered} / ${limit > 0 ? limit : '∞'} (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${isFull ? 'is-full' : ''}" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderChurchPlants(cpCounts, total) {
  const container = document.getElementById('churchPlantsContainer');
  const keys = Object.keys(cpCounts).sort((a, b) => cpCounts[b] - cpCounts[a]);

  if (keys.length === 0) {
    container.innerHTML = '<p style="color: var(--bloom-text-light); text-align: center;">No church plant data found.</p>';
    return;
  }

  let html = '';
  keys.forEach(cp => {
    const count = cpCounts[cp];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    html += `
      <div class="occupancy-item">
        <div class="occupancy-info">
          <span>${escapeHtml(cp)}</span>
          <span class="occupancy-count">${count} (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderSimpleBreakdown(containerId, dataMap, total) {
  const container = document.getElementById(containerId);
  const keys = Object.keys(dataMap).sort((a, b) => dataMap[b] - dataMap[a]);

  if (keys.length === 0) {
    container.innerHTML = '<p style="color: var(--bloom-text-light); text-align: center;">No data found.</p>';
    return;
  }

  let html = '';
  keys.forEach(k => {
    const count = dataMap[k];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    html += `
      <div class="occupancy-item">
        <div class="occupancy-info">
          <span>${escapeHtml(k)}</span>
          <span class="occupancy-count">${count} (${pct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('refreshBtn').addEventListener('click', fetchStats);
document.addEventListener('DOMContentLoaded', fetchStats);
