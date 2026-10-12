/**
 * Bloom Conference 2026 — Payment Verification & Approval Logic
 */

(function () {
  'use strict';

  // State
  let currentAdmin = {
    email: localStorage.getItem('bloom_admin_email') || '',
    token: localStorage.getItem('bloom_admin_token') || '',
    isAuthorized: false
  };

  let allPayments = [];
  let activeTab = 'pending'; // 'pending' | 'verified' | 'all'
  let activeItemToApprove = null;

  // DOM Elements
  const authGateSection = document.getElementById('authGateSection');
  const portalMainContent = document.getElementById('portalMainContent');
  const userBadge = document.getElementById('userBadge');
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
    validateAuth(token);
  }

  function validateAuth(token) {
    const scriptUrl = config.googleScriptUrl;
    if (!scriptUrl) {
      showAuthError('API URL not configured in config.js');
      return;
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
    authGateSection.style.display = 'block';
    portalMainContent.style.display = 'none';
    userBadge.style.display = 'none';
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
    authGateSection.style.display = 'none';
    portalMainContent.style.display = 'block';

    userBadge.innerHTML = `
      <span class="user-profile-badge">
        <span>👤 ${escapeHtml(currentAdmin.email)}</span>
        <button type="button" id="logoutBtn" title="Sign Out">Sign out</button>
      </span>
    `;
    userBadge.style.display = 'inline-block';

    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  }

  function handleLogout() {
    localStorage.removeItem('bloom_admin_email');
    localStorage.removeItem('bloom_admin_token');
    currentAdmin = { email: '', token: '', isAuthorized: false };
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
        <td colspan="7">
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
              <td colspan="7">
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
            <td colspan="7">
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
          <td colspan="7">
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

      const receiptBtn = item.paymentUrl && item.paymentUrl.startsWith('http')
        ? `<button type="button" class="btn-action btn-action--view open-modal-btn" data-id="${escapeHtml(item.submissionId)}" data-row="${item.rowIndex}">📄 View Receipt</button>`
        : `<span style="color: var(--bloom-text-light); font-size: 0.82rem;">None</span>`;

      const actionBtn = item.isVerified
        ? `<button type="button" class="btn-action open-modal-btn" data-id="${escapeHtml(item.submissionId)}" data-row="${item.rowIndex}" style="background: #e9ecef; color: #6c757d;">View Details</button>`
        : `<button type="button" class="btn-action btn-action--approve open-modal-btn" data-id="${escapeHtml(item.submissionId)}" data-row="${item.rowIndex}">Approve</button>`;

      return `
        <tr class="payment-row clickable-row" data-id="${escapeHtml(item.submissionId)}" data-row="${item.rowIndex}" style="cursor: pointer;" title="Click row to review & approve payment">
          <td><span style="font-size: 0.8rem; color: var(--bloom-text-light);">${index + 1}</span></td>
          <td>${badge}</td>
          <td>
            <strong>${escapeHtml(item.fullName)}</strong>
            ${item.firstBloom === 'Yes' ? '<span style="font-size:0.75rem; background: var(--bloom-peach-lt); padding:2px 6px; border-radius:4px; margin-left:4px;">🌸 1st Bloom</span>' : ''}
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
          <td>${receiptBtn}</td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    }).join('');

    // Attach row click listeners (entire row clickable)
    document.querySelectorAll('.payment-row').forEach(row => {
      row.addEventListener('click', function (e) {
        const subId = this.getAttribute('data-id');
        const rowIdx = this.getAttribute('data-row');
        const item = allPayments.find(p => p.submissionId === subId || String(p.rowIndex) === String(rowIdx));
        if (item) {
          openReviewModal(item);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // Consolidated Review & Approval Modal
  // -------------------------------------------------------------
  function openReviewModal(item) {
    activeItemToApprove = item;
    modalAttendeeName.textContent = item.fullName;
    modalAttendeeEmail.textContent = item.email;
    modalAttendeeChurch.textContent = item.churchPlant;
    modalAttendeeHomesCode.textContent = item.homesCode || '-';
    adminNotesInput.value = item.adminNotes || '';

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
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%;">
          <div style="max-height: 340px; width: 100%; overflow: auto; display: flex; justify-content: center; background: #fff; border-radius: var(--radius-sm); padding: 4px;">
            <img src="${directImgUrl}" alt="Payment Receipt" style="max-width: 100%; max-height: 320px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none'; document.getElementById('modalReceiptPdfNotice').style.display='block';" />
          </div>
          <div id="modalReceiptPdfNotice" style="display: none; padding: 12px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: var(--radius-sm); color: #856404; font-size: 0.84rem; width: 100%; text-align: center;">
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

    // Modal controls
    closeApprovalModalBtn.addEventListener('click', closeApprovalModal);
    cancelApprovalBtn.addEventListener('click', closeApprovalModal);
    confirmApprovalBtn.addEventListener('click', executeApproval);

    // Escape key modal close
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeApprovalModal();
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
