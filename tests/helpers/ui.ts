import { expect, type Page, type APIRequestContext } from "@playwright/test";

export const API = "http://localhost:5181";

export type Room = { id: string; joinToken: string };

export async function createRoom(request: APIRequestContext, name: string): Promise<Room> {
  const res = await request.post(`${API}/api/rooms`, { data: { name, adapterKind: "code" } });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { id: string; joinToken: string };
  return { id: body.id, joinToken: body.joinToken };
}

/** APIで直接チェックポイントを作る（UIの生成を待たずに前提条件を整える） */
export async function checkpoint(
  request: APIRequestContext,
  room: Room,
  files: Record<string, string>,
  label: string,
  parentNodeId: string | null = null,
): Promise<string> {
  const res = await request.post(`${API}/api/rooms/${room.id}/snapshots`, {
    headers: { "x-room-token": room.joinToken },
    data: { parentNodeId, files, label },
  });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { id: string }).id;
}

export async function snapshot(request: APIRequestContext, room: Room, nodeId: string) {
  const res = await request.get(`${API}/api/rooms/${room.id}/snapshots/${nodeId}`, {
    headers: { "x-room-token": room.joinToken },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { files: Record<string, string> };
}

export async function join(page: Page, room: Room) {
  await page.goto(`/?room=${room.id}&token=${room.joinToken}`);
  await expect(page.getByText("aiduchi")).toBeVisible();
}

export async function waitForSync(page: Page) {
  await expect(page.locator('[title="同期中"]')).toBeVisible({ timeout: 15_000 });
}

export async function openTask(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).first().click();
}

/** フローティング窓が中央パネルを覆っているとき、手前の窓から最小化してパネルを操作する */
export async function minimizeWindows(page: Page) {
  const buttons = page.getByTitle("最小化");
  for (let remaining = await buttons.count(); remaining > 0; remaining -= 1) {
    await buttons.last().click();
  }
}

export async function openFilesTab(page: Page) {
  await page.getByRole("button", { name: "ファイル", exact: true }).click();
}

export async function openPreviewTab(page: Page) {
  await page.getByRole("button", { name: "プレビュー", exact: true }).click();
}

export async function startEditing(page: Page, path: string) {
  await page.getByRole("button", { name: path, exact: true }).click();
  await page.getByRole("button", { name: "編集", exact: true }).click();
  await expect(page.locator(".cm-content")).toBeVisible({ timeout: 15_000 });
}
