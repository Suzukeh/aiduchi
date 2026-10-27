# PROJECT — aiduchi（相槌 / 相鎚）

人とコーディングエージェントが相槌を打つように共同編集する、汎用バイブコーディング基盤。
名前の由来：鍛冶で師匠の鎚に合わせて弟子が鎚を入れる共同作業「相鎚」。綴りに `ai` が入る。

## コンセプト（確定）

- 進捗点＝**作業スレッド**（会話＋複数チェックポイント）。会話履歴をAIへ渡す。兄弟分岐は上書き禁止で追加のみ。
- AI patchは親ではなく**作業の基点チェックポイント**を基準にする（分岐の独立性）。
- 画面はプレビュー中心（プレビュー/ファイル/差分）＋複数フローティングチャット窓。各窓は作業へのビューで、閉じても会話・実行は残る。
- 窓の配置・前面順は**個人設定**。共有するのは作業・会話・成果のみ。
- 同期は自ホストYjs（Hocuspocus）既定で0円運用。共同編集は**分岐スコープ付き**の `Y.Text`（別分岐の同名ファイルを共有しない）。
- AIはホスト持ち既定、BYOKは任意（既定はメモリのみ。localStorageへ自動保存しない）。
- 公開はGitHub（OSS・MIT想定）+ Cloudflare Named Tunnel。Quick TunnelはSSE不可のため禁止。

> 2026-10-27の再計画で、実行・検証・Git統合を中核に置き直した。詳細と未合意点は `docs/REPLAN-2026-10-27.md`。

## 役割分担（重要）

- **aiduchi** = 開発基盤（このリポジトリ）。汎用・codeアダプタのみ。
- **gehditor** = 映像編集ソフト本体（https://github.com/Suzukeh/gehditor）。映像機能はこちらに実装する。
  **aiduchiに映像・video関連を持ち込まないこと。**

## アーキテクチャ

```
Browser ──> Vite :5173（単一入口、Tunnelのターゲット）
              ├─ /api  ─proxy─> API :3000（REST + AI Gateway）
              └─ /sync ─proxy─> Hocuspocus :1234（WS）
                                   └─ SQLite: DATA_DIR/aiduchi.db（DBが正・Yjsは作業コピー）
```

- Node状態遷移：`draft → generating → review → adopted | abandoned`。`adopted`は1本のみ。
- AI出力は `typed patch steps` のみ受付、Zod検証後に適用。検証失敗→`draft`に戻す。
- 予算：room月間トークン上限（BYOKは対象外・集計のみ）。許可モデルリストあり。
- 認証P0：`x-room-token: joinToken` のみ（ユーザー登録なし。表示名はlocalStorage＋Awareness）。
- 窓配置・presence・ファイル編集はYjs。ノード・スナップショットはDB。保存操作で新ノード化。

## リポジトリ構成

```
apps/web/              # React + Vite + Tailwind v4 + react-rnd + React Flow + Zustand
  src/store.ts         # 状態一元化（Yjs同期・presence・窓・BYOK・API）
  src/components/      # Sidebar / FloatingWindow / ChatWindow / FilesPanel / TreeOverlay / Dock
server/src/index.ts    # REST（rooms/nodes/snapshots/windows）
server/src/ai.ts       # キー解決（BYOK>host>dummy）・patch生成・SSE中継（OpenAI互換）
server/src/db.ts       # node:sqlite スキーマ・集計
server/src/sync.ts     # Hocuspocus（joinToken照合・ydocs永続化）
packages/protocol/     # 共有Zod・型
tests/                 # Playwright E2E（UI/共同編集/分岐/Y.Text）
cloudflared/           # Tunnel設定例
agent/                 # この引き継ぎ一式
```
