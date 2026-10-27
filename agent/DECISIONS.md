# DECISIONS — 決定ログ（新しいものほど上）

> 注記: D26以降が2026-10-27の再計画以降。D04, D15, D16, D17 は D20 で無効（gehditorへ移動）。D09〜D11, D25 は D29〜D31 で置換。

- D35 (2026-10-27): 中央パネルの表示版は「明示的に選んだ版」だけを追う。窓のフォーカス・最小化では切り替えない（作業対象が勝手に変わるのを防ぐ）。
- D34 (2026-10-27): スナップショット取得は `{files, hash}` を本文で返し、`x-snapshot-hash` も公開する。別オリジンのブラウザがヘッダを読めず保存が409になる事故を防ぐ。
- D33 (2026-10-27): 表示名など非ASCIIの値はHTTPヘッダに載せず本文で送る（fetch の ISO-8859-1 制約）。
- D32 (2026-10-27): `y-codemirror.next` は初期内容を反映しないため使用しない。Y.Text↔CodeMirror の最小同期を自前実装（`apps/web/src/collab.ts`）。遠隔カーソル描画は行わない。
- D31 (2026-10-27): 窓の配置・前面順・最小化は**個人設定**（localStorage）。共有するのは作業・会話・成果のみ。全員の配置をYjsで共有しない。
- D30 (2026-10-27): 共同編集ドキュメントのキーに分岐スコープ（チェックポイントID）を含める。`files[path]` 共有を廃止し、別分岐の同名ファイルを同一Y.Textに接続しない。
- D29 (2026-10-27): 進捗点＝**作業スレッド**（会話＋複数チェックポイント）。1メッセージ＝1ノードにしない。会話履歴をAIへ渡す。
- D28 (2026-10-27): 旧「完了」表記を製品の合格判定に使わない。E2Eの本数ではなく、内容保持・実行・採用・権限を基準にする。
- D27 (2026-10-27): 画面はプレビュー中心（プレビュー/ファイル/差分/実行結果の切替）＋複数チャット窓。Boardは後回し。
- D26 (2026-10-27): 対象リポジトリの実行・検証・Git統合をaiduchiの中核に置く。LLMのJSON差分適用だけを「コーディング」とみなさない。

- D25 (2026-10-08): 既定窓は作らない（空スタート）。同期接続時の既定窓出現がUX/テストと競合するため。
- D24 (2026-10-08): ノード一覧は5秒ポーリングで自動更新（他ユーザーの追加を反映）。将来はSSE/WS通知に置換可。
- D23 (2026-10-08): ファイル編集はY.Text + y-codemirror.nextでリアルタイム共同編集。未接続時はローカル編集にフォールバック。保存で新ノード化。
- D22 (2026-10-08): AI patchの基点は親ノードのスナップショット（`filesOfNode`）。分岐の独立性を保証（root分岐は兄弟の変更を含まない）。
- D21 (2026-10-08): Web UIはTailwind+react-rnd+React Flow+Zustandに全面移行。手書きinline styleを廃止。
- D20 (2026-10-08): 映像編集機能はgehditorリポジトリに一本化。aiduchiからvideoアダプタを除去。今後混ぜない。
- D19 (2026-10-08): gehditor（映像ソフト本体）を別リポジトリで開発。aiduchiは開発基盤としてgehditor開発を通じて改善する相互関係。
- D18 (2026-10-08): Tunnel公開は Vite :5173 単一入口（/api, /sync をプロキシ）。Web/API URLは相対パス化で同一オリジン動作。
- D17 (2026-10-08): Playwright（Chromium headless）でMP4出力を検証可能に。H.264はLevel 4.0（1080p対応）を使用。
- D16 (2026-10-08): exportはWebCodecs + mp4-muxer（H.264）。描画はrenderSceneToContext純粋関数をPreview/export共有でゼロドリフト。
- D15 (2026-10-08): videoアダプタのProjectJSONはprotocolに集約（サーバー・Web共有）。patch stepsはtyped（8種）に限定し、AI語彙=Inspector操作のみ。
- D14 (2026-10-08): Yjsクライアントは`@hocuspocus/provider`採用（y-websocketはHocuspocus認証プロトコル非対応のため）。
- D13 (2026-10-08): baseUrlは `/chat/completions` 付きでも正規化して叩く。x-opencode-sessionはroom単位の安定IDを自動送信。response_format非送信で互換性優先。
- D12 (2026-10-08): `agent/`引き継ぎmdを常設し、作業のたびにSTATUS更新を義務化。
- D11 (2026-10-08): TunnelはNamed必須、Quick禁止（SSE不可・URL不安定）。
- D10 (2026-10-08): composeは`aiduchi-data`共有volume＋`PUBLIC_API_URL` build arg。
- D09 (2026-10-08): Webの窓配置はRESTで共有保存（Yjs本格配線はP1）。
- D08 (2026-10-08): AI解決順はBYOKヘッダ＞ホストenv＞dummy。BYOKは保存・制限外。
- D07 (2026-10-08): 永続化は`node:sqlite`内蔵（依存追加ゼロ）。DBが正・Yjsは作業コピー。
- D06 (2026-10-08): リポジトリ名は`aiduchi`（和風・共同操作寄り。floatingは強みにしない）。
- D05 (2026-10-08): 初期案のツリー単独→Tree/List/Boardの3ビュー併用。
- D04 (2026-10-08): AE例は汎用コア上の`video`アダプタ（ProjectJSON＋typed patch）。
- D03 (2026-10-08): 同期はHocuspocus自ホスト既定＋`SyncProvider`抽象。
- D02 (2026-10-08): AI出力はtyped patch steps＋Zod検証のみ適用。
- D01 (2026-10-08): 1チャット=1進捗ノード、編集・再生成は兄弟分岐として残す。
