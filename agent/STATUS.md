# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / video除去コミット

## 済み（P0〜Tunnel + ユーザー名 + gehditor分離）

- [x] P0〜Tunnel公開 + ユーザー名設定 + gehditor開始: これまでの記載通り（`a4749a3`まで）
- [x] **video関連をaiduchiから除去**（gehditorへ分離）
  - `packages/protocol/src/video.ts` 削除
  - `apps/web/src/adapters/video/` 全削除
  - server・App.tsxからvideo分岐・UI・adapterKind選択を除去
  - protocolの `CreateRoom.adapterKind` は `"code"` のみ
  - **今後、映像編集機能はgehditorリポジトリに実装する**

## 役割分担（明確化）

- **aiduchi** = 共同バイブコーディング基盤（汎用・codeアダプタ・同期・AI）
- **gehditor** = 映像編集ソフト本体（https://github.com/Suzukeh/gehditor）
- 映像機能はgehditorに実装し、aiduchiの改善（AI語彙・同期等）はgehditor開発で必要になったものだけ行う

## 未検証・既知のTODO

- [ ] aiduchi: codeアダプタのY.Text＋Monaco
- [ ] aiduchi: Cloudflare Access（身内限定化）
- [ ] gehditor: キーフレーム、実アセット、export、Undo/Redo

## 次の一手候補（優先順）

1. gehditor: キーフレームシステム
2. gehditor: export（WebCodecs）
3. aiduchi: codeアダプタのY.Text＋Monaco
