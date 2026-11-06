import { findDepartment } from "@/lib/departments";
import { analyzeProfile } from "@/lib/server/analysis";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { toPublic, type ProfileRow } from "@/lib/server/profiles";
import { ProfileInputSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const meView = (p: ProfileRow) => ({
  ...toPublic(p),
  match_preference: p.match_preference,
  login_id: p.login_id,
  has_password: !!p.password_hash,
});

/** 로그인 복원: 본인 프로필과 AI 학사 분석 (+ 본인만 보는 상담 선호, 로그인 아이디) */
export const GET = handler(async (req: Request) => {
  const me = await requireUser(req);
  return { profile: meView(me) };
});

/**
 * 학생증 수정. 바뀐 정보로 AI 학사 분석을 다시 하고,
 * 아직 신청하지 않은 추천은 지워서 다음에 새 정보로 다시 추천받게 한다.
 */
export const PATCH = handler(async (req: Request) => {
  const me = await requireUser(req);
  const parsed = ProfileInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "입력값을 다시 확인해주세요.", "invalid_input");
  const input = parsed.data;
  const dept = findDepartment(input.department_id)!;
  const base = {
    nickname: input.nickname,
    year: input.year,
    department_id: dept.id,
    department_name: dept.name,
    college: dept.college,
    mbti: input.mbti,
    blood_type: input.blood_type,
    traits: input.traits,
    music_genres: input.music_genres,
    favorite_music: input.favorite_music?.trim() || null,
  };
  const { analysis, source } = await analyzeProfile(base);
  const { data, error } = await db()
    .from("profiles")
    .update({ ...base, ai_analysis: analysis, ai_analysis_source: source })
    .eq("id", me.id)
    .select("*")
    .single<ProfileRow>();
  if (error) throw error;

  // 신청 기록이 없는 추천 카드만 정리 (신청·강의실이 있는 상대는 유지)
  const { data: reqs } = await db().from("requests").select("sender_id, receiver_id").or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`);
  const keep = (reqs ?? []).map((r) => (r.sender_id === me.id ? r.receiver_id : r.sender_id));
  let del = db().from("recommendations").delete().eq("user_id", me.id);
  if (keep.length) del = del.not("candidate_id", "in", `(${keep.join(",")})`);
  await del;

  return { profile: meView(data) };
});

/** 회원탈퇴: 닉네임을 한 번 더 입력해야 한다. 내 신청·강의실·메시지도 함께 지워진다. */
export const DELETE = handler(async (req: Request) => {
  const me = await requireUser(req);
  if (me.is_seed) throw new HttpError(403, "시연용 계정은 탈퇴할 수 없어요.");
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== me.nickname) throw new HttpError(400, "확인을 위해 닉네임을 정확히 입력해주세요.", "confirm_mismatch");
  const { error } = await db().from("profiles").delete().eq("id", me.id);
  if (error) throw error;
  return { deleted: true };
});
