import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { createRecommendations, getRecommendations } from "@/lib/server/matching";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 저장된 추천 조회 */
export const GET = handler(async (req: Request) => {
  const me = await requireUser(req);
  return getRecommendations(me);
});

/** 추천 생성 (이미 있으면 저장된 결과 반환). body.refresh=true면 다시 생성 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  return createRecommendations(me, { refresh: body?.refresh === true });
});
