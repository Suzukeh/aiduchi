import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(__dirname, "..", ".test-output");

test.describe("video adapter E2E", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("video roomでMP4を出力しffprobeで検証できる", async ({ page }) => {
    // 1. アプリを開く
    await page.goto("/");
    await expect(page.getByText("aiduchi")).toBeVisible();

    // 2. video roomを作成
    await page.getByPlaceholder("room name").fill("e2e-video");
    await page.locator("select").selectOption("video");
    await page.getByRole("button", { name: "作成", exact: true }).click();
    await expect(page.getByText("video editor")).toBeVisible({ timeout: 15_000 });

    // 3. チャット送信（dummy AIがクリップを追加）
    const chatInput = page.getByPlaceholder("この窓からチャット送信").first();
    await chatInput.fill("add a clip");
    await page.getByRole("button", { name: "送信＝子ノード作成" }).first().click();
    // listビューに切り替えてdiffSummaryを確認
    await page.getByRole("button", { name: "list", exact: true }).click();
    await expect(page.getByText("+1items")).toBeVisible({ timeout: 15_000 });

    // 4. タイムラインにクリップが表示されている（inline styleなのでIDテキストで探す）
    await expect(page.getByText(/^c[0-9a-z]{4}/).first()).toBeVisible({ timeout: 10_000 });

    // 5. MP4出力ボタンをクリック
    await page.getByRole("button", { name: "MP4出力" }).click();
    await expect(page.getByText(/MP4出力中/)).toBeVisible({ timeout: 10_000 });

    // 6. ダウンロードを待つ
    const download = await page.waitForEvent("download", { timeout: 60_000 });
    const dlPath = join(OUT_DIR, "export-test.mp4");
    await download.saveAs(dlPath);

    // 7. ファイルが存在し、MP4として有効かffprobeで確認
    expect(existsSync(dlPath)).toBe(true);
    expect(statSync(dlPath).size).toBeGreaterThan(1000);

    const probe = execSync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${dlPath}"`,
      { encoding: "utf-8" },
    );
    const info = JSON.parse(probe);
    const videoStream = info.streams?.find((s: { codec_type: string }) => s.codec_type === "video");
    expect(videoStream).toBeTruthy();
    expect(videoStream.codec_name).toBe("h264");
    expect(Number(videoStream.width)).toBe(1920);
    expect(Number(videoStream.height)).toBe(1080);
    console.log(`MP4 OK: ${videoStream.codec_name} ${videoStream.width}x${videoStream.height} duration=${info.format.duration}s size=${statSync(dlPath).size}b`);
  });

  test("TimelineとInspectorが表示される", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("room name").fill("e2e-trim");
    await page.locator("select").selectOption("video");
    await page.getByRole("button", { name: "作成", exact: true }).click();
    await expect(page.getByText("video editor")).toBeVisible({ timeout: 15_000 });

    // dummy AIでクリップ追加
    const chatInput = page.getByPlaceholder("この窓からチャット送信").first();
    await chatInput.fill("add a clip");
    await page.getByRole("button", { name: "送信＝子ノード作成" }).first().click();
    await page.getByRole("button", { name: "list", exact: true }).click();
    await expect(page.getByText("+1items")).toBeVisible({ timeout: 15_000 });

    // Inspectorが「クリップを選択すると」表示（未選択状態）
    await expect(page.getByText("クリップを選択すると")).toBeVisible({ timeout: 5_000 });
    // プロジェクト情報が見える
    await expect(page.getByText("fps: 30")).toBeVisible();
    await expect(page.getByText("items: 1")).toBeVisible();
    // タイムラインのルーラーが見える
    await expect(page.getByText("30").first()).toBeVisible();
    console.log("Timeline/Inspector OK");
  });

  test("code roomでdummy AIがファイルを作成できる", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("room name").fill("e2e-code");
    await page.locator("select").selectOption("code");
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
