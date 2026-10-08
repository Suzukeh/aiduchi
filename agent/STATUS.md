# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / 共同編集E2E完了

## 済み（P0〜UI再構築 + 共同編集検証）

- [x] P0〜UI再構築: これまでの記載通り（`0448ac1`まで）
- [x] **UI改善続き**
  - ファイルビューアタブ（ノードの生成物を窓内で閲覧）（`0b7c87e`）
  - 共有リンクのコピーボタン（`0d18b9e`）
  - 既定窓を廃止し空スタート（同期と競合しない）（`5944c04`）
- [x] **共同編集E2Eテスト**（`5944c04`）
  - 2クライアント（別ブラウザコンテキスト）で: room作成→共有URLで参加→
    窓のYjs同期→presence表示（あさん/びさん）→Bの送信がAのリストに反映
  - `npm test` で5テスト全合格
- [x] SQLite busy_timeout修正（`5024dd0`）
- [x] トンネル経由WS同期確認: wss://vtest.suzuke.dev/sync OK

## 未検証・既知のTODO

- [ ] codeアダプタのY.Text＋Monaco（ファイル内容のリアルタイム編集）
- [ ] スナップショットの手動編集・保存
- [ ] Cloudflare Access（身内限定化）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] gehditor側の開発（キーフレーム、export等）

## 次の一手候補（優先順）

1. codeアダプタのY.Text＋Monaco
2. Cloudflare Access設定
3. gehditor: キーフレームシステム
