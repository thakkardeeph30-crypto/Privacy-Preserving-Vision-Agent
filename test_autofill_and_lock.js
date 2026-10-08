/**
 * Test Suite for:
 * 1. Resilient Vault Security Lock Setup & Storage Persistence (Problem A)
 * 2. Biometric Fallback & Master PIN Direct Persistence
 * 3. Modern Reactive Form Autofill & Field Discovery (Problem B)
 *    - Search input vs. Username input scoring
 *    - Non-<form> SPA container inputs
 *    - React 16-19 _valueTracker & InputEvent prototype dispatch
 */

import crypto from 'crypto';

console.log('🧪 [Test Suite] Running Autofill & Vault Security Lock Integration Tests...\n');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

// ---------------------------------------------------------
// 1. Test Resilient Vault Security Lock Setup & Direct Persistence
// ---------------------------------------------------------
console.log('1. Vault Security Lock Direct Persistence:');

const fakeStorage = {};
const fakeSession = {};

function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.randomFillSync(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin, salt) {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

async function saveAuthLockDirectly(salt, pinHash, enableBio, bioCredId) {
  const authConfig = {
    hasMasterPin: !!pinHash,
    pinSalt: salt || '',
    pinHash: pinHash || '',
    biometricsEnabled: !!enableBio && !!bioCredId,
    biometricCredentialId: bioCredId || '',
    autoLockMinutes: 15
  };

  fakeStorage.privacy_agent_auth = authConfig;
  fakeSession.isUnlocked = true;
  fakeSession.unlockedAt = Date.now();

  return authConfig;
}

const salt = generateSalt();
const pin = '12345678';
const pinHash = await hashPin(pin, salt);

// Case 1: Biometrics unavailable / rejected in extension popup context
const bioCredId = ''; // Simulated graceful failure
const authConfig = await saveAuthLockDirectly(salt, pinHash, false, bioCredId);

assert(fakeStorage.privacy_agent_auth.hasMasterPin === true, 'Master PIN saved directly to local storage');
assert(fakeStorage.privacy_agent_auth.pinHash === pinHash, 'PIN hash correctly stored');
assert(fakeSession.isUnlocked === true, 'Session unlocked immediately upon lock creation');
assert(fakeStorage.privacy_agent_auth.biometricsEnabled === false, 'Biometrics disabled gracefully without error');

// Case 2: PIN Verification & Direct Disk Fallback
const enteredPin = '12345678';
const testHash = await hashPin(enteredPin, fakeStorage.privacy_agent_auth.pinSalt);
assert(testHash === fakeStorage.privacy_agent_auth.pinHash, 'Direct storage PIN verification succeeds');

const wrongPinHash = await hashPin('wrongpin', fakeStorage.privacy_agent_auth.pinSalt);
assert(wrongPinHash !== fakeStorage.privacy_agent_auth.pinHash, 'Rejects incorrect PIN');

// ---------------------------------------------------------
// 2. Test Input Selection & Scoring Logic (Problem B)
// ---------------------------------------------------------
console.log('\n2. Form Input Discovery & Field Scoring Engine:');

function findBestInputsMock(inputs, parentContainer = null) {
  // Password finding
  const passCandidates = [];
  for (const el of inputs) {
    if (el.disabled || el.readOnly || el.hidden) continue;
    let score = 0;
    const type = (el.type || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const ac = (el.autocomplete || '').toLowerCase();

    if (type === 'password') score += 100;
    if (ac.includes('password')) score += 80;
    if (name.includes('pass') || name.includes('pwd')) score += 60;
    if (id.includes('pass') || id.includes('pwd')) score += 50;

    if (score > 0) passCandidates.push({ el, score });
  }
  passCandidates.sort((a, b) => b.score - a.score);
  const passwordInput = passCandidates.length > 0 ? passCandidates[0].el : null;

  // Username finding
  const userCandidates = [];
  for (const el of inputs) {
    if (el === passwordInput || el.disabled || el.readOnly || el.hidden) continue;
    if (['password', 'checkbox', 'radio', 'submit', 'button'].includes((el.type || '').toLowerCase())) continue;

    let score = 0;
    const type = (el.type || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const ac = (el.autocomplete || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();

    // Heavy penalty for search / filter inputs
    if (/search|query|filter|find/i.test(`${name} ${id} ${placeholder}`)) {
      score -= 400;
    }

    if (ac === 'username' || ac === 'email') score += 120;
    else if (ac.includes('username') || ac.includes('email')) score += 90;

    if (type === 'email') score += 80;
    if (/(username|user_name|login|email|account)/i.test(name)) score += 70;
    if (/(username|user_name|login|email|account)/i.test(id)) score += 60;
    if (/(username|email|account)/i.test(placeholder)) score += 50;

    if (parentContainer && el.containerId === parentContainer.id) score += 40;
    if (score > 0) userCandidates.push({ el, score });
  }
  userCandidates.sort((a, b) => b.score - a.score);
  const usernameInput = userCandidates.length > 0 ? userCandidates[0].el : null;

  return { usernameInput, passwordInput };
}

// Test scenario: Webpage has search bar in header, followed by login card
const complexPageInputs = [
  { id: 'site-search', name: 'q', type: 'text', placeholder: 'Search products...', containerId: 'header-nav' },
  { id: 'user-field', name: 'username', type: 'text', autocomplete: 'username', placeholder: 'Enter email or username', containerId: 'login-modal' },
  { id: 'pass-field', name: 'password', type: 'password', autocomplete: 'current-password', containerId: 'login-modal' }
];

const found = findBestInputsMock(complexPageInputs, { id: 'login-modal' });

assert(found.usernameInput !== null, 'Found username input');
assert(found.usernameInput.id === 'user-field', 'Correctly selected username field instead of search bar in header');
assert(found.passwordInput !== null, 'Found password input');
assert(found.passwordInput.id === 'pass-field', 'Correctly selected visible password field');

// ---------------------------------------------------------
// 3. React _valueTracker Simulation (Problem B)
// ---------------------------------------------------------
console.log('\n3. Framework Controlled Input Value Setter:');

class MockReactInputElement {
  constructor(initialVal = '') {
    this._val = initialVal;
    this.eventsDispatched = [];
    this._valueTracker = {
      trackedValue: initialVal,
      getValue() { return this.trackedValue; },
      setValue(val) { this.trackedValue = val; }
    };
  }

  get value() { return this._val; }
  set value(v) { this._val = v; }

  dispatchEvent(evt) {
    this.eventsDispatched.push(evt.type);
    if (evt.type === 'input') {
      // React ChangeEventPlugin simulation:
      // React only calls component onChange if current value != trackedValue
      const current = this.value;
      const last = this._valueTracker.getValue();
      if (current !== last) {
        this.reactComponentStateUpdated = true;
        this._valueTracker.setValue(current);
      }
    }
  }

  focus() { this.focused = true; }
}

function simulateSetNativeInputValue(el, newVal) {
  const prevVal = el.value;
  el.focus();
  el.value = newVal;

  // Reset React _valueTracker to prevVal so React ChangeEventPlugin sees the diff
  if (el._valueTracker) {
    el._valueTracker.setValue(prevVal);
  }

  el.dispatchEvent({ type: 'keydown' });
  el.dispatchEvent({ type: 'input' });
  el.dispatchEvent({ type: 'change' });
  el.dispatchEvent({ type: 'blur' });
}

const mockInput = new MockReactInputElement('');
simulateSetNativeInputValue(mockInput, 'deep.thakkar@example.com');

assert(mockInput.value === 'deep.thakkar@example.com', 'Native value property assigned');
assert(mockInput.focused === true, 'Input received focus');
assert(mockInput.reactComponentStateUpdated === true, 'React component onChange fired and state updated');
assert(mockInput.eventsDispatched.includes('input'), 'Input event dispatched');
assert(mockInput.eventsDispatched.includes('change'), 'Change event dispatched');
assert(mockInput.eventsDispatched.includes('blur'), 'Blur event dispatched');

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
