import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import * as Y from "yjs";

const LOCAL_ORIGIN = Symbol("aiduchi-cm-local");

/** 単一の連続領域として差分を求める（共同編集の本文は小さく、これで十分） */
export function minimalChange(before: string, after: string): { from: number; to: number; insert: string } | null {
  if (before === after) return null;
  let start = 0;
  const max = Math.min(before.length, after.length);
  while (start < max && before[start] === after[start]) start += 1;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore -= 1;
    endAfter -= 1;
  }
  return { from: start, to: endBefore, insert: after.slice(start, endAfter) };
}

/**
 * Y.Text と CodeMirror の最小同期。
 *
 * 依存していた y-codemirror.next 0.3.6 は、生成時に Y.Text の既存内容を
 * エディタへ反映しない実装だったため、保存済みの本文が空に見えた。
 * ここでは「初期値は呼び出し側が doc として渡す」「以降の双方向更新だけを扱う」。
 * 遠隔カーソルの描画は行わない（参加者表示はサイドバーで行う）。
 */
export function ytextSync(text: Y.Text): Extension {
  let applyingRemote = false;

  const remoteToEditor = ViewPlugin.fromClass(
    class {
      private observer: (event: Y.YTextEvent, tr: Y.Transaction) => void;

      constructor(private view: EditorView) {
        this.observer = (_event, tr) => {
          if (tr.origin === LOCAL_ORIGIN) return;
          const next = text.toString();
          const current = this.view.state.doc.toString();
          const change = minimalChange(current, next);
          if (!change) return;
          applyingRemote = true;
          try {
            this.view.dispatch({ changes: change });
          } finally {
            applyingRemote = false;
          }
        };
        text.observe(this.observer);
      }

      destroy() {
        text.unobserve(this.observer);
      }
    },
  );

  const editorToY = EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.docChanged || applyingRemote) return;
    const next = update.state.doc.toString();
    const before = text.toString();
    const change = minimalChange(before, next);
    if (!change) return;
    const doc = text.doc;
    const apply = () => {
      if (change.to > change.from) text.delete(change.from, change.to - change.from);
      if (change.insert) text.insert(change.from, change.insert);
    };
    if (doc) doc.transact(apply, LOCAL_ORIGIN);
    else apply();
  });

  return [remoteToEditor, editorToY];
}
