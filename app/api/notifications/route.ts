import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler } from "@/lib/server/http";
import { listRooms } from "@/lib/server/rooms";
import type { NotificationsResponse } from "@/lib/types";

export const runtime = "nodejs";

/**
 * 알림 배지 = 처리 안 한 받은 요청 + 확인 안 한 내 요청 결과(승인·반려) + 안 읽은 강의실 수
 * 클라이언트는 5초마다 호출한다.
 */
export const GET = handler(async (req: Request): Promise<NotificationsResponse> => {
  const me = await requireUser(req);
  const [received, results, rooms] = await Promise.all([
    db().from("requests").select("id", { count: "exact", head: true }).eq("receiver_id", me.id).eq("status", "pending"),
    db()
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", me.id)
      .neq("status", "pending")
      .gt("responded_at", me.notifications_seen_at),
    listRooms(me.id),
  ]);
  if (received.error) throw received.error;
  if (results.error) throw results.error;
  const pending_received = received.count ?? 0;
  const unseen_results = results.count ?? 0;
  const unread_rooms = rooms.filter((r) => r.unread > 0).length;
  return { badge: pending_received + unseen_results + unread_rooms, pending_received, unseen_results, unread_rooms };
});
