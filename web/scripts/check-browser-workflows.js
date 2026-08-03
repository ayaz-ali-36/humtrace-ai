const assert = require("assert");
const fs = require("fs");
const path = require("path");

const browserUrl = process.env.HUMTRACE_CDP_URL || "http://127.0.0.1:9228";
const baseUrl = process.env.HUMTRACE_BASE_URL || "http://127.0.0.1:3025";
const faceFixture = process.env.HUMTRACE_BROWSER_FACE_FIXTURE ? path.resolve(process.env.HUMTRACE_BROWSER_FACE_FIXTURE) : "";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.exceptions = [];
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = reject;
    });
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown") this.exceptions.push(message.params.exceptionDetails?.text || "Browser exception");
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    };
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
    return result.result.value;
  }
}

async function eventually(test, message, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      last = await test();
      if (last) return last;
    } catch (error) {
      last = error.message;
    }
    await sleep(150);
  }
  throw new Error(`${message}${last ? ` (last: ${last})` : ""}`);
}

function valueScript(selector, value) {
  return `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`;
}

function clickTextScript(text, selector = "button") {
  return `(() => {
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find((element) => element.textContent.trim().replace(/\\s+/g, " ") === ${JSON.stringify(text)});
    if (!target) return false;
    target.click();
    return true;
  })()`;
}

async function main() {
  assert(faceFixture && path.isAbsolute(faceFixture) && fs.existsSync(faceFixture), "HUMTRACE_BROWSER_FACE_FIXTURE must reference a permitted local LFW JPEG in temporary test storage");
  const targets = await fetch(`${browserUrl}/json/list`).then((response) => response.json());
  const target = targets.find((item) => item.type === "page");
  assert(target?.webSocketDebuggerUrl, "a headless Edge page target is required");

  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

  const navigate = async (path) => {
    await cdp.send("Page.navigate", { url: baseUrl + path });
    await eventually(() => cdp.evaluate(`document.readyState === "complete"`), `page did not load: ${path}`, 60000);
    await sleep(500);
  };
  const text = () => cdp.evaluate("document.body.innerText");
  const clickText = (label, selector) => cdp.evaluate(clickTextScript(label, selector));
  const setValue = (selector, value) => cdp.evaluate(valueScript(selector, value));

  await navigate("/");
  let body = await text();
  assert.match(body, /Possible Similarity Review/i, "home page should explain possible recommendations");
  assert(await cdp.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "mobile home should not overflow horizontally");
  assert(await cdp.evaluate("document.querySelector('[aria-label=\"Open navigation\"]')?.click() || true"));
  await eventually(() => cdp.evaluate("Boolean(document.querySelector('[role=dialog][aria-modal=true]'))"), "mobile navigation should open");
  await cdp.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))");
  await eventually(() => cdp.evaluate("!document.querySelector('[role=dialog][aria-modal=true]')"), "Escape should close mobile navigation");

  await navigate("/browse");
  body = await text();
  assert.match(body, /UI-2026-0001/, "public Browse should include the seeded fictional report");
  assert(!/[\w.-]+@humtrace\.demo|\+92-/.test(body), "public Browse must not expose reporter contact details");
  assert(await setValue('input[placeholder*="Search by report ID"]', "UI-2026-0001"));
  await sleep(100);
  assert.equal(await cdp.evaluate("document.querySelectorAll('article').length"), 1, "Browse filter should narrow the directory");
  assert(await clickText("View Details"));
  await eventually(() => cdp.evaluate("Boolean(document.querySelector('[role=dialog]'))"), "public report details should open as a dialog");
  body = await cdp.evaluate("document.querySelector('[role=dialog]').innerText");
  assert.match(body, /contact.*(hidden|shared|accept)/is, "public detail dialog should explain contact privacy");

  await navigate("/track");
  assert(await setValue('input[placeholder="MP-2026-0047"]', "UI-2026-0001"));
  assert(await clickText("Track Case"));
  await eventually(async () => (await text()).includes("UI-2026-0001"), "public tracking result should render");

  await navigate("/search");
  assert(await setValue('textarea[name="description"]', "brown jacket fictional workflow fixture"));
  assert(await cdp.evaluate("document.querySelector('input[name=aiProcessingConsent]').click() || true"));
  assert(await clickText("Find Possible Recommendations"));
  await eventually(() => cdp.evaluate("document.querySelector('button[type=submit]')?.disabled === true"), "Smart Search should disable double submission", 3000);
  await eventually(async () => /Search completed|AI assistance is disabled|possible recommendation/i.test(await text()), "Smart Search should render a result or safe notice", 15000);

  await navigate("/report/missing");
  assert(await clickText("Next"));
  await eventually(async () => /Enter at least two characters|Approximate age is required/.test(await text()), "report wizard should show step validation");
  for (const [selector, value] of [
    ['input[name="name"]', "Fictional Browser Person"],
    ['input[name="age"]', "29"],
    ['select[name="gender"]', "Not specified"],
    ['input[name="heightFeet"]', "5.7"],
    ['input[name="weightKg"]', "68"]
  ]) assert(await setValue(selector, value), `missing report field not found: ${selector}`);
  assert(await clickText("Next"));
  await eventually(async () => (await text()).includes("Last Seen Details"), "report wizard should advance to location");
  assert(await setValue('select[name="region"]', "Punjab"));
  assert(await setValue('input[name="locationDetail"]', "Fictional browser test location"));
  assert(await clickText("Next"));
  await eventually(async () => (await text()).includes("Physical Description"), "report wizard should advance to description");
  assert(await setValue('textarea[name="description"]', "Clearly fictional, non-operational browser workflow record."));
  assert(await clickText("Next"));
  await eventually(async () => (await text()).includes("Photo Upload"), "report wizard should advance to photo upload");
  const documentNode = await cdp.send("DOM.getDocument", { depth: 1 });
  const fileInput = await cdp.send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: "input[type=file]" });
  assert(fileInput.nodeId, "report photo input should exist");
  await cdp.send("DOM.setFileInputFiles", { nodeId: fileInput.nodeId, files: [faceFixture] });
  assert(await clickText("Next"));
  await eventually(async () => (await text()).includes("No account is required to submit"), "public report wizard should explain account-free submission");
  const browserEmail = `browser-public-${Date.now()}@humtrace.demo`;
  assert(await setValue('input[name="reporterName"]', "Public Browser Submitter"));
  assert(await setValue('input[name="reporterEmail"]', browserEmail));
  assert(await clickText("Next"));
  await eventually(async () => (await text()).includes("Privacy and Consent"), "report wizard should advance to consent");
  for (const name of ["publicVisible", "photoConfirm", "aiProcessingConsent", "consent"]) {
    assert(await cdp.evaluate(`(() => { const element = document.querySelector('input[name=${name}]'); if (!element) return false; element.click(); return true; })()`), `consent control missing: ${name}`);
  }
  assert(await clickText("Next"));
  await eventually(async () => (await text()).includes("Review and Submit"), "report wizard should reach review");
  assert(await clickText("Submit Report"));
  await eventually(async () => (await text()).includes("Report submitted:"), "browser report submission should complete", 15000);
  body = await text();
  const submittedCase = body.match(/Case (MP-\d{4}-\d{4})/)?.[1];
  const claimCode = body.match(/HTC-(?:[23456789A-HJ-NP-Z]{4}-){3}[23456789A-HJ-NP-Z]{4}/)?.[0];
  assert(submittedCase, "browser report submission should display a case ID");
  assert(claimCode, "public browser submission should display a one-time claim code");

  await navigate(`/register?returnTo=${encodeURIComponent(`/reporter/claim-report?caseId=${submittedCase}`)}`);
  assert(await setValue('input:not([type])', "Public Browser Submitter"));
  assert(await setValue('input[type="email"]', browserEmail));
  assert(await cdp.evaluate(valueScript('input[type="password"]', "BrowserClaim!2026")));
  assert(await cdp.evaluate(`(() => { const element = document.querySelectorAll('input[type="password"]')[1]; if (!element) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, 'BrowserClaim!2026'); element.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`));
  assert(await cdp.evaluate("document.querySelector('input[type=checkbox]').click() || true"));
  assert(await clickText("Create Account"));
  await eventually(() => cdp.evaluate("location.pathname === '/login' && location.search.includes('returnTo=')"), "registration should preserve the claim destination", 60000);
  await eventually(() => cdp.evaluate("document.readyState === 'complete' && Boolean(document.querySelector('button[type=submit]'))"), "redirected login page should finish loading", 30000);
  await sleep(500);
  assert(await setValue('input[type="email"]', browserEmail));
  assert(await setValue('input[type="password"]', "BrowserClaim!2026"));
  assert(await clickText("Sign In"));
  await eventually(() => cdp.evaluate("location.pathname === '/reporter/claim-report'"), "sign-in should return the submitter to report claiming", 60000);
  await eventually(() => cdp.evaluate(`document.querySelector('input[placeholder^="HTC-"]')?.value === ${JSON.stringify(claimCode)}`), "the session-only claim code should be restored without placing it in the URL");
  assert(await clickText("Claim Report"));
  await eventually(async () => (await text()).includes("Report claimed successfully"), "the public submitter should claim the report", 60000);

  const cookies = await cdp.send("Network.getCookies", { urls: [baseUrl] });
  const sessionCookie = cookies.cookies.find((cookie) => cookie.name === "humtrace_session");
  assert(sessionCookie?.httpOnly, "browser session cookie should be HttpOnly");
  assert.equal(sessionCookie.secure, false, "isolated HTTP demo should use the explicit non-secure-cookie override");

  await navigate("/reporter/my-reports");
  body = await text();
  assert(body.includes(submittedCase), "My Reports should show the browser-submitted report");
  assert(!body.includes("UI-2026-0001"), "My Reports should not show another reporter's report");
  assert(await cdp.evaluate("document.querySelector('[aria-label=\"Open portal navigation\"]')?.click() || true"));
  await eventually(() => cdp.evaluate("Boolean(document.querySelector('[role=dialog]'))"), "mobile portal navigation should open");
  assert(await clickText("Logout"));
  await eventually(() => cdp.evaluate("location.pathname === '/login'"), "browser logout should clear the reporter session");

  await navigate("/admin/login");
  assert(await setValue('input[type="email"]', "admin@humtrace.demo"));
  assert(await setValue('input[type="password"]', "AdminDemo!2026"));
  assert(await clickText("Sign In"));
  await eventually(() => cdp.evaluate("location.pathname === '/admin/dashboard'"), "real browser admin login should reach the dashboard", 12000);
  await navigate("/admin/manage");
  body = await text();
  for (const label of ["Reports", "Users", "Audit Logs", "Settings"]) assert(body.includes(label), `admin Manage should include ${label}`);
  assert(!body.includes("passwordHash"), "admin HTML must not expose password hashes");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.reload", { ignoreCache: false });
  await eventually(() => cdp.evaluate("document.readyState === 'complete'"), "desktop admin page should reload");
  assert(await cdp.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "desktop admin layout should not overflow horizontally");

  assert.deepEqual(cdp.exceptions, [], `browser runtime exceptions were observed: ${cdp.exceptions.join("; ")}`);
  console.log(`Browser workflow check passed in headless Edge; submitted ${submittedCase}`);
  cdp.socket.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
