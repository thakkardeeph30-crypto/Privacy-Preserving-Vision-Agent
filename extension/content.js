/**
 * Content Script - PrivacyScreen Agent
 * Runs in the context of the active web page.
 * Scans DOM elements, reports sensitive coordinates to the background worker,
 * and executes visual agent interactions.
 */

(() => {
  // Prevent double injection
  if (window.__privacyScreenAgentLoaded) return;
  window.__privacyScreenAgentLoaded = true;

  let isAgentActive = false;
  let PrivacyFilterClass = window.PrivacyFilter || null;
  let ActionExecutorClass = window.ActionExecutor || null;
  let privacyFilter = PrivacyFilterClass ? new PrivacyFilterClass() : null;
  let actionExecutor = ActionExecutorClass ? new ActionExecutorClass() : null;

  async function ensureModules() {
    if (!privacyFilter) {
      try {
        const mod = await import(chrome.runtime.getURL('privacy-filter.js'));
        PrivacyFilterClass = mod.default || mod.PrivacyFilter || window.PrivacyFilter;
        privacyFilter = new PrivacyFilterClass();
      } catch (e) {
        if (window.PrivacyFilter) {
          PrivacyFilterClass = window.PrivacyFilter;
          privacyFilter = new PrivacyFilterClass();
        }
      }
    }
    if (!actionExecutor) {
      try {
        const mod = await import(chrome.runtime.getURL('action-executor.js'));
        ActionExecutorClass = mod.default || mod.ActionExecutor || window.ActionExecutor;
        actionExecutor = new ActionExecutorClass();
      } catch (e) {
        if (window.ActionExecutor) {
          ActionExecutorClass = window.ActionExecutor;
          actionExecutor = new ActionExecutorClass();
        }
      }
    }
  }

  // Pre-load modules
  ensureModules();

  // Listen for messages from popup or background service worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action || request.type;

    (async () => {
      await ensureModules();

      switch (action) {
        case 'PING':
          sendResponse({ status: 'ok', active: isAgentActive });
          break;

        case 'ACTIVATE':
          isAgentActive = true;
          if (request.settings && PrivacyFilterClass) {
            privacyFilter = new PrivacyFilterClass(request.settings);
          }
          if (actionExecutor) {
            actionExecutor.showFloatingBadge('🛡️ PrivacyScreen Agent Activated');
          }
          sendResponse({ status: 'activated' });
          break;

        case 'DEACTIVATE':
          isAgentActive = false;
          if (actionExecutor) {
            actionExecutor.showFloatingBadge('🛑 PrivacyScreen Agent Deactivated');
          }
          sendResponse({ status: 'deactivated' });
          break;

        case 'COLLECT_PAGE_CONTEXT': {
          const sensitivities = privacyFilter ? privacyFilter.detectDOMSensitivities(document) : [];
          const interactiveElements = getInteractiveElements();
          sendResponse({
            url: window.location.href,
            title: document.title,
            devicePixelRatio: window.devicePixelRatio || 1,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
              scrollX: window.scrollX,
              scrollY: window.scrollY
            },
            sensitivities,
            interactiveElements
          });
          break;
        }

        case 'APPLY_DOM_REDACTION': {
          const maskedCount = privacyFilter ? privacyFilter.redactDOM(document) : 0;
          if (actionExecutor) {
            actionExecutor.showFloatingBadge(`🛡️ Masked ${maskedCount} PII fields in DOM`);
          }
          sendResponse({ success: true, maskedCount });
          break;
        }

        case 'EXECUTE_ACTION':
          handleExecuteAction(request.actionData || request.data, sendResponse);
          break;

        default:
          sendResponse({ error: `Unknown action: ${action}` });
          break;
      }
    })();

    return true; // Keep channel open for async execution
  });

  async function handleExecuteAction(actionData, sendResponse) {
    try {
      const result = await actionExecutor.execute(actionData);
      sendResponse(result);
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }

  /**
   * Scans document for interactive components to assist vision grounding.
   */
  function getInteractiveElements() {
    const dpr = window.devicePixelRatio || 1;
    const elements = [];
    const candidates = document.querySelectorAll(
      'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="tab"], [tabindex]:not([tabindex="-1"])'
    );

    candidates.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Only include visible elements in viewport
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      ) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          const text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim();
          elements.push({
            type: el.tagName.toLowerCase(),
            selector: privacyFilter.getElementSelector(el),
            text: text.slice(0, 100),
            bbox: [
              Math.round(rect.left * dpr),
              Math.round(rect.top * dpr),
              Math.round(rect.width * dpr),
              Math.round(rect.height * dpr)
            ],
            attributes: {
              id: el.id || null,
              name: el.getAttribute('name') || null,
              placeholder: el.getAttribute('placeholder') || null,
              type: el.getAttribute('type') || null
            }
          });
        }
      }
    });

    return elements;
  }
})();
