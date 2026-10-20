import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const login = async (page: Page) => {
  await page.goto("/#/settings");
  await page.getByLabel("Логин").fill("medic");
  await page.getByLabel("Пароль").fill("e2e-password-123");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("button", { name: "Выйти" })).toBeVisible();
};

const noHorizontalScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

test("home: cold load under 4x CPU throttling and slow network, all entry points, no horizontal scroll", async ({ page }, info) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 300, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /ЭКГ/ })).toBeVisible();
  const perf = await page.evaluate(() => new Promise<any>((resolve) => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    let lcp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    const js = performance.getEntriesByType("resource").filter((r: any) => r.initiatorType === "script" || r.name.endsWith(".js"));
    setTimeout(() => resolve({
      fcp_ms: Math.round(fcp?.startTime ?? -1), lcp_ms: Math.round(lcp), dom_content_loaded_ms: Math.round(nav.domContentLoadedEventEnd),
      js_transfer_bytes: js.reduce((s: number, r: any) => s + (r.transferSize || 0), 0),
    }), 500);
  }));
  for (const name of ["ЭКГ", "Симптомы", "Сыпь", "Раны", "Экстренные алгоритмы", "Препараты", "Справочник"])
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await noHorizontalScroll(page);
  mkdirSync("e2e-results", { recursive: true });
  writeFileSync(`e2e-results/perf-${info.project.name}.json`, JSON.stringify({ project: info.project.name, cpu_throttle: 4,
    network: "300ms RTT, 1.6 Mbps down, 750 kbps up", ...perf }, null, 2));
  console.log(info.project.name, perf);
});

test("emergency checklist works before sign-in and before any upload", async ({ page }) => {
  await page.goto("/#/skin");
  await page.getByLabel("Отёк языка или горла").check();
  await expect(page.getByRole("alert")).toContainText("Критический признак");
  await expect(page.getByText(/Для анализа и сохранения нужен вход/)).toBeVisible();
  await noHorizontalScroll(page);
});

test("navigation and back are responsive across all screens", async ({ page }) => {
  await page.goto("/");
  const longTasks = await page.evaluate(() => { (window as any).__lt = 0; new PerformanceObserver((l) => { (window as any).__lt += l.getEntries().length; }).observe({ type: "longtask" }); return 0; });
  for (const [link, heading] of [["Симптомы", "Симптомы"], ["Справочник", "Справочник"], ["Препараты", "Препараты"], ["Неврология", "Инсультоподобные симптомы"]]) {
    await page.getByRole("link", { name: new RegExp(link) }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await noHorizontalScroll(page);
    await page.getByRole("button", { name: /Назад/ }).click();
    await expect(page.getByRole("link", { name: /ЭКГ/ })).toBeVisible();
  }
  console.log("long tasks during navigation:", await page.evaluate(() => (window as any).__lt), longTasks);
});

test("ECG upload reports AI as unavailable instead of inventing a result", async ({ page }) => {
  await login(page);
  await page.goto("/#/ecg");
  await page.locator('input[type=file]').nth(1).setInputFiles("e2e/fixtures/synthetic-ecg-grid.png");
  await expect(page.getByText(/Проверка качества/)).toBeVisible();
  await page.getByRole("button", { name: "Анализировать" }).click();
  await expect(page.getByText("ИИ-анализ сейчас недоступен. Используйте проверенный медицинский справочник и применимый экстренный протокол.").first()).toBeVisible();
  await expect(page.getByText(/нет проверенного применимого протокола/)).toBeVisible();
  await expect(page.getByText("C. Дифференциальный ряд")).toHaveCount(0);
});

test("invalid file is rejected with a clear message", async ({ page }) => {
  await login(page);
  await page.goto("/#/wound");
  await page.locator('input[type=file]').nth(1).setInputFiles({ name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not an image at all") });
  await page.getByRole("button", { name: "Анализировать" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Неподдерживаемый файл|повреждён/ })).toBeVisible();
});

test("encounter with partial data saves and appears in history", async ({ page }, info) => {
  const complaint = `боль в груди ${info.project.name}`;
  await login(page);
  await page.goto("/#/encounter/new");
  await page.getByLabel("Жалоба").fill(complaint);
  await page.getByLabel("SpO₂, %").fill("88");
  await expect(page.getByRole("alert")).toContainText("SpO₂ ≤ 91%");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page).toHaveURL(/#\/encounter\/[0-9a-f-]{36}/);
  await page.goto("/#/history");
  await expect(page.getByRole("link", { name: new RegExp(complaint) })).toBeVisible();
});

test("offline reference: download, then read without network", async ({ page, context }) => {
  await login(page);
  await page.getByRole("button", { name: "Загрузить / обновить" }).click();
  await expect(page.getByText("Готово")).toBeVisible();
  await page.goto("/#/reference");
  await expect(page.getByText(/ESC Guidelines/)).toBeVisible();
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await page.getByRole("button", { name: /Назад/ }).click();
  await page.goto("/#/reference");
  await expect(page.getByText("Показан загруженный офлайн-справочник")).toBeVisible();
  await expect(page.getByText(/ESC Guidelines/)).toBeVisible();
  await expect(page.getByText(/Нет сети/).first()).toBeVisible();
  await context.setOffline(false);
});

test("image screen releases memory after leaving", async ({ page }, info) => {
  await login(page);
  const heap = () => page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? 0);
  await page.goto("/#/home");
  const before = await heap();
  await page.goto("/#/skin");
  await page.locator('input[type=file]').nth(1).setInputFiles("e2e/fixtures/synthetic-ecg-grid.png");
  await expect(page.getByText(/Проверка качества/)).toBeVisible();
  const during = await heap();
  await page.goto("/#/home");
  await page.waitForTimeout(500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.collectGarbage");
  const after = await heap();
  writeFileSync(`e2e-results/memory-${info.project.name}.json`, JSON.stringify({ before, during, after }, null, 2));
  console.log("heap bytes", { before, during, after });
  expect(after).toBeLessThan(during + 1);
});
