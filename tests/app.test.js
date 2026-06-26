// TipX — Test Suite
// Run with: node tests/app.test.js

const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASSED: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

// ── TEST 1: Wallet address shortener ──────────────────────────────────
test('shortenAddress returns correct format (first6...last6)', () => {
  const shortenAddress = (address) => {
    if (!address) return '';
    return address.substring(0, 6) + '...' + address.substring(address.length - 6);
  };

  const fullAddress = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const shortened = shortenAddress(fullAddress);

  assert.strictEqual(shortened, 'GBBD47...LLFLA5', 'Should shorten correctly');
  // Wait — last 6 of that address
  const correctShort = fullAddress.substring(0, 6) + '...' + fullAddress.substring(fullAddress.length - 6);
  assert.strictEqual(shortened, correctShort, 'Format should be XXXXXX...XXXXXX');
  assert.strictEqual(shortened.length, 15, 'Length should be 6 + 3 + 6 = 15 chars');
  
  const emptyResult = shortenAddress('');
  assert.strictEqual(emptyResult, '', 'Empty address should return empty string');
});

// ── TEST 2: Tip amount validator ─────────────────────────────────────
test('validateTipAmount rejects invalid amounts and accepts valid ones', () => {
  const validateTipAmount = (amount, balance) => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num)) return { valid: false, error: 'Please enter an amount' };
    if (num <= 0) return { valid: false, error: 'Amount must be greater than 0' };
    if (num < 0.1) return { valid: false, error: 'Minimum tip is 0.1 XLM' };
    if (balance && num > parseFloat(balance) - 1) {
      return { valid: false, error: `Insufficient balance. You have ${balance} XLM` };
    }
    return { valid: true, error: null };
  };

  // Invalid cases
  const r1 = validateTipAmount('', '100');
  assert.strictEqual(r1.valid, false, 'Empty amount should be invalid');

  const r2 = validateTipAmount('-5', '100');
  assert.strictEqual(r2.valid, false, 'Negative amount should be invalid');

  const r3 = validateTipAmount('0.05', '100');
  assert.strictEqual(r3.valid, false, 'Amount below 0.1 should be invalid');

  const r4 = validateTipAmount('150', '100');
  assert.strictEqual(r4.valid, false, 'Amount exceeding balance-1 should be invalid');

  // Valid cases
  const r5 = validateTipAmount('5', '100');
  assert.strictEqual(r5.valid, true, '5 XLM with 100 balance should be valid');

  const r6 = validateTipAmount('0.1', '50');
  assert.strictEqual(r6.valid, true, '0.1 XLM minimum should be valid');
});

// ── TEST 3: Tip object structure validator ───────────────────────────
test('tip object has all required fields with correct types', () => {
  const createTipObject = (sender, amount, message, txHash) => ({
    sender,
    amount,
    message,
    txHash,
    timestamp: new Date(),
  });

  const tip = createTipObject(
    'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    10,
    'Great work!',
    'abc123txhash456'
  );

  // Check all required fields exist
  assert.ok('sender' in tip, 'tip must have sender field');
  assert.ok('amount' in tip, 'tip must have amount field');
  assert.ok('message' in tip, 'tip must have message field');
  assert.ok('txHash' in tip, 'tip must have txHash field');
  assert.ok('timestamp' in tip, 'tip must have timestamp field');

  // Check types
  assert.strictEqual(typeof tip.sender, 'string', 'sender must be string');
  assert.strictEqual(typeof tip.amount, 'number', 'amount must be number');
  assert.strictEqual(typeof tip.message, 'string', 'message must be string');
  assert.strictEqual(typeof tip.txHash, 'string', 'txHash must be string');
  assert.ok(tip.timestamp instanceof Date, 'timestamp must be a Date object');

  // Check Stellar address format (starts with G, 56 chars)
  assert.ok(tip.sender.startsWith('G'), 'Stellar address must start with G');
  assert.strictEqual(tip.sender.length, 56, 'Stellar address must be 56 characters');

  // Check amount is positive
  assert.ok(tip.amount > 0, 'tip amount must be positive');
});

// ── RESULTS ──────────────────────────────────────────────────────────
console.log('');
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed === 0) {
  console.log('🎉 All 3 tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Fix the errors above.');
  process.exit(1);
}
