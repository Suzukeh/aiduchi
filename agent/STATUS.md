# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / UI全面再構築

## 済み（P0〜UI再構築）

- [x] P0〜ユーザー名設定・video分離: これまでの記載通り（`88567c3`まで）
- [x] **UI全面再構築**（`0448ac1`）
  - スタック: Tailwind CSS v4 + react-rnd + @xyflow/react + Zustand + lucide-react
  - 旧: 手書きinline style → 新: コンポーネント分割（Sidebar/ChatWindow/FloatingWindow/TreeOverlay/Dock）
  - react-rnd採用でドラッグ・リサイズ・フォーカス問題を根本解消
  - React Flowで進捗ツリー表示（クリックで窓が開く）
  - Zustand storeにYjs同期・presence・窓状態を集約
  - Playwright 3テスト合格（room作成→送信→ツリー、Ctrl+Enter、ユーザー名）
- [x] SQLite busy_timeout修正（`5024dd0`）: 同時起動時のlockエラー解消
- [x] トンネル経由E2E確認: wss://vtest.suzuke.dev/sync で2クライアント同期OK

## 未検証・既知のTODO

- [ ] `lib0`モジュール初期化時の非致命的エラー（同期自体は正常）
- [ ] codeアダプタのY.Text＋Monaco（ファイル内容のリアルタイム編集）
- [ ] スナップショット閲覧UI（AI生成物の中身を見る）
- [ ] Cloudflare Access（身内限定化）
- [ ] docker composeの実起動検証（作業機にdockerなし）

## 次の一手候補（優先順）

1. スナップショット閲覧UI（ノードの生成物を窓で見る）
2. codeアダプタのY.Text＋Monaco
3. Cloudflare Access設定
