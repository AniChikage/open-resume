import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { create } from 'fontkit';
import { getPdfFontKey } from '../src/lib/pdf-fonts.ts';
import { createEditorHistory } from '../src/lib/editor-history.ts';

test('PDF font selection checks real content and falls back for every non-Latin script', () => {
  const latin = 'Résumé · Straße — Łódź / Москва / Ελληνικά → €';
  assert.equal(getPdfFontKey('Arial', latin), 'sans-latin');
  assert.equal(getPdfFontKey('Georgia', latin), 'serif-latin');
  assert.equal(getPdfFontKey('Resume PDF Serif Latin'), 'serif-latin');
  assert.equal(getPdfFontKey('Arial', '中文简历 · 软件工程师'), 'sans-common');
  assert.equal(getPdfFontKey('SimSun', '中文简历'), 'serif-common');
  for (const text of ['髙', '日本語', '한국어', 'Profile 📚', 'ภาษาไทย', 'مرحبا']) {
    assert.equal(getPdfFontKey('Arial', text), 'sans');
    assert.equal(getPdfFontKey('Georgia', text), 'serif');
  }
});

test('common Chinese fonts preserve glyphs and widths while rare characters use the full font', async () => {
  for (const family of ['Sans', 'Serif']) for (const weight of ['Regular', 'Bold']) {
    const smallBytes = await readFile(new URL(`../public/fonts/Resume${family}Common-${weight}.otf`, import.meta.url));
    assert.ok(smallBytes.length < 5_000_000);
    const small = create(smallBytes), full = create(await readFile(new URL(`../public/fonts/Noto${family}CJKsc-${weight}.otf`, import.meta.url)));
    if ('fonts' in small || 'fonts' in full) throw new Error('Unexpected collection');
    for (const char of '简历个人信息工作经验教育项目技能张王刘陈工程师·') {
      const code = char.codePointAt(0)!;
      assert.ok(small.hasGlyphForCodePoint(code), char);
      assert.equal(small.glyphForCodePoint(code).advanceWidth, full.glyphForCodePoint(code).advanceWidth, char);
      assert.equal(small.glyphForCodePoint(code).path.toSVG(), full.glyphForCodePoint(code).path.toSVG(), char);
    }
    assert.ok(full.hasGlyphForCodePoint('髙'.codePointAt(0)!));
    assert.equal(small.hasGlyphForCodePoint('髙'.codePointAt(0)!), false);
  }
});

test('small fonts preserve original glyph outlines and advances for all families and weights', async () => {
  for (const family of ['Sans', 'Serif']) for (const weight of ['Regular', 'Bold']) {
    const bytes = await readFile(new URL(`../public/fonts/Resume${family}Latin-${weight}.otf`, import.meta.url));
    assert.ok(bytes.length < 120_000, 'Latin fonts must stay small');
    const original = create(await readFile(new URL(`../public/fonts/Noto${family}CJKsc-${weight}.otf`, import.meta.url)));
    const small = create(bytes);
    if ('fonts' in original || 'fonts' in small) throw new Error('Unexpected collection');
    assert.equal(small.unitsPerEm, original.unitsPerEm);
    for (const char of 'RésuméStraßeŁódźМоскваΕλληνικά→€•0123456789') {
      const cp = char.codePointAt(0)!;
      assert.equal(small.hasGlyphForCodePoint(cp), original.hasGlyphForCodePoint(cp), char);
      assert.equal(small.glyphForCodePoint(cp).advanceWidth, original.glyphForCodePoint(cp).advanceWidth, char);
      assert.equal(small.glyphForCodePoint(cp).path.toSVG(), original.glyphForCodePoint(cp).path.toSVG(), char);
    }
  }
});

test('history keeps no-op detection and undo without serializing a large shared photo', () => {
  const profile = { avatar: 'a'.repeat(2_000_000), name: 'Alex' };
  const initial = { profile, settings: { accent: 'blue' } };
  const history = createEditorHistory(initial);
  history.commit({ ...initial, settings: { ...initial.settings } });
  assert.equal(history.getSnapshot().canUndo, false);
  const next = { ...initial, profile: { ...profile, name: 'Morgan' } };
  history.commit(next); assert.equal(history.getSnapshot().present.profile.name, 'Morgan');
  history.undo(); assert.equal(history.getSnapshot().present, initial);
  history.redo(); assert.equal(history.getSnapshot().present, next);
});
