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

        case 'AUTOFILL_AND_LOGIN':
          handleAutofillAndLogin(request, sendResponse);
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

  // --- Auto-Login & Credential Injection ---
  async function handleAutofillAndLogin(data, sendResponse) {
    const { username, password, autoSubmit } = data;
    try {
      const passwordInput = document.querySelector('input[type="password"]');
      if (!passwordInput) {
        sendResponse({ success: false, error: 'Password input not found on page' });
        return;
      }

      // Find username / email field preceding password or in form
      let usernameInput = null;
      const form = passwordInput.closest('form');
      if (form) {
        usernameInput = form.querySelector('input[type="text"], input[type="email"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]');
      }
      if (!usernameInput) {
        const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="password"])'));
        usernameInput = allInputs.find(input => {
          const type = (input.type || '').toLowerCase();
          const name = (input.name || '').toLowerCase();
          const id = (input.id || '').toLowerCase();
          return type === 'email' || type === 'text' || name.includes('user') || name.includes('email') || id.includes('user') || id.includes('email');
        });
      }

      // Fill username
      if (usernameInput && username) {
        setNativeInputValue(usernameInput, username);
        if (actionExecutor) actionExecutor.highlightElement(usernameInput, 'AUTOFILL USER');
      }

      // Fill password
      if (passwordInput && password) {
        setNativeInputValue(passwordInput, password);
        if (actionExecutor) actionExecutor.highlightElement(passwordInput, 'AUTOFILL PASS');
      }

      await new Promise(r => setTimeout(r, 350));

      // Auto-submit if requested
      let submitted = false;
      if (autoSubmit) {
        const submitBtn = (form ? form.querySelector('button[type="submit"], input[type="submit"]') : null)
          || document.querySelector('button[type="submit"], input[type="submit"], button#login-btn, #submit');

        if (submitBtn) {
          if (actionExecutor) {
            await actionExecutor.clickElement(submitBtn.id ? `#${submitBtn.id}` : (submitBtn.className ? `.${submitBtn.className.split(' ')[0]}` : 'button[type="submit"]'));
          } else {
            submitBtn.click();
          }
          submitted = true;
        } else if (form) {
          form.requestSubmit ? form.requestSubmit() : form.submit();
          submitted = true;
        }
      }

      if (actionExecutor) {
        actionExecutor.showFloatingBadge(`🛡️ Logged in with local credentials for ${window.location.hostname}`);
      }

      sendResponse({ success: true, filled: true, submitted });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }

  function setNativeInputValue(el, val) {
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(el, val || '');
    } else {
      el.value = val || '';
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // --- Credential Capture & Save Interceptor ---
  let promptDismissedForSession = false;

  function initLoginInterceptor() {
    document.addEventListener('submit', (e) => {
      captureCredentialsFromForm(e.target);
    }, true);

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button, input[type="submit"], [role="button"]');
      if (!btn) return;
      const text = (btn.textContent || btn.value || '').toLowerCase();
      if (btn.type === 'submit' || text.includes('login') || text.includes('log in') || text.includes('sign in') || text.includes('submit')) {
        const form = btn.closest('form') || document;
        captureCredentialsFromForm(form);
      }
    }, true);
  }

  function captureCredentialsFromForm(root) {
    if (promptDismissedForSession) return;
    try {
      const passwordInput = root.querySelector ? root.querySelector('input[type="password"]') : null;
      if (!passwordInput || !passwordInput.value) return;

      const password = passwordInput.value;
      let username = '';

      const form = passwordInput.closest('form') || root;
      const usernameInput = form.querySelector ? form.querySelector('input[type="email"], input[type="text"], input[name*="user" i], input[name*="login" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]') : null;
      if (usernameInput && usernameInput.value) {
        username = usernameInput.value.trim();
      }

      if (!username || !password) return;

      const hostname = window.location.hostname;
      if (!hostname) return;

      // Ask background if already saved
      chrome.runtime.sendMessage({ type: 'GET_SITE_CREDENTIALS', data: { hostname } }, (res) => {
        if (chrome.runtime.lastError) return;
        const existing = res?.credentials;
        if (existing && existing.username === username && existing.password === password) {
          return;
        }
        showSaveCredentialPrompt(hostname, username, password);
      });
    } catch (err) {
      console.warn('Credential capture warning:', err);
    }
  }

  function showSaveCredentialPrompt(hostname, username, password) {
    if (document.getElementById('privacy-agent-cred-prompt')) return;

    const banner = document.createElement('div');
    banner.id = 'privacy-agent-cred-prompt';
    banner.style.cssText = `
      position: fixed;
      top: 18px;
      right: 18px;
      width: 320px;
      background: #0f172a;
      border: 1px solid #38bdf8;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.25);
      z-index: 2147483647;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      animation: privacyAgentFade 0.3s ease-out;
    `;

    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="font-size: 18px;">🛡️</span>
        <strong style="font-size: 13px; color: #38bdf8;">PrivacyScreen Agent</strong>
      </div>
      <div style="margin-bottom: 6px; font-weight: 500;">
        Save credentials for <span style="color: #60a5fa; font-weight: 600;">${hostname}</span> in local storage?
      </div>
      <div style="font-size: 11.5px; color: #94a3b8; margin-bottom: 12px; background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 6px;">
        User: <b style="color: #f1f5f9;">${username}</b><br/>
        🔒 Stored only in your browser. Never sent to any server.
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="privacy-cred-save-btn" style="flex: 1; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; border: none; border-radius: 6px; padding: 7px 12px; font-weight: 600; font-size: 12px; cursor: pointer;">
          Save
        </button>
        <button id="privacy-cred-dismiss-btn" style="background: rgba(255,255,255,0.08); color: #94a3b8; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px 12px; font-size: 12px; cursor: pointer;">
          Not Now
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('privacy-cred-save-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'SAVE_SITE_CREDENTIALS',
        data: { hostname, username, password }
      }, () => {
        banner.remove();
        if (actionExecutor) {
          actionExecutor.showFloatingBadge(`🛡️ Credentials saved in local storage for ${hostname}`);
        }
      });
    });

    document.getElementById('privacy-cred-dismiss-btn').addEventListener('click', () => {
      promptDismissedForSession = true;
      banner.remove();
    });
  }

  // Initialize login interceptor
  initLoginInterceptor();

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
