import { strict as assert } from "node:assert";
import { test } from "node:test";
import { assertHyperframesDimensions } from "../src/engine/hyperframes-format";

test("HyperFrames accepts native landscape and portrait films", () => {
  assert.doesNotThrow(() =>
    assertHyperframesDimensions(
      '<div data-composition-id="main" data-width="1920" data-height="1080">',
      false,
    ),
  );
  assert.doesNotThrow(() =>
    assertHyperframesDimensions(
      "<div data-height='1920' data-width='1080' data-composition-id='main'>",
      true,
    ),
  );
});

test("A format override cannot silently crop or stretch native HTML", () => {
  assert.throws(() =>
    assertHyperframesDimensions(
      '<div data-composition-id="main" data-width="1080" data-height="1920">',
      false,
    ),
  );
  assert.throws(() =>
    assertHyperframesDimensions(
      '<div data-width="1920" data-height="1080">',
      false,
    ),
  );
});
