import { findDepartment } from "@/lib/departments";
import { analyzeProfile } from "@/lib/server/analysis";
import { hashSecret, makeToken } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { checkCredentials, hashPassword, loginSecret } from "@/lib/server/password";
import { toPublic, type ProfileRow } from "@/lib/server/profiles";
import { ProfileInputSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 회원가입(학적 등록): 아이디·비밀번호 + 프로필 생성 + AI 학사 분석. AI가 실패해도 가입은 유지한다. */
export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => null);
  const loginId = typeof body?.login_id === "string" ? body.login_id.trim().toLowerCase() : "";
  const problem = checkCredentials(loginId, body?.password);
  if (problem) throw new HttpError(400, problem, "invalid_credentials");
  const { data: taken } = await db().from("profiles").select("id").eq("login_id", loginId).maybeSingle();
  if (taken) throw new HttpError(409, "이미 사용 중인 아이디예요.", "login_id_taken");

  const parsed = ProfileInputSchema.safeParse(body);
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
  const [{ analysis, source }, password_hash] = await Promise.all([analyzeProfile(base), hashPassword(body.password)]);

  // id를 먼저 정해야 로그인 토큰을 계산할 수 있다
  const id = crypto.randomUUID();
  const secret = loginSecret(id, password_hash);
  const { data, error } = await db()
    .from("profiles")
    .insert({ id, ...base, login_id: loginId, password_hash, access_token_hash: hashSecret(secret), ai_analysis: analysis, ai_analysis_source: source })
    .select("*")
    .single<ProfileRow>();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "이미 사용 중인 아이디예요.", "login_id_taken");
    throw error;
  }
  return { profile: toPublic(data), session: { userId: data.id, token: makeToken(data.id, secret) } };
});
