import "server-only";
import type { AcademicAnalysis, AiSource } from "@/lib/types";
import { generate } from "./ai";
import { fallbackAnalysis } from "./fallback";
import { ANALYSIS_SYSTEM, wrapProfile } from "./prompts";
import { AcademicAnalysisSchema } from "./schemas";
import type { ProfileRow } from "./profiles";

type AnalysisInput = Pick<
  ProfileRow,
  "year" | "department_name" | "college" | "traits" | "music_genres" | "favorite_music" | "mbti" | "blood_type"
>;

/** AI 학사 분석. 실패하면 규칙 기반 결과를 돌려준다. */
export async function analyzeProfile(p: AnalysisInput): Promise<{ analysis: AcademicAnalysis; source: AiSource }> {
  const data = {
    year: p.year,
    department: p.department_name,
    college: p.college,
    traits: p.traits,
    music_genres: p.music_genres,
    favorite_music: p.favorite_music,
    mbti_for_fun_only: p.mbti,
    blood_type_for_fun_only: p.blood_type,
  };
  const result = await generate({
    name: "analysis",
    system: ANALYSIS_SYSTEM,
    user: `다음 학생을 분석해주세요.\n${wrapProfile("student", data)}`,
    schema: AcademicAnalysisSchema,
    maxTokens: 4000,
    validate: (v) => {
      if (!v.summary.trim() || !v.major_lens.trim() || !v.conversation_style.trim()) return "빈 항목이 있음";
      if (v.personal_traits.length < 2 || v.personal_traits.length > 3) return "personal_traits는 2~3개";
      return null;
    },
  });
  if (result) return { analysis: result, source: "ai" };
  return { analysis: fallbackAnalysis(p), source: "fallback" };
}
