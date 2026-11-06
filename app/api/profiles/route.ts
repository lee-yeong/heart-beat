import { findDepartment } from "@/lib/departments";
import { analyzeProfile } from "@/lib/server/analysis";
import { makeToken, newSecret } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { toPublic, type ProfileRow } from "@/lib/server/profiles";
import { ProfileInputSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 학적 등록: 프로필 생성 + AI 학사 분석. AI가 실패해도 가입은 유지한다. */
export const POST = handler(async (req: Request) => {
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
  const { secret, hash } = newSecret();

  const { data, error } = await db()
    .from("profiles")
    .insert({ ...base, access_token_hash: hash, ai_analysis: analysis, ai_analysis_source: source })
    .select("*")
    .single<ProfileRow>();
  if (error) throw error;

  return { profile: toPublic(data), session: { userId: data.id, token: makeToken(data.id, secret) } };
});
