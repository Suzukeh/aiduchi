# DESIGN (v0.1要点)

詳細は会話時の設計書を参照。P0実装メモ：

- DB正・Yjs作業コピー。P0はserver内メモリ＋スナップショット配列で代用し、P1でSQLite/Postgres永続化。
- Node遷移: draft→generating→review→adopted|abandoned。兄弟分岐は上書き禁止。
- AI解決順: X-BYOK-*ヘッダ > HOST_OPENAI_KEY > dummy。BYOKは保存しない。
- 同期: Hocuspocus既定（SyncProvider抽象で差替可）。認証はjoinTokenのみ。
- 公開: Named Tunnelのみ。QuickはSSE不可のため非推奨。
