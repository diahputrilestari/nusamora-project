import { expect, test } from "@playwright/test";

test.describe("deteksi bahasa dari Accept-Language", () => {
  test("browser id-ID -> /id", async ({ browser }) => {
    const c = await browser.newContext({ locale: "id-ID" }); const page = await c.newPage();
    await page.goto("/"); await expect(page).toHaveURL(/\/id$/); await c.close();
  });
  test("browser en-US -> /en", async ({ browser }) => {
    const c = await browser.newContext({ locale: "en-US" }); const page = await c.newPage();
    await page.goto("/"); await expect(page).toHaveURL(/\/en$/); await c.close();
  });
  test("bahasa tak didukung (fr-FR) -> bahasa default /id", async ({ browser }) => {
    const c = await browser.newContext({ locale: "fr-FR" }); const page = await c.newPage();
    await page.goto("/"); await expect(page).toHaveURL(/\/id$/); await c.close();
  });
});

test("/ dialihkan ke bahasa default /id", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/id$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Setiap Momen Menjadi Kenangan");
});

test("pergantian bahasa mengubah teks tanpa pindah halaman dan tersimpan", async ({ page }) => {
  await page.goto("/id");
  await page.getByTestId("lang-switcher").getByRole("button", { name: "EN" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every Moment, Made Memorable.");
  await page.goto("/"); // preferensi tersimpan di cookie NEXT_LOCALE
  await expect(page).toHaveURL(/\/en$/);
});

test("hreflang dan canonical ada di /en", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveCount(1);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
});

test("bahasa tidak dikenal -> 404 yang ramah", async ({ page }) => {
  const r = await page.goto("/fr");
  expect(r?.status()).toBe(404);
});

test("health check", async ({ request }) => {
  const r = await request.get("/api/health");
  expect([200, 503]).toContain(r.status());
  expect(r.headers()["cache-control"]).toContain("no-store");
});

test("tanpa overflow horizontal di 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/en");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("header keamanan: CSP bernonce (report-only), frame-ancestors, nosniff", async ({ request }) => {
  const r = await request.get("/id");
  const h = r.headers();
  const csp = h["content-security-policy-report-only"] ?? h["content-security-policy"];
  expect(csp).toBeTruthy();
  expect(csp).toMatch(/nonce-[A-Za-z0-9+/=]+/);
  expect(csp).toContain("frame-ancestors 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
});

test("endpoint laporan CSP menerima laporan dan tidak error", async ({ request }) => {
  const r = await request.post("/api/csp-report", { data: { "csp-report": { "blocked-uri": "https://x.example/a?token=SECRET", "effective-directive": "script-src" } }, headers: { "content-type": "application/csp-report" } });
  expect(r.status()).toBe(204);
});

test("nonce CSP benar-benar diteruskan ke HTML: semua <script> bernonce yang sama dengan header", async ({ request }) => {
  const r = await request.get("/id");
  const csp = r.headers()["content-security-policy-report-only"] ?? r.headers()["content-security-policy"] ?? "";
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonce).toBeTruthy();
  const html = await r.text();
  const tags = html.match(/<script\b[^>]*>/g) ?? [];
  expect(tags.length).toBeGreaterThan(0);
  const without = tags.filter((t) => !t.includes(`nonce="${nonce}"`));
  expect(without, `script tanpa nonce yang cocok: ${without.slice(0, 3).join(" | ")}`).toEqual([]);
  // nonce berbeda di setiap permintaan
  const r2 = await request.get("/id");
  const n2 = /'nonce-([^']+)'/.exec(r2.headers()["content-security-policy-report-only"] ?? r2.headers()["content-security-policy"] ?? "")?.[1];
  expect(n2).not.toBe(nonce);
});

for (const path of ["/id", "/en", "/id/halaman-tidak-ada"]) {
  test(`tanpa pelanggaran CSP di browser: ${path}`, async ({ page }) => {
    const viol: string[] = [];
    await page.exposeFunction("__viol", (v: string) => viol.push(v));
    await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => (window as any).__viol(`${e.effectiveDirective} ${e.blockedURI}`)));
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(viol).toEqual([]);
  });
}
