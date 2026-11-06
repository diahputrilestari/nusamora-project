import { expect, test } from "@playwright/test";

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
