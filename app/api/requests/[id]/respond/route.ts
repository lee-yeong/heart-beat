import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import type { RequestRow } from "@/lib/server/relations";

export const runtime = "nodejs";

const NOTICE =
  "📢 AI 조교 공지\n수강 승인이 완료되어 두 분의 강의실이 열렸어요 ♥\n\n앞으로 3일은 '수강 기간'이에요. 이 기간에는 실명, 나이, 전화번호, 인스타·카톡 아이디를 공개할 수 없어요. 3일 뒤 두 분 모두 '계속 수강하기'를 누르면 그때 연락처를 교환할 수 있어요.\n\n위의 '우리의 강의계획서'를 보면서 편하게 첫 인사를 나눠 보세요!";

/** 수신자만 승인 또는 반려. 승인 시 강의실을 만든다 (강의계획서는 강의실에서 따로 생성). */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "accept" && action !== "reject") throw new HttpError(400, "잘못된 요청이에요.");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "요청을 찾을 수 없어요.");

  // pending 상태이고 내가 수신자인 요청만 바꾼다 (조건부 업데이트 = 중복 클릭 방지)
  const { data: updated, error } = await db()
    .from("requests")
    .update({ status: action === "accept" ? "accepted" : "rejected", responded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("receiver_id", me.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle<RequestRow>();
  if (error) throw error;

  if (!updated) {
    const { data: existing } = await db().from("requests").select("*, rooms(id)").eq("id", id).eq("receiver_id", me.id).maybeSingle();
    if (!existing) throw new HttpError(404, "요청을 찾을 수 없어요.");
    const roomId = [existing.rooms].flat()[0]?.id ?? null;
    return { status: existing.status, room_id: roomId, already: true };
  }

  if (action === "reject") return { status: "rejected", room_id: null };

  // 승인: 강의실 생성 (request_id 유일 제약으로 방은 1개만)
  const { data: room, error: roomErr } = await db()
    .from("rooms")
    .insert({ request_id: updated.id, user_a_id: updated.sender_id, user_b_id: updated.receiver_id })
    .select("id")
    .single();
  if (roomErr) {
    if (roomErr.code === "23505") {
      const { data: r } = await db().from("rooms").select("id").eq("request_id", updated.id).single();
      return { status: "accepted", room_id: r?.id ?? null };
    }
    throw roomErr;
  }
  // 1) AI 조교 공지(3일 수강 기간 규칙) → 2) 신청할 때 보낸 한마디를 첫 메시지로
  await db().from("messages").insert({ room_id: room.id, sender_id: null, type: "ai", content: NOTICE, client_message_id: "ai-notice" });
  if (updated.message)
    await db().from("messages").insert({ room_id: room.id, sender_id: updated.sender_id, type: "user", content: updated.message, client_message_id: "intro" });
  return { status: "accepted", room_id: room.id };
});
