/**
 * Popup Script - PrivacyScreen Agent
 * Controls agent activation, privacy filter parameters, task execution,
 * and live telemetry dashboard.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
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

  // 1. Load initial state
  await refreshState();
  await checkServerStatus();
  await checkModelStatus();

  // 2. Toggle Agent Active/Inactive
  toggleBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_AGENT' }, (res) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      updateUIState(res.isActive);
    });
  });

  // 3. Privacy Settings Toggles
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

  // 4. Quick Task Chips
  document.querySelectorAll('.chip-btn').forEach((chip) => {
    chip.addEventListener('click', () => {
      taskInput.value = chip.getAttribute('data-task');
      triggerTaskExecution();
    });
  });

  // 5. Run Task / Process Screen
  runTaskBtn.addEventListener('click', triggerTaskExecution);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerTaskExecution();
  });

  async function triggerTaskExecution() {
    const task = (taskInput.value || '').trim();
    if (!task) return;

    setProcessingState(true);
    showLog(`Analyzing screen & redacting PII for task: "${task}"...`);

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
      showLog(`✅ Success (${res.latencyMs}ms): Redacted ${res.redactedCount} items. ${res.actionsExecuted?.length || 0} actions run.`);
      refreshState();
    });
  }

  // 6. Direct DOM Masking
  maskDomBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_DOM_REDACTION' }, (res) => {
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

  // 7. Advanced Modal
  settingsBtn.addEventListener('click', () => {
    advancedModal.style.display = 'flex';
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

  // --- Helper Functions ---
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
});
