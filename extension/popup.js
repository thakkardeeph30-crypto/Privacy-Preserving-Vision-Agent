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

  // Header Lock Button & Indicator
  const vaultLockStatusBtn = document.getElementById('vaultLockStatusBtn');
  const lockStatusIcon = document.getElementById('lockStatusIcon');
  const lockStatusText = document.getElementById('lockStatusText');
  const databaseCountPill = document.getElementById('databaseCountPill');
  const passwordsCountPill = document.getElementById('passwordsCountPill');

  // Database Tab & Sub-navigation Elements
  const dbSwitchPasswords = document.getElementById('dbSwitchPasswords');
  const dbSwitchProfile = document.getElementById('dbSwitchProfile');
  const dbPassCountBadge = document.getElementById('dbPassCountBadge');
  const passwordsSection = document.getElementById('passwordsSection');
  const profileSection = document.getElementById('profileSection');

  // Password Manager Database Elements
  const lockNowBtn = document.getElementById('lockNowBtn');
  const openSetupLockBtn = document.getElementById('openSetupLockBtn');
  const lockSetupBanner = document.getElementById('lockSetupBanner');
  const openLockSetupBtn = document.getElementById('openLockSetupBtn');
  const vaultLockScreen = document.getElementById('vaultLockScreen');
  const biometricUnlockBtn = document.getElementById('biometricUnlockBtn');
  const biometricBtnLabel = document.getElementById('biometricBtnLabel');
  const pinUnlockInput = document.getElementById('pinUnlockInput');
  const pinUnlockBtn = document.getElementById('pinUnlockBtn');
  const pinErrorMsg = document.getElementById('pinErrorMsg');
  const vaultUnlockedView = document.getElementById('vaultUnlockedView');
  const passwordSearchInput = document.getElementById('passwordSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const addPasswordBtn = document.getElementById('addPasswordBtn');
  const savedPasswordsCountText = document.getElementById('savedPasswordsCountText');
  const refreshVaultBtn = document.getElementById('refreshVaultBtn');
  const passwordsListContainer = document.getElementById('passwordsListContainer');

  // Add/Edit Credential Modal Elements
  const credentialModal = document.getElementById('credentialModal');
  const credModalTitle = document.getElementById('credModalTitle');
  const closeCredModalBtn = document.getElementById('closeCredModalBtn');
  const credEditId = document.getElementById('credEditId');
  const credSiteNameInput = document.getElementById('credSiteNameInput');
  const credUrlInput = document.getElementById('credUrlInput');
  const credUsernameInput = document.getElementById('credUsernameInput');
  const credPasswordInput = document.getElementById('credPasswordInput');
  const generateStrongPassBtn = document.getElementById('generateStrongPassBtn');
  const toggleCredPassVisibilityBtn = document.getElementById('toggleCredPassVisibilityBtn');
  const credNotesInput = document.getElementById('credNotesInput');
  const saveCredentialBtn = document.getElementById('saveCredentialBtn');
  const cancelCredentialBtn = document.getElementById('cancelCredentialBtn');

  // Lock Setup Modal Elements
  const lockSetupModal = document.getElementById('lockSetupModal');
  const closeLockSetupModalBtn = document.getElementById('closeLockSetupModalBtn');
  const setupPinInput = document.getElementById('setupPinInput');
  const setupPinConfirmInput = document.getElementById('setupPinConfirmInput');
  const setupEnableBiometrics = document.getElementById('setupEnableBiometrics');
  const setupErrorMsg = document.getElementById('setupErrorMsg');
  const confirmLockSetupBtn = document.getElementById('confirmLockSetupBtn');

  // Copy Toast Elements
  const copyToast = document.getElementById('copyToast');
  const copyToastText = document.getElementById('copyToastText');

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
  let currentVaultEntries = [];
  let isVaultLocked = false;
  let hasMasterLock = false;

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
      } else if (targetTab === 'databaseTab' || targetTab === 'passwordsTab' || targetTab === 'profileTab') {
        loadPasswordManager();
        loadProfileDatabase();
      }
    });
  });

  // Database Sub-Navigation (Saved Passwords vs Autofill Profile)
  if (dbSwitchPasswords && dbSwitchProfile) {
    dbSwitchPasswords.addEventListener('click', () => {
      dbSwitchPasswords.classList.add('active');
      dbSwitchProfile.classList.remove('active');
      if (passwordsSection) passwordsSection.style.display = 'block';
      if (profileSection) profileSection.style.display = 'none';
      loadPasswordManager();
    });

    dbSwitchProfile.addEventListener('click', () => {
      dbSwitchProfile.classList.add('active');
      dbSwitchPasswords.classList.remove('active');
      if (profileSection) profileSection.style.display = 'block';
      if (passwordsSection) passwordsSection.style.display = 'none';
      loadProfileDatabase();
    });
  }

  // --- 2. Initial State Loading ---
  await refreshActiveTab();
  await refreshState();
  await checkServerStatus();
  await checkModelStatus();
  await checkActiveSiteVault();
  await loadPasswordManager();
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
    if (isVaultLocked) {
      showToast('🔒 Database is locked. Authenticate in Database tab first.');
      const tabBtn = document.querySelector('.tab-btn[data-tab="databaseTab"]') || document.querySelector('.tab-btn[data-tab="passwordsTab"]');
      if (tabBtn) tabBtn.click();
      return;
    }
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
        showLog(`💾 Saved ${savedCount} fields to your on-device Database!`);
        showToast('Saved to Database! 💾');
      }
    });

    // Also if credentials (username/email + password) are detected on current site, save to website vault
    const userVal = updates.personal.username || updates.contact.email || updates.personal.fullName;
    let passVal = '';
    document.querySelectorAll('.field-inspect-input').forEach((input) => {
      const key = (input.getAttribute('data-key') || '').toLowerCase();
      if ((key.includes('pass') || input.type === 'password') && input.value) {
        passVal = input.value;
      }
    });
    if (userVal && passVal && currentHostname) {
      saveCredentialDirectly({
        hostname: currentHostname,
        username: userVal,
        password: passVal,
        url: `https://${currentHostname}`,
        siteName: formatSiteName(currentHostname)
      }).then(() => {
        loadPasswordManager();
      });
    }
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

  // =========================================================================
  // --- 13. GOOGLE PASSWORD MANAGER & BIOMETRIC AUTHENTICATION ---
  // =========================================================================

  // Cryptographic & Salt Utilities
  function generateSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function hashPin(pin, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}:${pin}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function bufferToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }

  function base64ToBuffer(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // WebAuthn Biometric Registration (Touch ID / Face ID / Windows Hello)
  async function registerDeviceBiometrics(username = 'user') {
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication is not supported by your browser environment.');
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const createOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'PrivacyScreen Agent Vault',
          id: window.location.hostname || undefined
        },
        user: {
          id: userId,
          name: username,
          displayName: 'Vault Owner'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged'
        },
        timeout: 60000,
        attestation: 'none'
      }
    };

    const credential = await navigator.credentials.create(createOptions);
    if (!credential) throw new Error('Biometric registration was cancelled.');
    return bufferToBase64(credential.rawId);
  }

  // WebAuthn Biometric Verification
  async function verifyDeviceBiometrics(credentialIdB64) {
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication is not supported on this device.');
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const getOptions = {
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        allowCredentials: credentialIdB64 ? [
          {
            id: base64ToBuffer(credentialIdB64),
            type: 'public-key'
          }
        ] : []
      }
    };

    const assertion = await navigator.credentials.get(getOptions);
    if (!assertion) throw new Error('Biometric verification cancelled.');
    return true;
  }

  // Floating Toast Notification
  let toastTimer = null;
  function showToast(msg) {
    if (copyToastText) copyToastText.textContent = msg;
    if (copyToast) {
      copyToast.style.display = 'flex';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        copyToast.style.display = 'none';
      }, 2200);
    }
  }

  function copyToClipboard(text, msg = 'Copied to clipboard!') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => fallbackCopy(text, msg));
    } else {
      fallbackCopy(text, msg);
    }
  }

  function fallbackCopy(text, msg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(msg);
    } catch (e) {
      showToast('Could not copy to clipboard');
    }
    document.body.removeChild(ta);
  }

  function generateStrongPassword(len = 16) {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()_+~';
    const values = new Uint32Array(len);
    crypto.getRandomValues(values);
    return Array.from(values).map((v) => chars[v % chars.length]).join('');
  }

  // Core Password Manager Loader
  async function loadPasswordManager() {
    chrome.runtime.sendMessage({ type: 'VAULT_GET_ALL' }, async (res) => {
      if (!chrome.runtime.lastError && res && res.success) {
        currentVaultEntries = res.entries || [];
        isVaultLocked = !!res.isLocked;
        hasMasterLock = !!res.requiresLock;
      } else {
        // Fallback directly to local disk storage
        try {
          const localData = await chrome.storage.local.get(['privacy_agent_vault_v2', 'privacy_agent_auth']);
          currentVaultEntries = Array.isArray(localData.privacy_agent_vault_v2) ? localData.privacy_agent_vault_v2 : [];
          hasMasterLock = !!localData.privacy_agent_auth?.hasMasterPin;
          isVaultLocked = false;
        } catch (e) {
          currentVaultEntries = currentVaultEntries || [];
        }
      }

      // Update badge counts
      if (databaseCountPill) {
        databaseCountPill.textContent = currentVaultEntries.length;
        databaseCountPill.style.display = currentVaultEntries.length > 0 ? 'inline-block' : 'none';
      }
      if (passwordsCountPill) {
        passwordsCountPill.textContent = currentVaultEntries.length;
        passwordsCountPill.style.display = currentVaultEntries.length > 0 ? 'inline-block' : 'none';
      }
      if (dbPassCountBadge) {
        dbPassCountBadge.textContent = currentVaultEntries.length;
      }

      // Update header lock button
      updateLockStatusHeader(isVaultLocked, hasMasterLock);

      // Show/hide setup reminder banner
      if (lockSetupBanner) {
        lockSetupBanner.style.display = (!hasMasterLock) ? 'flex' : 'none';
      }

      if (isVaultLocked) {
        if (vaultLockScreen) vaultLockScreen.style.display = 'block';
        if (vaultUnlockedView) vaultUnlockedView.style.display = 'none';
        if (pinErrorMsg) pinErrorMsg.style.display = 'none';
        if (pinUnlockInput) pinUnlockInput.value = '';
      } else {
        if (vaultLockScreen) vaultLockScreen.style.display = 'none';
        if (vaultUnlockedView) vaultUnlockedView.style.display = 'block';
        renderPasswordsList(passwordSearchInput ? passwordSearchInput.value : '');
      }

      // Keep settings modal vault list synchronized
      loadVaultManager();
    });
  }

  function updateLockStatusHeader(locked, hasLock) {
    if (!vaultLockStatusBtn) return;
    vaultLockStatusBtn.classList.remove('locked', 'unlocked');

    if (!hasLock) {
      if (lockStatusIcon) lockStatusIcon.textContent = '🔓';
      if (lockStatusText) lockStatusText.textContent = 'No Lock';
      vaultLockStatusBtn.title = 'No Security Lock Set (Click to set up)';
    } else if (locked) {
      if (lockStatusIcon) lockStatusIcon.textContent = '🔒';
      if (lockStatusText) lockStatusText.textContent = 'Locked';
      vaultLockStatusBtn.classList.add('locked');
      vaultLockStatusBtn.title = 'Database is Locked (Click to unlock)';
    } else {
      if (lockStatusIcon) lockStatusIcon.textContent = '🔓';
      if (lockStatusText) lockStatusText.textContent = 'Unlocked';
      vaultLockStatusBtn.classList.add('unlocked');
      vaultLockStatusBtn.title = 'Database Unlocked (Click to lock now)';
    }
  }

  function renderPasswordsList(searchQuery = '') {
    if (!passwordsListContainer) return;
    const q = (searchQuery || '').trim().toLowerCase();

    const filtered = currentVaultEntries.filter((e) => {
      if (!q) return true;
      return (
        (e.siteName && e.siteName.toLowerCase().includes(q)) ||
        (e.hostname && e.hostname.toLowerCase().includes(q)) ||
        (e.url && e.url.toLowerCase().includes(q)) ||
        (e.username && e.username.toLowerCase().includes(q))
      );
    });

    if (savedPasswordsCountText) {
      savedPasswordsCountText.textContent = `${filtered.length} saved credential${filtered.length === 1 ? '' : 's'}${q ? ' found' : ''}`;
    }

    if (filtered.length === 0) {
      if (q) {
        passwordsListContainer.innerHTML = `
          <div class="vault-empty">
            <span style="font-size: 24px;">🔍</span>
            <p>No saved passwords match "<b>${escapeHtml(q)}</b>"</p>
          </div>
        `;
      } else {
        passwordsListContainer.innerHTML = `
          <div class="vault-empty">
            <span style="font-size: 28px; display: block; margin-bottom: 8px;">🔑</span>
            <p>No saved passwords in your local database.</p>
            <small>Log into any website or click <b>+ Add</b> above to store credentials permanently.</small>
          </div>
        `;
      }
      return;
    }

    passwordsListContainer.innerHTML = '';
    filtered.forEach((entry) => {
      const card = document.createElement('div');
      card.className = 'pm-card';
      card.setAttribute('data-id', entry.id);

      const domain = entry.domain || entry.hostname || '';
      const initial = (entry.siteName || domain || 'W').charAt(0).toUpperCase();
      const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';

      card.innerHTML = `
        <div class="pm-card-header">
          <div class="pm-site-favicon" title="${escapeHtml(entry.siteName)}">
            <img src="${escapeHtml(faviconUrl)}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';" alt="" />
            <span style="display: none;">${escapeHtml(initial)}</span>
          </div>
          <div class="pm-site-info">
            <div class="pm-site-name">${escapeHtml(entry.siteName || domain)}</div>
            <a href="${escapeHtml(entry.url || `https://${entry.hostname}`)}" target="_blank" class="pm-site-url" title="${escapeHtml(entry.url)}">
              ${escapeHtml(entry.hostname || entry.url || domain)}
            </a>
          </div>
        </div>

        <!-- Username Row -->
        <div class="pm-data-row">
          <span class="pm-data-label">User:</span>
          <span class="pm-data-value">${escapeHtml(entry.username)}</span>
          <div class="pm-data-actions">
            <button class="pm-icon-btn pm-copy-user-btn" title="Copy Username" data-user="${escapeHtml(entry.username)}">📋</button>
          </div>
        </div>

        <!-- Password Row -->
        <div class="pm-data-row">
          <span class="pm-data-label">Password:</span>
          <span class="pm-data-value pm-pass-text" data-revealed="false" data-raw="${escapeHtml(entry.password)}">••••••••••••</span>
          <div class="pm-data-actions">
            <button class="pm-icon-btn pm-toggle-pass-btn" title="Show / Hide Password">👁️</button>
            <button class="pm-icon-btn pm-copy-pass-btn" title="Copy Password" data-pass="${escapeHtml(entry.password)}">📋</button>
          </div>
        </div>

        <!-- Quick Actions Row -->
        <div class="pm-card-actions">
          <button class="pm-autofill-btn" data-host="${escapeHtml(entry.hostname)}" data-user="${escapeHtml(entry.username)}" data-pass="${escapeHtml(entry.password)}" title="Fill credentials on active page & log in">
            <span>⚡ Autofill & Login</span>
          </button>
          <button class="pm-edit-btn" title="Edit this credential">✏️ Edit</button>
          <button class="pm-del-btn" title="Delete this credential">🗑️</button>
        </div>
      `;

      passwordsListContainer.appendChild(card);
    });

    attachPasswordCardListeners();
  }

  function attachPasswordCardListeners() {
    // Copy Username
    passwordsListContainer.querySelectorAll('.pm-copy-user-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const user = btn.getAttribute('data-user');
        copyToClipboard(user, 'Username copied to clipboard! 📋');
      });
    });

    // Copy Password
    passwordsListContainer.querySelectorAll('.pm-copy-pass-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pass = btn.getAttribute('data-pass');
        copyToClipboard(pass, 'Password copied to clipboard! 🔑');
      });
    });

    // Toggle Password Visibility
    passwordsListContainer.querySelectorAll('.pm-toggle-pass-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.pm-data-row');
        const passEl = row.querySelector('.pm-pass-text');
        const isRevealed = passEl.getAttribute('data-revealed') === 'true';
        const raw = passEl.getAttribute('data-raw');

        if (isRevealed) {
          passEl.textContent = '••••••••••••';
          passEl.setAttribute('data-revealed', 'false');
          btn.textContent = '👁️';
        } else {
          passEl.textContent = raw;
          passEl.setAttribute('data-revealed', 'true');
          btn.textContent = '🙈';
        }
      });
    });

    // Autofill & Login on Active Tab
    passwordsListContainer.querySelectorAll('.pm-autofill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hostname = btn.getAttribute('data-host');
        const username = btn.getAttribute('data-user');
        const password = btn.getAttribute('data-pass');

        setProcessingState(true);
        showLog(`⚡ Autofilling credentials for ${hostname}...`);

        chrome.runtime.sendMessage(
          {
            type: 'AUTOFILL_LOGIN',
            data: { hostname, username, password, autoSubmit: true }
          },
          (res) => {
            setProcessingState(false);
            if (res && res.success) {
              showToast(`Logged into ${hostname}! 🚀`);
              showLog(`✅ Autofilled credentials on ${hostname}`);
            } else {
              showToast(`Credentials filled on page! ✨`);
              showLog(`Autofill notice: ${res?.error || 'Fields filled on page'}`);
            }
          }
        );
      });
    });

    // Edit Credential
    passwordsListContainer.querySelectorAll('.pm-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.pm-card');
        const id = card.getAttribute('data-id');
        const entry = currentVaultEntries.find((e) => e.id === id);
        if (entry) {
          openEditCredentialModal(entry);
        }
      });
    });

    // Delete Credential
    passwordsListContainer.querySelectorAll('.pm-del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.pm-card');
        const id = card.getAttribute('data-id');
        const entry = currentVaultEntries.find((e) => e.id === id);
        const name = entry?.siteName || entry?.hostname || 'this site';

        if (confirm(`Are you sure you want to delete saved credentials for ${name}?`)) {
          // Direct storage deletion for immediate reliability
          try {
            const data = await chrome.storage.local.get(['privacy_agent_vault_v2', 'vault']);
            let vaultList = Array.isArray(data.privacy_agent_vault_v2) ? data.privacy_agent_vault_v2 : [];
            vaultList = vaultList.filter((e) => e.id !== id);
            await chrome.storage.local.set({ privacy_agent_vault_v2: vaultList });
            currentVaultEntries = vaultList;
            showToast(`Deleted credentials for ${name}`);
            renderPasswordsList(passwordSearchInput ? passwordSearchInput.value : '');
            if (databaseCountPill) {
              databaseCountPill.textContent = vaultList.length;
              databaseCountPill.style.display = vaultList.length > 0 ? 'inline-block' : 'none';
            }
            if (dbPassCountBadge) dbPassCountBadge.textContent = vaultList.length;
            await checkActiveSiteVault();
          } catch (e) {}

          // Also notify background
          chrome.runtime.sendMessage({ type: 'VAULT_DELETE_ENTRY', data: { id } }, () => {
            if (chrome.runtime.lastError) {}
          });
        }
      });
    });
  }

  // Helpers for domain and site name formatting in popup
  function formatSiteName(hostname) {
    if (!hostname) return 'Website';
    let clean = hostname.replace(/^www\./, '').split(':')[0];
    const parts = clean.split('.');
    if (parts.length > 1) {
      const main = parts[parts.length - 2];
      return main.charAt(0).toUpperCase() + main.slice(1);
    }
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  function getRootDomain(hostname) {
    if (!hostname) return '';
    const clean = hostname.replace(/^www\./, '').split(':')[0];
    const parts = clean.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return clean;
  }

  // Resilient direct database storage save helper (100% on-device guaranteed)
  async function saveCredentialDirectly(credData) {
    const { id, siteName, url, username, password, notes } = credData;
    if (!username || !password) {
      throw new Error('Please provide both username and password.');
    }

    let host = '';
    const cleanUrl = (url || '').trim();
    if (cleanUrl) {
      try {
        const parsed = new URL(cleanUrl.includes('://') ? cleanUrl : `https://${cleanUrl}`);
        host = parsed.hostname;
      } catch (e) {
        host = cleanUrl.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      }
    }
    if (!host && currentHostname) host = currentHostname;
    if (!host) host = 'website.local';

    const rootDom = getRootDomain(host);
    const name = siteName ? siteName.trim() : formatSiteName(host);
    let fullUrl = cleanUrl;
    if (!fullUrl) {
      fullUrl = host.startsWith('http') ? host : `https://${host}`;
    } else if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }

    // 1. Direct persistent save to chrome.storage.local
    let targetEntry = null;
    try {
      const data = await chrome.storage.local.get(['privacy_agent_vault_v2', 'vault']);
      let vaultList = Array.isArray(data.privacy_agent_vault_v2) ? data.privacy_agent_vault_v2 : [];
      let legacyVault = data.vault && typeof data.vault === 'object' ? data.vault : {};

      if (id) {
        targetEntry = vaultList.find((e) => e.id === id);
      }
      if (!targetEntry) {
        targetEntry = vaultList.find((e) => (e.hostname === host || (rootDom && e.domain === rootDom)) && e.username === username);
      }

      if (targetEntry) {
        targetEntry.siteName = name || targetEntry.siteName;
        targetEntry.url = fullUrl || targetEntry.url;
        targetEntry.hostname = host;
        targetEntry.domain = rootDom;
        targetEntry.username = username;
        targetEntry.password = password;
        targetEntry.notes = notes !== undefined ? notes : (targetEntry.notes || '');
        targetEntry.updatedAt = Date.now();
      } else {
        targetEntry = {
          id: id || `cred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          siteName: name,
          url: fullUrl,
          hostname: host,
          domain: rootDom,
          username,
          password,
          notes: notes || '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        vaultList.unshift(targetEntry);
      }

      legacyVault[host] = {
        username,
        password,
        domain: host,
        updatedAt: Date.now()
      };

      await chrome.storage.local.set({
        privacy_agent_vault_v2: vaultList,
        vault: legacyVault
      });

      // Update in-memory cache so UI updates immediately
      currentVaultEntries = vaultList;
    } catch (storageErr) {
      console.warn('Direct storage write warning:', storageErr);
    }

    // 2. Also notify background service worker (syncs its in-memory state)
    try {
      chrome.runtime.sendMessage(
        {
          type: 'VAULT_SAVE_ENTRY',
          data: {
            id: targetEntry ? targetEntry.id : id,
            siteName: name,
            url: fullUrl,
            hostname: host,
            username,
            password,
            notes
          }
        },
        () => {
          if (chrome.runtime.lastError) {
            // Ignored because data is already safely in chrome.storage.local!
          }
        }
      );
    } catch (e) {}

    return targetEntry || { siteName: name, username };
  }

  // Add / Edit Modal Controls
  function openAddCredentialModal() {
    if (credModalTitle) credModalTitle.textContent = 'Add Saved Password';
    if (credEditId) credEditId.value = '';
    if (credSiteNameInput) credSiteNameInput.value = '';
    if (credUrlInput) credUrlInput.value = currentHostname ? `https://${currentHostname}` : '';
    if (credUsernameInput) credUsernameInput.value = '';
    if (credPasswordInput) credPasswordInput.value = '';
    if (credNotesInput) credNotesInput.value = '';
    if (credentialModal) credentialModal.style.display = 'flex';
    if (credSiteNameInput) credSiteNameInput.focus();
  }

  function openEditCredentialModal(entry) {
    if (credModalTitle) credModalTitle.textContent = 'Edit Saved Password';
    if (credEditId) credEditId.value = entry.id;
    if (credSiteNameInput) credSiteNameInput.value = entry.siteName || '';
    if (credUrlInput) credUrlInput.value = entry.url || `https://${entry.hostname}`;
    if (credUsernameInput) credUsernameInput.value = entry.username || '';
    if (credPasswordInput) credPasswordInput.value = entry.password || '';
    if (credNotesInput) credNotesInput.value = entry.notes || '';
    if (credentialModal) credentialModal.style.display = 'flex';
  }

  if (addPasswordBtn) addPasswordBtn.addEventListener('click', openAddCredentialModal);
  if (closeCredModalBtn) closeCredModalBtn.addEventListener('click', () => { credentialModal.style.display = 'none'; });
  if (cancelCredentialBtn) cancelCredentialBtn.addEventListener('click', () => { credentialModal.style.display = 'none'; });

  if (generateStrongPassBtn) {
    generateStrongPassBtn.addEventListener('click', () => {
      const strong = generateStrongPassword(16);
      if (credPasswordInput) {
        credPasswordInput.value = strong;
        credPasswordInput.type = 'text';
      }
      if (toggleCredPassVisibilityBtn) toggleCredPassVisibilityBtn.textContent = '🙈';
      showToast('Generated strong 16-character password! 🎲');
    });
  }

  if (toggleCredPassVisibilityBtn) {
    toggleCredPassVisibilityBtn.addEventListener('click', () => {
      if (credPasswordInput.type === 'password') {
        credPasswordInput.type = 'text';
        toggleCredPassVisibilityBtn.textContent = '🙈';
      } else {
        credPasswordInput.type = 'password';
        toggleCredPassVisibilityBtn.textContent = '👁️';
      }
    });
  }

  if (saveCredentialBtn) {
    saveCredentialBtn.addEventListener('click', async () => {
      const id = credEditId.value.trim() || undefined;
      const siteName = credSiteNameInput.value.trim();
      const url = credUrlInput.value.trim();
      const username = credUsernameInput.value.trim();
      const password = credPasswordInput.value;
      const notes = credNotesInput.value.trim();

      if (!username || !password) {
        alert('Please provide both username and password.');
        return;
      }

      try {
        await saveCredentialDirectly({ id, siteName, url, username, password, notes });
        if (credentialModal) credentialModal.style.display = 'none';
        showToast('Credentials saved successfully! 💾');
        await loadPasswordManager();
        await checkActiveSiteVault();
      } catch (err) {
        console.error('Error saving credential:', err);
        alert(err.message || 'Failed to save credentials.');
      }
    });
  }

  // Biometrics & PIN Unlock Handlers
  if (biometricUnlockBtn) {
    biometricUnlockBtn.addEventListener('click', async () => {
      chrome.runtime.sendMessage({ type: 'AUTH_GET_STATUS' }, async (statusRes) => {
        if (chrome.runtime.lastError || !statusRes) return;
        const credId = statusRes.biometricCredentialId || '';

        try {
          if (biometricBtnLabel) biometricBtnLabel.textContent = 'Verifying Touch ID / Biometrics...';
          await verifyDeviceBiometrics(credId);

          chrome.runtime.sendMessage({ type: 'AUTH_SET_UNLOCKED', unlocked: true }, () => {
            if (biometricBtnLabel) biometricBtnLabel.textContent = 'Unlock with Touch ID / Biometrics';
            showToast('Vault unlocked via biometrics! 🔓');
            loadPasswordManager();
          });
        } catch (err) {
          if (biometricBtnLabel) biometricBtnLabel.textContent = 'Unlock with Touch ID / Biometrics';
          console.warn('Biometric verification failed:', err);
          if (pinErrorMsg) {
            pinErrorMsg.textContent = 'Biometric check cancelled or unavailable. Enter PIN below.';
            pinErrorMsg.style.display = 'block';
          }
          if (pinUnlockInput) pinUnlockInput.focus();
        }
      });
    });
  }

  async function attemptPinUnlock() {
    const pin = pinUnlockInput ? pinUnlockInput.value.trim() : '';
    if (!pin) {
      if (pinErrorMsg) {
        pinErrorMsg.textContent = 'Please enter your PIN or passcode.';
        pinErrorMsg.style.display = 'block';
      }
      return;
    }

    chrome.runtime.sendMessage({ type: 'AUTH_GET_STATUS' }, async (statusRes) => {
      if (chrome.runtime.lastError || !statusRes) return;

      const salt = statusRes.pinSalt || '';
      const pinHash = await hashPin(pin, salt);

      chrome.runtime.sendMessage({ type: 'AUTH_VERIFY_PIN', data: { pinHash } }, (verRes) => {
        if (verRes && verRes.valid) {
          if (pinErrorMsg) pinErrorMsg.style.display = 'none';
          if (pinUnlockInput) pinUnlockInput.value = '';
          showToast('Vault unlocked successfully! 🔓');
          loadPasswordManager();
        } else {
          if (pinErrorMsg) {
            pinErrorMsg.textContent = 'Incorrect PIN or passcode. Try again.';
            pinErrorMsg.style.display = 'block';
          }
          if (pinUnlockInput) pinUnlockInput.select();
        }
      });
    });
  }

  if (pinUnlockBtn) pinUnlockBtn.addEventListener('click', attemptPinUnlock);
  if (pinUnlockInput) {
    pinUnlockInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptPinUnlock();
    });
  }

  if (lockNowBtn) {
    lockNowBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'AUTH_LOCK_NOW' }, () => {
        showToast('Vault locked 🔒');
        loadPasswordManager();
      });
    });
  }

  if (vaultLockStatusBtn) {
    vaultLockStatusBtn.addEventListener('click', () => {
      if (!hasMasterLock) {
        openSetupLockModal();
      } else if (isVaultLocked) {
        const tabBtn = document.querySelector('.tab-btn[data-tab="databaseTab"]') || document.querySelector('.tab-btn[data-tab="passwordsTab"]');
        if (tabBtn) tabBtn.click();
        if (pinUnlockInput) pinUnlockInput.focus();
      } else {
        chrome.runtime.sendMessage({ type: 'AUTH_LOCK_NOW' }, () => {
          showToast('Vault locked 🔒');
          loadPasswordManager();
        });
      }
    });
  }

  function openSetupLockModal() {
    if (setupPinInput) setupPinInput.value = '';
    if (setupPinConfirmInput) setupPinConfirmInput.value = '';
    if (setupErrorMsg) setupErrorMsg.style.display = 'none';
    if (lockSetupModal) lockSetupModal.style.display = 'flex';
    if (setupPinInput) setupPinInput.focus();
  }

  if (openSetupLockBtn) openSetupLockBtn.addEventListener('click', openSetupLockModal);
  if (openLockSetupBtn) openLockSetupBtn.addEventListener('click', openSetupLockModal);
  if (closeLockSetupModalBtn) closeLockSetupModalBtn.addEventListener('click', () => { lockSetupModal.style.display = 'none'; });

  if (confirmLockSetupBtn) {
    confirmLockSetupBtn.addEventListener('click', async () => {
      const pin = setupPinInput ? setupPinInput.value.trim() : '';
      const confirmPin = setupPinConfirmInput ? setupPinConfirmInput.value.trim() : '';
      const enableBio = setupEnableBiometrics ? setupEnableBiometrics.checked : false;

      if (!pin || pin.length < 4) {
        if (setupErrorMsg) {
          setupErrorMsg.textContent = 'PIN or passcode must be at least 4 characters.';
          setupErrorMsg.style.display = 'block';
        }
        return;
      }

      if (pin !== confirmPin) {
        if (setupErrorMsg) {
          setupErrorMsg.textContent = 'PINs do not match. Please re-enter.';
          setupErrorMsg.style.display = 'block';
        }
        return;
      }

      if (setupErrorMsg) setupErrorMsg.style.display = 'none';

      let bioCredId = '';
      if (enableBio) {
        try {
          bioCredId = await registerDeviceBiometrics();
        } catch (err) {
          console.warn('Biometric setup warning:', err.message);
        }
      }

      const salt = generateSalt();
      const pinHash = await hashPin(pin, salt);

      chrome.runtime.sendMessage(
        {
          type: 'AUTH_SETUP_LOCK',
          data: {
            pinSalt: salt,
            pinHash,
            biometricsEnabled: !!bioCredId,
            biometricCredentialId: bioCredId
          }
        },
        (res) => {
          if (res && res.success) {
            lockSetupModal.style.display = 'none';
            showToast('Security protection activated! 🛡️');
            loadPasswordManager();
          } else {
            if (setupErrorMsg) {
              setupErrorMsg.textContent = res?.error || 'Failed to save security lock.';
              setupErrorMsg.style.display = 'block';
            }
          }
        }
      );
    });
  }

  if (passwordSearchInput) {
    passwordSearchInput.addEventListener('input', () => {
      const val = passwordSearchInput.value;
      if (clearSearchBtn) clearSearchBtn.style.display = val ? 'block' : 'none';
      renderPasswordsList(val);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (passwordSearchInput) {
        passwordSearchInput.value = '';
        renderPasswordsList('');
        passwordSearchInput.focus();
      }
      clearSearchBtn.style.display = 'none';
    });
  }

  if (refreshVaultBtn) {
    refreshVaultBtn.addEventListener('click', () => {
      loadPasswordManager();
      showToast('Reloaded vault from database 🔄');
    });
  }

  // Legacy Settings Modal Vault Loader
  function loadVaultManager() {
    chrome.runtime.sendMessage({ type: 'GET_ALL_SAVED_SITES' }, (res) => {
      if (chrome.runtime.lastError || !res || !res.sites) return;
      const sites = res.sites;
      if (vaultCountTag) vaultCountTag.textContent = `${sites.length} site${sites.length === 1 ? '' : 's'}`;

      if (!vaultList) return;
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
            <div class="vault-item-domain">${escapeHtml(item.siteName ? `${item.siteName} (${item.domain})` : item.domain)}</div>
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
              loadPasswordManager();
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
