// Mock payment service — uses Stripe test-card convention (no real processing)
// Accepted pattern for demos / local projects.
//
// Test cards:
//   4242 4242 4242 4242  →  Visa, always succeeds
//   5555 5555 5555 4444  →  Mastercard, always succeeds
//   3782 822463 10005    →  Amex, always succeeds
//   4000 0000 0000 0002  →  Visa, always declined
//   4000 0000 0000 9995  →  Visa, insufficient funds
//   4000 0000 0000 0069  →  Visa, expired card

const TEST_CARDS = {
  '4242424242424242': { brand: 'Visa',       decline: null },
  '5555555555554444': { brand: 'Mastercard', decline: null },
  '378282246310005':  { brand: 'Amex',       decline: null },
  '4000000000000002': { brand: 'Visa',       decline: 'Your card was declined.' },
  '4000000000009995': { brand: 'Visa',       decline: 'Insufficient funds.' },
  '4000000000000069': { brand: 'Visa',       decline: 'Your card has expired.' },
};

function detectBrand(number) {
  if (/^4/.test(number))        return 'Visa';
  if (/^5[1-5]/.test(number))   return 'Mastercard';
  if (/^3[47]/.test(number))    return 'Amex';
  if (/^6(?:011|5)/.test(number)) return 'Discover';
  return 'Card';
}

function luhn(number) {
  let sum = 0, alt = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = parseInt(number[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const PROCESSING_DELAY_MS = 1800;

function generatePaymentToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Secure token generation is not available in this browser.');
}

export { generatePaymentToken };

export const paymentService = {
  async processPayment({ cardNumber, expiry, cvv }) {
    const n = cardNumber.replace(/\s/g, '');

    // Simulate network + processor round-trip
    await new Promise((r) => setTimeout(r, PROCESSING_DELAY_MS));

    if (n.length < 13 || !luhn(n)) {
      throw new Error('Your card number is invalid.');
    }
    if (!expiry || expiry.replace(/\D/g, '').length < 4) {
      throw new Error('Please enter a valid expiry date.');
    }
    if (!cvv || cvv.length < 3) {
      throw new Error('Please enter a valid security code.');
    }

    const test = TEST_CARDS[n];
    if (test?.decline) throw new Error(test.decline);

    return {
      cardType:  test?.brand ?? detectBrand(n),
      lastFour: n.slice(-4),
    };
  },
};
