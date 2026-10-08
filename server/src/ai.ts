import type express from "express";
import { CodePatch } from "@aiduchi/protocol";

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

/** キー解決：BYOKヘッダ > ホストenv > null(dummy)。平文キーは返却値以外に保持・記録しない */
export function resolveCreds(req: express.Request): Creds | { forbidden: string } | null {
  const byokProvider = req.header("x-byok-provider");
  const byokKey = req.header("x-byok-key");
  const byokModel = req.header("x-byok-model");
  const byokBase = req.header("x-byok-base-url");
  if (byokProvider || byokKey) {
    if (!byokProvider || !byokKey) return { forbidden: "BYOK needs both x-byok-provider and x-byok-key" };
    const baseUrl = byokBase ?? OPENAI_COMPATIBLE_DEFAULTS[byokProvider] ?? OPENAI_COMPATIBLE_DEFAULTS.openai;
    return { provider: byokProvider, model: byokModel ?? "default", apiKey: byokKey, baseUrl, byok: true };
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
    baseUrl: process.env.HOST_OPENAI_BASE_URL ?? OPENAI_COMPATIBLE_DEFAULTS.openai,
    byok: false,
  };
}

const PATCH_SYSTEM = `You are a code editing agent. Output ONLY a JSON object: {"steps":[{"op":"upsertFile","path":"...","content":"..."}|{"op":"deleteFile","path":"..."}]}. Max 20 steps. Keep edits minimal and consistent with the existing files.`;

export async function generatePatch(
  creds: Creds,
  prompt: string,
  files: Record<string, string>,
): Promise<{ patch: { steps: { op: "upsertFile"; path: string; content: string }[] | { op: "deleteFile"; path: string }[] }; promptTokens: number; completionTokens: number }> {
  const fileList = Object.entries(files)
    .map(([p, c]) => `--- ${p} ---\n${c.slice(0, 4000)}`)
    .join("\n");
  const res = await fetch(`${creds.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${creds.apiKey}` },
    body: JSON.stringify({
      model: creds.model,
      messages: [
        { role: "system", content: PATCH_SYSTEM },
        { role: "user", content: `Request: ${prompt}\n\nCurrent files:\n${fileList || "(empty)"}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const body = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const parsed = CodePatch.safeParse(JSON.parse(body.choices[0]?.message?.content ?? "{}"));
  if (!parsed.success) throw new Error("invalid patch JSON");
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patch: parsed.data as any,
    promptTokens: body.usage?.prompt_tokens ?? 0,
    completionTokens: body.usage?.completion_tokens ?? 0,
  };
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
