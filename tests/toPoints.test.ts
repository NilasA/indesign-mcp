import { expect, test } from '@jest/globals';
import { toPoints } from '../src/utils/coords.js';

test('percentage converts correctly', () => {
  expect(toPoints('50%', 'x', 200, 400)).toBe(100);
  expect(toPoints('25%', 'y', 200, 400)).toBe(100);
});

test('center keyword converts correctly', () => {
  expect(toPoints('center', 'x', 300, 600)).toBe(150);
  expect(toPoints('center', 'y', 300, 600)).toBe(300);
});

test('plain numbers pass through unchanged', () => {
  expect(toPoints(100, 'x', 200, 400)).toBe(100);
  expect(toPoints('72', 'y', 200, 400)).toBe(72);
});

test('length unit strings convert correctly', () => {
  expect(toPoints('10mm', 'x', 0, 0)).toBeCloseTo(10 * 2.834645669);
  expect(toPoints('2cm', 'x', 0, 0)).toBeCloseTo(2 * 28.34645669);
  expect(toPoints('1in', 'y', 0, 0)).toBeCloseTo(72);
  expect(toPoints('96px', 'y', 0, 0)).toBeCloseTo(96 * 0.75);
});

test('throws error for unsupported strings', () => {
  expect(() => toPoints('invalid', 'x', 200, 400)).toThrow('Unsupported coordinate value: invalid');
}); 