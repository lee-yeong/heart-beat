import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler } from "@/lib/server/http";

export const runtime = "nodejs";

/** 알림 페이지를 열면 내 요청 결과(승인·반려)를 확인한 것으로 기록 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser(req);
  const { error } = await db().from("profiles").update({ notifications_seen_at: new Date().toISOString() }).eq("id", me.id);
  if (error) throw error;
  return { ok: true };
});
