import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listRooms } from "@/lib/server/rooms";

export const runtime = "nodejs";

/** 내가 참여한 강의실 목록 */
export const GET = handler(async (req: Request) => {
  const me = await requireUser(req);
  return { rooms: await listRooms(me.id) };
});
