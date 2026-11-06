import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { getRoomForUser, isBlocked, otherId, otherReadAt } from "@/lib/server/relations";
import type { ChatMessage, MessagesResponse } from "@/lib/types";

export const runtime = "nodejs";

const COLUMNS = "id, sender_id, type, content, created_at, client_message_id";

/** 메시지 조회. ?after=<ISO 시각>이면 그 이후 메시지만. 상대의 읽음 시각도 함께 준다. */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }): Promise<MessagesResponse> => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const room = await getRoomForUser(id, me.id);
  if (!room) throw new HttpError(404, "강의실을 찾을 수 없어요.");

  const after = new URL(req.url).searchParams.get("after");
  let q = db().from("messages").select(COLUMNS).eq("room_id", room.id).order("created_at").order("id").limit(300);
  if (after && !Number.isNaN(Date.parse(after))) q = q.gt("created_at", after);
  const [{ data, error }, blocked] = await Promise.all([q, isBlocked(me.id, otherId(room, me.id))]);
  if (error) throw error;
  return { messages: data as ChatMessage[], other_last_read_at: otherReadAt(room, me.id), blocked };
});

/** 메시지 전송. client_message_id로 재시도 중복을 막는다. */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const room = await getRoomForUser(id, me.id);
  if (!room) throw new HttpError(404, "강의실을 찾을 수 없어요.");
  if (await isBlocked(me.id, otherId(room, me.id))) throw new HttpError(403, "차단된 강의실에는 메시지를 보낼 수 없어요.", "blocked");

  const body = await req.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim();
  const clientId = String(body?.client_message_id ?? "").slice(0, 64) || null;
  if (!content) throw new HttpError(400, "메시지를 입력해주세요.");
  if (content.length > 1000) throw new HttpError(400, "메시지는 1000자까지 보낼 수 있어요.");

  const { data, error } = await db()
    .from("messages")
    .insert({ room_id: room.id, sender_id: me.id, type: "user", content, client_message_id: clientId })
    .select(COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505" && clientId) {
      const { data: existing } = await db().from("messages").select(COLUMNS).eq("room_id", room.id).eq("client_message_id", clientId).single();
      return { message: existing };
    }
    throw error;
  }
  return { message: data as ChatMessage };
});
