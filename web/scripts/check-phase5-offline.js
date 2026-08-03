const assert = require("assert");

const baseUrl = process.env.HUMTRACE_BASE_URL || "http://127.0.0.1:3025";

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] || "";
}

async function json(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { response, data: await response.json() };
}

async function main() {
  const login = await json("/api/auth/login", {
    method: "POST",
    body: { email: "admin@humtrace.demo", password: "AdminDemo!2026", adminOnly: true }
  });
  assert.equal(login.response.status, 200, "admin login should work");
  const cookie = cookieFrom(login.response);

  const current = await json("/api/admin/settings", { cookie });
  assert.equal(current.response.status, 200, "admin settings should load");
  const original = current.data.settings;

  try {
    const enabled = await json("/api/admin/settings", {
      method: "PATCH",
      cookie,
      body: { settings: { aiAssistanceEnabled: true, textSimilarityEnabled: true, faceSimilarityEnabled: true } }
    });
    assert.equal(enabled.response.status, 200, "development AI switches should enable for offline validation");

    const form = new FormData();
    form.set("age", "25");
    form.set("gender", "Male");
    form.set("description", "brown jacket fictional workflow fixture");
    form.set("searchScope", "ALL");
    form.set("aiProcessingConsent", "true");

    const started = Date.now();
    const response = await fetch(`${baseUrl}/api/search/recommendations`, { method: "POST", body: form });
    const elapsedMs = Date.now() - started;
    const data = await response.json();

    assert.equal(response.status, 200, "offline Smart Search should retain safe fallback behavior");
    assert(elapsedMs < 15000, `offline fallback should finish promptly, observed ${elapsedMs}ms`);
    assert(Array.isArray(data.recommendations), "offline response should contain a recommendation list");
    assert.match(data.notice || "", /unavailable|fallback/i, "offline response should explain the safe fallback");
    assert.equal(data.aiAssistance?.imageGenerated, false, "offline fallback must never generate imagery");
    assert.equal(data.aiAssistance?.humanReviewRequired, true, "offline fallback must require human review");

    console.log(`Phase 5 offline workflow check passed in ${elapsedMs}ms against ${baseUrl}`);
  } finally {
    await json("/api/admin/settings", {
      method: "PATCH",
      cookie,
      body: {
        settings: {
          aiAssistanceEnabled: original.aiAssistanceEnabled,
          textSimilarityEnabled: original.textSimilarityEnabled,
          faceSimilarityEnabled: original.faceSimilarityEnabled
        }
      }
    }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
