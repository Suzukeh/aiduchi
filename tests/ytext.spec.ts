import { test, expect } from "@playwright/test";
import { checkpoint, createRoom, join, minimizeWindows, openFilesTab, openTask, startEditing, waitForSync } from "./helpers/ui";

test.describe("チェックポイント単位の共同編集", () => {
  test("同じ版を2クライアントでリアルタイム編集できる", async ({ browser, request }) => {
    const room = await createRoom(request, "ytext-room");
    await checkpoint(request, room, { "README.md": "base text\n" }, "shared-checkpoint");

    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await join(pageA, room);
    await waitForSync(pageA);
    await openTask(pageA, "shared-checkpoint");
    await minimizeWindows(pageA);
    await openFilesTab(pageA);
    await startEditing(pageA, "README.md");

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await join(pageB, room);
    await waitForSync(pageB);
    await openTask(pageB, "shared-checkpoint");
    await minimizeWindows(pageB);
    await openFilesTab(pageB);
    await startEditing(pageB, "README.md");

    const editorA = pageA.locator(".cm-content").first();
    await editorA.click();
    await pageA.keyboard.press("Control+End");
    await pageA.keyboard.type("realtime hello from A");

    await expect(pageB.locator(".cm-content").first()).toContainText("realtime hello from A", { timeout: 15_000 });
    console.log("Y.Text realtime sync OK");

    await ctxA.close();
    await ctxB.close();
  });
});
