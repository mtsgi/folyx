import { expect, test } from "@playwright/test";

test("Mock edits flow through Core and Vue into the diagram and readings", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/folyx/foldlab/");

  await expect(page.getByTestId("layout")).toHaveText("horizontal");
  await expect(page.locator(".segment")).toHaveCount(2);

  await page.getByLabel("Scenario preset").selectOption("triple");

  await expect(page.locator(".segment")).toHaveCount(3);

  await page.getByLabel("Scenario preset").selectOption("laptop");

  await expect(page.getByTestId("layout")).toHaveText("vertical");

  await page.getByLabel("Viewport width", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Apply changes" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("layout")).toHaveText("vertical");

  await page.getByLabel("Scenario preset").selectOption("unsupported");

  await expect(page.getByTestId("geometry-source")).toHaveText("fallback");

  await page.getByLabel("Scenario preset").selectOption("unmapped");

  await expect(page.getByTestId("geometry-source")).toHaveText("fallback");

  const unmapped = JSON.parse((await page.locator(".snapshot-panel pre").textContent())!);

  expect(unmapped.availability.segments).toBe("available");

  await page.getByLabel("Scenario preset").selectOption("outside");

  await expect(page.getByTestId("layout")).toHaveText("complex");

  await page.getByLabel("Scenario preset").selectOption("unknown");

  await expect(page.getByTestId("layout")).toHaveText("unknown");

  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Browser diagnostics record raw values separately and export JSON", async ({ page }) => {
  await page.goto("/folyx/foldlab/");
  await page.getByRole("button", { name: "Device inspector" }).click();

  await expect(page.getByRole("heading", { name: "Device inspector", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByLabel("Diagnostic scenario").selectOption("keyboard");
  await page.getByLabel("Keyboard test").fill("viewport check");
  await page.getByRole("button", { name: "Capture sample" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloaded;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());

  expect(data.pixel10ProFoldVerified).toBe(false);
  expect(data.samples.length).toBeGreaterThanOrEqual(2);
  expect(data.samples[0].raw).toHaveProperty("segments");
  expect(data.samples[0].snapshot).toHaveProperty("availability");
  expect(data.samples[0].snapshot).not.toHaveProperty("raw");
});

test("docs serve both languages, search, direct links and FoldLab under the Pages base", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith("http://127.0.0.1"))
      failures.push(response.url());
  });
  await page.goto("/folyx/");

  await expect(page.getByRole("heading", { name: "Folyx", exact: true }).first()).toBeVisible();

  await page.goto("/folyx/ja/philosophy/");

  await expect(page.getByRole("heading", { name: "設計思想", exact: true })).toBeVisible();

  await page.goto("/folyx/core/");

  await expect(page.getByRole("heading", { name: "Core API", exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: /search/i })
    .first()
    .click();
  const search = page.getByRole("combobox").first();
  await search.fill("availability");

  await expect(page.getByRole("dialog")).toContainText(/availability/i);

  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "FoldLab ↗" }).first().click();

  await expect(page).toHaveURL(/\/folyx\/foldlab\/$/);

  expect(failures).toEqual([]);
});
