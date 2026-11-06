import seed from "@/data/seed-profiles.json";
import { DEPARTMENTS } from "@/lib/departments";
import { MBTI_UNKNOWN } from "@/lib/options";
import { analyzeProfile } from "@/lib/server/analysis";
import { newSecret } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * 시연용 시드 프로필 15개 생성. 이미 있는 닉네임은 건너뛴다.
 * 사용: POST /api/admin/seed  (헤더 x-demo-secret: DEMO_ACCESS_SECRET)
 */
export const POST = handler(async (req: Request) => {
  if (process.env.DEMO_MODE !== "true") throw new HttpError(404, "Not found");
  const secret = process.env.DEMO_ACCESS_SECRET;
  if (!secret || req.headers.get("x-demo-secret") !== secret) throw new HttpError(403, "비밀코드가 올바르지 않아요.");

  const { data: existing, error } = await db().from("profiles").select("nickname").eq("is_seed", true);
  if (error) throw error;
  const have = new Set(existing.map((p) => p.nickname));

  const todo = seed.profiles.filter((p) => !have.has(p.nickname));
  const rows = await Promise.all(
    todo.map(async (p) => {
      const dept = DEPARTMENTS.find((d) => d.name === p.department_name);
      if (!dept) throw new Error(`시드 학과 없음: ${p.department_name}`);
      const base = {
        nickname: p.nickname,
        year: p.year,
        department_id: dept.id,
        department_name: dept.name,
        college: dept.college,
        mbti: p.mbti === "모름" ? MBTI_UNKNOWN : p.mbti,
        blood_type: p.blood_type,
        traits: p.traits,
        music_genres: p.music_genres,
        favorite_music: p.favorite_music,
      };
      const { analysis, source } = await analyzeProfile(base);
      return { ...base, access_token_hash: newSecret().hash, ai_analysis: analysis, ai_analysis_source: source, is_seed: true };
    }),
  );
  if (rows.length) {
    const ins = await db().from("profiles").insert(rows);
    if (ins.error) throw ins.error;
  }
  return {
    created: rows.length,
    skipped: seed.profiles.length - rows.length,
    ai: rows.filter((r) => r.ai_analysis_source === "ai").length,
  };
});
