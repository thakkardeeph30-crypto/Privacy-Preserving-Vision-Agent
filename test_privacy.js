/**
 * Automated Unit Test Suite for PrivacyFilter
 * Tests detection, masking, and Luhn algorithms.
 */

import PrivacyFilter from './extension/privacy-filter.js';

console.log('🧪 [Test Suite] Running PrivacyFilter Unit Tests...\n');

const filter = new PrivacyFilter();
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Email Detection & Masking
console.log('1. Email Regex & Masking:');
const sampleEmail = 'security.officer@defense-gov.us';
const emailMatches = filter.detectEmailPatterns(`Contact us at ${sampleEmail} for inquiries.`);
assert(emailMatches.length === 1, 'Detected 1 email in sample text');
assert(emailMatches[0]?.raw === sampleEmail, 'Matched exact email string');
assert(emailMatches[0]?.masked === 'se***@defense-gov.us', `Masked correctly: ${emailMatches[0]?.masked}`);

// 2. Phone Number Detection & Masking
console.log('\n2. Phone Number Regex & Masking:');
const samplePhone = '(555) 234-5678';
const phoneMatches = filter.detectPhoneNumbers(`Call emergency dispatch at ${samplePhone} immediately.`);
assert(phoneMatches.length === 1, 'Detected 1 phone number');
assert(phoneMatches[0]?.masked === 'XXX-XXX-5678', `Masked correctly: ${phoneMatches[0]?.masked}`);

// 3. Credit Card Detection, BIN Verification & Luhn Check (Fix 6)
console.log('\n3. Credit Card BIN + Regex + Luhn Check & Masking:');
const validVisa = '4532 0158 9234 8928'; // Luhn valid + Visa BIN
const validMasterCard = '5500 0000 0000 0004'; // Luhn valid + MC BIN
const validAmex = '3782 822463 10005'; // Luhn valid + Amex BIN
const invalidChecksum = '4532 0158 9234 8921'; // Luhn invalid
const barcodeLuhnValid = '9999 9999 9999 9992'; // Luhn valid check digit (9*8 + 9*8 ... mod 10 = 0), but invalid BIN!

assert(filter.luhnCheck(validVisa) === true, 'Luhn check accepts valid Visa card');
assert(filter.luhnCheck(invalidChecksum) === false, 'Luhn check rejects invalid checksum card');

// BIN tests
assert(filter.validateCreditCardBIN('4532015892348928')?.issuer === 'Visa', 'BIN detector identifies Visa');
assert(filter.validateCreditCardBIN('5500000000000004')?.issuer === 'MasterCard', 'BIN detector identifies MasterCard');
assert(filter.validateCreditCardBIN('378282246310005')?.issuer === 'Amex', 'BIN detector identifies Amex');
assert(filter.validateCreditCardBIN('9999999999999992') === null, 'BIN detector rejects unknown/fake issuer prefix');

// Full isCreditCard test (BIN + Regex + Luhn)
assert(filter.isCreditCard(validVisa) !== false, 'isCreditCard accepts genuine Visa');
assert(filter.isCreditCard(validMasterCard) !== false, 'isCreditCard accepts genuine MasterCard');
assert(filter.isCreditCard(barcodeLuhnValid) === false, 'isCreditCard rejects false-positive barcode (Luhn-valid but non-existent BIN)');

const cardMatches = filter.detectCreditCards(`Invoice billed to ${validVisa} and bad num ${invalidChecksum} and barcode ${barcodeLuhnValid}`);
assert(cardMatches.length === 1, 'Detects only genuine credit cards with matching BIN and Luhn');
assert(cardMatches[0]?.masked === '**** **** **** 8928', `Masked correctly: ${cardMatches[0]?.masked}`);
assert(cardMatches[0]?.issuer === 'Visa', 'Card metadata contains detected issuer');

// 4. Multiple Mixed PII in Single Document
console.log('\n4. Multi-PII Document Scan:');
const docText = 'User test.user@gmail.com with phone (555) 892-1234 charged 4111111111111111';
const multiEmails = filter.detectEmailPatterns(docText);
const multiPhones = filter.detectPhoneNumbers(docText);
const multiCards = filter.detectCreditCards(docText);

assert(multiEmails.length === 1, 'Multi-scan found 1 email');
assert(multiPhones.length === 1, 'Multi-scan found 1 phone');
assert(multiCards.length === 1, 'Multi-scan found 1 card');

// Summary
console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All PrivacyFilter unit tests passed with 100% success!\n');
}
