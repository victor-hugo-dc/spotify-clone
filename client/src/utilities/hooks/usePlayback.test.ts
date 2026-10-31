import { test } from "node:test";
import assert from "node:assert/strict";
import { isStartedList } from "./usePlayback.ts";

const on = (trackUri: string | null, contextUri: string | null = null) => ({ trackUri, contextUri, playing: true, deviceId: null });
const liked = ["a", "b", "c"];

test("the list started here while the player, with no context, is on one of its tracks", () => {
  assert.equal(isStartedList(liked, liked, on("b")), true);
  assert.equal(isStartedList(liked, liked, on("b", "spotify:playlist:p1")), false);
  assert.equal(isStartedList(liked, liked, on("z")), false);
  assert.equal(isStartedList(liked, liked, on(null)), false);
});

test("allows for pages loaded since, or not loaded again yet", () => {
  assert.equal(isStartedList(["a", "b"], liked, on("a")), true);
  assert.equal(isStartedList(liked, ["a", "b"], on("c")), true);
  assert.equal(isStartedList(liked, ["new", ...liked], on("a")), false);
});

test("a lone track, as song cards play, only when it's the whole list", () => {
  assert.equal(isStartedList(["a"], liked, on("a")), false);
  assert.equal(isStartedList(["a"], ["a"], on("a")), true);
  assert.equal(isStartedList([], ["a"], on("a")), false);
});
