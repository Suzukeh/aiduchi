# PROJECT — aiduchi（相槌 / 相鎚）

人とコーディングエージェントが相槌を打つように共同編集する、汎用バイブコーディング基盤。
名前の由来：鍛冶で師匠の鎚に合わせて弟子が鎚を入れる共同作業「相鎚」。綴りに `ai` が入る。

## コンセプト（確定）

- 1チャット = 1進捗ノード。兄弟分岐は上書き禁止で追加のみ。AI patchは親ノードのスナップショットを基点にする（分岐の独立性）。
- ビュー：Tree（React Flow・俯瞰/分岐）/ List（時系列レビュー）/ Board（状態ゲート）。
- 複数フローティングウィンドウ（react-rnd）。各窓はノードへのビュー。配置はYjsで全員共有。
- 同期は自ホストYjs（Hocuspocus）既定で0円運用。ファイル編集はY.Text（y-codemirror.next）でリアルタイム共同編集。
- AIはホスト持ち既定、BYOKは任意。BYOKキーは保存・記録しない（ヘッダ経由・メモリ内のみ）。
- 公開はGitHub（OSS・MIT想定）+ Cloudflare Named Tunnel。Quick TunnelはSSE不可のため禁止。

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
