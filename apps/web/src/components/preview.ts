/**
 * ファイル群から、そのまま動く静的プレビューを組み立てる。
 * index.html を起点に、同一プロジェクト内の CSS / JS をインライン化する。
 * 外部URLの資産はそのまま参照する（取得はしない）。
 */
export function buildPreviewHtml(files: Record<string, string>): string | null {
  const paths = Object.keys(files);
  const entry = paths.includes("index.html") ? "index.html" : paths.find((p) => p.endsWith(".html")) ?? null;
  if (!entry) return null;
  const source = files[entry] ?? "";

  const doc = document.implementation.createHTMLDocument("preview");
  doc.documentElement.innerHTML = source;

  doc.querySelectorAll("link[rel~='stylesheet'][href]").forEach((el) => {
    const href = el.getAttribute("href") ?? "";
    const key = href.replace(/^\.\//, "");
    const css = files[key];
    if (css === undefined) return;
    const style = doc.createElement("style");
    style.textContent = css;
    el.replaceWith(style);
  });

  doc.querySelectorAll("script[src]").forEach((el) => {
    const src = el.getAttribute("src") ?? "";
    const key = src.replace(/^\.\//, "");
    const js = files[key];
    if (js === undefined) return;
    const script = doc.createElement("script");
    script.textContent = js;
    el.replaceWith(script);
  });

  if (!doc.querySelector("meta[charset]")) {
    const meta = doc.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    doc.head.prepend(meta);
  }

  return "<!doctype html>" + doc.documentElement.outerHTML;
}
