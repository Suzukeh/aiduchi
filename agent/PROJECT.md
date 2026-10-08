# PROJECT — aiduchi（相槌 / 相鎚）

人とコーディングエージェントが相槌を打つように共同編集する、汎用バイブコーディング基盤。
名前の由来：鍛冶で師匠の鎚に合わせて弟子が鎚を入れる共同作業「相鎚」。綴りに `ai` が入る。

## コンセプト（確定）

- 汎用コア + ドメイン別アダプタ（`code` / `video(AE例)` …）。映像制作ソフトは一例。
- 1チャット = 1進捗ノード。兄弟分岐は上書き禁止で追加のみ。
- ビュー3種：Tree（俯瞰・分岐）/ List（時系列レビュー）/ Board（状態ゲート）。
- 複数フローティングウィンドウ。各窓はノードへのビュー。
- 同期は自ホストYjs（Hocuspocus）既定で0円運用。`SyncProvider`抽象で差替可。
- AIはホスト持ち既定、BYOKは任意。BYOKキーは保存・記録しない。
- 公開はGitHub（OSS・MIT想定）+ Cloudflare Named Tunnel。Quick TunnelはSSE不可のため禁止。

## アーキテクチャ

```
Browser ──HTTPS──> app :3000 (Web配信 + REST + SSE + AI Gateway)
  │──WSS /sync──> hocuspocus :1234（別プロセス、同compose）
  └─ SQLite: DATA_DIR/aiduchi.db（DBが正・Yjsは作業コピー）
```

- Node状態遷移：`draft → generating → review → adopted | abandoned`。`adopted`は1本のみ。
- AI出力は `typed patch steps` のみ受付、Zod検証後に適用。検証失敗→`draft`に戻す。
- 予算：room月間トークン上限（BYOKは対象外・集計のみ）。許可モデルリストあり。
- 認証P0：`x-room-token: joinToken` のみ。admin操作だけ `x-admin-token`。

## リポジトリ構成

```
apps/web/            # React+Vite。Tree/List/Board + フローティング窓
server/src/index.ts  # REST + SSE
server/src/ai.ts     # キー解決・patch生成・stream中継（OpenAI互換）
server/src/db.ts     # node:sqlite スキーマ・集計
server/src/sync.ts   # Hocuspocusサーバ
packages/protocol/   # 共有Zod・型・Adapter I/F
cloudflared/         # Tunnel設定例
agent/               # この引き継ぎ一式
```
