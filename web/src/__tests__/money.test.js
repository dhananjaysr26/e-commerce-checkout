import { describe, it, expect } from 'vitest';
import { formatMoney } from '../utils/money';

describe('formatMoney utility', () => {
  it('formats minor units to INR correctly', () => {
    expect(formatMoney(49999)).toMatch(/499\.99/);
    expect(formatMoney(0)).toMatch(/0\.00/);
    expect(formatMoney(100)).toMatch(/1\.00/);
  });
});
