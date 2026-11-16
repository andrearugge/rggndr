import { expect, test } from '@playwright/test';
import { imageAttrs } from '../../src/content/image';

test('reads natural size from the asset ref', () => {
  const a = imageAttrs({ asset: { _ref: 'image-abc-1200x901-jpg' }, alt: 'A' }, { width: 800 });
  expect(a.width).toBe(1200);
  expect(a.height).toBe(901);
  expect(a.alt).toBe('A');
  expect(a.src).toContain('cdn.sanity.io/images/');
  expect(a.src).toContain('abc-1200x901.jpg');
  expect(a.src).toContain('w=800');
  expect(a.src).toContain('auto=format');
});

test('srcset skips widths larger than the original', () => {
  const a = imageAttrs(
    { asset: { _ref: 'image-abc-1200x901-jpg' }, alt: 'A' },
    { width: 800, widths: [400, 800, 1600], sizes: '50vw' },
  );
  expect(a.srcset).toMatch(/w=400\S* 400w/);
  expect(a.srcset).toMatch(/w=800\S* 800w/);
  expect(a.srcset).not.toContain('1600w');
  expect(a.sizes).toBe('50vw');
});

test('throws without alt', () => {
  expect(() => imageAttrs({ asset: { _ref: 'image-abc-10x10-jpg' }, alt: '' }, { width: 10 })).toThrow(/alt/);
});

test('throws without asset', () => {
  expect(() => imageAttrs(null, { width: 10 })).toThrow();
  expect(() => imageAttrs({ asset: null, alt: 'A' }, { width: 10 })).toThrow();
});
