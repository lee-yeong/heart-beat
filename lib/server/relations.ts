import "server-only";
import { db } from "./db";

export type RequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  analysis: unknown;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  responded_at: string | null;
};

export type RoomRow = {
  id: string;
  request_id: string;
  user_a_id: string;
  user_b_id: string;
  course_id: string | null;
  syllabus: unknown;
  syllabus_status: "pending" | "ready" | "failed";
  syllabus_claimed_at: string | null;
  user_a_last_read_at: string;
  user_b_last_read_at: string;
  created_at: string;
};

/** 두 사람 사이에 차단이 있는지 (양방향) */
export async function isBlocked(a: string, b: string): Promise<boolean> {
  const { data, error } = await db()
    .from("blocks")
    .select("id")
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`)
    .limit(1);
  if (error) throw error;
  return data.length > 0;
}

/** 내가 참여한 방. 참여자가 아니면 null */
export async function getRoomForUser(roomId: string, userId: string): Promise<RoomRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) return null;
  const { data, error } = await db().from("rooms").select("*").eq("id", roomId).maybeSingle<RoomRow>();
  if (error) throw error;
  if (!data || (data.user_a_id !== userId && data.user_b_id !== userId)) return null;
  return data;
}

export const otherId = (room: RoomRow, me: string) => (room.user_a_id === me ? room.user_b_id : room.user_a_id);
export const myReadKey = (room: RoomRow, me: string) =>
  room.user_a_id === me ? ("user_a_last_read_at" as const) : ("user_b_last_read_at" as const);
export const otherReadAt = (room: RoomRow, me: string) =>
  room.user_a_id === me ? room.user_b_last_read_at : room.user_a_last_read_at;
