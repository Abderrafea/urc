import { expect, test } from 'vitest';
import { detectImage } from '../../lib/images.js';
import { summarizeReactions } from '../../lib/reactions.js';
test('les images acceptent PNG et GIF et refusent SVG, texte et dépassement', () => {
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  expect(detectImage(png)?.mime).toBe('image/png');
  expect(
    detectImage(Buffer.from('GIF89a' + String.fromCharCode(1, 0, 1, 0, 0, 0, 0)).toString('base64'))
      ?.mime,
  ).toBe('image/gif');
  for (const value of [
    null,
    '?',
    Buffer.from('<svg/>').toString('base64'),
    Buffer.alloc(1048577).toString('base64'),
  ])
    expect(detectImage(value)).toBeNull();
});
test('les réactions sont isolées par message et identifient le vote courant', () => {
  const result = summarizeReactions(
    { 'one:2': '👍', 'one:3': '👍', 'two:2': '❤️', 'one:4': 'invalid' },
    'one',
    2,
  );
  expect(result).toEqual({ counts: { '👍': 2, '❤️': 0, '😂': 0 }, mine: '👍' });
});
