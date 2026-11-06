import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler } from "@/lib/server/http";

export const runtime = "nodejs";

/**
 * 알림 확인 기록.
 * - 기본: 내 요청 결과(승인·반려)를 확인한 것으로 기록
 * - body.rematch === "dismiss": 재매칭 제안을 '나중에'로 넘김
 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  const patch = body?.rematch === "dismiss" ? { rematch_decided_at: now } : { notifications_seen_at: now };
  const { error } = await db().from("profiles").update(patch).eq("id", me.id);
  if (error) throw error;
  return { ok: true };
});
