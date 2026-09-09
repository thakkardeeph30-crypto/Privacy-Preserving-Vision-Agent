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

// 3. Credit Card Detection & Luhn Verification
console.log('\n3. Credit Card Luhn Check & Masking:');
const validVisa = '4532 0158 9234 8928'; // Luhn valid
const invalidCard = '4532 0158 9234 8921'; // Luhn invalid

assert(filter.luhnCheck(validVisa) === true, 'Luhn check accepts valid Visa card');
assert(filter.luhnCheck(invalidCard) === false, 'Luhn check rejects invalid checksum card');

const cardMatches = filter.detectCreditCards(`Invoice billed to ${validVisa} and bad num ${invalidCard}`);
assert(cardMatches.length === 1, 'Detects only Luhn-valid credit cards');
assert(cardMatches[0]?.masked === '**** **** **** 8928', `Masked correctly: ${cardMatches[0]?.masked}`);

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
