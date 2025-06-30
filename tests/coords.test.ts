/**
 * @fileoverview Tests for coordinate and unit conversion utilities
 */

import { toPoints } from '../src/utils/coords.js';

describe('toPoints unit conversion', () => {
  const pageWidth = 368.5;  // Typical page width in points
  const pageHeight = 576;   // Typical page height in points

  describe('numeric values', () => {
    test('should pass through numbers unchanged', () => {
      expect(toPoints(100, 'x', pageWidth, pageHeight)).toBe(100);
      expect(toPoints(50.5, 'y', pageWidth, pageHeight)).toBe(50.5);
    });
  });

  describe('unit conversions', () => {
    test('should convert millimeters to points correctly', () => {
      // 296mm should convert to ~839pt (the problematic case)
      const result = toPoints('296mm', 'w', pageWidth, pageHeight);
      expect(result).toBeCloseTo(839.055, 2);
    });

    test('should convert centimeters to points correctly', () => {
      const result = toPoints('10cm', 'w', pageWidth, pageHeight);
      expect(result).toBeCloseTo(283.465, 2);
    });

    test('should convert inches to points correctly', () => {
      const result = toPoints('2in', 'w', pageWidth, pageHeight);
      expect(result).toBe(144); // 2 * 72
    });

    test('should handle point units explicitly', () => {
      expect(toPoints('100pt', 'x', pageWidth, pageHeight)).toBe(100);
      expect(toPoints('50.5pt', 'y', pageWidth, pageHeight)).toBe(50.5);
    });

    test('should convert pixels to points', () => {
      const result = toPoints('96px', 'w', pageWidth, pageHeight);
      expect(result).toBe(72); // 96 * 0.75
    });
  });

  describe('percentages', () => {
    test('should calculate percentages relative to page dimensions', () => {
      expect(toPoints('50%', 'w', pageWidth, pageHeight)).toBe(184.25); // 50% of pageWidth
      expect(toPoints('25%', 'h', pageWidth, pageHeight)).toBe(144); // 25% of pageHeight
    });
  });

  describe('special values', () => {
    test('should handle center positioning', () => {
      expect(toPoints('center', 'x', pageWidth, pageHeight)).toBe(184.25); // pageWidth / 2
      expect(toPoints('center', 'y', pageWidth, pageHeight)).toBe(288); // pageHeight / 2
    });

    test('should reject center for width/height axes', () => {
      expect(() => toPoints('center', 'w', pageWidth, pageHeight)).toThrow('Unsupported coordinate value "center" for axis w');
      expect(() => toPoints('center', 'h', pageWidth, pageHeight)).toThrow('Unsupported coordinate value "center" for axis h');
    });
  });

  describe('string numbers', () => {
    test('should handle string numbers without units', () => {
      expect(toPoints('100', 'x', pageWidth, pageHeight)).toBe(100);
      expect(toPoints('50.5', 'y', pageWidth, pageHeight)).toBe(50.5);
    });
  });

  describe('error cases', () => {
    test('should throw on invalid unit values', () => {
      expect(() => toPoints('invalidmm', 'x', pageWidth, pageHeight)).toThrow('Invalid millimeter value');
      expect(() => toPoints('abc', 'x', pageWidth, pageHeight)).toThrow('Unsupported coordinate value');
    });

    test('should throw on unsupported values', () => {
      expect(() => toPoints('unknown', 'x', pageWidth, pageHeight)).toThrow('Unsupported coordinate value');
    });
  });

  describe('real-world problematic case', () => {
    test('should handle the 296mm frame width issue correctly', () => {
      // The reported issue: 296mm wide frame on 368.5pt page
      const frameWidthMM = toPoints('296mm', 'w', pageWidth, pageHeight);
      const frameWidthExpected = 296 * 2.834645669; // ~839pt
      
      expect(frameWidthMM).toBeCloseTo(frameWidthExpected, 2);
      expect(frameWidthMM).toBeGreaterThan(pageWidth); // This should be true - it extends beyond page
      
      // But if agent meant 296pt, it should fit on page
      const frameWidthPt = toPoints('296pt', 'w', pageWidth, pageHeight);
      expect(frameWidthPt).toBe(296);
      expect(frameWidthPt).toBeLessThan(pageWidth); // This should fit
    });
  });
});