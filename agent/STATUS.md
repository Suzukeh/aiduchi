# STATUS — 進捗と次の一手（作業のたびに更新）

最終更新：2026-10-08 / gehditor開始

## 済み（P0〜Tunnel公開 + ユーザー名 + gehditor開始）

- [x] P0〜Tunnel公開 + ユーザー名設定: これまでの記載通り（`08919fd`まで）
- [x] **gehditor リポジトリ開始**（https://github.com/Suzukeh/gehditor）
  - 映像ソフト本体。aiduchiで共同開発する「つくっているソフト」
  - 初期構成: ProjectJSON / applyPatch / resolveTimeline / Timeline / Preview / Inspector
  - aiduchiのvideoアダプタで検証した設計を本体に昇華

## 開発フロー（aiduchi ↔ gehditor）

1. **gehditorに機能を足す**（Timeline、キーフレーム、エフェクト、export等）
2. その過程で **aiduchiの不足に気付く**（AI語彙、共同編集、UI等）
3. **aiduchiを改善**し、次の機能開発でまた使う
4. 例：gehditorにキーフレームUIが要る→aiduchiのvideoアダプタのpatch stepsに `setKeyframe` 追加→両方改善

## 未検証・既知のTODO

- [ ] gehditor: キーフレーム、実アセット、export（WebCodecs）、Undo/Redo
- [ ] aiduchi: codeアダプタのY.Text＋Monaco
- [ ] aiduchi: Cloudflare Access（身内限定化）
- [ ] Timelineのドラッグ・トリム操作（Playwrightセレクタ不安定のため保留）

## 次の一手候補（優先順）

1. gehditor: キーフレームシステム（ProjectJSON拡張＋Timeline UI）
2. gehditor: export（WebCodecs、aiduchiの実装を移植）
3. aiduchi: codeアダプタのY.Text＋Monaco
