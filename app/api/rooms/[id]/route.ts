import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { toPublic, type ProfileRow } from "@/lib/server/profiles";
import { getRoomForUser, isBlocked, otherId, roomPhase } from "@/lib/server/relations";
import { toSyllabusView } from "@/lib/server/syllabus";
import type { RoomDetail } from "@/lib/types";

export const runtime = "nodejs";

/** 강의실 상세 (참여자만) */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }): Promise<RoomDetail> => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const room = await getRoomForUser(id, me.id);
  if (!room) throw new HttpError(404, "강의실을 찾을 수 없어요.");
  const oid = otherId(room, me.id);
  const [{ data: other }, blocked, { data: request }] = await Promise.all([
    db().from("profiles").select("*").eq("id", oid).single<ProfileRow>(),
    isBlocked(me.id, oid),
    db().from("requests").select("sender_id, message").eq("id", room.request_id).maybeSingle(),
  ]);
  if (!other) throw new HttpError(404, "상대를 찾을 수 없어요.");
  const mineA = room.user_a_id === me.id;
  return {
    id: room.id,
    other: toPublic(other),
    me_id: me.id,
    syllabus: room.syllabus_status === "ready" ? toSyllabusView(room.syllabus) : null,
    syllabus_status: room.syllabus_status,
    blocked,
    ended: !!room.ended_at,
    phase: roomPhase(room),
    trial_ends_at: room.trial_ends_at,
    my_continue: !!(mineA ? room.user_a_continue_at : room.user_b_continue_at),
    other_continue: !!(mineA ? room.user_b_continue_at : room.user_a_continue_at),
    intro_message: request?.message ? { from_me: request.sender_id === me.id, text: request.message } : null,
    demo_mode: process.env.DEMO_MODE === "true",
    created_at: room.created_at,
  };
});
