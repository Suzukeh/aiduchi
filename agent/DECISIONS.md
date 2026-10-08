# DECISIONS — 決定ログ（新しいものほど上）

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
