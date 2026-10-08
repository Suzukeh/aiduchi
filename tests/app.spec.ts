import { test, expect } from "@playwright/test";

test.describe("aiduchi E2E", () => {
  test("room作成→窓で送信→リストとツリーに反映", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("aiduchi")).toBeVisible();

    // room作成
    await page.getByPlaceholder("room name").fill("e2e-room");
    await page.getByRole("button", { name: "作成" }).click();
    await expect(page.getByRole("button", { name: "新しい窓", exact: true })).toBeEnabled({ timeout: 10_000 });

    // 窓を開いてメッセージ送信
    await page.getByRole("button", { name: "新しい窓", exact: true }).click();
    const textarea = page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await textarea.fill("create a note");
    await page.getByRole("button", { name: "送信" }).first().click();

    // リストにノードが出る（diffSummary）
    await expect(page.getByText("+notes/").first()).toBeVisible({ timeout: 15_000 });

    // ツリーを開くとノードが見える
    await page.getByRole("button", { name: "ツリー" }).first().click();
    await expect(page.getByText("進捗ツリー")).toBeVisible();
  });

  test("Ctrl+Enterで送信できる", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("room name").fill("e2e-ctrl");
    await page.getByRole("button", { name: "作成" }).click();
    await expect(page.getByRole("button", { name: "新しい窓", exact: true })).toBeEnabled({ timeout: 10_000 });

    await page.getByRole("button", { name: "新しい窓", exact: true }).click();
    const textarea = page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await textarea.fill("ctrl enter test");
    await textarea.press("Control+Enter");
    await expect(page.getByText("+notes/").first()).toBeVisible({ timeout: 15_000 });
  });

  test("ユーザー名を設定できる", async ({ page }) => {
    await page.goto("/");
    const nameInput = page.getByPlaceholder("あなたの名前");
    await nameInput.fill("すずけ");
    await expect(nameInput).toHaveValue("すずけ");
    // localStorageに保持される
    const stored = await page.evaluate(() => localStorage.getItem("aiduchi.name"));
    expect(stored).toBe("すずけ");
  });
});
