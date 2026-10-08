# WORKFLOW — 作業手順（作業前に読む）

## 起動・検証

```bash
cp .env.example .env        # 初回のみ（.envはcommit禁止）
npm install
npm --prefix packages/protocol run build
npm --prefix server run build
npm --prefix apps/web run build   # 型検査＋本番ビルド
# API疎通（別DATA_DIR推奨）
DATA_DIR=/tmp/aidXXXX PORT=31XX npm --prefix server start
curl localhost:31XX/healthz
```

## 守ること

- `.env` / `*.pem` / `*.key` / トークン類は絶対にcommitしない。push前に `git status` と `git diff --cached` を見て、`API_KEY|TOKEN=|SECRET=|PASSWORD=` が混入していないか確認する。
- BYOKキー・ホストキーをログ・DB・コードに出さない（`ai.ts`の解決方針を維持）。
- Node分岐は上書き禁止・追加のみ。`adopted`は1本。
- ビルド生成物（`dist/`、`apps/web/src/*.js`等）をcommitしない。webの`tsc`は`noEmit`。
- 小さくcommitし、pushする。amend・force-pushはしない。

## 作業後の更新義務

1. `agent/STATUS.md` の「済み／未検証／次の一手」を更新（日付・コミットhash付き）。
2. 設計判断を変えたら `agent/DECISIONS.md` に採番追記。
3. 手順が変わったら `agent/WORKFLOW.md` と `README.md` を更新。
