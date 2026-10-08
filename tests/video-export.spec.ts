import { test, expect } from "@playwright/test";

test.describe("code adapter E2E", () => {
  test("code roomでdummy AIがファイルを作成できる", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("room name").fill("e2e-code");
    await page.getByRole("button", { name: "作成", exact: true }).click();
    await expect(page.getByText("中央プレビュー")).toBeVisible({ timeout: 15_000 });

    const chatInput = page.getByPlaceholder("この窓からチャット送信").first();
    await chatInput.fill("create a note");
    await page.getByRole("button", { name: "送信＝子ノード作成" }).first().click();
    await page.getByRole("button", { name: "list", exact: true }).click();
    await expect(page.getByText("+notes/")).toBeVisible({ timeout: 15_000 });
    console.log("code dummy OK");
  });
});
