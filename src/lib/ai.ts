import "server-only";
import { z } from "zod";
import { ApiError } from "./http";

// Next.js route bundles share these small, process-local runtime controls.
const runtime = globalThis as typeof globalThis & {
  __flexirovaAi?: { status: string; inFlight: number };
};
const state = (runtime.__flexirovaAi ??= {
  status: "configured_unverified",
  inFlight: 0,
});
export function aiStatus() {
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  return {
    configured,
    provider: "OpenAI",
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    status: configured ? state.status : "not_configured",
  };
}
export async function structuredResponse<T>(
  name: string,
  schema: z.ZodType<T>,
  instructions: string,
  input: string,
): Promise<T> {
  if (!aiStatus().configured) throw new ApiError("AI_NOT_CONFIGURED", 503);
  if (state.inFlight >= 3) throw new ApiError("AI_RATE_LIMITED", 429);
  state.inFlight++;
  try {
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: aiStatus().model,
          store: false,
          max_output_tokens: 1200,
          instructions,
          input,
          text: {
            format: {
              type: "json_schema",
              name,
              strict: true,
              schema: z.toJSONSchema(schema),
            },
          },
        }),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw new ApiError("AI_UNAVAILABLE", 503);
    }
    // Never log or return provider response bodies, headers, or credentials.
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new ApiError("AI_AUTH_ERROR", 503);
      if (response.status === 429)
        throw new ApiError(
          [
            "insufficient_quota",
            "credit_balance_exhausted",
            "billing_hard_limit_reached",
          ].includes(body?.error?.code)
            ? "AI_QUOTA_EXCEEDED"
            : "AI_RATE_LIMITED",
          503,
        );
      if (body?.error?.code === "model_not_found")
        throw new ApiError("AI_MODEL_UNAVAILABLE", 503);
      throw new ApiError("AI_UNAVAILABLE", 503);
    }
    if (body?.status !== "completed")
      throw new ApiError("AI_INVALID_RESPONSE", 502);
    const content = (body.output ?? []).flatMap(
      (item: { content?: { type: string; text?: string }[] }) =>
        item.content ?? [],
    );
    const text = content
      .filter((item: { type: string }) => item.type === "output_text")
      .map((item: { text?: string }) => item.text ?? "")
      .join("");
    let parsed: T;
    try {
      parsed = schema.parse(JSON.parse(text));
    } catch {
      throw new ApiError("AI_INVALID_RESPONSE", 502);
    }
    state.status = "ready";
    return parsed;
  } catch (error) {
    state.status =
      error instanceof ApiError ? error.code.toLowerCase() : "ai_unavailable";
    throw error instanceof ApiError
      ? error
      : new ApiError("AI_UNAVAILABLE", 503);
  } finally {
    state.inFlight--;
  }
}

export async function aiRequestBody(request: Request) {
  // Read with a byte cap even when Content-Length is absent or incorrect.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("VALIDATION_ERROR", 422);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 64000) {
      await reader.cancel();
      throw new ApiError("VALIDATION_ERROR", 422);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError("VALIDATION_ERROR", 422);
  }
}
