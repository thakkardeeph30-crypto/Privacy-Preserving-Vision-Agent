/**
 * OpenAgent AI Analyzer Module
 * Analyzes web pages and forms to understand required user information,
 * classifies universal authentication methods (SSO, multi-step, OTP, passkeys),
 * and generates the in-page visual form layer.
 */

class OpenAgentAnalyzer {
  constructor() {
    this.visualLayerContainer = null;
    this.activeBadges = [];
    this.isLayerVisible = false;
  }

  // --- 1. Semantic Field Classification ---

  /**
   * Field classification dictionary mapping semantic keys to regex patterns.
   */
  static get FIELD_PATTERNS() {
    return {
      fullName: {
        label: 'Full Name',
        icon: '👤',
        category: 'personal',
        regex: /(full[\s_-]?name|^name$|your[\s_-]?name|contact[\s_-]?name|author[\s_-]?name)/i,
        autocomplete: ['name']
      },
      firstName: {
        label: 'First Name',
        icon: '👤',
        category: 'personal',
        regex: /(first[\s_-]?name|given[\s_-]?name|^fname$|vorname)/i,
        autocomplete: ['given-name', 'fname']
      },
      lastName: {
        label: 'Last Name',
        icon: '👤',
        category: 'personal',
        regex: /(last[\s_-]?name|family[\s_-]?name|surname|^lname$|nachname)/i,
        autocomplete: ['family-name', 'lname']
      },
      username: {
        label: 'Username / ID',
        icon: '🆔',
        category: 'personal',
        regex: /(user[\s_-]?name|login[\s_-]?id|account[\s_-]?id|screen[\s_-]?name|^user$|^handle$)/i,
        autocomplete: ['username']
      },
      email: {
        label: 'Email Address',
        icon: '📧',
        category: 'contact',
        regex: /(email|e-mail|mail[\s_-]?addr|^email$)/i,
        autocomplete: ['email', 'username']
      },
      phone: {
        label: 'Phone Number',
        icon: '📱',
        category: 'contact',
        regex: /(phone|mobile|telephone|cell|tel[\s_-]?no|contact[\s_-]?num|whatsapp)/i,
        autocomplete: ['tel', 'tel-national', 'tel-local']
      },
      streetAddress: {
        label: 'Street Address',
        icon: '🏠',
        category: 'address',
        regex: /(street[\s_-]?addr|address[\s_-]?line[\s_-]?1|addr[\s_-]?1|^address$|^street$)/i,
        autocomplete: ['address-line1', 'street-address']
      },
      apt: {
        label: 'Apt / Suite / Unit',
        icon: '🏢',
        category: 'address',
        regex: /(apt|suite|unit|bldg|building|address[\s_-]?line[\s_-]?2|addr[\s_-]?2)/i,
        autocomplete: ['address-line2']
      },
      city: {
        label: 'City / Locality',
        icon: '🏙️',
        category: 'address',
        regex: /(city|town|locality|municipality|suburb)/i,
        autocomplete: ['address-level2']
      },
      state: {
        label: 'State / Province',
        icon: '🗺️',
        category: 'address',
        regex: /(state|province|region|county|prefecture)/i,
        autocomplete: ['address-level1']
      },
      zipCode: {
        label: 'ZIP / Postal Code',
        icon: '📮',
        category: 'address',
        regex: /(zip|postal[\s_-]?code|pincode|postcode|zipcode)/i,
        autocomplete: ['postal-code']
      },
      country: {
        label: 'Country / Nation',
        icon: '🌍',
        category: 'address',
        regex: /(country|nation|citizenship)/i,
        autocomplete: ['country-name', 'country']
      },
      company: {
        label: 'Company / Organization',
        icon: '🏢',
        category: 'professional',
        regex: /(company|organization|organisation|employer|workplace|business[\s_-]?name)/i,
        autocomplete: ['organization']
      },
      jobTitle: {
        label: 'Job Title / Role',
        icon: '💼',
        category: 'professional',
        regex: /(job[\s_-]?title|designation|occupation|position|profession|^role$)/i,
        autocomplete: ['organization-title']
      },
      website: {
        label: 'Website / Portfolio',
        icon: '🌐',
        category: 'professional',
        regex: /(website|web[\s_-]?page|portfolio|url|linkedin|github[\s_-]?url)/i,
        autocomplete: ['url']
      },
      password: {
        label: 'Password',
        icon: '🔒',
        category: 'security',
        regex: /(^pass$|password|pwd|secret|auth[\s_-]?key)/i,
        autocomplete: ['current-password', 'new-password']
      },
      confirmPassword: {
        label: 'Confirm Password',
        icon: '🔐',
        category: 'security',
        regex: /(confirm[\s_-]?pass|re[\s_-]?enter[\s_-]?pass|repeat[\s_-]?pass|verify[\s_-]?pass)/i,
        autocomplete: ['new-password']
      },
      otp: {
        label: 'OTP / Verification Code',
        icon: '🔑',
        category: 'verification',
        regex: /(otp|verification[\s_-]?code|2fa|mfa|token|passcode|one[\s_-]?time|sms[\s_-]?code)/i,
        autocomplete: ['one-time-code']
      }
    };
  }

  /**
   * Classifies an individual form element into a semantic key and label.
   */
  classifyElement(el) {
    if (!el) return { key: 'unknown', label: 'Field', icon: '📝', category: 'general' };

    const type = (el.type || el.getAttribute?.('type') || '').toLowerCase();
    const name = (el.name || el.getAttribute?.('name') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const placeholder = (el.placeholder || el.getAttribute?.('placeholder') || '').toLowerCase();
    const autocomplete = (el.autocomplete || el.getAttribute?.('autocomplete') || '').toLowerCase();
    const ariaLabel = (el.getAttribute?.('aria-label') || '').toLowerCase();

    // Extract surrounding label text if available
    let labelText = '';
    if (el.labels && el.labels.length > 0) {
      labelText = Array.from(el.labels).map((l) => l.innerText || '').join(' ').toLowerCase();
    } else if (id && typeof document !== 'undefined') {
      try {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) labelText = (lbl.innerText || '').toLowerCase();
      } catch (e) {}
    }
    if (!labelText && el.closest) {
      const parentLabel = el.closest('label');
      if (parentLabel) labelText = (parentLabel.innerText || '').toLowerCase();
    }

    // Direct type shortcuts
    if (type === 'password') {
      const allText = `${name} ${id} ${placeholder} ${labelText} ${ariaLabel}`;
      if (OpenAgentAnalyzer.FIELD_PATTERNS.confirmPassword.regex.test(allText)) {
        return { key: 'confirmPassword', ...OpenAgentAnalyzer.FIELD_PATTERNS.confirmPassword };
      }
      return { key: 'password', ...OpenAgentAnalyzer.FIELD_PATTERNS.password };
    }
    if (type === 'email') {
      return { key: 'email', ...OpenAgentAnalyzer.FIELD_PATTERNS.email };
    }
    if (type === 'tel') {
      return { key: 'phone', ...OpenAgentAnalyzer.FIELD_PATTERNS.phone };
    }

    // Check autocomplete attribute
    if (autocomplete) {
      for (const [key, def] of Object.entries(OpenAgentAnalyzer.FIELD_PATTERNS)) {
        if (def.autocomplete && def.autocomplete.includes(autocomplete)) {
          return { key, ...def };
        }
      }
    }

    // Multi-signal matching across all attributes
    const signals = `${name} ${id} ${placeholder} ${labelText} ${ariaLabel}`;

    // Confirm password special check before password
    if (OpenAgentAnalyzer.FIELD_PATTERNS.confirmPassword.regex.test(signals)) {
      return { key: 'confirmPassword', ...OpenAgentAnalyzer.FIELD_PATTERNS.confirmPassword };
    }

    for (const [key, def] of Object.entries(OpenAgentAnalyzer.FIELD_PATTERNS)) {
      if (def.regex.test(signals)) {
        return { key, ...def };
      }
    }

    // Fallback if it's a textarea or select
    const tag = (el.tagName || '').toLowerCase();
    if (tag === 'select') return { key: 'select', label: 'Selection', icon: '🔽', category: 'general' };
    if (tag === 'textarea') return { key: 'notes', label: 'Message / Notes', icon: '📝', category: 'general' };

    return { key: 'custom_' + (name || id || 'input'), label: labelText || placeholder || name || id || 'Input Field', icon: '📝', category: 'general' };
  }

  // --- 2. Universal Login Methods Detector ---

  /**
   * Scans document and detects all authentication flows and architectures.
   */
  detectLoginMethods(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc) return [];
    const methods = [];
    const passwordInputs = doc.querySelectorAll ? doc.querySelectorAll('input[type="password"]') : [];
    const emailOrUserInputs = doc.querySelectorAll ? doc.querySelectorAll('input[type="email"], input[type="text"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]') : [];
    const visibleButtons = Array.from(doc.querySelectorAll ? doc.querySelectorAll('button, a, input[type="submit"], [role="button"]') : []);

    // 1. Social SSO / Federated Identity Detection
    const ssoProviders = [
      { id: 'google', name: 'Google Sign-In', icon: '🌐', regex: /google/i, domain: 'accounts.google.com' },
      { id: 'github', name: 'GitHub Sign-In', icon: '🐙', regex: /github/i, domain: 'github.com/login' },
      { id: 'apple', name: 'Apple Sign-In', icon: '🍎', regex: /apple/i, domain: 'appleid.apple.com' },
      { id: 'microsoft', name: 'Microsoft Sign-In', icon: '🪟', regex: /(microsoft|azure[\s_-]?ad|office[\s_-]?365)/i, domain: 'login.microsoftonline.com' },
      { id: 'saml', name: 'Enterprise SAML / SSO', icon: '🏢', regex: /(saml|single[\s_-]?sign[\s_-]?on|^sso$|okta|auth0|ping[\s_-]?identity)/i }
    ];

    const detectedSSO = [];
    visibleButtons.forEach((btn) => {
      const text = (btn.innerText || btn.textContent || btn.value || btn.getAttribute?.('aria-label') || '').trim();
      const href = btn.getAttribute?.('href') || '';
      const idClass = `${btn.id || ''} ${btn.className || ''}`.toLowerCase();

      ssoProviders.forEach((prov) => {
        const matchesText = prov.regex.test(text) || prov.regex.test(idClass);
        const matchesDomain = prov.domain ? href.includes(prov.domain) : false;
        if ((matchesText || matchesDomain) && !detectedSSO.some((p) => p.id === prov.id)) {
          detectedSSO.push({
            id: prov.id,
            name: prov.name,
            icon: prov.icon,
            buttonSelector: this.getElementSelector(btn),
            buttonText: text || prov.name
          });
        }
      });
    });

    // Check for Google Sign-In SDK embeds (e.g. g_id_onload, iframe)
    if (doc.querySelector && (doc.querySelector('#g_id_onload, .g_id_signin, iframe[src*="accounts.google.com"]') && !detectedSSO.some((p) => p.id === 'google'))) {
      detectedSSO.push({
        id: 'google',
        name: 'Google Sign-In (Embed)',
        icon: '🌐',
        buttonSelector: '#g_id_onload, .g_id_signin',
        buttonText: 'Sign in with Google'
      });
    }

    if (detectedSSO.length > 0) {
      methods.push({
        type: 'social_sso',
        title: 'Social SSO & Federated Identity',
        icon: '🌐',
        description: `Detected ${detectedSSO.length} one-click identity provider(s)`,
        providers: detectedSSO
      });
    }

    // 2. Standard Password Login
    if (passwordInputs.length > 0) {
      const form = passwordInputs[0].closest ? passwordInputs[0].closest('form') : null;
      methods.push({
        type: 'standard',
        title: 'Standard Password Login',
        icon: '🔒',
        description: 'Username / Email + Password credentials form',
        hasForm: !!form,
        passwordCount: passwordInputs.length
      });
    }

    // 3. Multi-Step / Split Login (e.g. Step 1: Identifier -> Click Next -> Step 2: Password)
    if (passwordInputs.length === 0 && emailOrUserInputs.length > 0) {
      const nextBtn = visibleButtons.find((b) => {
        const t = (b.innerText || b.value || '').toLowerCase();
        return /(next|continue|proceed|forward|log[\s_-]?in|sign[\s_-]?in)/i.test(t);
      });
      if (nextBtn) {
        methods.push({
          type: 'multi_step',
          title: 'Multi-Step / Split Login (Step 1)',
          icon: '⏩',
          description: 'Requires entering identifier first, followed by password step',
          step: 1,
          nextButtonSelector: this.getElementSelector(nextBtn)
        });
      }
    }

    // 4. OTP / 2FA / Verification Code Flow
    const otpInputs = doc.querySelectorAll ? Array.from(doc.querySelectorAll('input[autocomplete="one-time-code"], input[name*="otp" i], input[id*="otp" i], input[name*="code" i], input[id*="code" i], input[maxlength="1"]')) : [];
    // Segmented multi-box check (e.g. 4 or 6 single-digit inputs)
    const singleDigitBoxes = otpInputs.filter((inp) => inp.getAttribute?.('maxlength') === '1' || (inp.style && inp.style.width && parseInt(inp.style.width) < 50));
    const isMultiBox = singleDigitBoxes.length >= 4 && singleDigitBoxes.length <= 8;

    if (isMultiBox || otpInputs.length > 0) {
      methods.push({
        type: 'otp',
        title: isMultiBox ? `OTP Code (${singleDigitBoxes.length}-Digit Segmented)` : 'OTP / 2FA Verification Code',
        icon: '🔑',
        description: isMultiBox ? 'Individual digit verification boxes' : 'Single verification token input',
        isMultiBox,
        digitCount: isMultiBox ? singleDigitBoxes.length : 1,
        selectors: isMultiBox ? singleDigitBoxes.map((el) => this.getElementSelector(el)) : [this.getElementSelector(otpInputs[0])]
      });
    }

    // 5. Magic Link / Passwordless
    const magicLinkBtn = visibleButtons.find((b) => {
      const t = (b.innerText || b.value || '').toLowerCase();
      return /(magic[\s_-]?link|email[\s_-]?link|send[\s_-]?link|passwordless)/i.test(t);
    });
    if (magicLinkBtn && passwordInputs.length === 0) {
      methods.push({
        type: 'magic_link',
        title: 'Magic Link / Passwordless',
        icon: '✨',
        description: 'Authentication link dispatched to user email',
        buttonSelector: this.getElementSelector(magicLinkBtn)
      });
    }

    // 6. Passkey / WebAuthn
    const passkeyBtn = visibleButtons.find((b) => {
      const t = (b.innerText || b.value || '').toLowerCase();
      return /(passkey|security[\s_-]?key|webauthn|fido|biometric)/i.test(t);
    });
    if (passkeyBtn) {
      methods.push({
        type: 'passkey',
        title: 'Passkey / WebAuthn Biometric',
        icon: '🛡️',
        description: 'FIDO2 cryptographic hardware key or biometric token',
        buttonSelector: this.getElementSelector(passkeyBtn)
      });
    }

    return methods;
  }

  // --- 3. Scan & Package All Active Form Fields ---

  /**
   * Scans page and returns structured list of all inputs with classification.
   */
  scanPageForms(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc) return { fields: [], loginMethods: [], fieldCount: 0 };
    const fields = [];
    const inputs = doc.querySelectorAll ? doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea') : [];

    inputs.forEach((el, index) => {
      // Check visibility if available
      if (el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
      }

      const classification = this.classifyElement(el);
      const selector = this.getElementSelector(el);
      const currentValue = el.value || '';
      const isRequired = el.required || el.getAttribute?.('aria-required') === 'true';

      fields.push({
        id: el.id || `field_${index}`,
        name: el.name || '',
        type: el.type || el.tagName.toLowerCase(),
        tag: el.tagName.toLowerCase(),
        selector,
        key: classification.key,
        label: classification.label,
        icon: classification.icon,
        category: classification.category,
        currentValue,
        isRequired: !!isRequired,
        placeholder: el.placeholder || ''
      });
    });

    const loginMethods = this.detectLoginMethods(doc);

    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      hostname: typeof window !== 'undefined' ? window.location.hostname : '',
      title: typeof document !== 'undefined' ? document.title : '',
      fields,
      loginMethods,
      fieldCount: fields.length
    };
  }

  // --- 4. In-Page Visual Form Layer (Badges Overlay) ---

  /**
   * Toggles or creates the visual overlay layer on the live web page.
   */
  toggleVisualLayer(enable = null, matchedKeys = {}) {
    if (typeof document === 'undefined') return false;

    if (enable === null) {
      this.isLayerVisible = !this.isLayerVisible;
    } else {
      this.isLayerVisible = !!enable;
    }

    if (!this.isLayerVisible) {
      this.removeVisualLayer();
      return false;
    }

    this.renderVisualLayer(matchedKeys);
    return true;
  }

  renderVisualLayer(matchedKeys = {}) {
    this.removeVisualLayer();

    const container = document.createElement('div');
    container.id = 'openagent-visual-layer';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483640;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(container);
    this.visualLayerContainer = container;

    const scan = this.scanPageForms(document);
    scan.fields.forEach((field) => {
      try {
        const el = document.querySelector(field.selector);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;

        const hasMatch = matchedKeys && matchedKeys[field.key] !== undefined && matchedKeys[field.key] !== '';

        // Create Badge
        const badge = document.createElement('div');
        badge.className = `openagent-field-badge ${hasMatch ? 'has-match' : ''}`;
        badge.style.cssText = `
          position: absolute;
          top: ${Math.max(0, rect.top + scrollY - 24)}px;
          left: ${rect.left + scrollX}px;
          pointer-events: auto;
          background: ${hasMatch ? 'linear-gradient(135deg, #065f46, #047857)' : 'linear-gradient(135deg, #1e1b4b, #312e81)'};
          color: ${hasMatch ? '#a7f3d0' : '#e0e7ff'};
          border: 1px solid ${hasMatch ? '#10b981' : '#6366f1'};
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 8px ${hasMatch ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.3)'};
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          animation: openagentBadgeFade 0.25s ease-out;
        `;

        badge.innerHTML = `
          <span>${field.icon}</span>
          <span>${field.label}</span>
          ${hasMatch ? '<span style="color: #34d399; font-size: 12px;">✓</span>' : ''}
          ${field.isRequired ? '<span style="color: #f87171;">*</span>' : ''}
        `;

        badge.title = `${field.label} (${field.key}) - Click to focus input`;
        badge.addEventListener('click', () => {
          el.focus();
          el.style.outline = '2px solid #38bdf8';
          setTimeout(() => (el.style.outline = ''), 1500);
        });

        container.appendChild(badge);
        this.activeBadges.push(badge);

        // Highlight element border gently
        el.setAttribute('data-openagent-inspected', 'true');
      } catch (e) {
        console.warn('Visual badge placement warning:', e);
      }
    });

    // Also display Authentication Flow banner if detected
    if (scan.loginMethods && scan.loginMethods.length > 0) {
      this.renderAuthFlowBadge(scan.loginMethods[0], container);
    }
  }

  renderAuthFlowBadge(primaryMethod, container) {
    const badge = document.createElement('div');
    badge.className = 'openagent-auth-flow-banner';
    badge.style.cssText = `
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(12px);
      border: 1px solid #38bdf8;
      border-radius: 24px;
      padding: 6px 18px;
      color: #f8fafc;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.35);
      z-index: 2147483647;
      animation: openagentBadgeFade 0.3s ease-out;
    `;
    badge.innerHTML = `
      <span>${primaryMethod.icon}</span>
      <span style="color: #38bdf8;">OpenAgent Auth:</span>
      <span>${primaryMethod.title}</span>
    `;
    container.appendChild(badge);
  }

  removeVisualLayer() {
    if (this.visualLayerContainer) {
      this.visualLayerContainer.remove();
      this.visualLayerContainer = null;
    }
    this.activeBadges = [];
    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-openagent-inspected]').forEach((el) => {
        el.removeAttribute('data-openagent-inspected');
      });
    }
  }

  // --- 5. Helper Methods ---

  getElementSelector(el) {
    if (!el) return '';
    const escapeCss = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (s) => s.replace(/[^\w-]/g, '\\$&');
    if (el.id) return `#${escapeCss(el.id)}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${escapeCss(el.name)}"]`;
    if (el.className && typeof el.className === 'string') {
      const firstClass = el.className.trim().split(/\s+/)[0];
      if (firstClass && !firstClass.includes(':')) {
        return `${el.tagName.toLowerCase()}.${escapeCss(firstClass)}`;
      }
    }
    return el.tagName.toLowerCase();
  }
}

// Module export for browser & Node.js ESM/CJS test environment
if (typeof window !== 'undefined') {
  window.OpenAgentAnalyzer = OpenAgentAnalyzer;
}

export default OpenAgentAnalyzer;
export { OpenAgentAnalyzer };
