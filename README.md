# aiduchi（相槌 / 相鎚）

人とコーディングエージェントが相槌を打つように共同編集する、汎用バイブコーディング基盤。

語源の「相鎚」は、師匠の鎚に合わせて弟子が合間に鎚を入れる鍛冶の共同作業。
このリポジトリは、人とAIが交互に槌を打つ（＝会話→変更→確認→採用を回す）ための最小コアを目指す。

- 1チャット＝1つの作業スレッド。会話の流れとチェックポイントをリスト／ツリーで追う
- 窓は複数開ける。配置・前面順・未送信の下書きは**個人**（他人の作業机を動かさない）
- 中央はプレビュー／ファイル／差分。静的サイトは sandbox iframe でそのまま動く
- 共同編集は**版（チェックポイント）ごと**。別分岐の同名ファイルとは混ざらない
- 同期は自ホストYjs（Hocuspocus）が既定、追加SaaSなしで運用可
- AIはホスト持ち既定、BYOKは任意。BYOKキーは**メモリのみ**（localStorageへ保存しない）

> 映像編集ソフト本体は別リポジトリ **gehditor**（https://github.com/Suzukeh/gehditor）。
> このリポジトリは開発基盤に専念する。

## クイックスタート

```bash
cp .env.example .env       # HOST_OPENAI_KEY 等を設定（未設定でもdummyで動作）
npm install
npm run build:server       # protocol + server
npm run dev                # web :5173 + api :3000
npm run dev:sync           # 同期サーバ :1234（別ターミナル）
```

テスト（Playwright + Chromium、API/sync/webを自動起動。`pretest` が server をビルドする）：

```bash
npx playwright install chromium   # 初回のみ
npm test
```

## 使い方の流れ

1. roomを作る → 「新しい窓」でチャット窓を開く
2. 指示を送る → 子チェックポイントができ、中央のプレビュー／ファイル／差分がその版を表示
3. ファイルタブで内容を確認・編集 → 保存で**新しいチェックポイント**（元の版は不変）
4. 窓はドラッグで移動、最小化すると下のドックから戻せる。下書きは再読込後も残る
5. 参加者は共有リンクで入室。表示名は各自が設定（presenceに色付きで出る）

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
  src/store.ts         # 状態一元化（個人の窓・presence・版ごとのY.Doc）
  src/collab.ts        # Y.Text ↔ CodeMirror の最小同期
  src/components/      # Sidebar / NodePanel / FilesPanel / ChatWindow / FloatingWindow / TreeOverlay / Dock
server/                # REST + AI Gateway + Hocuspocus
  src/index.ts         # rooms / nodes / thread / snapshots / windows API
  src/ai.ts            # キー解決（BYOK>host>dummy）・patch生成・SSE
  src/sync.ts          # Hocuspocus（joinToken照合・版ごとの初期化・ydocs永続化）
packages/protocol/     # 共有Zodスキーマ
tests/                 # Playwright E2E（内容保持・分岐独立・共同編集・プレビュー）
agent/                 # 引き継ぎノート（STATUS/DECISIONS/WORKFLOW）
```

### 同期ドキュメント

- `room:<id>:node:<nodeId>` … その版のファイル（`Y.Map<path, Y.Text>`）。接続時にサーバがスナップショットから一度だけ初期化
- `room:<id>:node:lobby` … presence（表示名・色）のみ
- 窓配置・下書きはYjsに載せない（localStorage `aiduchi.windows.<roomId>`）

## API

```
POST /api/rooms {name, adapterKind}
GET  /api/rooms/:id
POST /api/rooms/:id/nodes {parentId, prompt, authorName}   # AI patch生成
POST /api/rooms/:id/nodes/:nodeId/chat  (SSE)
POST /api/rooms/:id/nodes/:nodeId/adopt | abandon
GET  /api/rooms/:id/nodes
GET  /api/rooms/:id/nodes/:nodeId/thread                    # 基点→現在の会話
GET  /api/rooms/:id/snapshots/:nodeId                       # {files, hash}
POST /api/rooms/:id/snapshots {parentNodeId, files, label, baseHash, authorName}
GET/PUT /api/rooms/:id/windows                              # 旧版の互換用（現在は未使用）
GET  /healthz
WS   /sync (hocuspocus :1234)
```

認証は `x-room-token: joinToken` のみ。保存時は `baseHash` が一致しないと 409（上書きしない）。
BYOKは `x-byok-provider` / `x-byok-key` / `x-byok-model`（サーバは保存しない）。

## 現状と制約

- 実装済み: 複数窓、作業スレッド、版ごとの共同編集、手動編集＋保存、静的プレビュー、AI（ホスト/BYOK/ダミー）、Tunnel公開
- 未実装: 対象リポジトリの実行・ビルド・テスト（Paseo接続と実行隔離）、採用＝Git統合＋再検証、権限（閲覧/編集/採用）、Cloudflare Access、バイナリ資産
- 「採用」は現状statusの更新のみ。対象アプリは変わらない
- 実行中のAIは1リクエスト同期。複数同時実行の制御は未実装

計画と監査: `docs/REPLAN-2026-10-27.md` / `agent/audits/2026-10-27.md`
