# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / 自走セッション完了

## 済み（P0〜自走セッション分）

- [x] P0〜Y.Text共同編集: これまでの記載通り（`254b372`まで）
- [x] **Y.Text 2クライアント同時編集E2E**（`a9f7e22`）
  - Aが入力→Bにリアルタイム反映を検証（`Y.Text realtime sync OK`）
- [x] **E2Eテスト8本全合格**: UI 5 + 共同編集1 + 分岐1 + Y.Text共同編集1

## 起動中のサービス（このマシン）
- API :3000 / sync :1234 / Vite :5173 / Tunnel vtest.suzuke.dev
- 注意: 再起動時は古いプロセスが残っていないか `ss -tlnp | grep :3000` で確認すること

## 未検証・既知のTODO

- [ ] Cloudflare Access（身内限定化）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] gehditor側の開発（キーフレーム、export等）
- [ ] 認証の強化（現状joinTokenのみ）
- [ ] Y.Textの初期化競合（2人が同時に開いた時のinit重複。実運用で問題が出たら対処）

## 次の一手候補（優先順）

1. Cloudflare Access設定
2. gehditor: キーフレームシステム
3. 認証の強化（ユーザー登録・権限）
