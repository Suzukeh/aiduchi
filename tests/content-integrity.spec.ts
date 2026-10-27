import { test, expect } from "@playwright/test";
import {
  API,
  checkpoint,
  createRoom,
  join,
  openFilesTab,
  minimizeWindows,
  openTask,
  snapshot,
  startEditing,
  waitForSync,
} from "./helpers/ui";

test.describe("内容の保持と分岐の独立", () => {
  test("編集を開始しても保存済みの内容が空にならない", async ({ page, request }) => {
    const room = await createRoom(request, "content-keep");
    const node = await checkpoint(request, room, { "README.md": "# 保存された内容\n" }, "base");

    await join(page, room);
    await waitForSync(page);
    await openTask(page, "base");
    await minimizeWindows(page);
    await openFilesTab(page);
    await expect(page.locator("pre")).toContainText("保存された内容");

    await startEditing(page, "README.md");
    await expect(page.locator(".cm-content")).toContainText("保存された内容", { timeout: 10_000 });
    console.log("editor content on open =", JSON.stringify(await page.locator(".cm-content").innerText()));

    // 参照用: 基点のスナップショットは不変のまま
    expect((await snapshot(request, room, node)).files["README.md"]).toBe("# 保存された内容\n");
  });

  test("手動編集の保存で内容が失われない", async ({ page, request }) => {
    const room = await createRoom(request, "content-save");
    await checkpoint(request, room, { "README.md": "before\n" }, "base");

    await join(page, room);
    await waitForSync(page);
    await openTask(page, "base");
    await minimizeWindows(page);
    await openFilesTab(page);
    await startEditing(page, "README.md");

    const editor = page.locator(".cm-content");
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("after edit");
    await expect(editor).toContainText("after edit");

    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText(/手動編集: README\.md/).first()).toBeVisible({ timeout: 15_000 });

    const nodes = (await (await request.get(`${API}/api/rooms/${room.id}/nodes`, {
      headers: { "x-room-token": room.joinToken },
    })).json()) as { id: string; parentId: string | null }[];
    const child = nodes.find((n) => n.parentId !== null && n.parentId === nodes.find((x) => x.parentId === null)?.id);
    expect(child, "保存で新しいチェックポイントができる").toBeTruthy();
    const saved = await snapshot(request, room, child!.id);
    console.log("saved README =", JSON.stringify(saved.files["README.md"]));
    expect(saved.files["README.md"]).toBe("after edit");
  });

  test("別分岐の同名ファイルを編集・保存しても混ざらない", async ({ page, request }) => {
    const room = await createRoom(request, "branch-isolation");
    const a = await checkpoint(request, room, { "README.md": "branch-A" }, "branch-A");
    const b = await checkpoint(request, room, { "README.md": "branch-B" }, "branch-B");

    await join(page, room);
    await waitForSync(page);

    await openTask(page, "branch-A");
    await minimizeWindows(page);
    await openFilesTab(page);
    await startEditing(page, "README.md");
    await expect(page.locator(".cm-content")).toHaveText("branch-A");

    // 別の作業として分岐Bを開く（窓配置は個人なので新しく開く）
    await page.getByRole("button", { name: "新しい窓", exact: true }).click();
    await openTask(page, "branch-B");
    await minimizeWindows(page);
    await openFilesTab(page);
    await expect(page.locator("pre")).toHaveText("branch-B");
    await startEditing(page, "README.md");
    await expect(page.locator(".cm-content")).toHaveText("branch-B");

    // 分岐Bだけを編集して保存する
    const editor = page.locator(".cm-content");
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("branch-B edited");
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByText(/手動編集: README\.md/).first()).toBeVisible({ timeout: 15_000 });

    const nodes = (await (await request.get(`${API}/api/rooms/${room.id}/nodes`, {
      headers: { "x-room-token": room.joinToken },
    })).json()) as { id: string; parentId: string | null }[];
    const child = nodes.find((n) => n.parentId === b);
    expect(child).toBeTruthy();
    const saved = await snapshot(request, room, child!.id);
    console.log("branch B saved =", JSON.stringify(saved.files["README.md"]));
    expect(saved.files["README.md"]).toBe("branch-B edited");

    // 分岐Aの内容は変わっていない
    expect((await snapshot(request, room, a)).files["README.md"]).toBe("branch-A");
  });
});
