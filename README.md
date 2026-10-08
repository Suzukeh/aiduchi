# aiduchi（相槌 / 相鎚）

人とコーディングエージェントが相槌を打つように共同編集する、汎用バイブコーディング基盤。

語源の「相鎚」は、師匠の鎚に合わせて弟子が合間に鎚を入れる鍛冶の共同作業。
このリポジトリは、人とAIが交互に槌を打つ（＝チャット→パッチ→検証→採用を回す）ための最小コアを目指す。

- 1チャット = 1進捗ノード、Tree / List / Board の3ビュー
- 複数フローティングウィンドウ（react-rnd、各窓はノードへのビュー）
- 同期は自ホストYjs（Hocuspocus）が既定、0円運用可
- AIはホスト持ち既定、BYOKは任意（キーは保存しない）
- ファイルは手動編集・保存も可能（CodeMirror、新ノードとして記録）

> 映像編集ソフト本体は別リポジトリ **gehditor**（https://github.com/Suzukeh/gehditor）。
> このリポジトリは開発基盤に専念する。

## クイックスタート

```bash
cp .env.example .env       # HOST_OPENAI_KEY 等を設定（未設定でもdummyで動作）
npm install
npm --prefix packages/protocol run build
npm --prefix server run build
npm run dev                # web :5173 + api :3000
npm run dev:sync           # 同期サーバ :1234（別ターミナル）
```

テスト（Playwright + Chromium、API/sync/webを自動起動）：

```bash
npx playwright install chromium   # 初回のみ
npm test
```

## 起動構成（Tunnel公開時）

```
Browser ──> cloudflared (vtest.suzuke.dev) ──> Vite :5173
                                                  ├─ /api  ─proxy─> API :3000
                                                  └─ /sync ─proxy─> Hocuspocus :1234
```

Named Tunnel 必須（QuickはランダムURL＋SSE不可のため非推奨）：

```bash
cloudflared tunnel create aiduchi-dev
cloudflared tunnel route dns aiduchi-dev <your-host>
cp cloudflared/config.yml.example ~/.cloudflared/aiduchi.yml  # ホスト名を編集
cloudflared tunnel --config ~/.cloudflared/aiduchi.yml run
# 身内限定にする場合は dash側で Access(OTP) ポリシーを付ける
```

## 構成

```
apps/web/              # React + Vite + Tailwind + react-rnd + React Flow + Zustand
  src/store.ts         # 状態一元化（Yjs同期・presence・窓）
  src/components/      # Sidebar / FloatingWindow / ChatWindow / FilesPanel / TreeOverlay / Dock
server/                # REST + AI Gateway + Hocuspocus
  src/index.ts         # rooms / nodes / snapshots / windows API
  src/ai.ts            # キー解決（BYOK>host>dummy）・patch生成・SSE
  src/sync.ts          # Hocuspocus（joinToken照合・ydocs永続化）
packages/protocol/     # 共有Zodスキーマ
tests/                 # Playwright E2E（UI・共同編集）
agent/                 # 引き継ぎノート（STATUS/DECISIONS/WORKFLOW）
```

## API

```
POST /api/rooms {name, adapterKind}
GET  /api/rooms/:id
POST /api/rooms/:id/nodes {parentId, prompt}          # AI patch生成
POST /api/rooms/:id/nodes/:nodeId/chat  (SSE)
POST /api/rooms/:id/nodes/:nodeId/adopt | abandon
GET  /api/rooms/:id/nodes
GET  /api/rooms/:id/snapshots/:nodeId
POST /api/rooms/:id/snapshots {parentNodeId, files, label}   # 手動編集の保存
GET/PUT /api/rooms/:id/windows
GET  /healthz
WS   /sync (hocuspocus :1234)
```

認証は `x-room-token: joinToken` のみ。BYOKは `x-byok-provider` / `x-byok-key` / `x-byok-model`。

## ロードマップ

- P0〜P1 ✅: room入室、複数窓（react-rnd）、Nodeツリー（React Flow）、List/Board、
  Hocuspocus同期＋presence、ホストキーAI＋BYOK、SQLite永続化、ファイル閲覧・手動編集（CodeMirror）、
  共有リンク、Tunnel公開、E2Eテスト（UI 6本）
- 次: Y.Textによるファイル内容のリアルタイム共同編集、Cloudflare Access、管理画面
