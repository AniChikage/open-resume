import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_ZOOM, MIN_ZOOM, previewScale } from '../src/lib/preview-scale.ts';

// An A4 page at 100% is about 794 x 1123 pixels.
const page = { pageWidth: 794, pageHeight: 1123 };

test('"page" shows the whole page, so a short window makes it small', () => {
  const wide = { width: 900, height: 500, ...page };
  assert.ok(Math.abs(previewScale('page', wide, 1) - 500 / 1123) < 1e-9, 'limited by the height');
  const tall = { width: 400, height: 2000, ...page };
  assert.ok(Math.abs(previewScale('page', tall, 1) - 400 / 794) < 1e-9, 'limited by the width');
});

test('"width" fills the panel width whatever its height', () => {
  const wide = { width: 900, height: 500, ...page };
  assert.ok(Math.abs(previewScale('width', wide, 1) - 900 / 794) < 1e-9);
  assert.ok(previewScale('width', wide, 1) > previewScale('page', wide, 1), 'larger and readable on a wide, short window');
  assert.ok(Math.abs(previewScale('width', { width: 400, height: 300, ...page }, 1) - 400 / 794) < 1e-9);
});

test('neither fit enlarges a page past what stays sharp', () => {
  const huge = { width: 5000, height: 5000, ...page };
  assert.equal(previewScale('page', huge, 1), 1.1);
  assert.equal(previewScale('width', huge, 1), 1.6);
});

test('the user\'s zoom multiplies the fit and stays within its bounds', () => {
  const space = { width: 794, height: 5000, ...page };
  assert.equal(previewScale('width', space, 1), 1);
  assert.ok(Math.abs(previewScale('width', space, 1.2) - 1.2) < 1e-9);
  assert.equal(previewScale('width', space, 100), MAX_ZOOM, 'zoom is capped');
  assert.equal(previewScale('width', space, 0.01), MIN_ZOOM, 'and floored');
});
