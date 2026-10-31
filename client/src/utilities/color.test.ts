import { test } from "node:test";
import assert from "node:assert/strict";
import { coverColor } from "./color.ts";

const fill = (...rgb: number[]) => new Uint8ClampedArray(Array.from({ length: 16 }, () => [...rgb, 255]).flat());

test("takes the cover's hue and darkens it for white text", () => {
  assert.equal(coverColor(fill(255, 0, 0)), "hsl(0, 70%, 32%)");
  assert.equal(coverColor(fill(30, 60, 200)), "hsl(229, 70%, 32%)");
});

test("a grey cover gives a grey banner, an empty one none", () => {
  assert.equal(coverColor(fill(128, 128, 128)), "hsl(0, 0%, 32%)");
  assert.equal(coverColor(new Uint8ClampedArray()), null);
});

test("colourful pixels outweigh a mostly white cover", () => {
  const pixels = new Uint8ClampedArray([...Array(12).fill([250, 250, 250, 255]).flat(), ...Array(4).fill([0, 160, 60, 255]).flat()]);
  const hue = Number(coverColor(pixels)!.match(/hsl\((\d+)/)![1]);
  assert.ok(hue > 120 && hue < 160, `expected a green hue, got ${hue}`);
});
