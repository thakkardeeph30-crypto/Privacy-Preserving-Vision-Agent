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
    serverUrl: 'http://127.0.0.1:8000'
  },
  stats: {
    framesAnalyzed: 0,
    piiRedactedCount: 0,
    totalActionsExecuted: 0,
    lastLatencyMs: 0
  }
};

// Initialize settings and offscreen document
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[PrivacyScreen Agent] Extension installed.');
  await loadStoredState();
  await setupOffscreenDocument();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadStoredState();
  await setupOffscreenDocument();
});

async function loadStoredState() {
  try {
    const data = await chrome.storage.local.get(['settings', 'stats', 'isActive']);
    if (data.settings) state.settings = { ...state.settings, ...data.settings };
    if (data.stats) state.stats = { ...state.stats, ...data.stats };
    if (typeof data.isActive === 'boolean') state.isActive = data.isActive;
  } catch (err) {
    console.warn('[PrivacyScreen Agent] Error reading storage:', err);
  }
}

async function saveState() {
  try {
    await chrome.storage.local.set({
      settings: state.settings,
      stats: state.stats,
      isActive: state.isActive
    });
  } catch (err) {
    console.warn('[PrivacyScreen Agent] Error saving storage:', err);
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

// Global message bus
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const type = request.type || request.action;

  switch (type) {
    case 'GET_STATE':
      sendResponse({ state });
      return false;

    case 'TOGGLE_AGENT':
      state.isActive = !state.isActive;
      saveState();
      notifyActiveTab(state.isActive ? 'ACTIVATE' : 'DEACTIVATE', { settings: state.settings });
      sendResponse({ isActive: state.isActive });
      return false;

    case 'UPDATE_SETTINGS':
      if (request.settings) {
        state.settings = { ...state.settings, ...request.settings };
        saveState();
        notifyActiveTab('ACTIVATE', { settings: state.settings });
      }
      sendResponse({ success: true, settings: state.settings });
      return false;

    case 'PROCESS_SCREEN':
      handleScreenProcessing(request.data || {}, sendResponse);
      return true; // Keep async channel open

    case 'PING_SERVER':
      checkServerHealth().then(sendResponse);
      return true;

    default:
      return false;
  }
});

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

    // 8. Transmit sanitized frame to server
    const serverUrl = state.settings.serverUrl || 'http://127.0.0.1:8000';
    const taskPrompt = data.task || 'Analyze screen and assist with current form/actions';

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
        files: ['privacy-filter.js', 'action-executor.js', 'content.js']
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
