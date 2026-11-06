import { generate } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { handler, HttpError } from "@/lib/server/http";
import { toAiProfile } from "@/lib/server/profiles";
import { CONSULT_SYSTEM, wrapProfile } from "@/lib/server/prompts";
import { ConsultSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

type Turn = { role: "user" | "assistant"; content: string };

/**
 * AI 매칭 상담. 대화 기록은 클라이언트가 들고 있고(최대 12턴), 서버는 매번 정리된 선호를 돌려준다.
 * 상담 내용은 추천에만 쓰고 상대에게 보이지 않는다.
 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const turns: Turn[] = Array.isArray(body?.messages)
    ? body.messages
        .filter((t: Turn) => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string")
        .slice(-12)
        .map((t: Turn) => ({ role: t.role, content: t.content.slice(0, 500) }))
    : [];
  if (!turns.length || turns[turns.length - 1].role !== "user") throw new HttpError(400, "상담 내용을 입력해주세요.");

  const current = typeof body?.current_recommendations === "string" ? body.current_recommendations.slice(0, 600) : "";
  const result = await generate({
    name: "consult",
    system: CONSULT_SYSTEM,
    user: [
      wrapProfile("me", toAiProfile(me)),
      current ? `<current_recommendations>\n${current}\n</current_recommendations>` : "",
      me.match_preference ? `<previous_preference>\n${me.match_preference}\n</previous_preference>` : "",
      `<conversation>\n${turns.map((t) => `${t.role === "user" ? "학생" : "AI 조교"}: ${t.content}`).join("\n")}\n</conversation>`,
      "마지막 학생 말에 답하고, 선호를 정리해 주세요.",
    ].join("\n"),
    schema: ConsultSchema,
    maxTokens: 3000,
    validate: (v) => (v.reply.trim() ? null : "reply가 비어 있음"),
  });
  if (!result) {
    const last = turns[turns.length - 1].content;
    return {
      reply: "말씀해 주셔서 고마워요! 지금 말씀하신 내용을 반영해서 다시 추천해 볼게요.",
      preference_summary: last.slice(0, 150),
      ready: true,
      source: "fallback",
    };
  }
  return { ...result, preference_summary: result.preference_summary.slice(0, 300), source: "ai" };
});
