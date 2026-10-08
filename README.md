# aiduchi（相槌 / 相鎚）

人とコーディングエージェントが相槌を打つように共同編集する、汎用バイブコーディング基盤。

語源の「相鎚」は、師匠の鎚に合わせて弟子が合間に鎚を入れる鍛冶の共同作業。
このリポジトリは、人とAIが交互に槌を打つ（＝チャット→パッチ→検証→採用を回す）ための最小コアを目指す。

- 汎用コア + ドメイン別アダプタ（`code` / `video` …）
- 1チャット = 1進捗ノード、Tree / List / Board の3ビュー
- 複数フローティングウィンドウ（各窓はノードへのビュー）
- 同期は自ホストYjs（Hocuspocus）が既定、0円運用可
- AIはホスト持ち既定、BYOKは任意（キーは保存しない）

## クイックスタート（P0）

```bash
cp .env.example .env
npm install
npm run dev        # web :5173 + server :3000 を起動
# 別端末（同期サーバを分ける場合）
npm run dev:sync
```

Dockerでまとめて動かす：

```bash
docker compose up --build
```

Cloudflare Tunnel（Named必須。QuickはランダムURL＋SSE不可のため非推奨）：

```bash
cloudflared tunnel create aiduchi-dev
cloudflared tunnel route dns aiduchi-dev collab.example.com
cloudflared tunnel route dns aiduchi-dev sync-collab.example.com
cp cloudflared/config.yml.example ~/.cloudflared/aiduchi.yml  # ホスト名を編集
cloudflared tunnel --config ~/.cloudflared/aiduchi.yml run
# 身内限定にする場合は dash側で Access(OTP) ポリシーを付ける
```

本番相当の公開では `PUBLIC_API_URL=https://collab.example.com docker compose up --build`
でwebをビルドし、`apps/web/.env` の向き先も公開URLに合わせる。

## 構成

```
apps/web/              # React + Vite（Tree/List/Board + フローティング窓）
server/                # REST + SSE + Hocuspocusフック + AI Gateway
packages/protocol/     # 共有Zodスキーマ・型・Adapter I/F
cloudflared/           # Tunnel設定例
docs/DESIGN.md         # 詳細設計
```

## API（P0最小）

```
POST /api/rooms {name, adapterKind}
GET  /api/rooms/:id
POST /api/rooms/:id/nodes {parentId, prompt}
POST /api/rooms/:id/nodes/:nodeId/chat  (SSE)
POST /api/rooms/:id/nodes/:nodeId/adopt | abandon
GET  /api/rooms/:id/nodes
GET  /healthz
WS   /sync (hocuspocus :1234)
```

認証は `x-room-token: joinToken` のみ。admin操作だけ `x-admin-token`。

## ロードマップ

- P0: room入室、複数窓、Nodeツリー、Hocuspocus同期、ホストキーAI往復、codeアダプタ最小、SQLite永続化、BYOK任意 ✅
- P1: videoアダプタ（AE例：ProjectJSON + タイムライン + export）、Yjsリアルタイム同期本格化
- P2: 公開手順整備、予算・管理画面
