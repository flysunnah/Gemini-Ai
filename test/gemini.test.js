const test = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/gemini");

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test("rejects methods other than POST", async () => {
  const res = responseRecorder();
  await handler({ method: "GET", headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.payload, { error: "Method not allowed" });
});

test("requires the server-side Gemini API key", async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const res = responseRecorder();
  try {
    await handler({ method: "POST", headers: {}, body: { message: "hello" } }, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.payload, { error: "AI service is not configured" });
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test("rejects empty and oversized messages", async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only-key";
  try {
    for (const message of ["  ", "x".repeat(12001)]) {
      const res = responseRecorder();
      await handler({ method: "POST", headers: {}, body: { message } }, res);
      assert.equal(res.statusCode, 400);
      assert.equal(res.payload.error, "message must be between 1 and 12000 characters");
    }
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test("forwards valid text using the server-side key and returns generated text", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = global.fetch;
  process.env.GEMINI_API_KEY = "test-only-key";
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Hello from Gemini" }] } }] }),
    };
  };
  try {
    const res = responseRecorder();
    await handler({ method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000" }, body: { message: "hello" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload, { text: "Hello from Gemini" });
    assert.equal(request.options.headers["x-goog-api-key"], "test-only-key");
    assert.equal(request.options.headers["x-goog-api-key"] !== undefined, true);
    assert.equal(request.options.body.includes("hello"), true);
    assert.equal(request.url.includes("key="), false);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }
});
