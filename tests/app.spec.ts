import { test, expect } from "@playwright/test";
import { checkpoint, createRoom, join, minimizeWindows, openFilesTab, openTask, waitForSync } from "./helpers/ui";

test.describe("aiduchi E2E", () => {
  test("room作成→送信→リストとツリーに反映", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("aiduchi")).toBeVisible();

    await page.getByPlaceholder("room name").fill("e2e-room");
    await page.getByRole("button", { name: "作成", exact: true }).click();
    await expect(page.getByRole("button", { name: "新しい窓", exact: true })).toBeEnabled({ timeout: 10_000 });

    await page.getByRole("button", { name: "新しい窓", exact: true }).click();
    const textarea = page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await textarea.fill("create a note");
    await page.getByRole("button", { name: "送信", exact: true }).first().click();

    await expect(page.getByText("+notes/").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "create a note", exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "ツリー", exact: true }).first().click();
    await expect(page.getByText("進捗ツリー")).toBeVisible();
  });

  test("Ctrl+Enterで送信できる", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("room name").fill("e2e-ctrl");
    await page.getByRole("button", { name: "作成", exact: true }).click();
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
    const stored = await page.evaluate(() => localStorage.getItem("aiduchi.name"));
    expect(stored).toBe("すずけ");
  });

  test("生成物をファイルタブで閲覧できる", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("room name").fill("e2e-files");
    await page.getByRole("button", { name: "作成", exact: true }).click();
    await expect(page.getByRole("button", { name: "新しい窓", exact: true })).toBeEnabled({ timeout: 10_000 });

    await page.getByRole("button", { name: "新しい窓", exact: true }).click();
    const textarea = page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await textarea.fill("make a note file");
    await textarea.press("Control+Enter");
    await expect(page.getByText("+notes/").first()).toBeVisible({ timeout: 15_000 });

    await openFilesTab(page);
    await expect(page.getByRole("button", { name: "README.md", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /notes\// })).toBeVisible();
  });

  test("未送信の入力は窓を増やしても再読込しても消えない", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("room name").fill("e2e-draft");
    await page.getByRole("button", { name: "作成", exact: true }).click();
    await expect(page.getByRole("button", { name: "新しい窓", exact: true })).toBeEnabled({ timeout: 10_000 });

    await page.getByRole("button", { name: "新しい窓", exact: true }).click();
    const first = page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first();
    await first.fill("書きかけの日本語入力");

    // 別の窓を開いても、元の入力は残る
    await page.getByRole("button", { name: "新しい窓", exact: true }).click();
    await expect(page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）")).toHaveCount(2);
    await expect(page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first()).toHaveValue("書きかけの日本語入力");

    // すべて最小化→ドックから下書きの窓を復元
    await minimizeWindows(page);
    await page.getByRole("button", { name: "書きかけの日本語入力" }).first().click();
    await expect(page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first()).toHaveValue("書きかけの日本語入力");

    // 再読込しても個人の下書きが戻る
    await page.reload();
    await expect(page.getByPlaceholder("指示を入力（Ctrl+Enterで送信）").first()).toHaveValue("書きかけの日本語入力", {
      timeout: 15_000,
    });
  });

  test("保存された静的サイトがプレビューに表示される", async ({ page, request }) => {
    const room = await createRoom(request, "preview-room");
    await checkpoint(
      request,
      room,
      {
        "index.html":
          '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><h1 id="t">preview works</h1><script src="app.js"></script></body></html>',
        "style.css": "body { background: rgb(1, 2, 3); }",
        "app.js":
          "document.body.appendChild(Object.assign(document.createElement('p'), { id: 'js', textContent: 'script ran' }));",
      },
      "static-site",
    );

    await join(page, room);
    await waitForSync(page);
    await openTask(page, "static-site");

    const frame = page.frameLocator('iframe[title="preview"]');
    await expect(frame.locator("#t")).toHaveText("preview works");
    await expect(frame.locator("#js")).toHaveText("script ran");
    const bg = await frame.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(1, 2, 3)");
  });
});
