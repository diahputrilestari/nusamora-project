import { expect, test, type Page } from "@playwright/test";

const MOCK = "http://127.0.0.1:54399";
const A = "a".repeat(32), B = "b".repeat(32);
type Call = { fn: string; args: Record<string, unknown>; apikey: string | null };
const calls = async (page: Page): Promise<Call[]> => (await page.request.get(`${MOCK}/__calls`)).json();
const reset = (page: Page) => page.request.post(`${MOCK}/__reset`);

test.beforeEach(async ({ page }) => { await reset(page); });

test.describe("halaman undangan publik /[slug]", () => {
  test("undangan aktif tampil; tanpa token tidak ada panel tamu dan tidak ada panggilan guest_*", async ({ page }) => {
    const res = await page.goto("/id/uji-undangan");
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("undangan-judul")).toHaveText("Dewi & Raka");
    await expect(page.getByText("Gedung Serbaguna")).toBeVisible();
    await expect(page.getByRole("link", { name: "Buka peta" })).toHaveAttribute("href", /^https:\/\/maps\.google\.com/);
    await expect(page.getByTestId("tamu-panel")).toHaveCount(0);
    await page.waitForTimeout(500);
    expect((await calls(page)).filter((c) => c.fn.startsWith("guest_"))).toEqual([]);
  });

  test("tidak diindeks mesin pencari dan tidak membocorkan referrer", async ({ page }) => {
    await page.goto("/id/uji-undangan");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  });

  test("alamat tanpa bahasa dialihkan ke /id dan query ?t= tetap ada", async ({ page }) => {
    await page.goto(`/uji-undangan?t=${A}`);
    await expect(page).toHaveURL(new RegExp(`/id/uji-undangan\\?t=${A}$`));
    await expect(page.getByTestId("tamu-sapaan")).toHaveText("Halo, Budi");
  });

  test("slug tidak dikenal -> 404 seragam; slug berformat buruk tidak sampai ke server", async ({ page }) => {
    const r1 = await page.goto("/id/tidak-ada-undangan");
    expect(r1?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Halaman tidak ditemukan");
    const r2 = await page.goto("/id/ADMIN_x%27--");
    expect(r2?.status()).toBe(404);
    const slugs = (await calls(page)).filter((c) => c.fn === "get_public_invitation").map((c) => c.args.p_slug);
    expect(slugs).toContain("tidak-ada-undangan");
    expect(slugs.some((s) => String(s).includes("ADMIN"))).toBe(false);
  });

  test("konten berbahaya dirender sebagai teks; tautan/gambar non-https dibuang", async ({ page }) => {
    await page.goto("/id/xss-undangan");
    await expect(page.getByTestId("undangan-judul")).toContainText("<img src=x onerror=window.__xss=1>");
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await expect(page.locator("article img")).toHaveCount(0);
    await expect(page.locator('article a[href^="javascript:"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Buka peta" })).toHaveCount(0);
  });

  test("fitur RSVP/buku tamu dimatikan di editor -> formulir tidak ada", async ({ page }) => {
    await page.goto(`/id/tanpa-fitur?t=${A}`);
    await expect(page.getByTestId("tamu-sapaan")).toHaveText("Halo, Budi");
    await expect(page.getByRole("heading", { name: "Konfirmasi Kehadiran" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Ucapan & Doa" })).toHaveCount(0);
  });
});

test.describe("panel tamu (?t=)", () => {
  test("token sah: sapaan, guest_open sekali, RSVP dan ucapan terkirim dengan parameter benar, hanya kunci anon", async ({ page }) => {
    await page.goto(`/id/uji-undangan?t=${A}`);
    await expect(page.getByTestId("tamu-sapaan")).toHaveText("Halo, Budi");
    await page.getByLabel("Jumlah tamu yang hadir").selectOption("4");
    await page.getByLabel("Pesan (opsional)").fill("Insyaallah hadir");
    await page.getByRole("button", { name: "Kirim Konfirmasi" }).click();
    await expect(page.getByText("konfirmasi Anda sudah kami terima")).toBeVisible();
    await page.getByLabel("Tulis ucapan").fill("Selamat <b>ya</b>");
    await page.getByRole("button", { name: "Kirim Ucapan" }).click();
    await expect(page.getByText("Terima kasih atas ucapan Anda.")).toBeVisible();
    await expect(page.getByLabel("Tulis ucapan")).toHaveValue("");
    const g = (await calls(page)).filter((c) => c.fn.startsWith("guest_"));
    expect(g.filter((c) => c.fn === "guest_open")).toHaveLength(1);
    expect(g.find((c) => c.fn === "guest_rsvp")?.args).toEqual({ p_token: A, p_status: "hadir", p_pax: 4, p_message: "Insyaallah hadir" });
    expect(g.find((c) => c.fn === "guest_wish")?.args).toEqual({ p_token: A, p_message: "Selamat <b>ya</b>" });
    expect(g.every((c) => c.apikey === "anon-e2e")).toBe(true);
  });

  test("status bukan hadir: jumlah tamu disembunyikan dan dikirim 1", async ({ page }) => {
    await page.goto(`/id/uji-undangan?t=${A}`);
    await page.getByLabel("Tidak bisa hadir").check();
    await expect(page.getByLabel("Jumlah tamu yang hadir")).toHaveCount(0);
    await page.getByRole("button", { name: "Kirim Konfirmasi" }).click();
    await expect(page.getByText("konfirmasi Anda sudah kami terima")).toBeVisible();
    expect((await calls(page)).find((c) => c.fn === "guest_rsvp")?.args).toMatchObject({ p_status: "tidak_hadir", p_pax: 1 });
  });

  test("token tidak dikenal server: pesan jelas, tanpa formulir", async ({ page }) => {
    await page.goto(`/id/uji-undangan?t=${B}`);
    await expect(page.getByTestId("tamu-tidak-berlaku")).toBeVisible();
    await expect(page.getByTestId("tamu-panel")).toHaveCount(0);
  });

  test("token berformat salah: tidak ada panggilan ke server sama sekali", async ({ page }) => {
    await page.goto("/id/uji-undangan?t=ngawur");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("tamu-panel")).toHaveCount(0);
    expect((await calls(page)).filter((c) => c.fn.startsWith("guest_"))).toEqual([]);
  });

  test("ucapan kosong ditolak di klien; batas laju dari server tampil ramah", async ({ page }) => {
    await page.goto(`/id/uji-undangan?t=${A}`);
    await page.getByRole("button", { name: "Kirim Ucapan" }).click();
    await expect(page.getByText("Tulis ucapan Anda dulu.")).toBeVisible();
    expect((await calls(page)).filter((c) => c.fn === "guest_wish")).toHaveLength(0);
    await page.getByLabel("Tulis ucapan").fill("LIMIT");
    await page.getByRole("button", { name: "Kirim Ucapan" }).click();
    await expect(page.getByText("Terlalu banyak percobaan")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kirim Ucapan" })).toBeEnabled();
  });

  test("bahasa Inggris", async ({ page }) => {
    await page.goto(`/en/uji-undangan?t=${A}`);
    await expect(page.getByTestId("tamu-sapaan")).toHaveText("Hello, Budi");
    await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible();
  });
});
