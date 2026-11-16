import "server-only";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

export const AI_TIMEOUT_MS = 5_000;

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generate(
  parts: GeminiPart[],
  options: { system?: string; json?: boolean; maxOutputTokens: number },
): Promise<string> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
      generationConfig: {
        maxOutputTokens: options.maxOutputTokens,
        ...(options.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Gemini ${response.status}`);

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) throw new Error("Gemini: răspuns gol");
  return text;
}
