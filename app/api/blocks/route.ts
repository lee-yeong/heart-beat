import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";

export const runtime = "nodejs";

/** 차단: 이후 양방향 메시지 전송 불가, 추천에서 서로 제외, 대기 중 신청은 반려 처리 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const target = String(body?.user_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(target) || target === me.id) throw new HttpError(400, "잘못된 요청이에요.");

  const { error } = await db().from("blocks").upsert({ blocker_id: me.id, blocked_id: target }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  if (error) throw error;

  await db()
    .from("requests")
    .update({ status: "rejected", responded_at: new Date().toISOString() })
    .eq("status", "pending")
    .or(`and(sender_id.eq.${me.id},receiver_id.eq.${target}),and(sender_id.eq.${target},receiver_id.eq.${me.id})`);
  return { blocked: true };
});
