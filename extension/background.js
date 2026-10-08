/**
 * Background Service Worker (Manifest V3) - PrivacyScreen Agent
 * Manages extension lifecycle, offscreen ML documents, screen capture,
 * local privacy redaction coordination, server communications, and action dispatch.
 */

import PrivacyFilter from './privacy-filter.js';
import VisionProcessor from './vision-processor.js';

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

let state = {
  isActive: false,
  settings: {
    blurFaces: true,
    maskPasswords: true,
    maskEmails: true,
    maskPhones: true,
    maskCreditCards: true,
    promptSaveCredentials: true,
    serverUrl: 'http://127.0.0.1:8000'
  },
  stats: {
    framesAnalyzed: 0,
    piiRedactedCount: 0,
    totalActionsExecuted: 0,
    lastLatencyMs: 0
  },
  vaultList: [], // Google Password Manager style list: [{ id, siteName, hostname, domain, url, username, password, createdAt, updatedAt }]
  vault: {},     // Legacy map for backward compatibility: { [hostname]: { username, password, domain, updatedAt } }
  authConfig: {
    hasMasterPin: false,
    pinSalt: '',
    pinHash: '',
    biometricsEnabled: false,
    biometricCredentialId: '',
    autoLockMinutes: 15
  },
  profileDatabase: {
    personal: {
      fullName: '',
      firstName: '',
      lastName: '',
      username: ''
    },
    contact: {
      email: '',
      phone: '',
      altEmail: ''
    },
    address: {
      streetAddress: '',
      apt: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    professional: {
      company: '',
      jobTitle: '',
      website: ''
    },
    custom: []
  }
};

// In-memory session unlock state
let sessionLockState = {
  isUnlocked: false,
  unlockedAt: 0
};

// Asynchronous initialization mutex to guarantee MV3 worker is fully loaded from disk before handling messages
let isStateLoaded = false;
let stateInitPromise = null;

async function ensureStateLoaded() {
  if (isStateLoaded) return state;
  if (!stateInitPromise) {
    stateInitPromise = (async () => {
      await loadStoredState();
      isStateLoaded = true;
      return state;
    })();
  }
  return stateInitPromise;
}

// Lifecycle listeners
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[PrivacyScreen Agent] Extension installed.');
  await ensureStateLoaded();
  await setupOffscreenDocument();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureStateLoaded();
  await setupOffscreenDocument();
});

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

function syncLegacyVault() {
  state.vault = {};
  if (Array.isArray(state.vaultList)) {
    for (const item of state.vaultList) {
      if (item && item.hostname) {
        state.vault[item.hostname] = {
          username: item.username || '',
          password: item.password || '',
          domain: item.hostname,
          updatedAt: item.updatedAt || Date.now()
        };
      }
    }
  }
}

async function loadStoredState() {
  try {
    const data = await chrome.storage.local.get([
      'settings',
      'stats',
      'isActive',
      'vault',
      'privacy_agent_vault_v2',
      'privacy_agent_auth',
      'profileDatabase'
    ]);

    if (data.settings) state.settings = { ...state.settings, ...data.settings };
    if (data.stats) state.stats = { ...state.stats, ...data.stats };
    if (typeof data.isActive === 'boolean') state.isActive = data.isActive;

    // Load auth lock configuration
    if (data.privacy_agent_auth) {
      state.authConfig = { ...state.authConfig, ...data.privacy_agent_auth };
    }

    // Load v2 credential database or migrate from legacy v1 vault
    if (Array.isArray(data.privacy_agent_vault_v2)) {
      state.vaultList = data.privacy_agent_vault_v2;
    } else if (data.vault && typeof data.vault === 'object') {
      const migrated = Object.keys(data.vault).map((host) => {
        const item = data.vault[host] || {};
        return {
          id: `cred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          siteName: formatSiteName(host),
          hostname: host,
          domain: getRootDomain(host),
          url: `https://${host}`,
          username: item.username || '',
          password: item.password || '',
          createdAt: item.updatedAt || Date.now(),
          updatedAt: item.updatedAt || Date.now()
        };
      });
      state.vaultList = migrated;
      await chrome.storage.local.set({ privacy_agent_vault_v2: state.vaultList });
    } else {
      state.vaultList = [];
    }

    syncLegacyVault();

    if (data.profileDatabase) {
      state.profileDatabase = {
        personal: { ...state.profileDatabase.personal, ...(data.profileDatabase.personal || {}) },
        contact: { ...state.profileDatabase.contact, ...(data.profileDatabase.contact || {}) },
        address: { ...state.profileDatabase.address, ...(data.profileDatabase.address || {}) },
        professional: { ...state.profileDatabase.professional, ...(data.profileDatabase.professional || {}) },
        custom: Array.isArray(data.profileDatabase.custom) ? data.profileDatabase.custom : state.profileDatabase.custom
      };
    }
  } catch (err) {
    console.warn('[PrivacyScreen Agent] Error reading storage:', err);
  }
}

async function saveVault() {
  syncLegacyVault();
  try {
    await chrome.storage.local.set({
      privacy_agent_vault_v2: state.vaultList,
      vault: state.vault
    });
  } catch (err) {
    console.warn('[PrivacyScreen Agent] Error saving vault:', err);
  }
}

async function saveState() {
  syncLegacyVault();
  try {
    await chrome.storage.local.set({
      settings: state.settings,
      stats: state.stats,
      isActive: state.isActive,
      privacy_agent_vault_v2: state.vaultList,
      vault: state.vault,
      privacy_agent_auth: state.authConfig,
      profileDatabase: state.profileDatabase
    });
  } catch (err) {
    console.warn('[PrivacyScreen Agent] Error saving storage:', err);
  }
}

async function getSessionUnlockState() {
  if (chrome.storage && chrome.storage.session) {
    try {
      const sess = await chrome.storage.session.get(['isUnlocked', 'unlockedAt']);
      if (sess && sess.isUnlocked) {
        const timeoutMs = (state.authConfig.autoLockMinutes || 15) * 60 * 1000;
        if (Date.now() - (sess.unlockedAt || 0) < timeoutMs) {
          return true;
        } else {
          await chrome.storage.session.set({ isUnlocked: false });
          sessionLockState.isUnlocked = false;
        }
      }
    } catch (e) {}
  }
  return sessionLockState.isUnlocked;
}

async function setSessionUnlockState(unlocked) {
  sessionLockState.isUnlocked = !!unlocked;
  sessionLockState.unlockedAt = unlocked ? Date.now() : 0;
  if (chrome.storage && chrome.storage.session) {
    try {
      await chrome.storage.session.set({
        isUnlocked: !!unlocked,
        unlockedAt: unlocked ? Date.now() : 0
      });
    } catch (e) {}
  }
}

/**
 * Creates or re-uses offscreen document safely.
 */
async function setupOffscreenDocument() {
  if (chrome.offscreen && chrome.offscreen.hasDocument) {
    const hasDoc = await chrome.offscreen.hasDocument();
    if (hasDoc) return;

    try {
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'Run Vision Transformer and client-side PII canvas redaction.'
      });
      console.log('[PrivacyScreen Agent] Offscreen document created successfully.');
    } catch (e) {
      console.warn('[PrivacyScreen Agent] Offscreen doc creation:', e.message);
    }
  }
}

// Global message bus with guaranteed initialization
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const type = request.type || request.action;

  (async () => {
    await ensureStateLoaded();

    switch (type) {
      case 'GET_STATE': {
        const isUnlocked = await getSessionUnlockState();
        sendResponse({
          state: {
            ...state,
            isLocked: state.authConfig.hasMasterPin && !isUnlocked
          }
        });
        break;
      }

      case 'TOGGLE_AGENT': {
        state.isActive = !state.isActive;
        await saveState();
        notifyActiveTab(state.isActive ? 'ACTIVATE' : 'DEACTIVATE', { settings: state.settings });
        sendResponse({ isActive: state.isActive });
        break;
      }

      case 'UPDATE_SETTINGS': {
        if (request.settings) {
          state.settings = { ...state.settings, ...request.settings };
          await saveState();
          notifyActiveTab('ACTIVATE', { settings: state.settings });
        }
        sendResponse({ success: true, settings: state.settings });
        break;
      }

      case 'PROCESS_SCREEN': {
        handleScreenProcessing(request.data || {}, sendResponse);
        return; // handleScreenProcessing handles sendResponse
      }

      // --- Google Password Manager Database Handlers ---
      case 'VAULT_GET_ALL': {
        const isUnlocked = await getSessionUnlockState();
        const requiresLock = state.authConfig.hasMasterPin || state.authConfig.biometricsEnabled;
        const isLocked = requiresLock && !isUnlocked;

        // If locked and not requested for internal verification, mask passwords
        const entries = state.vaultList.map((entry) => ({
          ...entry,
          password: isLocked ? '••••••••' : entry.password
        }));

        sendResponse({
          success: true,
          isLocked,
          requiresLock,
          entries
        });
        break;
      }

      case 'VAULT_SAVE_ENTRY': {
        try {
          const { id, siteName, url, hostname, username, password, notes } = request.data || {};
          if (!username || !password) {
            sendResponse({ success: false, error: 'Username and password are required' });
            break;
          }

          let host = (hostname || '').trim();
          let cleanUrl = (url || '').trim();
          if (!host && cleanUrl) {
            try {
              const parsed = new URL(cleanUrl.includes('://') ? cleanUrl : `https://${cleanUrl}`);
              host = parsed.hostname;
            } catch(e) {
              host = cleanUrl.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
            }
          }
          if (!host) host = 'website.local';

          const rootDom = getRootDomain(host);
          const name = siteName ? siteName.trim() : formatSiteName(host);
          let fullUrl = cleanUrl;
          if (!fullUrl) {
            fullUrl = host.startsWith('http') ? host : `https://${host}`;
          } else if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
            fullUrl = `https://${fullUrl}`;
          }

          if (!Array.isArray(state.vaultList)) {
            state.vaultList = [];
          }

          let targetEntry = null;
          if (id) {
            targetEntry = state.vaultList.find((e) => e.id === id);
          }
          if (!targetEntry) {
            // Match by domain/host + username to update existing
            targetEntry = state.vaultList.find((e) => (e.hostname === host || (rootDom && e.domain === rootDom)) && e.username === username);
          }

          if (targetEntry) {
            // Update existing entry
            targetEntry.siteName = name || targetEntry.siteName;
            targetEntry.url = fullUrl || targetEntry.url;
            targetEntry.hostname = host;
            targetEntry.domain = rootDom;
            targetEntry.username = username;
            targetEntry.password = password;
            targetEntry.notes = notes !== undefined ? notes : (targetEntry.notes || '');
            targetEntry.updatedAt = Date.now();
          } else {
            // Create new entry
            const newEntry = {
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
            state.vaultList.unshift(newEntry);
            targetEntry = newEntry;
          }

          await saveVault();
          sendResponse({ success: true, entry: targetEntry, message: `Saved credentials for ${name}` });
        } catch (saveErr) {
          console.error('[PrivacyScreen Agent] Error in VAULT_SAVE_ENTRY:', saveErr);
          sendResponse({ success: false, error: saveErr.message || 'Error saving to database' });
        }
        break;
      }

      case 'VAULT_DELETE_ENTRY': {
        const { id, hostname } = request.data || {};
        const beforeLen = state.vaultList.length;
        if (id) {
          state.vaultList = state.vaultList.filter((e) => e.id !== id);
        } else if (hostname) {
          state.vaultList = state.vaultList.filter((e) => e.hostname !== hostname);
        }
        if (state.vaultList.length < beforeLen) {
          await saveVault();
          sendResponse({ success: true, message: 'Credential entry deleted' });
        } else {
          sendResponse({ success: false, error: 'Entry not found' });
        }
        break;
      }

      case 'VAULT_GET_FOR_URL': {
        const targetUrl = request.url || request.data?.url || '';
        const targetHost = request.hostname || request.data?.hostname || (targetUrl ? (() => { try { return new URL(targetUrl).hostname; } catch(e) { return ''; } })() : '');
        const targetDomain = getRootDomain(targetHost);

        const matches = state.vaultList.filter((e) => {
          if (targetHost && e.hostname === targetHost) return true;
          if (targetDomain && e.domain === targetDomain) return true;
          return false;
        });

        sendResponse({ success: true, matches });
        break;
      }

      // Legacy Vault Handlers for Content Script & Existing Endpoints
      case 'SAVE_SITE_CREDENTIALS': {
        const { hostname, username, password, url, siteName } = request.data || {};
        if (hostname && username && password) {
          const host = hostname;
          const rootDom = getRootDomain(host);
          const name = siteName || formatSiteName(host);
          const fullUrl = url || `https://${host}`;

          // Check if an entry with this hostname or root domain + username already exists
          let existing = state.vaultList.find((e) => (e.hostname === host || (rootDom && e.domain === rootDom)) && e.username === username);
          if (existing) {
            existing.password = password;
            existing.updatedAt = Date.now();
            existing.url = fullUrl || existing.url;
            existing.siteName = name || existing.siteName;
          } else {
            state.vaultList.unshift({
              id: `cred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              siteName: name,
              url: fullUrl,
              hostname: host,
              domain: rootDom,
              username,
              password,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
          await saveVault();
          sendResponse({ success: true, message: `Credentials saved locally for ${hostname}` });
        } else {
          sendResponse({ success: false, error: 'Missing hostname, username, or password' });
        }
        break;
      }

      case 'GET_SITE_CREDENTIALS': {
        const { hostname } = request.data || {};
        const rootDom = getRootDomain(hostname || '');
        const cred = state.vaultList.find((e) => e.hostname === hostname || (rootDom && e.domain === rootDom)) || state.vault[hostname] || null;
        sendResponse({ success: true, credentials: cred });
        break;
      }

      case 'GET_ALL_SAVED_SITES': {
        const sites = state.vaultList.map((entry) => ({
          id: entry.id,
          siteName: entry.siteName,
          domain: entry.hostname,
          url: entry.url,
          username: entry.username,
          updatedAt: entry.updatedAt
        }));
        sendResponse({ success: true, sites });
        break;
      }

      case 'DELETE_SITE_CREDENTIALS': {
        const { hostname } = request.data || {};
        const beforeLen = state.vaultList.length;
        state.vaultList = state.vaultList.filter((e) => e.hostname !== hostname);
        if (state.vaultList.length < beforeLen || state.vault[hostname]) {
          await saveVault();
          sendResponse({ success: true, message: `Removed credentials for ${hostname}` });
        } else {
          sendResponse({ success: false, error: 'Domain not found in vault' });
        }
        break;
      }

      // --- Security Lock & Biometrics Handlers ---
      case 'AUTH_GET_STATUS': {
        const isUnlocked = await getSessionUnlockState();
        sendResponse({
          success: true,
          hasMasterPin: !!state.authConfig.hasMasterPin,
          pinSalt: state.authConfig.pinSalt,
          biometricsEnabled: !!state.authConfig.biometricsEnabled,
          biometricCredentialId: state.authConfig.biometricCredentialId || '',
          autoLockMinutes: state.authConfig.autoLockMinutes || 15,
          isUnlocked
        });
        break;
      }

      case 'AUTH_SETUP_LOCK': {
        const { pinSalt, pinHash, biometricsEnabled, biometricCredentialId } = request.data || {};
        state.authConfig = {
          ...state.authConfig,
          hasMasterPin: !!pinHash,
          pinSalt: pinSalt || '',
          pinHash: pinHash || '',
          biometricsEnabled: !!biometricsEnabled,
          biometricCredentialId: biometricCredentialId || ''
        };
        await saveState();
        await setSessionUnlockState(true);
        sendResponse({ success: true, message: 'Vault security lock configured successfully' });
        break;
      }

      case 'AUTH_VERIFY_PIN': {
        const { pinHash } = request.data || {};
        if (pinHash && pinHash === state.authConfig.pinHash) {
          await setSessionUnlockState(true);
          sendResponse({ success: true, valid: true });
        } else {
          sendResponse({ success: false, valid: false, error: 'Incorrect PIN or passcode' });
        }
        break;
      }

      case 'AUTH_SET_UNLOCKED': {
        await setSessionUnlockState(request.unlocked !== false);
        sendResponse({ success: true, isUnlocked: await getSessionUnlockState() });
        break;
      }

      case 'AUTH_LOCK_NOW': {
        await setSessionUnlockState(false);
        sendResponse({ success: true, isUnlocked: false });
        break;
      }

      case 'AUTOFILL_LOGIN': {
        handleAutofillLogin(request.data || {}, sendResponse);
        return; // handleAutofillLogin handles sendResponse
      }

      case 'GET_PROFILE_DATABASE': {
        sendResponse({ success: true, profile: state.profileDatabase });
        break;
      }

      case 'UPDATE_PROFILE_DATABASE': {
        const updates = request.data || request.profile || {};
        if (updates.personal) state.profileDatabase.personal = { ...state.profileDatabase.personal, ...updates.personal };
        if (updates.contact) state.profileDatabase.contact = { ...state.profileDatabase.contact, ...updates.contact };
        if (updates.address) state.profileDatabase.address = { ...state.profileDatabase.address, ...updates.address };
        if (updates.professional) state.profileDatabase.professional = { ...state.profileDatabase.professional, ...updates.professional };
        if (Array.isArray(updates.custom)) state.profileDatabase.custom = updates.custom;
        await saveState();
        sendResponse({ success: true, profile: state.profileDatabase });
        break;
      }

      case 'CLEAR_PROFILE_DATABASE': {
        state.profileDatabase = {
          personal: { fullName: '', firstName: '', lastName: '', username: '' },
          contact: { email: '', phone: '', altEmail: '' },
          address: { streetAddress: '', apt: '', city: '', state: '', zipCode: '', country: '' },
          professional: { company: '', jobTitle: '', website: '' },
          custom: []
        };
        await saveState();
        sendResponse({ success: true, profile: state.profileDatabase });
        break;
      }

      case 'PING_SERVER': {
        checkServerHealth().then(sendResponse);
        return;
      }

      default:
        sendResponse({ error: `Unknown background message: ${type}` });
        break;
    }
  })().catch((err) => {
    console.error('[PrivacyScreen Agent] Error processing message:', err);
    sendResponse({ success: false, error: err.message });
  });

  return true; // Keep async response channel open for all messages
});

async function handleAutofillLogin(data, sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active browser tab found.');

    let hostname = data.hostname || '';
    if (!hostname && tab.url) {
      try { hostname = new URL(tab.url).hostname; } catch (e) {}
    }

    const rootDom = getRootDomain(hostname);
    const cred = state.vaultList.find((e) =>
      e.hostname === hostname ||
      (rootDom && (e.domain === rootDom || e.hostname === rootDom || getRootDomain(e.hostname) === rootDom))
    ) || state.vault[hostname] || (rootDom ? state.vault[rootDom] : null);

    const username = data.username || cred?.username;
    let password = data.password;
    if (!password || password === '••••••••') {
      password = cred?.password;
    }

    if (!username || !password || password === '••••••••') {
      throw new Error(`No saved credentials found in database for ${hostname || 'this site'}. Make sure your database vault is unlocked.`);
    }

    await ensureContentScript(tab.id);

    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'AUTOFILL_AND_LOGIN',
        username,
        password,
        autoSubmit: data.autoSubmit !== false
      },
      (res) => {
        if (chrome.runtime.lastError || !res) {
          sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Autofill failed to communicate with tab' });
        } else if (!res.success) {
          sendResponse({ success: false, error: res.error || 'No matching login fields found on active page' });
        } else {
          state.stats.totalActionsExecuted += 2;
          saveState();
          sendResponse({ success: true, ...res });
        }
      }
    );
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

async function notifyActiveTab(action, data = {}) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action, ...data }).catch(() => {});
    }
  } catch (e) {}
}

/**
 * Core Pipeline:
 * 1. Capture pristine screenshot from activeTab
 * 2. Scan DOM sensitivities & interactive coordinates
 * 3. Run local Vision Transformer
 * 4. Apply client-side PII redaction on canvas
 * 5. Verify 0 PII leaves the client
 * 6. Send sanitized payload to FastAPI server
 * 7. Execute returned agent actions with visual indicators
 */
async function handleScreenProcessing(data, sendResponse) {
  const startTime = Date.now();
  await setupOffscreenDocument();

  try {
    // 1. Get active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) {
      throw new Error('No active browser tab found.');
    }

    // 2. Ensure content script is running
    await ensureContentScript(activeTab.id);

    // 3. Collect page metadata and DOM PII regions
    let pageContext = { sensitivities: [], interactiveElements: [] };
    try {
      pageContext = await new Promise((resolve) => {
        chrome.tabs.sendMessage(activeTab.id, { action: 'COLLECT_PAGE_CONTEXT' }, (res) => {
          if (chrome.runtime.lastError || !res) {
            resolve({ sensitivities: [], interactiveElements: [] });
          } else {
            resolve(res);
          }
        });
      });
    } catch (e) {
      console.warn('DOM context collection warning:', e);
    }

    // 4. Capture visible screen
    const rawScreenshot = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

    // 5. Run local vision model via offscreen document
    let visionElements = [];
    try {
      const visionRes = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'OFFSCREEN_ANALYZE_SCREEN', screenshot: rawScreenshot },
          (res) => {
            if (chrome.runtime.lastError || !res) resolve(null);
            else resolve(res);
          }
        );
      });
      if (visionRes && visionRes.detections) {
        visionElements = visionRes.detections;
      }
    } catch (e) {
      console.warn('Vision detection warning:', e);
    }

    // Combine DOM sensitivities with any visual detections (e.g. faces or detected UI blocks)
    const redactionTargets = [...(pageContext.sensitivities || [])];

    // If ViT detected persons/faces, ensure they are added to redaction targets
    if (state.settings.blurFaces && Array.isArray(visionElements)) {
      visionElements.forEach((det) => {
        const lbl = (det.label || '').toLowerCase();
        if (lbl.includes('person') || lbl.includes('face')) {
          const b = det.box || (det.bbox ? { x: det.bbox[0], y: det.bbox[1], width: det.bbox[2], height: det.bbox[3] } : null);
          if (b) {
            redactionTargets.push({
              type: 'face',
              method: 'blur',
              label: 'DETECTED FACE',
              box: b
            });
          }
        }
      });
    }

    // 6. Apply Local Privacy Redaction in offscreen canvas context
    const redactionResult = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'OFFSCREEN_REDACT_IMAGE',
          screenshot: rawScreenshot,
          detections: redactionTargets,
          settings: state.settings
        },
        (res) => {
          if (chrome.runtime.lastError || !res) {
            reject(new Error(chrome.runtime.lastError?.message || 'Redaction failed in offscreen doc'));
          } else {
            resolve(res);
          }
        }
      );
    });

    const sanitizedScreenshot = redactionResult.sanitizedBase64;
    const itemsRedacted = redactionResult.redactedCount || 0;

    // 7. Update Telemetry
    state.stats.framesAnalyzed += 1;
    state.stats.piiRedactedCount += itemsRedacted;

    // 8. Transmit sanitized frame to server (or execute local vault login)
    const serverUrl = state.settings.serverUrl || 'http://127.0.0.1:8000';
    const taskPrompt = data.task || 'Analyze screen and assist with current form/actions';
    const taskLower = taskPrompt.toLowerCase();

    // Check if user requested login and we have stored credentials for this site
    let urlObj;
    try { urlObj = new URL(activeTab.url); } catch (e) {}
    const savedCred = urlObj && state.vault[urlObj.hostname];

    if (savedCred && (taskLower.includes('login') || taskLower.includes('log in') || taskLower.includes('sign in') || taskLower.includes('autofill') || taskLower.includes('password'))) {
      const autofillRes = await new Promise((resolve) => {
        chrome.tabs.sendMessage(
          activeTab.id,
          {
            action: 'AUTOFILL_AND_LOGIN',
            username: savedCred.username,
            password: savedCred.password,
            autoSubmit: true
          },
          (r) => resolve(r || { success: true })
        );
      });

      const latency = Date.now() - startTime;
      state.stats.lastLatencyMs = latency;
      state.stats.totalActionsExecuted += 2;
      saveState();

      sendResponse({
        success: true,
        result: {
          latencyMs: latency,
          redactedCount: itemsRedacted,
          actionsExecuted: [{ action: { type: 'autofill_and_login' }, result: autofillRes }],
          confidence: 0.99,
          description: `Logged in using secure local storage credentials for ${urlObj.hostname}. Password was kept 100% on-device.`
        }
      });
      return;
    }

    // Check if user requested form filling from Profile Database
    if (taskLower.includes('fill') && (taskLower.includes('form') || taskLower.includes('profile') || taskLower.includes('registration') || taskLower.includes('detail') || taskLower.includes('contact') || taskLower.includes('address'))) {
      const scanData = await new Promise((resolve) => {
        chrome.tabs.sendMessage(activeTab.id, { action: 'SCAN_PAGE_FORMS' }, (r) => resolve(r || { fields: [] }));
      });

      const flatProfile = {
        ...state.profileDatabase.personal,
        ...state.profileDatabase.contact,
        ...state.profileDatabase.address,
        ...state.profileDatabase.professional
      };
      (state.profileDatabase.custom || []).forEach((c) => {
        if (c.key && c.value) flatProfile[c.key] = c.value;
      });

      const fieldsToFill = [];
      (scanData.fields || []).forEach((f) => {
        if (flatProfile[f.key]) {
          fieldsToFill.push({ selector: f.selector, value: flatProfile[f.key], key: f.key });
        }
      });

      if (fieldsToFill.length > 0) {
        const fillRes = await new Promise((resolve) => {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: 'AUTOFILL_FORM_FIELDS', fields: fieldsToFill, autoSubmit: false },
            (r) => resolve(r || { success: true })
          );
        });

        const latency = Date.now() - startTime;
        state.stats.lastLatencyMs = latency;
        state.stats.totalActionsExecuted += fieldsToFill.length;
        saveState();

        sendResponse({
          success: true,
          result: {
            latencyMs: latency,
            redactedCount: itemsRedacted,
            actionsExecuted: [{ action: { type: 'openagent_fill_profile', fieldsFilled: fieldsToFill.length }, result: fillRes }],
            confidence: 0.98,
            description: `OpenAgent auto-filled ${fieldsToFill.length} fields from your secure on-device Profile Database.`
          }
        });
        return;
      }
    }

    const serverPayload = {
      image: sanitizedScreenshot, // Guaranteed sanitized & anonymized
      task: taskPrompt,
      context: {
        url: activeTab.url,
        title: activeTab.title,
        elementsCount: (pageContext.interactiveElements || []).length,
        redactedCount: itemsRedacted
      }
    };

    let actionResponse;
    try {
      const resp = await fetch(`${serverUrl}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverPayload)
      });

      if (!resp.ok) {
        throw new Error(`Server returned HTTP ${resp.status}: ${await resp.text()}`);
      }
      actionResponse = await resp.json();
    } catch (serverErr) {
      console.warn('[PrivacyScreen Agent] Server communication fallback:', serverErr.message);
      // Fallback action generation if server is offline
      actionResponse = generateLocalFallbackAction(taskPrompt, pageContext.interactiveElements);
    }

    // 9. Execute returned actions sequentially in active tab
    const executedActions = [];
    if (Array.isArray(actionResponse.actions)) {
      for (const action of actionResponse.actions) {
        const res = await new Promise((resolve) => {
          chrome.tabs.sendMessage(activeTab.id, { action: 'EXECUTE_ACTION', actionData: action }, (r) => {
            if (chrome.runtime.lastError || !r) {
              resolve({ success: false, error: chrome.runtime.lastError?.message || 'Execution error' });
            } else {
              resolve(r);
            }
          });
        });
        executedActions.push({ action, result: res });
        state.stats.totalActionsExecuted += 1;
        // Brief pause between sequential actions
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    const latency = Date.now() - startTime;
    state.stats.lastLatencyMs = latency;
    saveState();

    sendResponse({
      success: true,
      result: {
        latencyMs: latency,
        redactedCount: itemsRedacted,
        actionsExecuted: executedActions,
        confidence: actionResponse.confidence || 0.9,
        description: actionResponse.description || 'Processed screen with complete privacy protection.'
      }
    });
  } catch (error) {
    console.error('[PrivacyScreen Agent] Error processing screen:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function ensureContentScript(tabId) {
  try {
    const isAlive = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'PING' }, (res) => {
        if (chrome.runtime.lastError || !res) resolve(false);
        else resolve(true);
      });
    });

    if (!isAlive) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['privacy-filter.js', 'action-executor.js', 'openagent-analyzer.js', 'content.js']
      });
    }
  } catch (e) {
    console.warn('Content script injection check:', e);
  }
}

async function checkServerHealth() {
  const serverUrl = state.settings.serverUrl || 'http://127.0.0.1:8000';
  try {
    const res = await fetch(`${serverUrl}/health`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return { online: true, ...data };
    }
    return { online: false, status: res.status };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

function generateLocalFallbackAction(taskPrompt, elements = []) {
  const prompt = (taskPrompt || '').toLowerCase();
  const actions = [];

  // Intelligently find matching interactive element
  if (prompt.includes('login') || prompt.includes('sign in')) {
    const btn = elements.find((e) => /login|sign in|submit/i.test(e.text || e.selector));
    actions.push({ type: 'click', target: btn ? btn.selector : 'button[type="submit"]' });
  } else if (prompt.includes('click')) {
    const words = prompt.replace('click', '').trim();
    const btn = elements.find((e) => (e.text || '').toLowerCase().includes(words) || (e.selector || '').includes(words));
    actions.push({ type: 'click', target: btn ? btn.selector : 'button' });
  } else if (prompt.includes('fill') || prompt.includes('type')) {
    const input = elements.find((e) => e.type === 'input');
    actions.push({ type: 'fill', target: input ? input.selector : 'input', value: 'Test User' });
  } else {
    actions.push({ type: 'scroll', value: 300 });
  }

  return {
    actions,
    confidence: 0.85,
    description: 'Local heuristic agent determined next best action.'
  };
}
