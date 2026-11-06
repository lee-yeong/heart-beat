import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler } from "@/lib/server/http";
import { listRooms } from "@/lib/server/rooms";
import type { NotificationsResponse } from "@/lib/types";

export const runtime = "nodejs";

/**
 * 알림 배지 = 처리 안 한 받은 요청 + 확인 안 한 내 요청 결과(승인·반려) + 안 읽은 강의실 수 + 재매칭 제안
 * 클라이언트는 5초마다 호출한다.
 */
export const GET = handler(async (req: Request): Promise<NotificationsResponse> => {
  const me = await requireUser(req);
  const [received, results, rooms, ended] = await Promise.all([
    db().from("requests").select("id", { count: "exact", head: true }).eq("receiver_id", me.id).eq("status", "pending"),
    db()
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", me.id)
      .neq("status", "pending")
      .gt("responded_at", me.notifications_seen_at),
    listRooms(me.id),
    db()
      .from("rooms")
      .select("id, user_a_id, user_b_id, ended_by, ended_at")
      .or(`user_a_id.eq.${me.id},user_b_id.eq.${me.id}`)
      .gt("ended_at", me.rematch_decided_at),
  ]);
  if (received.error) throw received.error;
  if (results.error) throw results.error;
  if (ended.error) throw ended.error;

  const pending_received = received.count ?? 0;
  const unseen_results = results.count ?? 0;
  const unread_rooms = rooms.filter((r) => r.unread > 0 && !r.ended).length;
  const rematch = ended.data.map((r) => {
    const other = rooms.find((x) => x.id === r.id)?.other;
    return { room_id: r.id, other_nickname: other?.nickname ?? "상대", ended_by_me: r.ended_by === me.id, ended_at: r.ended_at as string };
  });
  return {
    badge: pending_received + unseen_results + unread_rooms + (rematch.length ? 1 : 0),
    pending_received,
    unseen_results,
    unread_rooms,
    rematch,
  };
});
