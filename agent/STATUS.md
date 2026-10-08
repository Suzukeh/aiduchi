# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / Step 3コミット

## 済み（P0 + Step 1 + Step 2 + Step 3 P1コア完了）

- [x] 雛形・初回push（`0849b37`）〜 Step 2（`b8472ed`）: これまでの記載通り
- [x] **Step 3: videoアダプタ P1コア**
  - `packages/protocol/src/video.ts`: ProjectJSONスキーマ（tracks/items/assets/fps）＋
    typed patch steps（addClip/addText/trimItem/moveItem/setProp/removeItem/addTrack/removeTrack）＋
    applyVideoPatch純粋関数＋videoDiffSummary
  - `apps/web/src/adapters/video/`: Timeline（トラック・クリップ・トリムハンドル・再生ヘッド）、
    Preview（canvas描画・resolveTimeline）、Inspector（text/color/opacity/trim）、VideoEditor（統合）
  - サーバー: adapterKind分岐（video→VideoPatch検証・applyVideoPatch、code→従来）、
    AIシステムプロンプトをvideo用に差替、room作成時snapshot初期値をadapterKindで分岐
  - 検証: 実AI（mimo-v2.6-flash）で「青クリップ60f＋Hello text 30f」→
    ProjectJSONに正しく2 items生成（`+2items`）を確認

## 未検証・既知のTODO

- [ ] VideoEditorのブラウザ実操作（ドラッグ・トリム・再生）はビルド確認のみ。実ブラウザ操作未検証
- [ ] exportジョブ（MP4書き出し）
- [ ] 実アセット（画像・動画ファイル）の取り込み
- [ ] `lib0`モジュール初期化時の非致命的エラー（同期自体は正常）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] Named Tunnelの作成・DNS登録・Access付与（オーナーのCloudflare側操作）

## 次の一手候補（優先順）

1. exportジョブ（フレーム描画→MP4）
2. codeアダプタのY.Textファイル編集＋Monaco
3. Tunnel公開の通し確認（オーナーの操作待ち）
