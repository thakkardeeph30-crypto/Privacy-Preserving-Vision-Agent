/**
 * ActionExecutor - Reliable Browser Action Runner
 * Executes simulated agent clicks, fills, and scrolls with visual glow indicators
 * and support for modern reactive frameworks (React, Vue, Svelte).
 */
class ActionExecutor {
  constructor() {
    this.overlayContainer = null;
    this.ensureOverlay();
  }

  ensureOverlay() {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('privacy-agent-indicator-overlay');
    if (!container) {
      container = document.createElement('div');
      container.id = 'privacy-agent-indicator-overlay';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483647;
      `;
      document.documentElement.appendChild(container);
    }
    this.overlayContainer = container;
  }

  /**
   * Executes a structured action object.
   * @param {Object} action - { type, target, value, selector, coordinates }
   * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
   */
  async execute(action) {
    if (!action || !action.type) {
      return { success: false, error: 'Invalid action payload' };
    }

    const type = action.type.toLowerCase();
    const selector = action.target || action.selector;
    const value = action.value;

    try {
      switch (type) {
        case 'click':
          return await this.clickElement(selector, action.coordinates);
        case 'fill':
        case 'type':
          return await this.fillElement(selector, value);
        case 'scroll':
          return await this.scrollPage(value || 300);
        case 'hover':
          return await this.hoverElement(selector);
        case 'press_key':
          return await this.pressKey(selector, value || 'Enter');
        case 'wait':
          await new Promise((r) => setTimeout(r, value || 1000));
          return { success: true, message: `Waited ${value || 1000}ms` };
        default:
          return { success: false, error: `Unsupported action type: ${type}` };
      }
    } catch (err) {
      console.error('Action execution failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Resolves target element using selector, text search, or fuzzy match.
   */
  resolveElement(selector) {
    if (!selector) return null;
    let el = null;

    // 1. Direct CSS Selector
    try {
      el = document.querySelector(selector);
      if (el) return el;
    } catch (e) {
      // Invalid selector syntax, fallback to heuristic
    }

    // 2. ID match
    const cleanSel = selector.replace(/^[#.]/, '');
    el = document.getElementById(cleanSel);
    if (el) return el;

    // 3. Name or attribute match
    el = document.querySelector(`[name="${cleanSel}"], [placeholder*="${cleanSel}" i], [aria-label*="${cleanSel}" i]`);
    if (el) return el;

    // 4. Text content match for buttons / links
    const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"], [role="button"]'));
    const matchedBtn = buttons.find((b) => {
      const txt = (b.textContent || b.value || '').trim().toLowerCase();
      return txt === cleanSel.toLowerCase() || txt.includes(cleanSel.toLowerCase());
    });
    if (matchedBtn) return matchedBtn;

    return null;
  }

  /**
   * Clicks an element with visual highlight and full event dispatching.
   */
  async clickElement(selector, coordinates) {
    let el = this.resolveElement(selector);

    if (!el && coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      el = document.elementFromPoint(coordinates[0], coordinates[1]);
    }

    if (!el) {
      return { success: false, error: `Element not found for click: "${selector}"` };
    }

    // Scroll into view smoothly
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise((r) => setTimeout(r, 200));

    // Show visual indicator
    this.highlightElement(el, 'CLICK');

    // Dispatch synthetic mouse sequence
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const eventOpts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: cx,
      clientY: cy
    };

    el.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
    el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
    el.focus();
    el.dispatchEvent(new PointerEvent('pointerup', eventOpts));
    el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
    el.click();

    return {
      success: true,
      message: `Clicked element: ${selector || el.tagName.toLowerCase()}`
    };
  }

  /**
   * Fills an input or textarea with modern reactive framework support.
   */
  async fillElement(selector, value) {
    const el = this.resolveElement(selector);
    if (!el) {
      return { success: false, error: `Element not found for fill: "${selector}"` };
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise((r) => setTimeout(r, 200));

    this.highlightElement(el, 'FILL');

    el.focus();

    // React/Vue setter hook bypass to update virtual DOM state
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (el instanceof HTMLTextAreaElement && nativeTextAreaSetter) {
      nativeTextAreaSetter.call(el, value || '');
    } else if (el instanceof HTMLInputElement && nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value || '');
    } else {
      el.value = value || '';
    }

    // Dispatch input & change events
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      success: true,
      message: `Filled value into ${selector || el.tagName.toLowerCase()}`
    };
  }

  /**
   * Scrolls the page smoothly.
   */
  async scrollPage(deltaY) {
    window.scrollBy({
      top: deltaY,
      behavior: 'smooth'
    });
    this.showFloatingBadge(`📜 Scrolling ${deltaY > 0 ? 'down' : 'up'} ${Math.abs(deltaY)}px`);
    return { success: true, message: `Scrolled ${deltaY}px` };
  }

  /**
   * Hovers over an element.
   */
  async hoverElement(selector) {
    const el = this.resolveElement(selector);
    if (!el) return { success: false, error: `Element not found: ${selector}` };
    this.highlightElement(el, 'HOVER');
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return { success: true, message: `Hovered over ${selector}` };
  }

  /**
   * Presses a keyboard key on the target element.
   */
  async pressKey(selector, key) {
    const el = this.resolveElement(selector) || document.activeElement || document.body;
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keypress', { key, bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    return { success: true, message: `Pressed ${key}` };
  }

  /**
   * Displays an animated glowing halo and label above the targeted element.
   */
  highlightElement(el, actionLabel = 'ACTION') {
    this.ensureOverlay();
    if (!el || !this.overlayContainer) return;

    const rect = el.getBoundingClientRect();
    const halo = document.createElement('div');

    halo.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY - 4}px;
      left: ${rect.left + window.scrollX - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 2px solid #38bdf8;
      border-radius: 6px;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.7), inset 0 0 10px rgba(99, 102, 241, 0.5);
      animation: privacyAgentPulse 1.2s ease-out forwards;
      pointer-events: none;
      z-index: 2147483647;
    `;

    const tag = document.createElement('div');
    tag.style.cssText = `
      position: absolute;
      top: -24px;
      left: 0;
      background: linear-gradient(135deg, #4f46e5, #0284c7);
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      white-space: nowrap;
    `;
    tag.textContent = `🛡️ AGENT: ${actionLabel}`;
    halo.appendChild(tag);

    this.overlayContainer.appendChild(halo);

    setTimeout(() => {
      halo.remove();
    }, 1500);
  }

  showFloatingBadge(text) {
    this.ensureOverlay();
    if (!this.overlayContainer) return;

    const badge = document.createElement('div');
    badge.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid #38bdf8;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      animation: privacyAgentFade 2s ease forwards;
    `;
    badge.textContent = text;
    this.overlayContainer.appendChild(badge);

    setTimeout(() => badge.remove(), 2000);
  }
}

// Inject animation styles if in browser document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes privacyAgentPulse {
      0% { transform: scale(0.96); opacity: 0.2; }
      50% { transform: scale(1.04); opacity: 1; }
      100% { transform: scale(1.0); opacity: 0.9; }
    }
    @keyframes privacyAgentFade {
      0% { opacity: 0; transform: translateY(10px); }
      20% { opacity: 1; transform: translateY(0); }
      80% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// Universal module export
if (typeof globalThis !== 'undefined') {
  globalThis.ActionExecutor = ActionExecutor;
}
if (typeof window !== 'undefined') {
  window.ActionExecutor = ActionExecutor;
}
if (typeof self !== 'undefined') {
  self.ActionExecutor = ActionExecutor;
}

export default ActionExecutor;
export { ActionExecutor };

