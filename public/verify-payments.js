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
  const manualAuthForm = document.getElementById('manualAuthForm');
  const manualEmailInput = document.getElementById('manualEmailInput');
  const verifyEmailBtn = document.getElementById('verifyEmailBtn');

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

  // Modals
  const approvalModal = document.getElementById('approvalModal');
  const closeApprovalModalBtn = document.getElementById('closeApprovalModalBtn');
  const cancelApprovalBtn = document.getElementById('cancelApprovalBtn');
  const confirmApprovalBtn = document.getElementById('confirmApprovalBtn');
  const modalAttendeeName = document.getElementById('modalAttendeeName');
  const modalAttendeeEmail = document.getElementById('modalAttendeeEmail');
  const modalAttendeeChurch = document.getElementById('modalAttendeeChurch');
  const modalAttendeeWorkshop = document.getElementById('modalAttendeeWorkshop');
  const adminNotesInput = document.getElementById('adminNotesInput');

  const receiptModal = document.getElementById('receiptModal');
  const receiptModalTitle = document.getElementById('receiptModalTitle');
  const receiptPreviewContainer = document.getElementById('receiptPreviewContainer');
  const closeReceiptModalBtn = document.getElementById('closeReceiptModalBtn');
  const closeReceiptFooterBtn = document.getElementById('closeReceiptFooterBtn');
  const openExternalReceiptBtn = document.getElementById('openExternalReceiptBtn');

  const config = window.APP_CONFIG || {};

  // -------------------------------------------------------------
  // Initialization & Auth Flow
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();

    if (currentAdmin.email) {
      validateAuth(currentAdmin.email);
    } else {
      showAuthGate();
    }
  });

  function validateAuth(email) {
    const scriptUrl = config.googleScriptUrl;
    if (!scriptUrl) {
      showAuthError('API URL not configured in config.js');
      return;
    }

    if (verifyEmailBtn) {
      verifyEmailBtn.disabled = true;
      verifyEmailBtn.textContent = 'Verifying...';
    }

    const checkUrl = `${scriptUrl}?action=check_auth&email=${encodeURIComponent(email)}`;

    fetch(checkUrl)
      .then(res => res.json())
      .then(data => {
        if (verifyEmailBtn) {
          verifyEmailBtn.disabled = false;
          verifyEmailBtn.textContent = 'Sign In with Authorized Email';
        }
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
        if (verifyEmailBtn) {
          verifyEmailBtn.disabled = false;
          verifyEmailBtn.textContent = 'Sign In with Authorized Email';
        }
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
        <td colspan="8">
          <div class="state-box">
            <div class="state-spinner"></div>
            <p>Loading registrations for verification...</p>
          </div>
        </td>
      </tr>
    `;

    const getUrl = `${scriptUrl}?action=get_payments&token=${encodeURIComponent(currentAdmin.token)}&email=${encodeURIComponent(currentAdmin.email)}`;

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
              <td colspan="8">
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
            <td colspan="8">
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
      const haystack = `${item.fullName} ${item.email} ${item.churchPlant} ${item.phone}`.toLowerCase();
      return haystack.includes(query);
    });

    if (filtered.length === 0) {
      paymentsTableBody.innerHTML = `
        <tr>
          <td colspan="8">
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
        ? `<button type="button" class="btn-action btn-action--view view-receipt-btn" data-url="${escapeHtml(item.paymentUrl)}" data-name="${escapeHtml(item.fullName)}">📄 View Receipt</button>`
        : `<span style="color: var(--bloom-text-light); font-size: 0.82rem;">None</span>`;

      const actionBtn = item.isVerified
        ? `<button type="button" class="btn-action" disabled style="background: #e9ecef; color: #6c757d;">Approved</button>`
        : `<button type="button" class="btn-action btn-action--approve approve-payment-btn" data-id="${escapeHtml(item.submissionId)}" data-row="${item.rowIndex}">Approve</button>`;

      return `
        <tr>
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
          <td>
            <span style="font-size: 0.84rem;">${escapeHtml(item.workshop || 'None')}</span>
          </td>
          <td>${receiptBtn}</td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    }).join('');

    // Attach event listeners for row actions
    document.querySelectorAll('.view-receipt-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        openReceiptModal(this.getAttribute('data-url'), this.getAttribute('data-name'));
      });
    });

    document.querySelectorAll('.approve-payment-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const subId = this.getAttribute('data-id');
        const rowIdx = this.getAttribute('data-row');
        const item = allPayments.find(p => p.submissionId === subId || String(p.rowIndex) === String(rowIdx));
        if (item) {
          openApprovalModal(item);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // Modals & Actions
  // -------------------------------------------------------------
  function openReceiptModal(url, attendeeName) {
    receiptModalTitle.textContent = `Payment Receipt — ${attendeeName}`;
    openExternalReceiptBtn.href = url;

    // Extract Drive File ID if present
    let fileId = '';
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    } else if (url.includes('id=')) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) fileId = match[1];
    }

    if (fileId) {
      // Use Google Drive direct thumbnail / preview image which doesn't trigger CSP framing blocking
      const directImgUrl = `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
      receiptPreviewContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
          <div style="max-height: 480px; width: 100%; overflow: auto; display: flex; justify-content: center; background: #fdfdfd; border-radius: var(--radius-sm); border: 1px solid var(--bloom-border); padding: 8px;">
            <img src="${directImgUrl}" alt="Payment Receipt" style="max-width: 100%; height: auto; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none'; document.getElementById('receiptFallbackNotice').style.display='block';" />
          </div>
          <div id="receiptFallbackNotice" style="display: none; padding: 16px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: var(--radius-sm); color: #856404; font-size: 0.88rem; width: 100%;">
            📄 This document is a PDF or private document that Google Drive protects from in-page preview. Please click the button below to view it directly in Google Drive.
          </div>
        </div>
      `;
    } else {
      receiptPreviewContainer.innerHTML = `
        <p style="color: var(--bloom-text-light); margin-bottom: 12px;">Click below to open payment proof in Google Drive:</p>
        <a href="${escapeHtml(url)}" target="_blank" class="primary-btn" style="display: inline-flex;">↗ Open Receipt in Drive</a>
      `;
    }

    receiptModal.classList.add('is-visible');
    receiptModal.setAttribute('aria-hidden', 'false');
  }

  function closeReceiptModal() {
    receiptModal.classList.remove('is-visible');
    receiptModal.setAttribute('aria-hidden', 'true');
    receiptPreviewContainer.innerHTML = '';
  }

  function openApprovalModal(item) {
    activeItemToApprove = item;
    modalAttendeeName.textContent = item.fullName;
    modalAttendeeEmail.textContent = item.email;
    modalAttendeeChurch.textContent = item.churchPlant;
    modalAttendeeWorkshop.textContent = item.workshop || 'None';
    adminNotesInput.value = '';

    approvalModal.classList.add('is-visible');
    approvalModal.setAttribute('aria-hidden', 'false');
  }

  function closeApprovalModal() {
    approvalModal.classList.remove('is-visible');
    approvalModal.setAttribute('aria-hidden', 'true');
    activeItemToApprove = null;
  }

  function executeApproval() {
    if (!activeItemToApprove) return;

    confirmApprovalBtn.disabled = true;
    confirmApprovalBtn.textContent = 'Processing & Sending Email...';

    const payload = {
      action: 'approve_payment',
      token: currentAdmin.token,
      adminEmail: currentAdmin.email,
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
    // Manual Email Form
    if (manualAuthForm) {
      manualAuthForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = manualEmailInput.value.trim();
        if (email) {
          validateAuth('', email);
        }
      });
    }

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

    closeReceiptModalBtn.addEventListener('click', closeReceiptModal);
    closeReceiptFooterBtn.addEventListener('click', closeReceiptModal);

    // Escape key modal close
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeApprovalModal();
        closeReceiptModal();
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
