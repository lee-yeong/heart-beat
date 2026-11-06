import { generate } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { toAiProfile, type ProfileRow } from "@/lib/server/profiles";
import { INTRO_SYSTEM, wrapProfile } from "@/lib/server/prompts";
import { QuestionsSchema } from "@/lib/server/schemas";
import type { MatchAnalysis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 수강신청 한마디 추천: 추천 근거를 바탕으로 보낼 멘트 3개 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const receiverId = String(body?.receiver_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(receiverId)) throw new HttpError(400, "잘못된 요청이에요.");

  const [{ data: other }, { data: rec }] = await Promise.all([
    db().from("profiles").select("*").eq("id", receiverId).maybeSingle<ProfileRow>(),
    db().from("recommendations").select("analysis").eq("user_id", me.id).eq("candidate_id", receiverId).maybeSingle(),
  ]);
  if (!other) throw new HttpError(404, "상대를 찾을 수 없어요.");
  const match = rec?.analysis as MatchAnalysis | undefined;

  const result = await generate({
    name: "intro",
    system: INTRO_SYSTEM,
    user: [
      wrapProfile("me", toAiProfile(me)),
      wrapProfile("other", toAiProfile(other)),
      match ? `<match>\n${JSON.stringify({ headline: match.headline, major_synergy: match.major_synergy, common_points: match.common_points, first_topic: match.first_topic })}\n</match>` : "",
      "보낼 한마디 3개를 questions 배열에 담아 주세요.",
    ].join("\n"),
    schema: QuestionsSchema,
    maxTokens: 3000,
    validate: (v) => (v.questions.length === 3 && v.questions.every((q) => q.trim() && q.length <= 60) ? null : "정확히 3개, 각 60자 이내"),
  });
  if (result) return { suggestions: result.questions, source: "ai" };
  return {
    suggestions: [
      `안녕하세요! ${other.department_name} 이야기 궁금해서 신청했어요 :)`,
      match?.first_topic?.slice(0, 60) ?? "AI가 저희 잘 맞을 거래요. 반가워요!",
      "다른 과 친구 사귀고 싶었는데 반가워요 ♥",
    ],
    source: "fallback",
  };
});
