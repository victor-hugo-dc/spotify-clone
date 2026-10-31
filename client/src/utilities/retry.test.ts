import { test } from "node:test";
import assert from "node:assert/strict";
import { retried } from "./retry.ts";

const failure = (status?: number) => Object.assign(new Error(`failed ${status}`), { status });

// A load that throws each of `errors` in turn, then answers "ok"; `calls` counts the tries.
function loader(...errors: Error[]) {
  const load = async () => {
    load.calls++;
    const error = errors.shift();
    if (error) throw error;
    return "ok";
  };
  load.calls = 0;
  return load;
}

test("tries again, after each wait, while Spotify is busy, failing or out of reach", async () => {
  const load = loader(failure(429), failure(undefined));
  const start = Date.now();
  assert.equal(await retried(load, [20, 40]), "ok");
  assert.equal(load.calls, 3);
  assert.ok(Date.now() - start >= 55, "didn't wait between tries");
});

test("gives up with the last error once the waits run out", async () => {
  const load = loader(failure(503), failure(500), failure(502));
  await assert.rejects(retried(load, [1, 1]), /failed 502/);
  assert.equal(load.calls, 3);
});

test("doesn't ask again when the answer won't change", async () => {
  for (const status of [401, 403, 404]) {
    const load = loader(failure(status));
    await assert.rejects(retried(load, [1, 1]), new RegExp(`failed ${status}`));
    assert.equal(load.calls, 1);
  }
});
