import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { toPublic } from "@/lib/server/profiles";

export const runtime = "nodejs";

/** 로그인 복원: 본인 프로필과 AI 학사 분석 */
export const GET = handler(async (req: Request) => {
  const me = await requireUser(req);
  return { profile: toPublic(me) };
});
