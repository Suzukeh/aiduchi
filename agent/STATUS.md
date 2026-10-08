# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / 自走セッション終了（20:50）

## 済み（P0〜自走セッション分）

- [x] P0〜分岐修正: これまでの記載通り（`2ad18a2`まで）
- [x] **Y.Textリアルタイム共同編集**（`caf063a`）
  - ファイル編集をCodeMirror + y-codemirror.next（yCollab）でY.Textにバインド
  - 編集内容がリアルタイムに他クライアントへ同期、リモートカーソル表示
  - 未接続時はローカル編集にフォールバック
  - Y.Docの`files`マップ（path→Y.Text）で管理、保存で新ノード化
- [x] **E2Eテスト7本全合格**: UI 5本 + 共同編集1本 + 分岐1本

## 起動中のサービス（このマシン）
- API :3000 / sync :1234 / Vite :5173 / Tunnel vtest.suzuke.dev
- 注意: 再起動時は古いプロセスが残っていないか `ss -tlnp | grep :3000` で確認すること

## 未検証・既知のTODO

- [ ] Y.Textの2クライアント同時編集E2E（単一クライアントでは検証済み）
- [ ] Cloudflare Access（身内限定化）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] gehditor側の開発（キーフレーム、export等）
- [ ] 認証の強化（現状joinTokenのみ）
- [ ] Y.Textの初期化競合（2人が同時に開いた時のinit重複。実運用で問題が出たらUndoManager等で対処）

## 次の一手候補（優先順）

1. Y.Text 2クライアント同時編集のE2E検証
2. Cloudflare Access設定
3. gehditor: キーフレームシステム
