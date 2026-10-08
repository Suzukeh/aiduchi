# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / 手動編集・自走セッション終了

## 済み（P0〜UI再構築 + 共同編集 + 手動編集）

- [x] P0〜共同編集E2E: これまでの記載通り（`b857b64`まで）
- [x] **ファイル手動編集＋保存**（`6df5684`）
  - サーバー: `POST /api/rooms/:id/snapshots`（files+label→新ノードとして記録、サイズ上限付き）
  - Web: FilesPanelに編集モード・ダーティ表示・保存ボタン
  - E2Eテスト6本全合格（閲覧・編集保存含む）
- [x] トンネル経由で新API動作確認済み（manual snapshot OK）

## 起動中のサービス（2026-10-08時点）
- API :3000 / sync :1234 / Vite :5173 / Tunnel vtest.suzuke.dev
- 再起動手順は `README.md` 参照

## 未検証・既知のTODO

- [ ] codeアダプタのY.Text＋Monaco（ファイル内容のリアルタイム共同編集。現状は保存時のみ共有）
- [ ] Cloudflare Access（身内限定化）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] gehditor側の開発（キーフレーム、export等）

## 次の一手候補（優先順）

1. codeアダプタのY.Text＋Monaco
2. Cloudflare Access設定
3. gehditor: キーフレームシステム
