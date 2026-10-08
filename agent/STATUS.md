# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / Step 2コミット

## 済み（P0 + Step 1 + Step 2完了）

- [x] 雛形・初回push（`0849b37`）＋成果物掃除（`69e63a1`）
- [x] SQLite永続化＋再起動復元を検証（`3d0ed35`）
- [x] AI Gateway本実装：BYOKヘッダ＞ホストenv＞dummy、予算・許可モデル、SSE中継（`3d0ed35`）
- [x] windows共有保存API＋Web側の読込・自動保存・BYOK欄・エラー表示（`bdcb609`）
- [x] compose共有volume・公開URL build arg・Named Tunnel手順書（`7bbc49b`）
- [x] agent/引き継ぎ一式（`9e2002b`）
- [x] **Step 1: 実AI応答の検証**（`9bdc287`）
  - patch生成→ファイル適用、SSE、usage記録、許可モデル外403、BYOK経路
  - baseUrl正規化、x-opencode-session対応、フェンスJSONパース修正
- [x] **Step 2: Yjsリアルタイム同期の本格配線**
  - `sync.ts`: joinToken照合（SQLite rooms参照）+ ydocsテーブルでY.Doc永続化
  - `apps/web/src/sync.ts`: `@hocuspocus/provider`で接続、Y.Map窓共有、Awareness presence
  - `App.tsx`: Yjs⇄React双方向同期、参加者ドット表示、同期状態インジケータ
  - 検証: 2クライアントで窓追加・更新がリアルタイム共有（`E2E SYNC OK`）、
    認証（BAD token→rejected / GOOD→connected）、永続化ロジック単体確認済み

## 未検証・既知のTODO

- [ ] `lib0`モジュール初期化時の非致命的エラー（同期自体は正常。yjs/lib0のv0.2.119既知問題）
- [ ] Hocuspocus `onStoreDocument` のデバウンス（既定30秒）での自動永続化（ロジック単体は確認済み）
- [ ] `video`アダプタ（ProjectJSON＋タイムライン＋export）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] Named Tunnelの作成・DNS登録・Access付与（オーナーのCloudflare側操作）

## 次の一手候補（優先順）

1. `video`アダプタP1 — AE例のタイムライン＋export（本命機能）
2. codeアダプタのファイル編集（Y.Text）＋Monaco差し替え
3. Tunnel公開の通し確認（オーナーの操作待ち）
