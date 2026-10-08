# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / Tunnel公開コミット

## 済み（P0〜export + 検証 + Tunnel公開）

- [x] P0〜Playwright検証: これまでの記載通り（`65a9247`まで）
- [x] **Cloudflare Named Tunnel公開**
  - tunnel: `aiduchi-dev` (25a98e0b-dcb2-41dd-a07a-b60a77eec9cd)
  - ホスト名: `vtest.suzuke.dev` → Vite :5173（/api, /sync プロキシ経由）
  - Vite proxy設定追加（/api→:3000, /sync→ws://:1234）
  - Web/API URLを相対パス化（同一オリジン→プロキシ経由）
  - 検証: 外部から `https://vtest.suzuke.dev` でWeb 200応答、API room作成成功
  - 起動手順: `node server/dist/sync.js` → `node server/dist/index.js` →
    `npm --prefix apps/web run dev` → `cloudflared tunnel --config ~/.cloudflared/aiduchi.yml run`

## 未検証・既知のTODO

- [ ] 実アセット（画像・動画ファイル）の取り込み
- [ ] codeアダプタのY.Textファイル編集＋Monaco
- [ ] Cloudflare Access（身内限定化）は未設定
- [ ] Timelineのドラッグ・トリム操作（Playwrightセレクタ不安定のため保留）
- [ ] `lib0`モジュール初期化時の非致命的エラー（同期自体は正常）
- [ ] docker composeの実起動検証（作業機にdockerなし）

## 次の一手候補（優先順）

1. codeアダプタのY.Text＋Monaco
2. 実アセット取り込み（画像・動画→assets）
3. Cloudflare Access設定（身内限定化）
