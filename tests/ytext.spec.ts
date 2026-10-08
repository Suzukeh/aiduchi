import { test, expect } from "@playwright/test";

test.describe("ファイル共同編集", () => {
  test("2クライアントで同じファイルをリアルタイム編集できる", async ({ browser }) => {
    // A: room作成→送信→ファイル編集開始
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await pageA.goto("/");
    await pageA.getByPlaceholder("room name").fill("ytext-test");
    await pageA.getByRole("button", { name: "作成" }).click();
    await expect(pageA.getByRole("button", { name: "新しい窓", exact: true })).toBeEnabled({ timeout: 10_000 });
    await pageA.getByRole("button", { name: "新しい窓", exact: true }).click();
    const taA = pageA.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await taA.fill("note please");
    await taA.press("Control+Enter");
    await expect(pageA.getByText("+notes/").first()).toBeVisible({ timeout: 15_000 });
    await pageA.getByRole("button", { name: "ファイル" }).first().click();
    await pageA.getByRole("button", { name: "編集" }).first().click();
    await pageA.waitForTimeout(1000);

    const url = pageA.url();

    // B: 共有URLで参加
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await pageB.goto(url);
    await pageB.waitForTimeout(3000);

    // BにもAの窓が同期されている → ファイルタブ→編集
    await expect(pageB.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first()).toBeVisible({ timeout: 15_000 });
    await pageB.getByRole("button", { name: "ファイル" }).first().click();
    await pageB.waitForTimeout(1000);
    await pageB.getByRole("button", { name: "編集" }).first().click();
    await pageB.waitForTimeout(1500);

    // Aが入力 → Bにリアルタイム反映される
    const editorA = pageA.locator(".cm-content").first();
    await editorA.click();
    await pageA.keyboard.press("Control+a");
    await pageA.keyboard.type("realtime hello from A");

    await expect(pageB.locator(".cm-content").first()).toContainText("realtime hello from A", { timeout: 10_000 });
    console.log("Y.Text realtime sync OK");

    await ctxA.close();
    await ctxB.close();
  });
});
