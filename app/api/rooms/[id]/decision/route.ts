import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { getRoomForUser, roomPhase } from "@/lib/server/relations";

export const runtime = "nodejs";

/**
 * 수강 결정.
 * - continue: 3일 수강 기간이 끝난 뒤 '계속 수강하기'. 둘 다 누르면 수강 확정 → 연락처 교환 가능
 * - end: 언제든 '수강 철회'. 강의실이 닫히고 양쪽에 재매칭 제안 알림이 간다
 * - skip_trial: 시연 모드에서만, 3일 수강 기간을 바로 끝낸다
 */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const room = await getRoomForUser(id, me.id);
  if (!room) throw new HttpError(404, "강의실을 찾을 수 없어요.");
  const body = await req.json().catch(() => ({}));
  const decision = body?.decision;
  const phase = roomPhase(room);
  if (phase === "ended") return { phase };
  const now = new Date().toISOString();
  const ai = (client_message_id: string, content: string) =>
    db().from("messages").upsert({ room_id: room.id, sender_id: null, type: "ai", client_message_id, content }, { onConflict: "room_id,client_message_id", ignoreDuplicates: true });

  if (decision === "skip_trial") {
    if (process.env.DEMO_MODE !== "true") throw new HttpError(404, "Not found");
    await db().from("rooms").update({ trial_ends_at: now }).eq("id", room.id);
    await ai("ai-trial-end", "⏰ 3일 수강 기간이 끝났어요! 대화를 계속 이어가고 싶다면 두 분 모두 '계속 수강하기'를 눌러 주세요.");
    return { phase: "deciding" };
  }

  if (decision === "end") {
    const { error } = await db().from("rooms").update({ ended_at: now, ended_by: me.id }).eq("id", room.id).is("ended_at", null);
    if (error) throw error;
    await ai("ai-ended", "이 강의는 수강 철회되었어요. 그동안 즐거웠어요! AI 조교가 새로운 수강 추천을 준비해 둘게요 ♥");
    return { phase: "ended" };
  }

  if (decision === "continue") {
    if (phase === "trial") throw new HttpError(400, "3일 수강 기간이 끝난 뒤에 선택할 수 있어요.", "trial");
    const key = room.user_a_id === me.id ? "user_a_continue_at" : "user_b_continue_at";
    const { data, error } = await db().from("rooms").update({ [key]: now }).eq("id", room.id).select("*").single();
    if (error) throw error;
    if (data.user_a_continue_at && data.user_b_continue_at) {
      await ai("ai-confirmed", "🎉 수강 확정! 두 분 모두 계속 수강하기를 선택했어요. 이제 원하면 번호나 인스타를 교환해도 돼요. 개인정보는 꼭 서로 동의할 때만 나눠 주세요.");
      return { phase: "confirmed" };
    }
    return { phase: "deciding" };
  }
  throw new HttpError(400, "잘못된 요청이에요.");
});
