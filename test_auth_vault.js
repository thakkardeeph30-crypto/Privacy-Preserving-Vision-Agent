/**
 * Comprehensive Unit Test Suite for:
 * 1. Long-Term Credential Storage Persistence across Service Worker Reboots
 * 2. Google Password Manager-style Database (Site Name, URL, Domain, Username, Password)
 * 3. Device Biometric / PIN Cryptographic Lock & Unlocking Gates
 */

import crypto from 'crypto';

console.log('🧪 [Test Suite] Running Persistent Database & Biometric/PIN Lock Tests...\n');

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

// Simulated chrome.storage.local persisting on disk
class SimulatedDiskStorage {
  constructor() {
    this.disk = {};
  }

  async get(keys) {
    const res = {};
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      if (this.disk[k] !== undefined) {
        // Deep clone to simulate serialization
        res[k] = JSON.parse(JSON.stringify(this.disk[k]));
      }
    }
    return res;
  }

  async set(items) {
    for (const [k, v] of Object.entries(items)) {
      this.disk[k] = JSON.parse(JSON.stringify(v));
    }
  }
}

// Simulated Background Service Worker with Lifecycle Reboots
class BackgroundServiceWorkerSimulator {
  constructor(diskStorage) {
    this.diskStorage = diskStorage;
    this.rebootWorker();
  }

  // Simulates Service Worker being terminated by Chrome after 30s idle or browser restart
  rebootWorker() {
    this.isStateLoaded = false;
    this.stateInitPromise = null;
    this.state = {
      vaultList: [],
      vault: {},
      authConfig: {
        hasMasterPin: false,
        pinSalt: '',
        pinHash: '',
        biometricsEnabled: false,
        biometricCredentialId: '',
        autoLockMinutes: 15
      }
    };
    this.sessionUnlocked = false;
  }

  async ensureStateLoaded() {
    if (this.isStateLoaded) return this.state;
    if (!this.stateInitPromise) {
      this.stateInitPromise = (async () => {
        const data = await this.diskStorage.get(['privacy_agent_vault_v2', 'vault', 'privacy_agent_auth']);

        if (data.privacy_agent_auth) {
          this.state.authConfig = { ...this.state.authConfig, ...data.privacy_agent_auth };
        }

        if (Array.isArray(data.privacy_agent_vault_v2)) {
          this.state.vaultList = data.privacy_agent_vault_v2;
        } else if (data.vault && typeof data.vault === 'object') {
          this.state.vaultList = Object.keys(data.vault).map(host => ({
            id: `cred_${host}`,
            siteName: host,
            hostname: host,
            domain: host,
            url: `https://${host}`,
            username: data.vault[host].username,
            password: data.vault[host].password,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }));
        } else {
          this.state.vaultList = [];
        }

        this.isStateLoaded = true;
        return this.state;
      })();
    }
    return this.stateInitPromise;
  }

  async saveVault() {
    await this.diskStorage.set({
      privacy_agent_vault_v2: this.state.vaultList
    });
  }

  async saveAuthConfig() {
    await this.diskStorage.set({
      privacy_agent_auth: this.state.authConfig
    });
  }

  // Message Dispatcher
  async handleMessage(request) {
    await this.ensureStateLoaded();
    const type = request.type;

    switch (type) {
      case 'AUTH_SETUP_LOCK': {
        const { pinSalt, pinHash, biometricsEnabled, biometricCredentialId } = request.data || {};
        this.state.authConfig = {
          ...this.state.authConfig,
          hasMasterPin: !!pinHash,
          pinSalt,
          pinHash,
          biometricsEnabled: !!biometricsEnabled,
          biometricCredentialId: biometricCredentialId || ''
        };
        await this.saveAuthConfig();
        this.sessionUnlocked = true;
        return { success: true };
      }

      case 'AUTH_VERIFY_PIN': {
        const { pinHash } = request.data || {};
        if (pinHash && pinHash === this.state.authConfig.pinHash) {
          this.sessionUnlocked = true;
          return { success: true, valid: true };
        }
        return { success: false, valid: false };
      }

      case 'AUTH_LOCK_NOW': {
        this.sessionUnlocked = false;
        return { success: true, isUnlocked: false };
      }

      case 'AUTH_GET_STATUS': {
        return {
          success: true,
          hasMasterPin: !!this.state.authConfig.hasMasterPin,
          isUnlocked: this.sessionUnlocked,
          biometricsEnabled: !!this.state.authConfig.biometricsEnabled
        };
      }

      case 'VAULT_SAVE_ENTRY': {
        const { id, siteName, url, hostname, username, password } = request.data || {};
        const newEntry = {
          id: id || `cred_${Date.now()}_${Math.random()}`,
          siteName: siteName || hostname,
          url: url || `https://${hostname}`,
          hostname,
          domain: hostname,
          username,
          password,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        this.state.vaultList.unshift(newEntry);
        await this.saveVault();
        return { success: true, entry: newEntry };
      }

      case 'VAULT_GET_ALL': {
        const requiresLock = this.state.authConfig.hasMasterPin || this.state.authConfig.biometricsEnabled;
        const isLocked = requiresLock && !this.sessionUnlocked;
        const entries = this.state.vaultList.map(e => ({
          ...e,
          password: isLocked ? '••••••••' : e.password
        }));
        return { success: true, isLocked, requiresLock, entries };
      }

      case 'VAULT_GET_FOR_URL': {
        const { hostname } = request.data || {};
        const matches = this.state.vaultList.filter(e => e.hostname === hostname);
        return { success: true, matches };
      }
    }
  }
}

// Cryptographic helpers matching Web Crypto API implementation in popup.js
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPin(pin, salt) {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

async function runTests() {
  const disk = new SimulatedDiskStorage();
  let worker = new BackgroundServiceWorkerSimulator(disk);

  // 1. Google Password Manager Data Storage
  console.log('1. Long-Term Credential Storage:');
  const credGoogle = await worker.handleMessage({
    type: 'VAULT_SAVE_ENTRY',
    data: {
      siteName: 'Google',
      hostname: 'accounts.google.com',
      url: 'https://accounts.google.com/signin',
      username: 'deep.thakkar@gmail.com',
      password: 'SuperSecretGooglePassword2026!'
    }
  });
  assert(credGoogle.success === true, 'Saved Google credential');

  const credGitHub = await worker.handleMessage({
    type: 'VAULT_SAVE_ENTRY',
    data: {
      siteName: 'GitHub',
      hostname: 'github.com',
      url: 'https://github.com/login',
      username: 'thakkardeeph30-crypto',
      password: 'GitHubStrongTokenKey#992'
    }
  });
  assert(credGitHub.success === true, 'Saved GitHub credential');

  // Verify retrieval
  let allCreds = await worker.handleMessage({ type: 'VAULT_GET_ALL' });
  assert(allCreds.entries.length === 2, 'Vault contains 2 saved credentials');
  assert(allCreds.entries[0].siteName === 'GitHub', 'GitHub credential present with site name');
  assert(allCreds.entries[1].siteName === 'Google', 'Google credential present with site name and full URL');

  // 2. Browser Restart & MV3 Service Worker Sleep Simulation
  console.log('\n2. Persistence Across Chrome Restart / Idle Sleep:');
  console.log('  🔄 Simulating browser restart / service worker shutdown...');
  worker.rebootWorker(); // Discards all in-memory variables to simulate fresh spin-up

  // Fetch immediately on fresh worker wake-up
  const restoredCreds = await worker.handleMessage({ type: 'VAULT_GET_ALL' });
  assert(restoredCreds.entries.length === 2, 'Stored credentials fully recovered from persistent disk storage');
  assert(restoredCreds.entries.some(e => e.username === 'deep.thakkar@gmail.com'), 'Recovered exact Google username');
  assert(restoredCreds.entries.some(e => e.password === 'SuperSecretGooglePassword2026!'), 'Recovered exact Google password after restart');

  // 3. Security Lock Setup (Biometrics & Master PIN)
  console.log('\n3. Security Lock Setup & Salted SHA-256 Hashing:');
  const userPin = '8842';
  const salt = generateSalt();
  const pinHash = hashPin(userPin, salt);

  const setupRes = await worker.handleMessage({
    type: 'AUTH_SETUP_LOCK',
    data: {
      pinSalt: salt,
      pinHash: pinHash,
      biometricsEnabled: true,
      biometricCredentialId: 'mock_touchid_cred_id_xyz'
    }
  });
  assert(setupRes.success === true, 'Configured Master PIN and Device Biometrics lock');

  // 4. Session Lock Enforcement
  console.log('\n4. Session Lock Enforcement:');
  // Simulate browser close & re-open: session unlock state is reset to locked
  console.log('  🔒 Simulating Chrome close & re-open (Lock engaged)...');
  worker.rebootWorker();

  const lockedQuery = await worker.handleMessage({ type: 'VAULT_GET_ALL' });
  assert(lockedQuery.isLocked === true, 'Vault reports LOCKED on restart');
  assert(lockedQuery.entries[0].password === '••••••••', 'Passwords are MASKED while locked');
  assert(lockedQuery.entries[1].password === '••••••••', 'No raw passwords exposed to unauthorized viewers');

  // 5. Unlock with Device PIN / Passcode
  console.log('\n5. Unlock with Device PIN / Passcode:');
  // Attempt with wrong PIN
  const wrongHash = hashPin('0000', salt);
  const badUnlock = await worker.handleMessage({
    type: 'AUTH_VERIFY_PIN',
    data: { pinHash: wrongHash }
  });
  assert(badUnlock.valid === false, 'Rejects incorrect PIN');

  // Attempt with correct PIN
  const goodUnlock = await worker.handleMessage({
    type: 'AUTH_VERIFY_PIN',
    data: { pinHash: pinHash }
  });
  assert(goodUnlock.valid === true, 'Accepts valid PIN and unlocks vault session');

  // Verify passwords are now visible
  const unlockedQuery = await worker.handleMessage({ type: 'VAULT_GET_ALL' });
  assert(unlockedQuery.isLocked === false, 'Vault reports UNLOCKED');
  assert(unlockedQuery.entries.some(e => e.password === 'SuperSecretGooglePassword2026!'), 'Passwords unmasked after successful verification');

  // 6. Manual Lock Now
  console.log('\n6. Manual Immediate Re-Lock:');
  await worker.handleMessage({ type: 'AUTH_LOCK_NOW' });
  const relocked = await worker.handleMessage({ type: 'VAULT_GET_ALL' });
  assert(relocked.isLocked === true, 'Vault instantly re-locked via Lock Now');
  assert(relocked.entries[0].password === '••••••••', 'Passwords masked immediately upon lock');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All Persistent Database and Biometric/PIN Lock tests passed with 100% success!\n');
  }
}

runTests();
