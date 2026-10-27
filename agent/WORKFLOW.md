# WORKFLOW — 作業手順（作業前に読む）

## 初回セットアップ

```bash
cp .env.example .env        # 初回のみ（.envはcommit禁止）
npm install
npx playwright install chromium   # テスト用（初回のみ）
```

## 起動（開発）

```bash
# 1) ビルド（protocolはserver/webの前提）
npm --prefix packages/protocol run build
npm --prefix server run build

# 2) 3プロセス起動（別ターミナル or setsid）
set -a; source .env; set +a; export DATA_DIR=./data
node server/dist/index.js      # API :3000
node server/dist/sync.js       # sync :1234
npm --prefix apps/web run dev  # Vite :5173（Tunnelの入口）
```

注意：再起動時は**古いプロセスが残っていないか必ず確認**（過去に新コードが反映されない事故あり）。
```bash
ss -tlnp | grep -E ":3000|:1234|:5173"
```

## テスト（推奨の検証手段）

```bash
npm test                       # pretestで server をビルド→API/sync/web自動起動→E2E 13本
npx playwright test tests/content-integrity.spec.ts --reporter=list   # 個別実行
```

注意: UIテストでは中央パネルの上にフローティング窓が重なる。パネルを操作する前に
`minimizeWindows(page)`（`tests/helpers/ui.ts`）で窓を最小化する。

## 守ること

- `.env` / `*.pem` / `*.key` / トークン類 / `data/`（SQLite）は絶対にcommitしない。push前に `git status` と `git diff --cached` を確認し、`API_KEY|TOKEN=|SECRET=|PASSWORD=` の混入を見る。
- BYOKキー・ホストキーをログ・DB・コードに出さない（`ai.ts`の解決方針を維持）。
- Node分岐は上書き禁止・追加のみ。AI patchは親ノードのスナップショット基点（`filesOfNode`）を維持。
- 共同編集のY.Doc名は `room:<roomId>:node:<nodeId>`。パスだけをキーにした共有マップを作らない（分岐が混ざる）。
- 初期内容はサーバの `seedDocument` だけで書く。クライアントから初期化しない（二重挿入の原因）。
- 保存は `baseHash` を必ず送る。409を無視して再送しない。
- 映像・video関連をaiduchiに持ち込まない（gehditorへ）。
- ビルド生成物（`dist/`等）をcommitしない。webの`tsc`は`noEmit`。
- 小さくcommitし、pushする。amend・force-pushはしない。

## 作業後の更新義務

1. `agent/STATUS.md` の「済み／未検証／次の一手」を更新（日付・コミットhash付き）。
2. 設計判断を変えたら `agent/DECISIONS.md` に採番追記。
3. 手順・構成が変わったら `agent/PROJECT.md` / `agent/WORKFLOW.md` / `README.md` を更新。
