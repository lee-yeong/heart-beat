import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

// Claude 호출은 이 파일에서만 한다. 서버 전용.
let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
  return client;
}

export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";

type GenerateOptions<T> = {
  name: string; // 로그용
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** 스키마 외 추가 검증. 문제가 있으면 사유 문자열을 돌려준다. */
  validate?: (value: T) => string | null;
  maxTokens?: number;
};

/**
 * 구조화된 JSON 응답을 받아 검증한다.
 * 파싱·스키마·추가 검증이 실패하면 1회 재시도하고, 그래도 실패하면 null (호출자가 fallback 사용).
 */
export async function generate<T>({ name, system, user, schema, validate, maxTokens = 8000 }: GenerateOptions<T>): Promise<T | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(`[ai:${name}] ANTHROPIC_API_KEY 없음 → fallback`);
    return null;
  }
  let feedback = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await getClient().messages.parse({
        model: AI_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: feedback ? `${user}\n\n${feedback}` : user }],
        output_config: { format: zodOutputFormat(schema), effort: "low" },
      });
      if (res.stop_reason === "refusal") {
        console.warn(`[ai:${name}] refusal`, res.stop_details?.category);
        return null;
      }
      const out = res.parsed_output;
      if (!out) {
        console.warn(`[ai:${name}] 파싱 실패 (시도 ${attempt}, stop=${res.stop_reason})`);
        feedback = "이전 응답이 JSON 형식에 맞지 않았어요. 스키마에 맞게 다시 작성하세요.";
        continue;
      }
      const problem = validate?.(out as T) ?? null;
      if (problem) {
        console.warn(`[ai:${name}] 검증 실패 (시도 ${attempt}): ${problem}`);
        feedback = `이전 응답이 규칙을 어겼어요: ${problem}. 규칙을 지켜 다시 작성하세요.`;
        continue;
      }
      return out as T;
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
        console.error(`[ai:${name}] 인증 오류`, e.message);
        return null;
      }
      if (e instanceof Anthropic.APIError) console.error(`[ai:${name}] API 오류 ${e.status}`, e.message);
      else console.error(`[ai:${name}] 오류`, e);
    }
  }
  return null;
}
