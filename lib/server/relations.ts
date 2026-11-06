import "server-only";
import { db } from "./db";

export type RequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  analysis: unknown;
  status: "pending" | "accepted" | "rejected";
  message: string | null;
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
  ended_at: string | null;
  ended_by: string | null;
  trial_ends_at: string;
  user_a_continue_at: string | null;
  user_b_continue_at: string | null;
  created_at: string;
};

/** 수강 단계: trial(3일 수강 기간) → deciding(기간 끝, 계속 수강 선택 대기) → confirmed(연락처 교환 가능) / ended */
export type RoomPhase = "trial" | "deciding" | "confirmed" | "ended";
export function roomPhase(room: RoomRow): RoomPhase {
  if (room.ended_at) return "ended";
  if (room.user_a_continue_at && room.user_b_continue_at) return "confirmed";
  if (Date.parse(room.trial_ends_at) > Date.now()) return "trial";
  return "deciding";
}

/** 연락처·SNS 공유 감지 (수강 기간 중 차단용) */
const CONTACT_PATTERNS = [
  /01[016789][\s.\-]*\d{3,4}[\s.\-]*\d{4}/, // 휴대폰 번호
  /(?:^|[\s(])@[a-z0-9._]{3,30}/i, // @아이디
  /인스타|insta(gram)?|카톡|카카오\s*톡|kakao|오픈\s*채팅|텔레그램|telegram|디엠|\bdm\b/i,
  /(전화|폰|휴대폰|핸드폰)\s*번호/,
];
export const containsContact = (text: string) => CONTACT_PATTERNS.some((re) => re.test(text));

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
