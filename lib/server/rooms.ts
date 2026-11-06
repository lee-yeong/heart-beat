import "server-only";
import type { RoomSummary } from "@/lib/types";
import { db } from "./db";
import { toPublic, type ProfileRow } from "./profiles";
import { myReadKey, otherId, type RoomRow } from "./relations";

/** 내 강의실 목록 + 안 읽은 메시지 수 */
export async function listRooms(meId: string): Promise<RoomSummary[]> {
  const { data: rooms, error } = await db()
    .from("rooms")
    .select("*")
    .or(`user_a_id.eq.${meId},user_b_id.eq.${meId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rooms.length) return [];

  const others = [...new Set((rooms as RoomRow[]).map((r) => otherId(r, meId)))];
  const { data: profiles, error: pErr } = await db().from("profiles").select("*").in("id", others);
  if (pErr) throw pErr;
  const byId = new Map((profiles as ProfileRow[]).map((p) => [p.id, p]));

  const result = await Promise.all(
    (rooms as RoomRow[]).map(async (room) => {
      const myRead = room[myReadKey(room, meId)];
      const [last, unread] = await Promise.all([
        db().from("messages").select("content, created_at, type").eq("room_id", room.id).order("created_at", { ascending: false }).limit(1),
        db()
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", room.id)
          .gt("created_at", myRead)
          .or(`sender_id.is.null,sender_id.neq.${meId}`),
      ]);
      const other = byId.get(otherId(room, meId));
      if (!other) return null;
      return {
        id: room.id,
        other: toPublic(other),
        last_message: last.data?.[0] ?? null,
        unread: unread.count ?? 0,
        created_at: room.created_at,
      } satisfies RoomSummary;
    }),
  );
  return result.filter((r): r is RoomSummary => r !== null);
}
