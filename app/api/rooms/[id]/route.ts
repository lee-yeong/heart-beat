import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { toPublic, type ProfileRow } from "@/lib/server/profiles";
import { getRoomForUser, isBlocked, otherId } from "@/lib/server/relations";
import type { RoomDetail } from "@/lib/types";

export const runtime = "nodejs";

/** 강의실 상세 (참여자만) */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }): Promise<RoomDetail> => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const room = await getRoomForUser(id, me.id);
  if (!room) throw new HttpError(404, "강의실을 찾을 수 없어요.");
  const oid = otherId(room, me.id);
  const [{ data: other }, blocked] = await Promise.all([
    db().from("profiles").select("*").eq("id", oid).single<ProfileRow>(),
    isBlocked(me.id, oid),
  ]);
  if (!other) throw new HttpError(404, "상대를 찾을 수 없어요.");
  return {
    id: room.id,
    other: toPublic(other),
    me_id: me.id,
    course_id: room.course_id,
    syllabus: room.syllabus,
    syllabus_status: room.syllabus_status,
    blocked,
    created_at: room.created_at,
  };
});
