# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / Playwright検証コミット

## 済み（P0〜export + ヘッドレス検証）

- [x] P0〜exportジョブ: これまでの記載通り（`a0bf2ad`まで）
- [x] **Playwrightヘッドレス検証環境**
  - `playwright.config.ts` + `tests/video-export.spec.ts`（3テスト）
  - `tests/helpers/start-api.cjs`: dummy AIモードでAPIサーバ自動起動
  - 検証結果:
    - video room→MP4出力→ffprobe検証: `h264 1920x1080 2s 24KB` ✅
    - Timeline/Inspector表示 ✅
    - code room→dummy AI→`+notes/` ✅
  - 発見・修正: H.264 Level 3.1は1080p非対応（最大921600画素）→Level 4.0に変更
  - `npm test` で実行可

## 未検証・既知のTODO

- [ ] 実アセット（画像・動画ファイル）の取り込み
- [ ] codeアダプタのY.Textファイル編集＋Monaco
- [ ] Timelineのドラッグ・トリム操作（Playwrightでの自動操作はセレクタが不安定なため保留）
- [ ] `lib0`モジュール初期化時の非致命的エラー（同期自体は正常）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] Named Tunnelの作成・DNS登録・Access付与（オーナーのCloudflare側操作）

## 次の一手候補（優先順）

1. codeアダプタのY.Text＋Monaco
2. 実アセット取り込み（画像・動画→assets）
3. Tunnel公開の通し確認（オーナーの操作待ち）
