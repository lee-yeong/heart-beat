import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { toPublic, type ProfileRow } from "@/lib/server/profiles";
import { isBlocked, type RequestRow } from "@/lib/server/relations";
import type { MatchAnalysis, RequestView, RequestsResponse } from "@/lib/types";

export const runtime = "nodejs";

/** 수강신청: 승인 대기 요청이 이미 있으면 409 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const receiverId = String(body?.receiver_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(receiverId) || receiverId === me.id) throw new HttpError(400, "잘못된 요청이에요.");

  const { data: receiver } = await db().from("profiles").select("id, department_id").eq("id", receiverId).maybeSingle();
  if (!receiver) throw new HttpError(404, "상대를 찾을 수 없어요.");
  if (receiver.department_id === me.department_id) throw new HttpError(400, "같은 과 학생에게는 신청할 수 없어요.");
  if (await isBlocked(me.id, receiverId)) throw new HttpError(403, "신청할 수 없는 상대예요.");

  // 화면 표시용 사전 검사 (최종 보장은 DB 유일 인덱스)
  const { data: pending } = await db().from("requests").select("id").eq("sender_id", me.id).eq("status", "pending").limit(1);
  if (pending?.length) throw new HttpError(409, "수강신청 승인 대기 중이에요. 상대가 응답하면 다시 신청할 수 있어요.", "pending_exists");

  const { data: rec } = await db()
    .from("recommendations")
    .select("analysis")
    .eq("user_id", me.id)
    .eq("candidate_id", receiverId)
    .maybeSingle();

  const { data, error } = await db()
    .from("requests")
    .insert({ sender_id: me.id, receiver_id: receiverId, analysis: rec?.analysis ?? null })
    .select("*")
    .single<RequestRow>();
  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("one_pending_per_sender"))
        throw new HttpError(409, "수강신청 승인 대기 중이에요.", "pending_exists");
      throw new HttpError(409, "이미 이 학생과 수강신청 기록이 있어요.", "duplicate");
    }
    throw error;
  }
  return { request: { id: data.id, status: data.status } };
});

/** 보낸 요청과 받은 요청 */
export const GET = handler(async (req: Request): Promise<RequestsResponse> => {
  const me = await requireUser(req);
  const { data, error } = await db()
    .from("requests")
    .select("*, sender:profiles!requests_sender_id_fkey(*), receiver:profiles!requests_receiver_id_fkey(*), rooms(id)")
    .or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const toView = (r: (typeof data)[number], other: ProfileRow): RequestView => ({
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    responded_at: r.responded_at,
    analysis: (r.analysis as MatchAnalysis | null) ?? null,
    other: toPublic(other),
    room_id: (r.rooms as { id: string }[] | { id: string } | null) ? ([r.rooms].flat()[0]?.id ?? null) : null,
  });
  return {
    sent: data.filter((r) => r.sender_id === me.id).map((r) => toView(r, r.receiver as ProfileRow)),
    received: data.filter((r) => r.receiver_id === me.id).map((r) => toView(r, r.sender as ProfileRow)),
  };
});
