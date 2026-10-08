import type express from "express";

export type Creds = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  byok: boolean;
};

const OPENAI_COMPATIBLE_DEFAULTS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  ollama: "http://localhost:11434/v1",
};

const USER_AGENT = "aiduchi/0.1 (collaborative vibe-coding)";

/** baseUrl末尾が /chat/completions でも /v1 でも動くように正規化 */
function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
}

/** キー解決：BYOKヘッダ > ホストenv > null(dummy)。平文キーは返却値以外に保持・記録しない */
export function resolveCreds(req: express.Request): Creds | { forbidden: string } | null {
  const byokProvider = req.header("x-byok-provider");
  const byokKey = req.header("x-byok-key");
  const byokModel = req.header("x-byok-model");
  const byokBase = req.header("x-byok-base-url");
  if (byokProvider || byokKey) {
    if (!byokProvider || !byokKey) return { forbidden: "BYOK needs both x-byok-provider and x-byok-key" };
    const baseUrl = byokBase ?? OPENAI_COMPATIBLE_DEFAULTS[byokProvider] ?? OPENAI_COMPATIBLE_DEFAULTS.openai;
    return { provider: byokProvider, model: byokModel ?? "default", apiKey: byokKey, baseUrl: normalizeBase(baseUrl), byok: true };
  }
  const hostKey = process.env.HOST_OPENAI_KEY;
  if (!hostKey) return null;
  const allowed = (process.env.ALLOWED_MODELS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const want = req.header("x-model") ?? allowed[0] ?? "gpt-4o-mini";
  if (allowed.length > 0 && !allowed.includes(want)) return { forbidden: `model not allowed: ${want}` };
  return {
    provider: "host",
    model: want,
    apiKey: hostKey,
    baseUrl: normalizeBase(process.env.HOST_OPENAI_BASE_URL ?? OPENAI_COMPATIBLE_DEFAULTS.openai),
    byok: false,
  };
}

function chatUrl(creds: Creds): string {
  return `${creds.baseUrl}/chat/completions`;
}

function chatHeaders(creds: Creds, session: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${creds.apiKey}`,
    "User-Agent": USER_AGENT,
    // ルーティング最適化とprompt cachingのための安定したセッションID（OpenCode Go等で必須）
    "x-opencode-session": session,
  };
}

const CODE_PATCH_SYSTEM = `You are a code editing agent. Output ONLY a JSON object: {"steps":[{"op":"upsertFile","path":"...","content":"..."}|{"op":"deleteFile","path":"..."}]}. Max 20 steps. Keep edits minimal and consistent with the existing files. No markdown fences, no commentary.`;

/** モデル出力のコードフェンス等を剥がしてJSONを取り出す */
function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

export async function generatePatch(
  creds: Creds,
  prompt: string,
  context: unknown,
  session: string,
): Promise<{ patch: { steps: unknown[] }; promptTokens: number; completionTokens: number }> {
  const contextStr = typeof context === "string" ? context : JSON.stringify(context, null, 1).slice(0, 8000);
  const messages = [
    { role: "system", content: CODE_PATCH_SYSTEM },
    { role: "user", content: `Request: ${prompt}\n\nCurrent state:\n${contextStr || "(empty)"}` },
  ];
  const body = {
    model: creds.model,
    messages,
    temperature: 0.2,
    max_tokens: 2000,
    // 互換性を優先して response_format は送らない（対応プロバイダ依存のため）
  };
  const res = await fetch(chatUrl(creds), {
    method: "POST",
    headers: chatHeaders(creds, session),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`upstream ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const raw = extractJson(data.choices[0]?.message?.content ?? "{}") as { steps?: unknown[] };
  if (!Array.isArray(raw.steps)) throw new Error("invalid patch: no steps array");
  return {
    patch: { steps: raw.steps },
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

export async function* streamChat(creds: Creds, prompt: string, session: string) {
  const res = await fetch(chatUrl(creds), {
    method: "POST",
    headers: chatHeaders(creds, session),
    body: JSON.stringify({
      model: creds.model,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "").then((t) => t.slice(0, 200));
    throw new Error(`upstream ${res.status}: ${detail}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let usage = { promptTokens: 0, completionTokens: 0 };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
          usage?: { prompt_tokens: number; completion_tokens: number };
        };
        const text = j.choices?.[0]?.delta?.content;
        if (text) yield { text };
        if (j.usage) usage = { promptTokens: j.usage.prompt_tokens, completionTokens: j.usage.completion_tokens };
      } catch {
        /* keep-aliveやコメント行は無視 */
      }
    }
  }
  yield { done: true, usage };
}

export function dummyPatch(prompt: string, nodeId: string, provider: string, model: string) {
  return {
    steps: [
      {
        op: "upsertFile" as const,
        path: `notes/${nodeId}.md`,
        content: `# ${prompt}\n\n- provider: ${provider} / ${model}\n`,
      },
    ],
  };
}
