import { db } from "@/lib/server/db";
import { requireDemo } from "@/lib/server/demo";
import { handler } from "@/lib/server/http";

export const runtime = "nodejs";

/**
 * 시연 데이터 초기화: 시드 15명만 남기고 나머지 가입자, 모든 수강신청·강의실·메시지·차단·추천을 지운다.
 * 되돌릴 수 없으므로 화면에서 한 번 더 확인한 뒤 호출한다.
 */
export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  requireDemo(body?.secret);
  const all = (t: string) => db().from(t).delete().not("id", "is", null);

  for (const t of ["messages", "rooms", "requests", "blocks", "recommendations"]) {
    const { error } = await all(t);
    if (error) throw error;
  }
  const { error: pErr, count } = await db().from("profiles").delete({ count: "exact" }).eq("is_seed", false);
  if (pErr) throw pErr;
  const now = new Date().toISOString();
  await db().from("profiles").update({ match_preference: null, notifications_seen_at: now, rematch_decided_at: now }).eq("is_seed", true);
  return { ok: true, removed_users: count ?? 0 };
});
