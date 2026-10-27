import { test, expect } from "@playwright/test";
import { createRoom, join, openTask, waitForSync } from "./helpers/ui";

test.describe("共同編集", () => {
  test("2クライアントで作業とpresenceを共有する（窓配置は個人）", async ({ browser, request }) => {
    const room = await createRoom(request, "collab-room");

    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await join(pageA, room);
    await pageA.getByPlaceholder("あなたの名前").fill("あさん");
    await waitForSync(pageA);

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await join(pageB, room);
    await pageB.getByPlaceholder("あなたの名前").fill("びさん");
    await waitForSync(pageB);

    // Aが作業を作る
    await pageA.getByRole("button", { name: "新しい窓", exact: true }).click();
    const taA = pageA.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await taA.fill("shared task from A");
    await taA.press("Control+Enter");
    await expect(pageA.getByText("+notes/").first()).toBeVisible({ timeout: 15_000 });

    // B側にも作業が見える（窓配置は共有しないので、リストから開く）
    const taskInB = pageB.getByRole("button", { name: "shared task from A", exact: true }).first();
    await expect(taskInB).toBeVisible({ timeout: 15_000 });
    await taskInB.click();
    await expect(pageB.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first()).toBeVisible();

    // 互いの名前がpresenceで見える
    await expect(pageA.getByText("びさん").first()).toBeVisible({ timeout: 15_000 });
    await expect(pageB.getByText("あさん").first()).toBeVisible({ timeout: 15_000 });

    await ctxA.close();
    await ctxB.close();
  });

  test("Bが同じ作業に追記するとAのスレッドにも現れる", async ({ browser, request }) => {
    const room = await createRoom(request, "collab-thread");
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await join(pageA, room);
    await waitForSync(pageA);

    await pageA.getByRole("button", { name: "新しい窓", exact: true }).click();
    const taA = pageA.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await taA.fill("first step");
    await taA.press("Control+Enter");
    await expect(pageA.getByText("+notes/").first()).toBeVisible({ timeout: 15_000 });

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await join(pageB, room);
    await waitForSync(pageB);
    await openTask(pageB, "first step");
    const taB = pageB.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await taB.fill("second step from B");
    await taB.press("Control+Enter");
    await expect(pageB.getByText("+notes/").nth(1)).toBeVisible({ timeout: 15_000 });

    // Aは5秒ポーリングでBの追記を取得し、スレッドに2件表示される
    await expect(pageA.getByText("second step from B").first()).toBeVisible({ timeout: 20_000 });

    await ctxA.close();
    await ctxB.close();
  });
});
