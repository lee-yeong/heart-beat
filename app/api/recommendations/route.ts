import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler } from "@/lib/server/http";
import { createRecommendations, getRecommendations, refillRecommendations } from "@/lib/server/matching";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 저장된 추천 조회 */
export const GET = handler(async (req: Request) => {
  const me = await requireUser(req);
  return { ...(await getRecommendations(me)), demo_mode: process.env.DEMO_MODE === "true" };
});

/**
 * 추천 생성.
 * - 기본: 이미 있으면 저장된 결과 반환
 * - refresh: true → 다시 추천 (preference가 있으면 AI 상담 내용을 저장하고 반영)
 * - refill: true → 반려 등으로 빈 자리만 새로 채움
 * - rematch: true → 수강 철회 후 '매칭 다시 시작'에 동의 (알림 확인 처리 + 다시 추천)
 */
export const POST = handler(async (req: Request) => {
  let me = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const demo_mode = process.env.DEMO_MODE === "true";

  if (typeof body?.preference === "string" && body.preference.trim()) {
    const preference = body.preference.trim().slice(0, 300);
    const { error } = await db().from("profiles").update({ match_preference: preference }).eq("id", me.id);
    if (error) throw error;
    me = { ...me, match_preference: preference };
  }
  if (body?.rematch === true) {
    await db().from("profiles").update({ rematch_decided_at: new Date().toISOString() }).eq("id", me.id);
    return { ...(await createRecommendations(me, { refresh: true })), demo_mode };
  }
  if (body?.refill === true) return { ...(await refillRecommendations(me)), demo_mode };
  return { ...(await createRecommendations(me, { refresh: body?.refresh === true })), demo_mode };
});
