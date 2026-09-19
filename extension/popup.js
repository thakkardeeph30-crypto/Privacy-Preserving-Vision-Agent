/**
 * Popup Script - PrivacyScreen Agent
 * Controls agent activation, privacy filters, OpenAgent Form Inspector & Info Box,
 * Universal Auth Intelligence, Local Profile Database, and telemetry.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation & Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const formFieldsCountPill = document.getElementById('formFieldsCountPill');

  // Vision Tab Elements
  const statusEl = document.getElementById('status');
  const toggleBtn = document.getElementById('toggleBtn');
  const blurFaces = document.getElementById('blurFaces');
  const maskPasswords = document.getElementById('maskPasswords');
  const maskPII = document.getElementById('maskPII');
  const modelStatus = document.getElementById('modelStatus');
  const frameCount = document.getElementById('frameCount');
  const redactedCount = document.getElementById('redactedCount');
  const latencyStat = document.getElementById('latencyStat');
  const taskInput = document.getElementById('taskInput');
  const runTaskBtn = document.getElementById('runTaskBtn');
  const logTray = document.getElementById('logTray');
  const logMessage = document.getElementById('logMessage');
  const serverBadge = document.getElementById('serverBadge');
  const serverStatusText = document.getElementById('serverStatusText');
  const maskDomBtn = document.getElementById('maskDomBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const advancedModal = document.getElementById('advancedModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const serverUrlInput = document.getElementById('serverUrlInput');
  const saveAdvancedBtn = document.getElementById('saveAdvancedBtn');
  const vaultBanner = document.getElementById('vaultBanner');
  const vaultSiteTitle = document.getElementById('vaultSiteTitle');
  const vaultUserText = document.getElementById('vaultUserText');
  const vaultLoginBtn = document.getElementById('vaultLoginBtn');
  const vaultList = document.getElementById('vaultList');
  const vaultCountTag = document.getElementById('vaultCountTag');

  // Form Info Box Elements
  const formSummaryText = document.getElementById('formSummaryText');
  const toggleVisualLayerBtn = document.getElementById('toggleVisualLayerBtn');
  const rescanFormsBtn = document.getElementById('rescanFormsBtn');
  const authIntelCard = document.getElementById('authIntelCard');
  const authMethodsContainer = document.getElementById('authMethodsContainer');
  const authQuickActions = document.getElementById('authQuickActions');
  const profileMatchBanner = document.getElementById('profileMatchBanner');
  const matchedCountText = document.getElementById('matchedCountText');
  const applyProfileMatchesBtn = document.getElementById('applyProfileMatchesBtn');
  const fieldsCountTag = document.getElementById('fieldsCountTag');
  const detectedFieldsList = document.getElementById('detectedFieldsList');
  const autofillPageBtn = document.getElementById('autofillPageBtn');
  const autofillAndSubmitBtn = document.getElementById('autofillAndSubmitBtn');
  const saveFieldsToDbBtn = document.getElementById('saveFieldsToDbBtn');

  // Profile Database Elements
  const prof_fullName = document.getElementById('prof_fullName');
  const prof_username = document.getElementById('prof_username');
  const prof_firstName = document.getElementById('prof_firstName');
  const prof_lastName = document.getElementById('prof_lastName');
  const prof_email = document.getElementById('prof_email');
  const prof_phone = document.getElementById('prof_phone');
  const prof_altEmail = document.getElementById('prof_altEmail');
  const prof_streetAddress = document.getElementById('prof_streetAddress');
  const prof_apt = document.getElementById('prof_apt');
  const prof_city = document.getElementById('prof_city');
  const prof_state = document.getElementById('prof_state');
  const prof_zipCode = document.getElementById('prof_zipCode');
  const prof_country = document.getElementById('prof_country');
  const prof_company = document.getElementById('prof_company');
  const prof_jobTitle = document.getElementById('prof_jobTitle');
  const prof_website = document.getElementById('prof_website');
  const customAttrsContainer = document.getElementById('customAttrsContainer');
  const addCustomAttrBtn = document.getElementById('addCustomAttrBtn');
  const saveProfileDbBtn = document.getElementById('saveProfileDbBtn');
  const clearProfileDbBtn = document.getElementById('clearProfileDbBtn');

  let currentHostname = '';
  let activeTabId = null;
  let currentProfile = null;
  let detectedFields = [];
  let isVisualLayerOn = false;

  // --- 1. Tab Navigation ---
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => {
        c.classList.remove('active');
        c.style.display = 'none';
      });

      btn.classList.add('active');
      const targetEl = document.getElementById(targetTab);
      if (targetEl) {
        targetEl.classList.add('active');
        targetEl.style.display = 'block';
      }

      if (targetTab === 'formTab') {
        scanActivePageForms();
      } else if (targetTab === 'profileTab') {
        loadProfileDatabase();
      }
    });
  });

  // --- 2. Initial State Loading ---
  await refreshActiveTab();
  await refreshState();
  await checkServerStatus();
  await checkModelStatus();
  await checkActiveSiteVault();
  await loadProfileDatabase();
  // Pre-scan for badge count in background
  scanActivePageForms(false);

  // --- 3. Toggle Agent Active/Inactive ---
  toggleBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_AGENT' }, (res) => {
      if (chrome.runtime.lastError) return;
      updateUIState(res.isActive);
    });
  });

  // --- 4. Privacy Filter Toggles ---
  const privacyCheckboxes = [blurFaces, maskPasswords, maskPII];
  privacyCheckboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      const settings = {
        blurFaces: blurFaces.checked,
        maskPasswords: maskPasswords.checked,
        maskEmails: maskPII.checked,
        maskPhones: maskPII.checked,
        maskCreditCards: maskPII.checked
      };
      chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    });
  });

  // --- 5. Quick Task Chips ---
  document.querySelectorAll('.chip-btn').forEach((chip) => {
    chip.addEventListener('click', () => {
      taskInput.value = chip.getAttribute('data-task');
      triggerTaskExecution();
    });
  });

  // --- 6. Run Task / Process Screen ---
  runTaskBtn.addEventListener('click', triggerTaskExecution);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerTaskExecution();
  });

  async function triggerTaskExecution() {
    const task = (taskInput.value || '').trim();
    if (!task) return;

    setProcessingState(true);
    showLog(`Analyzing screen & executing task: "${task}"...`);

    chrome.runtime.sendMessage({ type: 'PROCESS_SCREEN', data: { task } }, (response) => {
      setProcessingState(false);

      if (chrome.runtime.lastError || !response) {
        showLog(`❌ Error: ${chrome.runtime.lastError?.message || 'Processing failed'}`);
        return;
      }

      if (!response.success) {
        showLog(`❌ Execution failed: ${response.error}`);
        return;
      }

      const res = response.result || {};
      showLog(`✅ Success (${res.latencyMs}ms): ${res.description || 'Task completed.'}`);
      refreshState();
    });
  }

  // --- 7. DOM Masking ---
  maskDomBtn.addEventListener('click', async () => {
    try {
      if (!activeTabId) await refreshActiveTab();
      if (activeTabId) {
        chrome.tabs.sendMessage(activeTabId, { action: 'APPLY_DOM_REDACTION' }, (res) => {
          if (res && res.success) {
            showLog(`🛡️ Masked ${res.maskedCount} sensitive text elements on page.`);
          } else {
            showLog('Notice: Open a regular webpage to mask DOM.');
          }
        });
      }
    } catch (e) {
      showLog(`DOM Redaction Notice: ${e.message}`);
    }
  });

  // --- 8. Vault Auto-Login Quick Action ---
  vaultLoginBtn.addEventListener('click', () => {
    if (!currentHostname) return;
    setProcessingState(true);
    showLog(`🔑 Autofilling & logging into ${currentHostname}...`);

    chrome.runtime.sendMessage(
      {
        type: 'AUTOFILL_LOGIN',
        data: { hostname: currentHostname, autoSubmit: true }
      },
      (res) => {
        setProcessingState(false);
        if (res && res.success) {
          showLog(`✅ Successfully logged in to ${currentHostname} with local storage credentials!`);
        } else {
          showLog(`❌ Auto-login failed: ${res?.error || 'Unknown error'}`);
        }
      }
    );
  });

  // --- 9. Advanced Modal ---
  settingsBtn.addEventListener('click', () => {
    advancedModal.style.display = 'flex';
    loadVaultManager();
  });

  closeModalBtn.addEventListener('click', () => {
    advancedModal.style.display = 'none';
  });

  advancedModal.addEventListener('click', (e) => {
    if (e.target === advancedModal) advancedModal.style.display = 'none';
  });

  saveAdvancedBtn.addEventListener('click', () => {
    const serverUrl = (serverUrlInput.value || 'http://127.0.0.1:8000').trim();
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings: { serverUrl } }, () => {
      advancedModal.style.display = 'none';
      checkServerStatus();
      showLog(`Saved vision endpoint: ${serverUrl}`);
    });
  });

  // =========================================================================
  // --- 10. OPENAGENT FORM INSPECTOR & INFO BOX LOGIC ---
  // =========================================================================

  rescanFormsBtn.addEventListener('click', () => {
    scanActivePageForms(true);
  });

  toggleVisualLayerBtn.addEventListener('click', () => {
    if (!activeTabId) return;
    const flatProfile = getFlattenedProfile();
    chrome.tabs.sendMessage(
      activeTabId,
      { action: 'TOGGLE_VISUAL_LAYER', matchedKeys: flatProfile },
      (res) => {
        if (chrome.runtime.lastError || !res) return;
        isVisualLayerOn = !!res.isVisible;
        updateVisualLayerButtonState();
      }
    );
  });

  function updateVisualLayerButtonState() {
    if (isVisualLayerOn) {
      toggleVisualLayerBtn.innerHTML = '<span>👁️ Visual Layer: On</span>';
      toggleVisualLayerBtn.classList.add('active-glow');
    } else {
      toggleVisualLayerBtn.innerHTML = '<span>👁️ Visual Layer: Off</span>';
      toggleVisualLayerBtn.classList.remove('active-glow');
    }
  }

  async function scanActivePageForms(notify = true) {
    if (!activeTabId) await refreshActiveTab();
    if (!activeTabId) {
      if (notify) formSummaryText.textContent = 'No active webpage found.';
      return;
    }

    if (notify) formSummaryText.textContent = 'Scanning forms & authentication...';

    chrome.tabs.sendMessage(activeTabId, { action: 'SCAN_PAGE_FORMS' }, (res) => {
      if (chrome.runtime.lastError || !res || !res.success) {
        if (notify) {
          formSummaryText.textContent = 'Unable to scan this page (try refreshing).';
          detectedFieldsList.innerHTML = '<div class="empty-fields-state"><span>⚠️</span><p>Cannot access page DOM on this tab.</p></div>';
        }
        return;
      }

      detectedFields = res.fields || [];
      const loginMethods = res.loginMethods || [];

      // Update Pill
      if (detectedFields.length > 0) {
        formFieldsCountPill.style.display = 'inline-block';
        formFieldsCountPill.textContent = detectedFields.length;
      } else {
        formFieldsCountPill.style.display = 'none';
      }

      fieldsCountTag.textContent = `${detectedFields.length} field${detectedFields.length === 1 ? '' : 's'}`;
      formSummaryText.textContent = `Found ${detectedFields.length} input field${detectedFields.length === 1 ? '' : 's'} on page`;

      // Render Universal Auth Intelligence
      renderUniversalAuthMethods(loginMethods);

      // Render Detected Fields in Info Box
      renderDetectedFields(detectedFields);
    });
  }

  function renderUniversalAuthMethods(methods = []) {
    if (!methods || methods.length === 0) {
      authIntelCard.style.display = 'none';
      return;
    }

    authIntelCard.style.display = 'block';
    authMethodsContainer.innerHTML = '';
    authQuickActions.innerHTML = '';

    methods.forEach((method) => {
      const badge = document.createElement('div');
      badge.className = `auth-method-badge ${method.type}`;
      badge.innerHTML = `
        <span class="auth-method-badge-icon">${method.icon}</span>
        <span>${method.title}</span>
      `;
      authMethodsContainer.appendChild(badge);

      // Add Quick Action Buttons
      if (method.type === 'social_sso' && Array.isArray(method.providers)) {
        method.providers.forEach((prov) => {
          const btn = document.createElement('button');
          btn.className = 'quick-action-pill';
          btn.innerHTML = `${prov.icon} <span>${prov.buttonText || prov.name}</span>`;
          btn.addEventListener('click', () => {
            triggerElementClick(prov.buttonSelector, `Triggered ${prov.name}`);
          });
          authQuickActions.appendChild(btn);
        });
      }

      if (method.type === 'multi_step' && method.nextButtonSelector) {
        const btn = document.createElement('button');
        btn.className = 'quick-action-pill';
        btn.innerHTML = `⏩ <span>Step 1: Fill & Click Next</span>`;
        btn.addEventListener('click', () => {
          handleMultiStepAdvance(method.nextButtonSelector);
        });
        authQuickActions.appendChild(btn);
      }

      if (method.type === 'otp') {
        const btn = document.createElement('button');
        btn.className = 'quick-action-pill';
        btn.innerHTML = `🔑 <span>Fill OTP Code...</span>`;
        btn.addEventListener('click', () => {
          promptAndFillOTP();
        });
        authQuickActions.appendChild(btn);
      }
    });
  }

  function renderDetectedFields(fields = []) {
    if (!fields || fields.length === 0) {
      detectedFieldsList.innerHTML = '<div class="empty-fields-state"><span>ℹ️</span><p>No interactive input fields detected on this page.</p></div>';
      profileMatchBanner.style.display = 'none';
      return;
    }

    const flatProfile = getFlattenedProfile();
    let matchCount = 0;
    detectedFieldsList.innerHTML = '';

    fields.forEach((field, idx) => {
      const profileValue = flatProfile[field.key] || '';
      const initialVal = field.currentValue || profileValue || '';
      if (profileValue) matchCount++;

      const row = document.createElement('div');
      row.className = `field-inspect-row ${profileValue ? 'has-profile-match' : ''}`;
      row.innerHTML = `
        <div class="field-inspect-header">
          <div class="field-title-wrapper">
            <span class="field-icon">${field.icon || '📝'}</span>
            <span class="field-name">${field.label || field.key}</span>
            ${field.isRequired ? '<span class="required-star">*</span>' : ''}
            ${profileValue ? '<span class="profile-match-tag">Matched</span>' : ''}
          </div>
          <span class="field-type-tag">${field.type || 'text'}</span>
        </div>
        <div class="field-input-wrapper">
          <input 
            type="${field.key.toLowerCase().includes('password') ? 'password' : 'text'}" 
            class="field-inspect-input" 
            data-selector="${escapeHtml(field.selector)}" 
            data-key="${escapeHtml(field.key)}"
            value="${escapeHtml(initialVal)}"
            placeholder="${escapeHtml(field.placeholder || `Enter ${field.label}...`)}"
          />
        </div>
      `;
      detectedFieldsList.appendChild(row);
    });

    if (matchCount > 0) {
      profileMatchBanner.style.display = 'flex';
      matchedCountText.textContent = matchCount;
    } else {
      profileMatchBanner.style.display = 'none';
    }
  }

  // 1-Click Fill from Profile Button in Info Box
  applyProfileMatchesBtn.addEventListener('click', () => {
    const flatProfile = getFlattenedProfile();
    document.querySelectorAll('.field-inspect-input').forEach((input) => {
      const key = input.getAttribute('data-key');
      if (flatProfile[key]) {
        input.value = flatProfile[key];
        input.classList.add('pulse-highlight');
        setTimeout(() => input.classList.remove('pulse-highlight'), 1000);
      }
    });
    showLog('Applied matched profile values to Info Box fields.');
  });

  // Fill Page with OpenAgent
  autofillPageBtn.addEventListener('click', () => {
    executeFormAutofill(false);
  });

  // Fill & Submit Form
  autofillAndSubmitBtn.addEventListener('click', () => {
    executeFormAutofill(true);
  });

  async function executeFormAutofill(autoSubmit = false) {
    if (!activeTabId) await refreshActiveTab();
    if (!activeTabId) return;

    const fieldsToFill = [];
    document.querySelectorAll('.field-inspect-input').forEach((input) => {
      const selector = input.getAttribute('data-selector');
      const key = input.getAttribute('data-key');
      const val = input.value;
      if (selector && val !== '') {
        fieldsToFill.push({ selector, value: val, key });
      }
    });

    if (fieldsToFill.length === 0) {
      showLog('Notice: No values to fill. Enter values in the Info Box first.');
      return;
    }

    setProcessingState(true);
    showLog(`🤖 OpenAgent filling ${fieldsToFill.length} fields on page...`);

    chrome.tabs.sendMessage(
      activeTabId,
      { action: 'AUTOFILL_FORM_FIELDS', fields: fieldsToFill, autoSubmit },
      (res) => {
        setProcessingState(false);
        if (res && res.success) {
          showLog(`✅ OpenAgent filled ${res.filledCount} fields!${res.submitted ? ' (Form submitted)' : ''}`);
        } else {
          showLog(`❌ Autofill error: ${res?.error || 'Failed to inject fields'}`);
        }
      }
    );
  }

  // Save current values from Info Box back to Profile DB
  saveFieldsToDbBtn.addEventListener('click', () => {
    const updates = { personal: {}, contact: {}, address: {}, professional: {} };
    let savedCount = 0;

    document.querySelectorAll('.field-inspect-input').forEach((input) => {
      const key = input.getAttribute('data-key');
      const val = (input.value || '').trim();
      if (!val) return;

      if (['fullName', 'firstName', 'lastName', 'username'].includes(key)) {
        updates.personal[key] = val;
        savedCount++;
      } else if (['email', 'phone', 'altEmail'].includes(key)) {
        updates.contact[key] = val;
        savedCount++;
      } else if (['streetAddress', 'apt', 'city', 'state', 'zipCode', 'country'].includes(key)) {
        updates.address[key] = val;
        savedCount++;
      } else if (['company', 'jobTitle', 'website'].includes(key)) {
        updates.professional[key] = val;
        savedCount++;
      }
    });

    if (savedCount === 0) {
      showLog('Notice: No matching profile keys found to save.');
      return;
    }

    chrome.runtime.sendMessage({ type: 'UPDATE_PROFILE_DATABASE', profile: updates }, (res) => {
      if (res && res.success) {
        currentProfile = res.profile;
        showLog(`💾 Saved ${savedCount} fields to your on-device Profile Database!`);
      }
    });
  });

  // Prompt and fill OTP code
  function promptAndFillOTP() {
    const code = prompt('Enter the 4-8 digit OTP / 2FA code to auto-inject:');
    if (!code) return;

    chrome.tabs.sendMessage(activeTabId, { action: 'FILL_OTP_CODE', code, autoSubmit: true }, (res) => {
      if (res && res.success) {
        showLog(`🔑 Injected ${res.digitsFilled} OTP digits into page!`);
      } else {
        showLog(`❌ OTP injection failed: ${res?.error || 'Field not found'}`);
      }
    });
  }

  // Trigger click on element
  function triggerElementClick(selector, label) {
    if (!activeTabId) return;
    chrome.tabs.sendMessage(activeTabId, { action: 'EXECUTE_ACTION', actionData: { type: 'click', target: selector } }, (res) => {
      if (res && res.success) {
        showLog(`✅ ${label}`);
      } else {
        showLog(`Action failed: ${res?.error || 'Could not click element'}`);
      }
    });
  }

  // Multi-step Advance
  function handleMultiStepAdvance(btnSelector) {
    const flatProfile = getFlattenedProfile();
    const identifier = flatProfile.email || flatProfile.username || '';
    if (!identifier) {
      showLog('Notice: Add an email or username in your Profile DB first.');
      return;
    }

    executeFormAutofill(false).then(() => {
      setTimeout(() => {
        triggerElementClick(btnSelector, 'Advanced to next authentication step');
      }, 400);
    });
  }

  // =========================================================================
  // --- 11. LOCAL PROFILE DATABASE LOGIC ---
  // =========================================================================

  async function loadProfileDatabase() {
    chrome.runtime.sendMessage({ type: 'GET_PROFILE_DATABASE' }, (res) => {
      if (chrome.runtime.lastError || !res || !res.profile) return;
      currentProfile = res.profile;
      populateProfileForm(res.profile);
    });
  }

  function populateProfileForm(p) {
    const pers = p.personal || {};
    const cont = p.contact || {};
    const addr = p.address || {};
    const prof = p.professional || {};

    prof_fullName.value = pers.fullName || '';
    prof_username.value = pers.username || '';
    prof_firstName.value = pers.firstName || '';
    prof_lastName.value = pers.lastName || '';

    prof_email.value = cont.email || '';
    prof_phone.value = cont.phone || '';
    prof_altEmail.value = cont.altEmail || '';

    prof_streetAddress.value = addr.streetAddress || '';
    prof_apt.value = addr.apt || '';
    prof_city.value = addr.city || '';
    prof_state.value = addr.state || '';
    prof_zipCode.value = addr.zipCode || '';
    prof_country.value = addr.country || '';

    prof_company.value = prof.company || '';
    prof_jobTitle.value = prof.jobTitle || '';
    prof_website.value = prof.website || '';

    // Render custom attributes
    customAttrsContainer.innerHTML = '';
    (p.custom || []).forEach((c) => {
      addCustomAttrRow(c.key, c.label, c.value);
    });
  }

  addCustomAttrBtn.addEventListener('click', () => {
    addCustomAttrRow('', '', '');
  });

  function addCustomAttrRow(key = '', label = '', value = '') {
    const row = document.createElement('div');
    row.className = 'custom-attr-row';
    row.innerHTML = `
      <input type="text" class="custom-attr-key" placeholder="Key (e.g. ssn, license)" value="${escapeHtml(key)}" />
      <input type="text" class="custom-attr-label" placeholder="Label" value="${escapeHtml(label)}" />
      <input type="text" class="custom-attr-val" placeholder="Value" value="${escapeHtml(value)}" />
      <button type="button" class="custom-attr-del" title="Delete attribute">✕</button>
    `;
    row.querySelector('.custom-attr-del').addEventListener('click', () => row.remove());
    customAttrsContainer.appendChild(row);
  }

  saveProfileDbBtn.addEventListener('click', () => {
    const profile = {
      personal: {
        fullName: prof_fullName.value.trim(),
        username: prof_username.value.trim(),
        firstName: prof_firstName.value.trim(),
        lastName: prof_lastName.value.trim()
      },
      contact: {
        email: prof_email.value.trim(),
        phone: prof_phone.value.trim(),
        altEmail: prof_altEmail.value.trim()
      },
      address: {
        streetAddress: prof_streetAddress.value.trim(),
        apt: prof_apt.value.trim(),
        city: prof_city.value.trim(),
        state: prof_state.value.trim(),
        zipCode: prof_zipCode.value.trim(),
        country: prof_country.value.trim()
      },
      professional: {
        company: prof_company.value.trim(),
        jobTitle: prof_jobTitle.value.trim(),
        website: prof_website.value.trim()
      },
      custom: []
    };

    document.querySelectorAll('.custom-attr-row').forEach((row) => {
      const k = row.querySelector('.custom-attr-key').value.trim();
      const l = row.querySelector('.custom-attr-label').value.trim();
      const v = row.querySelector('.custom-attr-val').value.trim();
      if (k && v) {
        profile.custom.push({ key: k, label: l || k, value: v });
      }
    });

    chrome.runtime.sendMessage({ type: 'UPDATE_PROFILE_DATABASE', profile }, (res) => {
      if (res && res.success) {
        currentProfile = res.profile;
        showLog('💾 Local Profile Database saved successfully on-device!');
      } else {
        showLog('Failed to save profile database.');
      }
    });
  });

  clearProfileDbBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset your local Profile Database to empty defaults?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_PROFILE_DATABASE' }, (res) => {
        if (res && res.success) {
          currentProfile = res.profile;
          populateProfileForm(res.profile);
          showLog('Profile Database reset to defaults.');
        }
      });
    }
  });

  function getFlattenedProfile() {
    if (!currentProfile) return {};
    const flat = {
      ...currentProfile.personal,
      ...currentProfile.contact,
      ...currentProfile.address,
      ...currentProfile.professional
    };
    (currentProfile.custom || []).forEach((c) => {
      if (c.key) flat[c.key] = c.value;
    });
    return flat;
  }

  // =========================================================================
  // --- 12. HELPER UTILITIES ---
  // =========================================================================

  async function refreshActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        activeTabId = tab.id;
        if (tab.url) {
          try {
            const u = new URL(tab.url);
            currentHostname = u.hostname;
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  async function checkActiveSiteVault() {
    if (!currentHostname) return;
    chrome.runtime.sendMessage(
      { type: 'GET_SITE_CREDENTIALS', data: { hostname: currentHostname } },
      (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.credentials) {
          vaultBanner.style.display = 'flex';
          vaultSiteTitle.textContent = currentHostname;
          vaultUserText.textContent = res.credentials.username;
        } else {
          vaultBanner.style.display = 'none';
        }
      }
    );
  }

  function loadVaultManager() {
    chrome.runtime.sendMessage({ type: 'GET_ALL_SAVED_SITES' }, (res) => {
      if (chrome.runtime.lastError || !res || !res.sites) return;
      const sites = res.sites;
      vaultCountTag.textContent = `${sites.length} site${sites.length === 1 ? '' : 's'}`;

      if (sites.length === 0) {
        vaultList.innerHTML = '<div class="vault-empty">No credentials saved yet. Log into any site with the extension active to save.</div>';
        return;
      }

      vaultList.innerHTML = '';
      sites.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'vault-item';
        row.innerHTML = `
          <div>
            <div class="vault-item-domain">${escapeHtml(item.domain)}</div>
            <div class="vault-item-user">${escapeHtml(item.username)}</div>
          </div>
          <button class="vault-item-del-btn" title="Delete saved credential" data-domain="${escapeHtml(item.domain)}">🗑️</button>
        `;
        vaultList.appendChild(row);
      });

      vaultList.querySelectorAll('.vault-item-del-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const domain = btn.getAttribute('data-domain');
          chrome.runtime.sendMessage(
            { type: 'DELETE_SITE_CREDENTIALS', data: { hostname: domain } },
            () => {
              loadVaultManager();
              checkActiveSiteVault();
              showLog(`Removed credentials for ${domain}`);
            }
          );
        });
      });
    });
  }

  async function refreshState() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (resp) => {
      if (chrome.runtime.lastError || !resp || !resp.state) return;
      const { state } = resp;

      updateUIState(state.isActive);

      if (state.settings) {
        blurFaces.checked = !!state.settings.blurFaces;
        maskPasswords.checked = !!state.settings.maskPasswords;
        maskPII.checked = !!(state.settings.maskEmails || state.settings.maskCreditCards);
        if (state.settings.serverUrl) serverUrlInput.value = state.settings.serverUrl;
      }

      if (state.stats) {
        frameCount.textContent = state.stats.framesAnalyzed || 0;
        redactedCount.textContent = state.stats.piiRedactedCount || 0;
        latencyStat.textContent = `${state.stats.lastLatencyMs || 0}ms`;
      }
    });
  }

  function updateUIState(isActive) {
    if (isActive) {
      statusEl.textContent = 'Active';
      statusEl.className = 'status-value active';
      toggleBtn.innerHTML = '<span class="btn-icon">🛑</span><span class="btn-text">Deactivate</span>';
      toggleBtn.classList.add('deactivate');
    } else {
      statusEl.textContent = 'Inactive';
      statusEl.className = 'status-value';
      toggleBtn.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-text">Activate</span>';
      toggleBtn.classList.remove('deactivate');
    }
  }

  function setProcessingState(isProcessing) {
    if (isProcessing) {
      statusEl.textContent = 'Processing';
      statusEl.className = 'status-value processing';
      runTaskBtn.disabled = true;
      runTaskBtn.innerHTML = '<span class="run-btn-icon">⏳</span><span>...</span>';
    } else {
      runTaskBtn.disabled = false;
      runTaskBtn.innerHTML = '<span class="run-btn-icon">🚀</span><span>Run</span>';
      refreshState();
    }
  }

  function showLog(msg) {
    logTray.style.display = 'flex';
    logMessage.textContent = msg;
  }

  async function checkServerStatus() {
    chrome.runtime.sendMessage({ type: 'PING_SERVER' }, (res) => {
      if (res && res.online) {
        serverBadge.classList.add('connected');
        serverStatusText.textContent = 'Server Online';
      } else {
        serverBadge.classList.remove('connected');
        serverStatusText.textContent = 'Server Offline';
      }
    });
  }

  async function checkModelStatus() {
    chrome.runtime.sendMessage({ type: 'CHECK_VISION_MODEL' }, (res) => {
      if (res) {
        if (res.status === 'loaded') {
          modelStatus.textContent = res.webgpu ? 'DETR (WebGPU)' : 'DETR (WASM)';
        } else if (res.status === 'heuristic_ready') {
          modelStatus.textContent = 'ViT-Fast';
        } else {
          modelStatus.textContent = 'Ready';
        }
      } else {
        modelStatus.textContent = 'Ready';
      }
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
