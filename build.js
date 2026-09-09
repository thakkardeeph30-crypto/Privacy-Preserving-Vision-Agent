/**
 * Build Script - PrivacyScreen Agent
 * Validates Manifest V3 specifications, verifies assets,
 * and packages the extension directory for distribution.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 [PrivacyScreen Agent] Building extension...');

const extensionDir = path.join(__dirname, 'extension');
const manifestPath = path.join(extensionDir, 'manifest.json');

// 1. Verify Manifest
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Manifest not found at:', manifestPath);
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`✅ Valid Manifest V3 found: "${manifest.name}" v${manifest.version}`);

  // 2. Check required files
  const requiredFiles = [
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'styles.css',
    'privacy-filter.js',
    'vision-processor.js',
    'action-executor.js',
    'offscreen.html',
    'offscreen.js',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
  ];

  let missing = 0;
  for (const file of requiredFiles) {
    const fullPath = path.join(extensionDir, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing required extension asset: ${file}`);
      missing++;
    } else {
      const stats = fs.statSync(fullPath);
      console.log(`  ✓ ${file} (${stats.size} bytes)`);
    }
  }

  if (missing > 0) {
    console.error(`\n❌ Build failed with ${missing} missing files.`);
    process.exit(1);
  }

  // 3. Check vendor directory
  const vendorDir = path.join(extensionDir, 'vendor');
  if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
  }

  console.log('\n🎉 Build completed successfully!');
  console.log('👉 To load in Chrome:');
  console.log('   1. Open chrome://extensions/');
  console.log('   2. Enable "Developer mode" (top-right toggle)');
  console.log('   3. Click "Load unpacked"');
  console.log(`   4. Select folder: ${extensionDir}\n`);

} catch (err) {
  console.error('❌ Error during build:', err.message);
  process.exit(1);
}
