import { test } from "node:test";
import assert from "node:assert/strict";
import formatTime from "./time.ts";

test("formats milliseconds as m:ss without rounding up to :60", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(61000), "1:01");
  assert.equal(formatTime(59999), "0:59");
});
