/**
 * E2E test: boots the real app against the mock provider and proves
 *   1) the boot screen plays and hands off to the UI,
 *   2) a chat turn with two saved keys REPLIES (the original bug),
 *   3) the reply arrived through the SECOND key after the first hit
 *      its quota (rotation works), with the rotation toast/banner,
 *   4) usage events were recorded (token accounting works).
 *
 * The mock provider must be running on :8787 (scripts/mock-provider.cjs).
 * The vite dev server must be running on :5173.
 */
const { chromium } = require("/home/z/.npm-global/lib/node_modules/playwright");

const BASE = "http://localhost:5173";

// A custom provider entry pointing at the mock; we drive the app's own
// catalog through the provider picker by using an OpenAI-compatible
// provider and overriding the base URL in the key form.
const PROVIDER_NAME = "Groq"; // openai adapter, baseUrl overridable in the form

/** Waits out the boot animation, then unlocks the vault if this reload locked it. */
async function ensureUnlocked(page) {
  await page.locator("nav, aside").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator("text=Vault locked").count())) return;
    try {
      await page.locator('input[type="password"]').first().fill("1234", { timeout: 2000 });
      await page.getByRole("button", { name: "Unlock" }).click({ timeout: 2000 });
      await page.locator("text=Vault locked").waitFor({ state: "detached", timeout: 5000 });
      return;
    } catch {
      await page.waitForTimeout(500);
    }
  }
  throw new Error("vault never unlocked");
}

async function addKey(page, { label, secret, baseUrl }) {
  await page.goto(`${BASE}/keys/new`);
  await ensureUnlocked(page);
  await page.getByPlaceholder("Search 78 providers…").waitFor({ timeout: 10000 });
  await page.getByPlaceholder("Search 78 providers…").fill("groq");
  await page.locator("button", { hasText: PROVIDER_NAME }).first().waitFor({ timeout: 10000 });
  await page.locator("button", { hasText: PROVIDER_NAME }).first().click();
  await page.locator("#secret").waitFor({ timeout: 10000 });
  await page.locator("#label").fill(label);
  await page.locator("#secret").fill(secret);
  await page.locator("#baseUrl").fill(baseUrl);
  await page.getByRole("button", { name: "Save key" }).click();
  await page.waitForURL(/\/keys\/[^/]+$/, { timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const netLog = [];
  page.on("response", (r) => {
    if (r.url().includes("chat/completions")) netLog.push("RES " + r.status());
  });
  page.on("request", (r) => {
    if (r.url().includes("chat/completions")) netLog.push("REQ " + (r.headers()["authorization"] || "?").slice(7, 21));
  });
  const failures = [];
  const ok = (name, cond) => {
    console.log(`${cond ? "  PASS" : "  FAIL"}  ${name}`);
    if (!cond) failures.push(name);
  };

  // 1. Boot screen appears then resolves.
  await page.goto(BASE);
  const boot = await page.locator("h1", { hasText: "NthRouter" }).first().isVisible().catch(() => false);
  await page.waitForSelector("text=Your keys, at a glance", { timeout: 15000 });
  ok("boot screen -> dashboard", true);
  ok("boot title visible during boot", boot);

  // 2. Add two keys on the same provider. The VALID key goes in first (it also
  //    creates the vault, PIN 1234); the QUOTA key second. Keys are stored
  //    newest-first, so the quota key is attempted first and the turn must
  //    rotate to the valid key — exactly the scenario being tested.
  await page.goto(`${BASE}/keys/new`);
  await page.getByPlaceholder("Search 78 providers…").waitFor({ timeout: 10000 });
  await page.getByPlaceholder("Search 78 providers…").fill("groq");
  await page.locator("button", { hasText: PROVIDER_NAME }).first().waitFor({ timeout: 10000 });
  await page.locator("button", { hasText: PROVIDER_NAME }).first().click();
  await page.locator("#secret").waitFor({ timeout: 10000 });
  await page.locator("#label").fill("valid key");
  await page.locator("#secret").fill("sk-mock-valid-0000000000000000000001");
  await page.locator("#baseUrl").fill("http://localhost:8787");
  await page.locator('input[inputmode="numeric"]').first().fill("1234");
  await page.locator('input[inputmode="numeric"]').nth(1).fill("1234");
  await page.getByRole("button", { name: "Save key" }).click();
  await page.waitForURL(/\/keys\/[^/]+$/, { timeout: 10000 });
  await page.waitForTimeout(400);

  await addKey(page, { label: "quota key", secret: "sk-mock-quota-0000000000000000000001", baseUrl: "http://localhost:8787" });
  await page.waitForTimeout(400);
  const storedCount = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("nthrouter.db.v1") || "{}");
    return (db.keys || []).length;
  });
  ok("two keys stored", storedCount === 2);

  // 3. Start a chat and send a message. (Vault may lock on reload — unlock first.)
  await page.goto(`${BASE}/chat`);
  await ensureUnlocked(page);
  await page.getByRole("button", { name: "New" }).first().waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "New" }).first().click();
  await page.waitForURL(/\/chat\/[^/]+$/);
  await page.getByPlaceholder("Message NthRouter…").fill("Hello there, please reply briefly.");
  await page.getByRole("button", { name: "Send" }).click();

  // Wait for the assistant reply (rotation: quota key fails, valid key streams).
  await page.locator("text=mock provider replying").first().waitFor({ timeout: 20000 });
  ok("assistant replied (chat no longer silent)", true);

  // Let the turn finish committing (message + usage records persist).
  await page.waitForFunction(
    () => document.querySelectorAll("div.anim-rise, div.space-y-6 > div").length > 0 && document.body.innerText.includes("Regenerate"),
    { timeout: 10000 }
  ).catch(() => {});
  await page.waitForTimeout(600);

  // 4. Rotation evidence: the assistant message carries the rotated-key badge
  //    (span with primary border — not the mock's prose).
  const rotatedBadge = await page.locator("span.rounded-full.border", { hasText: "rotated key" }).count();
  ok("message shows 'rotated key' badge", rotatedBadge > 0);

  // 4b. Protocol-level rotation: the turn hit the quota key first (429), then
  //     retried on the valid key (200 stream).
  ok("rotation happened (429 then 200)", netLog.some((n) => n === "RES 429") && netLog.some((n) => n === "RES 200"));

  // 5. Token accounting: the reply shows a token count; usage recorded.
  const tokenNote = await page.locator("text=tokens").count();
  ok("token accounting visible in chat", tokenNote > 0);

  // 6. Key detail: tokens spent bar for the valid key; quota key shows cooldown state.
  await page.goto(`${BASE}/keys`);
  await ensureUnlocked(page);
  await page.locator("text=stored on this device").waitFor({ timeout: 10000 });
  const cards = await page.locator("div.group.cursor-pointer").count();
  ok("two key cards on keys page", cards === 2);

  // The quota key should show a rotation/quota chip eventually.
  await page.waitForTimeout(400);
  const quotaChip = await page.locator("text=quota hit").count();
  const cooldownChip = await page.locator("text=cooling down").count();
  ok("quota key shows rotation state chip", quotaChip > 0 || cooldownChip > 0);

  // 7. Dashboard stats populated (usage events exist).
  await page.goto(`${BASE}/`);
  await ensureUnlocked(page);
  await page.waitForSelector("text=Top providers", { timeout: 10000 });
  await page.waitForTimeout(500);
  const providerRow = await page.locator("text=Groq").count();
  ok("dashboard lists provider usage", providerRow > 0);

  // 8. Theme toggle works (Claude-like light/dark).
  await page.locator('button[aria-label="Toggle theme"]').waitFor({ timeout: 5000 });
  await page.locator('button[aria-label="Toggle theme"]').click();
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  ok("dark theme toggles", isDark);

  console.log(failures.length ? `\nFAILED: ${failures.join(", ")}` : "\nALL E2E CHECKS PASSED");
  await browser.close();
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error("E2E error:", e);
  process.exit(1);
});
