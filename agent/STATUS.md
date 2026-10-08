# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / exportジョブコミット

## 済み（P0〜Step 3 P1コア + exportジョブ）

- [x] P0〜Step 3 P1コア: これまでの記載通り（`85a1551`まで）
- [x] **exportジョブ（MP4書き出し）**
  - `apps/web/src/adapters/video/export.ts`: WebCodecs VideoEncoder + mp4-muxer でH.264 MP4出力
  - `renderScene.ts`: `renderSceneToContext` 純粋関数をPreviewとexportで共有（ゼロドリフト）
  - `totalFrames()` 共有ユーティリティ
  - VideoEditorに「MP4出力」ボタン＋進捗バー＋エラー表示追加
  - `isExportSupported()` でWebCodecs非対応ブラウザを事前判定

## 未検証・既知のTODO

- [ ] MP4出力の実ブラウザ再生確認（WebCodecsはChrome/Edge系。実出力は未検証）
- [ ] 実アセット（画像・動画ファイル）の取り込み
- [ ] codeアダプタのY.Textファイル編集＋Monaco
- [ ] `lib0`モジュール初期化時の非致命的エラー（同期自体は正常）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] Named Tunnelの作成・DNS登録・Access付与（オーナーのCloudflare側操作）

## 次の一手候補（優先順）

1. codeアダプタのY.Text＋Monaco（code roomの本格的なファイル編集）
2. 実アセット取り込み（画像・動画→assets）
3. Tunnel公開の通し確認（オーナーの操作待ち）
