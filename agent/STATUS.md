# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / main `7bbc49b`

## 済み（P0完了）

- [x] 雛形・初回push（`0849b37`）＋成果物掃除（`69e63a1`）
- [x] SQLite永続化＋再起動復元を検証（`3d0ed35`）
- [x] AI Gateway本実装：BYOKヘッダ＞ホストenv＞dummy、予算・許可モデル、SSE中継（`3d0ed35`）
- [x] windows共有保存API（GET/PUT）＋Web側の読込・自動保存・BYOK欄・エラー表示（`bdcb609`）
- [x] compose共有volume・公開URL build arg・Named Tunnel手順書（`7bbc49b`）
- [x] agent/引き継ぎ一式（このコミット）

検証済み：`/healthz`、room作成→node生成→adopt、snapshot取得、windows保存、SSE dummy、
kill→再起動後の復元、web本番ビルド、web dev 200応答＋同経路のAPI実動。

## 未検証・既知のTODO

- [ ] 上流LLMの実応答（HOSTキー未設定のため未テスト。`.env`にキーを入れれば動く設計）
- [ ] HocuspocusのjoinToken照合（`sync.ts`のTODO。現状はtoken有無のみ）
- [ ] Yjsリアルタイム同期の本格配線（Web側はRESTのみ、Yjsは未接続）
- [ ] `video`アダプタ（ProjectJSON＋タイムライン＋export）
- [ ] docker composeの実起動検証（作業機にdockerなし）
- [ ] Named Tunnelの作成・DNS登録・Access付与（オーナーのCloudflare側操作）

## 次の一手候補（優先順）

1. `.env`にOpenAI互換キーを入れてAI実応答を検証（キー入手後）
2. Yjsリアルタイム同期の配線（presence・窓・編集中テキスト）
3. `video`アダプタP1
