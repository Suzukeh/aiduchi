import { test, expect } from "@playwright/test";

test.describe("共同編集", () => {
  test("2クライアントでroomを共有し、窓とpresenceが同期する", async ({ browser }) => {
    // クライアントA: room作成
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await pageA.goto("/");
    await pageA.getByPlaceholder("あなたの名前").fill("あさん");
    await pageA.getByPlaceholder("room name").fill("collab-test");
    await pageA.getByRole("button", { name: "作成" }).click();
    await expect(pageA.getByRole("button", { name: "新しい窓", exact: true })).toBeEnabled({ timeout: 10_000 });

    // Aが窓を開く（Yjsで共有される）
    await pageA.getByRole("button", { name: "新しい窓", exact: true }).click();
    await pageA.waitForTimeout(1500);

    // 共有URLを取得
    const url = pageA.url();
    expect(url).toContain("room=");
    expect(url).toContain("token=");

    // クライアントB: 共有URLで参加
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await pageB.goto(url);
    await pageB.getByPlaceholder("あなたの名前").fill("びさん");
    await pageB.waitForTimeout(2500);

    // Bに窓が同期されている（窓のtextareaが見える）
    await expect(pageB.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first()).toBeVisible({ timeout: 15_000 });

    // A側にpresenceで「びさん」が見える
    await expect(pageA.getByText("びさん").first()).toBeVisible({ timeout: 15_000 });

    // B側に「あさん」が見える
    await expect(pageB.getByText("あさん").first()).toBeVisible({ timeout: 15_000 });

    // Bから送信するとAのリストにもノードが現れる
    const taB = pageB.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await taB.fill("from B");
    await taB.press("Control+Enter");
    await pageA.getByRole("button", { name: "更新" }).click();
    await expect(pageA.getByText("from B").first()).toBeVisible({ timeout: 15_000 });

    await ctxA.close();
    await ctxB.close();
  });
});
