import { requireUser } from "@/lib/server/auth";
import { handler, HttpError } from "@/lib/server/http";
import { getRoomForUser } from "@/lib/server/relations";
import { ensureSyllabus } from "@/lib/server/syllabus";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 강의계획서 생성 (참여자만). 이미 있으면 그대로, 다른 기기가 만드는 중이면 in_progress */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const room = await getRoomForUser(id, me.id);
  if (!room) throw new HttpError(404, "강의실을 찾을 수 없어요.");
  return { status: await ensureSyllabus(room) };
});
