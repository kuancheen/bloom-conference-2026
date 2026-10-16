/**
 * Bloom Conference 2026 — Payment Verification & Approval Logic
 */

(function () {
  'use strict';

  // State
  let currentAdmin = {
    email: localStorage.getItem('bloom_admin_email') || '',
    name: localStorage.getItem('bloom_admin_name') || '',
    token: localStorage.getItem('bloom_admin_token') || '',
    isAuthorized: false
  };

  let allPayments = [];
  let activeTab = 'pending'; // 'pending' | 'verified' | 'all'
  let activeItemToApprove = null;
  let currentFilteredList = []; // Tracks the currently visible (filtered) list for modal nav
  let currentModalIndex = -1;   // Index of the open item in currentFilteredList
  let currentZoom = 1;          // Receipt image zoom level

  // DOM Elements
  const authLoadingState = document.getElementById('authLoadingState');
  const authGateSection = document.getElementById('authGateSection');
  const portalMainContent = document.getElementById('portalMainContent');
  const userBadge = document.getElementById('userBadge');
  const userBadgeMobile = document.getElementById('userBadgeMobile');
  const authErrorMessage = document.getElementById('authErrorMessage');
  const googleBtnContainer = document.getElementById('googleBtnContainer');
  const missingClientIdNotice = document.getElementById('missingClientIdNotice');

  // KPI elements
  const kpiTotal = document.getElementById('kpiTotal');
  const kpiPending = document.getElementById('kpiPending');
  const kpiVerified = document.getElementById('kpiVerified');

  // Filter & Search
  const tabPending = document.getElementById('tabPending');
  const tabVerified = document.getElementById('tabVerified');
  const tabAll = document.getElementById('tabAll');
  const tabPendingCount = document.getElementById('tabPendingCount');
  const tabVerifiedCount = document.getElementById('tabVerifiedCount');
  const tabAllCount = document.getElementById('tabAllCount');
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');

  // Table
  const paymentsTableBody = document.getElementById('paymentsTableBody');

  // Consolidated Modal Elements
  const approvalModal = document.getElementById('approvalModal');
  const closeApprovalModalBtn = document.getElementById('closeApprovalModalBtn');
  const cancelApprovalBtn = document.getElementById('cancelApprovalBtn');
  const confirmApprovalBtn = document.getElementById('confirmApprovalBtn');
  const modalAttendeeName = document.getElementById('modalAttendeeName');
  const modalAttendeeEmail = document.getElementById('modalAttendeeEmail');
  const modalAttendeeChurch = document.getElementById('modalAttendeeChurch');
  const modalAttendeeHomesCode = document.getElementById('modalAttendeeHomesCode');
  const modalReceiptContainer = document.getElementById('modalReceiptContainer');
  const modalExternalReceiptBtn = document.getElementById('modalExternalReceiptBtn');
  const adminNotesInput = document.getElementById('adminNotesInput');
  const modalPrevBtn = document.getElementById('modalPrevBtn');
  const modalNextBtn = document.getElementById('modalNextBtn');
  const modalNavCounter = document.getElementById('modalNavCounter');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');

  const config = window.APP_CONFIG || {};

  // -------------------------------------------------------------
  // Initialization & Auth Flow
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    setupGoogleIdentity();

    if (currentAdmin.token) {
      validateAuth(currentAdmin.token);
    } else {
      showAuthGate();
    }
  });

  function setupGoogleIdentity() {
    const clientId = config.googleClientId;

    if (!clientId || clientId.includes('YOUR_')) {
      if (missingClientIdNotice) missingClientIdNotice.style.display = 'block';
      return;
    }

    if (window.google && window.google.accounts && window.google.accounts.id) {
      initGsiButton(clientId);
    } else {
      // Retry if GIS script is still loading
      const checkInterval = setInterval(function () {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          clearInterval(checkInterval);
          initGsiButton(clientId);
        }
      }, 100);
      setTimeout(function () { clearInterval(checkInterval); }, 5000);
    }
  }

  function initGsiButton(clientId) {
    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      google.accounts.id.renderButton(googleBtnContainer, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 280
      });
    } catch (err) {
      console.error('Error initializing Google Identity:', err);
      showAuthError('Failed to initialize Google Sign-In: ' + err.message);
    }
  }

  function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      showAuthError('No Google credential returned. Please try again.');
      return;
    }
    const token = response.credential;
    currentAdmin.token = token;
    localStorage.setItem('bloom_admin_token', token);

    // Decode the JWT payload (middle section) to extract the user's display name
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      currentAdmin.name = payload.name || payload.given_name || '';
      if (currentAdmin.name) {
        localStorage.setItem('bloom_admin_name', currentAdmin.name);
      }
    } catch (e) {
      console.warn('Could not decode Google token payload for name:', e);
    }

    validateAuth(token);
  }

  function validateAuth(token) {
    const scriptUrl = config.googleScriptUrl;
    if (!scriptUrl) {
      showAuthError('API URL not configured in config.js');
      return;
    }

    // If name not yet known, try to decode it from the JWT payload now
    if (!currentAdmin.name && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        currentAdmin.name = payload.name || payload.given_name || '';
        if (currentAdmin.name) {
          localStorage.setItem('bloom_admin_name', currentAdmin.name);
        }
      } catch (e) {
        // Non-critical — will fall back to email in the badge
      }
    }

    showAuthError('');
    const checkUrl = `${scriptUrl}?action=check_auth&token=${encodeURIComponent(token)}`;

    fetch(checkUrl)
      .then(res => res.json())
      .then(data => {
        if (data.result === 'success' && data.authorized) {
          currentAdmin.isAuthorized = true;
          currentAdmin.email = data.email;
          localStorage.setItem('bloom_admin_email', data.email);
          renderAuthenticatedState();
          loadPaymentsData();
        } else {
          currentAdmin.isAuthorized = false;
          showAuthError(data.error || 'Access denied: Google account is not on the admin whitelist.');
          showAuthGate();
        }
      })
      .catch(err => {
        console.error('Auth verification error:', err);
        showAuthError('Failed to verify admin privileges. Please try again.');
        showAuthGate();
      });
  }

  function showAuthGate() {
    if (authLoadingState) authLoadingState.style.display = 'none';
    authGateSection.style.display = 'block';
    portalMainContent.style.display = 'none';
    if (userBadge) userBadge.style.display = 'none';
    if (userBadgeMobile) userBadgeMobile.style.display = 'none';
  }

  function showAuthError(msg) {
    if (!msg) {
      authErrorMessage.textContent = '';
      authErrorMessage.style.display = 'none';
      return;
    }
    authErrorMessage.textContent = msg;
    authErrorMessage.style.display = 'block';
  }

  function renderAuthenticatedState() {
    if (authLoadingState) authLoadingState.style.display = 'none';
    authGateSection.style.display = 'none';
    portalMainContent.style.display = 'block';

    const displayName = currentAdmin.name || currentAdmin.email;
    const badgeHtml = (logoutBtnId) => `
      <span class="user-profile-badge" title="${escapeHtml(currentAdmin.email)}">
        <span>👤 ${escapeHtml(displayName)}</span>
        <button type="button" id="${logoutBtnId}" title="Sign Out">Sign out</button>
      </span>
    `;

    if (userBadge) {
      userBadge.innerHTML = badgeHtml('logoutBtnDesktop');
      userBadge.style.display = 'inline-flex';
      const logoutBtnDesktop = document.getElementById('logoutBtnDesktop');
      if (logoutBtnDesktop) logoutBtnDesktop.addEventListener('click', handleLogout);
    }

    if (userBadgeMobile) {
      userBadgeMobile.innerHTML = badgeHtml('logoutBtnMobile');
      userBadgeMobile.style.display = '';
      const logoutBtnMobile = document.getElementById('logoutBtnMobile');
      if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout);
    }
  }

  function handleLogout() {
    localStorage.removeItem('bloom_admin_email');
    localStorage.removeItem('bloom_admin_name');
    localStorage.removeItem('bloom_admin_token');
    currentAdmin = { email: '', name: '', token: '', isAuthorized: false };
    if (window.google && window.google.accounts && window.google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    showAuthGate();
  }

  // -------------------------------------------------------------
  // Data Loading
  // -------------------------------------------------------------
  function loadPaymentsData() {
    const scriptUrl = config.googleScriptUrl;
    if (!scriptUrl) return;

    paymentsTableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="state-box">
            <div class="state-spinner"></div>
            <p>Loading registrations for verification...</p>
          </div>
        </td>
      </tr>
    `;

    const getUrl = `${scriptUrl}?action=get_payments&token=${encodeURIComponent(currentAdmin.token)}`;

    fetch(getUrl)
      .then(res => res.json())
      .then(data => {
        if (data.result === 'success') {
          allPayments = data.payments || [];
          updateKPIs(data);
          renderPaymentsTable();
        } else {
          paymentsTableBody.innerHTML = `
            <tr>
              <td colspan="6">
                <div class="state-box" style="color: #dc3545;">
                  <p>⚠️ ${escapeHtml(data.error || 'Failed to load registration records.')}</p>
                </div>
              </td>
            </tr>
          `;
        }
      })
      .catch(err => {
        paymentsTableBody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="state-box" style="color: #dc3545;">
                <p>⚠️ Connection error: ${escapeHtml(err.message)}</p>
              </div>
            </td>
          </tr>
        `;
      });
  }

  function updateKPIs(data) {
    const total = data.total || 0;
    const pending = data.pendingCount !== undefined ? data.pendingCount : allPayments.filter(p => !p.isVerified).length;
    const verified = data.verifiedCount !== undefined ? data.verifiedCount : allPayments.filter(p => p.isVerified).length;

    kpiTotal.textContent = total;
    kpiPending.textContent = pending;
    kpiVerified.textContent = verified;

    tabPendingCount.textContent = pending;
    tabVerifiedCount.textContent = verified;
    tabAllCount.textContent = total;
  }

  // -------------------------------------------------------------
  // Rendering Table
  // -------------------------------------------------------------
  function renderPaymentsTable() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = allPayments.filter(item => {
      // Tab filter
      if (activeTab === 'pending' && item.isVerified) return false;
      if (activeTab === 'verified' && !item.isVerified) return false;

      // Text search
      if (!query) return true;
      const haystack = `${item.fullName} ${item.email} ${item.churchPlant} ${item.phone} ${item.homesCode}`.toLowerCase();
      return haystack.includes(query);
    });

    if (filtered.length === 0) {
      paymentsTableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="state-box">
              <p>No registration records match the current filter.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    paymentsTableBody.innerHTML = filtered.map((item, index) => {
      const badge = item.isVerified
        ? `<span class="status-badge status-badge--verified" title="${escapeHtml(item.adminNotes)}">✅ Verified</span>`
        : `<span class="status-badge status-badge--pending">⏳ Pending Review</span>`;

      const actionBtn = item.isVerified
        ? `<button type="button" class="btn-action open-modal-btn" data-id="${escapeHtml(item.submissionId)}" data-row="${item.rowIndex}" style="background: #e9ecef; color: #6c757d;">View Details</button>`
        : `<button type="button" class="btn-action btn-action--approve open-modal-btn" data-id="${escapeHtml(item.submissionId)}" data-row="${item.rowIndex}">Approve</button>`;

      return `
        <tr class="payment-row clickable-row" data-id="${escapeHtml(item.submissionId)}" data-row="${item.rowIndex}" style="cursor: pointer;" title="Click row to review & approve payment">
          <td><span style="font-size: 0.8rem; color: var(--bloom-text-light);">${index + 1}</span></td>
          <td>${badge}</td>
          <td>
            <strong>${escapeHtml(item.fullName)}</strong>
            <div style="font-size: 0.78rem; color: var(--bloom-text-light);">${escapeHtml(item.timestamp)}</div>
          </td>
          <td>
            <div>${escapeHtml(item.email)}</div>
            <div style="font-size: 0.8rem; color: var(--bloom-text-light);">${escapeHtml(item.phone)}</div>
          </td>
          <td>
            <div>${escapeHtml(item.churchPlant)}</div>
            ${item.homesCode && item.homesCode !== '-' ? `<div style="font-size: 0.78rem; color: var(--bloom-text-light);">Homes: ${escapeHtml(item.homesCode)}</div>` : ''}
          </td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    }).join('');

    // Save the current filtered list for modal navigation
    currentFilteredList = filtered;

    // Attach row click listeners (entire row clickable)
    document.querySelectorAll('.payment-row').forEach((row, idx) => {
      row.addEventListener('click', function (e) {
        openReviewModal(currentFilteredList[idx], idx);
      });
    });
  }

  // -------------------------------------------------------------
  // Consolidated Review & Approval Modal
  // -------------------------------------------------------------
  function openReviewModal(item, index) {
    if (!item) return;
    activeItemToApprove = item;
    currentModalIndex = (index !== undefined) ? index : currentFilteredList.indexOf(item);

    modalAttendeeName.textContent = item.fullName;
    modalAttendeeEmail.textContent = item.email;
    modalAttendeeChurch.textContent = item.churchPlant;
    modalAttendeeHomesCode.textContent = item.homesCode || '-';
    adminNotesInput.value = item.adminNotes || '';

    // Update prev/next navigation
    const total = currentFilteredList.length;
    modalNavCounter.textContent = total > 1 ? `${currentModalIndex + 1} / ${total}` : '';
    modalPrevBtn.disabled = currentModalIndex <= 0;
    modalNextBtn.disabled = currentModalIndex >= total - 1;
    modalPrevBtn.style.opacity = currentModalIndex <= 0 ? '0.4' : '1';
    modalNextBtn.style.opacity = currentModalIndex >= total - 1 ? '0.4' : '1';

    // Reset zoom when navigating to a new record
    currentZoom = 1;
    if (zoomLevelDisplay) zoomLevelDisplay.textContent = '100%';

    // Receipt preview
    const url = item.paymentUrl || '';
    modalExternalReceiptBtn.href = url || '#';
    modalExternalReceiptBtn.style.display = url ? 'inline-flex' : 'none';

    let fileId = '';
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    } else if (url.includes('id=')) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }

    if (fileId) {
      const directImgUrl = `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
      modalReceiptContainer.innerHTML = `
        <div style="width: 100%; min-height: 200px;">
          <div id="receiptImgWrapper" style="width: 100%; overflow: auto; background: #fff; border-radius: var(--radius-sm); padding: 4px; text-align: center; max-height: 380px;">
            <img id="receiptImg" src="${directImgUrl}" alt="Payment Receipt" style="max-width: 100%; max-height: 370px; height: auto; display: inline-block; border-radius: 4px;" onerror="this.style.display='none'; document.getElementById('modalReceiptPdfNotice').style.display='block';" />
          </div>
          <div id="modalReceiptPdfNotice" style="display: none; padding: 12px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: var(--radius-sm); color: #856404; font-size: 0.84rem; width: 100%; text-align: center; margin-top: 8px;">
            📄 PDF or private document detected. Click "Open in Google Drive" above to view.
          </div>
        </div>
      `;
    } else if (url) {
      modalReceiptContainer.innerHTML = `
        <div style="text-align: center; padding: 16px;">
          <p style="color: var(--bloom-text-light); margin-bottom: 10px;">Payment link available in Google Drive:</p>
          <a href="${escapeHtml(url)}" target="_blank" class="btn-action btn-action--view">↗ View Receipt File</a>
        </div>
      `;
    } else {
      modalReceiptContainer.innerHTML = `
        <p style="color: var(--bloom-text-light); font-size: 0.88rem;">No payment receipt URL provided.</p>
      `;
    }

    // Toggle button state if already verified
    if (item.isVerified) {
      confirmApprovalBtn.textContent = '✅ Already Approved';
      confirmApprovalBtn.disabled = true;
      confirmApprovalBtn.style.background = '#6c757d';
    } else {
      confirmApprovalBtn.textContent = '✅ Approve & Send Email';
      confirmApprovalBtn.disabled = false;
      confirmApprovalBtn.style.background = '#28a745';
    }

    approvalModal.classList.add('is-visible');
    approvalModal.setAttribute('aria-hidden', 'false');
  }

  function closeApprovalModal() {
    if (document.activeElement && approvalModal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    approvalModal.classList.remove('is-visible');
    approvalModal.setAttribute('aria-hidden', 'true');
    modalReceiptContainer.innerHTML = '';
    activeItemToApprove = null;
  }

  function applyZoom() {
    const img = document.getElementById('receiptImg');
    if (img) {
      if (currentZoom <= 1) {
        // Fit to container — restore natural constrained sizing
        img.style.width = '';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '370px';
      } else {
        // Zoom: expand width beyond container so wrapper's overflow:auto scrolls
        img.style.width = Math.round(currentZoom * 100) + '%';
        img.style.maxWidth = 'none';
        img.style.maxHeight = 'none';
      }
    }
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = Math.round(currentZoom * 100) + '%';
    }
  }

  function executeApproval() {
    if (!activeItemToApprove || activeItemToApprove.isVerified) return;

    confirmApprovalBtn.disabled = true;
    confirmApprovalBtn.textContent = 'Processing & Sending Email...';

    const payload = {
      action: 'approve_payment',
      token: currentAdmin.token,
      submissionId: activeItemToApprove.submissionId,
      rowIndex: activeItemToApprove.rowIndex,
      notes: adminNotesInput.value.trim()
    };

    fetch(config.googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        confirmApprovalBtn.disabled = false;
        confirmApprovalBtn.textContent = '✅ Approve & Send Email';

        if (data.result === 'success') {
          activeItemToApprove.isVerified = true;
          activeItemToApprove.adminNotes = data.verificationNote || 'Verified';
          closeApprovalModal();
          updateKPIs({
            total: allPayments.length,
            pendingCount: allPayments.filter(p => !p.isVerified).length,
            verifiedCount: allPayments.filter(p => p.isVerified).length
          });
          renderPaymentsTable();
        } else {
          alert('Failed to approve payment: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(err => {
        confirmApprovalBtn.disabled = false;
        confirmApprovalBtn.textContent = '✅ Approve & Send Email';
        alert('Network error during approval: ' + err.message);
      });
  }

  // -------------------------------------------------------------
  // Event Listeners
  // -------------------------------------------------------------
  function setupEventListeners() {
    // Tabs
    [tabPending, tabVerified, tabAll].forEach(btn => {
      btn.addEventListener('click', function () {
        [tabPending, tabVerified, tabAll].forEach(b => b.classList.remove('is-active'));
        this.classList.add('is-active');
        activeTab = this.getAttribute('data-tab');
        renderPaymentsTable();
      });
    });

    // Search
    searchInput.addEventListener('input', function () {
      renderPaymentsTable();
    });

    // Refresh
    refreshBtn.addEventListener('click', function () {
      loadPaymentsData();
    });

    // Mobile hamburger menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const portalNav = document.getElementById('portalNav');
    if (mobileMenuBtn && portalNav) {
      mobileMenuBtn.addEventListener('click', function () {
        const isOpen = portalNav.classList.toggle('nav-open');
        this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        this.textContent = isOpen ? '✕' : '☰';
      });
    }

    // Modal controls
    closeApprovalModalBtn.addEventListener('click', closeApprovalModal);
    cancelApprovalBtn.addEventListener('click', closeApprovalModal);
    confirmApprovalBtn.addEventListener('click', executeApproval);

    // Modal prev/next navigation
    modalPrevBtn.addEventListener('click', function () {
      if (currentModalIndex > 0) {
        openReviewModal(currentFilteredList[currentModalIndex - 1], currentModalIndex - 1);
      }
    });
    modalNextBtn.addEventListener('click', function () {
      if (currentModalIndex < currentFilteredList.length - 1) {
        openReviewModal(currentFilteredList[currentModalIndex + 1], currentModalIndex + 1);
      }
    });

    // Zoom controls
    zoomInBtn.addEventListener('click', function () {
      currentZoom = Math.min(currentZoom + 0.25, 4);
      applyZoom();
    });
    zoomOutBtn.addEventListener('click', function () {
      currentZoom = Math.max(currentZoom - 0.25, 0.25);
      applyZoom();
    });
    zoomResetBtn.addEventListener('click', function () {
      currentZoom = 1;
      applyZoom();
    });

    // Escape key modal close; Arrow keys for navigation inside modal
    window.addEventListener('keydown', function (e) {
      if (!approvalModal.classList.contains('is-visible')) return;
      if (e.key === 'Escape') {
        closeApprovalModal();
      } else if (e.key === 'ArrowLeft') {
        if (currentModalIndex > 0) {
          openReviewModal(currentFilteredList[currentModalIndex - 1], currentModalIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (currentModalIndex < currentFilteredList.length - 1) {
          openReviewModal(currentFilteredList[currentModalIndex + 1], currentModalIndex + 1);
        }
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
