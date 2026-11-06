import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { getRoomForUser, myReadKey } from "@/lib/server/relations";
import { toMicros } from "@/lib/time";

export const runtime = "nodejs";

/**
 * 읽음 처리. body.until = 화면에 실제로 표시한 마지막 메시지의 서버 시각(원문 문자열, 마이크로초 포함).
 * 이전 값보다 뒤로만 갱신한다.
 */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const room = await getRoomForUser(id, me.id);
  if (!room) throw new HttpError(404, "강의실을 찾을 수 없어요.");

  const body = await req.json().catch(() => ({}));
  const until = String(body?.until ?? "");
  const micros = toMicros(until);
  if (Number.isNaN(micros) || micros > Date.now() * 1000 + 5_000_000) throw new HttpError(400, "잘못된 요청이에요.");
  const key = myReadKey(room, me.id);

  // DB에서 직접 비교해 뒤로만 갱신 (동시 요청에도 안전)
  const { error } = await db().from("rooms").update({ [key]: until }).eq("id", room.id).lt(key, until);
  if (error) throw error;
  return { ok: true };
});
