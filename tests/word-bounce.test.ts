import assert from "node:assert/strict";
import test from "node:test";
import { wordBounce } from "../src/developer/word-bounce";

test("a spoken word moves the whole character through the reference arc at either frame rate", () => {
  for (const fps of [30, 60]) {
    const words = [{ start: 1 }];
    assert.equal(wordBounce(fps - 1, fps, words), 0);
    assert.equal(wordBounce(fps, fps, words), 0);
    assert.equal(wordBounce(fps + (4 * fps) / 30, fps, words), 16);
    assert.equal(wordBounce(fps + (8 * fps) / 30, fps, words), 0);
  }
});

test("a close second word restarts at rest and the character settles in the pause", () => {
  const words = [{ start: 1 }, { start: 1.1 }];
  assert.ok(wordBounce(65, 60, words) > 0);
  assert.equal(wordBounce(66, 60, words), 0);
  assert.equal(wordBounce(74, 60, words), 16);
  assert.equal(wordBounce(100, 60, words), 0);
  assert.equal(wordBounce(100, 60, []), 0);
});
