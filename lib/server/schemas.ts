import "server-only";
import { z } from "zod";
import { findDepartment } from "@/lib/departments";
import {
  BLOOD_TYPES, FAVORITE_MUSIC_MAX, MBTI_TYPES, MBTI_UNKNOWN, MUSIC_GENRES, MUSIC_MAX, MUSIC_MIN, MUSIC_NONE,
  NICKNAME_MAX, TRAITS, TRAITS_MAX, TRAITS_MIN, YEARS,
} from "@/lib/options";

// ── 사용자 입력 검증 ──
export const ProfileInputSchema = z
  .object({
    nickname: z.string().trim().min(1).max(NICKNAME_MAX),
    year: z.number().int().refine((y) => (YEARS as readonly number[]).includes(y)),
    department_id: z.string().refine((id) => !!findDepartment(id), "알 수 없는 학과"),
    mbti: z.enum([...MBTI_TYPES, MBTI_UNKNOWN]),
    blood_type: z.enum(BLOOD_TYPES),
    traits: z.array(z.enum(TRAITS)).min(TRAITS_MIN).max(TRAITS_MAX),
    music_genres: z.array(z.enum(MUSIC_GENRES)).min(MUSIC_MIN).max(MUSIC_MAX),
    favorite_music: z.string().trim().max(FAVORITE_MUSIC_MAX).nullable().optional(),
  })
  .refine((p) => new Set(p.traits).size === p.traits.length, "특징이 중복됐어요")
  .refine((p) => new Set(p.music_genres).size === p.music_genres.length, "장르가 중복됐어요")
  .refine((p) => !p.music_genres.includes(MUSIC_NONE) || p.music_genres.length === 1, "음악 잘 안 들음은 단독 선택");

// ── AI 응답 스키마 (구조화 출력용: 단순한 형태만 사용하고 세부 규칙은 코드에서 검증) ──
export const AcademicAnalysisSchema = z.object({
  summary: z.string(),
  major_lens: z.string(),
  personal_traits: z.array(z.string()),
  conversation_style: z.string(),
});

export const SyllabusSchema = z.object({
  course_id: z.string(),
  subtitle: z.string(),
  reason: z.string(),
  weeks: z.array(z.object({ week: z.number(), topic: z.string() })),
  midterm: z.string(),
  final_exam: z.string(),
  ice_breakers: z.array(z.string()),
});

export const QuestionsSchema = z.object({ questions: z.array(z.string()) });

export const ConsultSchema = z.object({
  reply: z.string(),
  preference_summary: z.string(),
  ready: z.boolean(),
});

export const MatchSchema = z.object({
  recommendations: z.array(
    z.object({
      candidate_id: z.string(),
      headline: z.string(),
      major_synergy: z.string(),
      common_points: z.array(z.string()),
      complementary_points: z.array(z.string()),
      difference_note: z.string(),
      first_topic: z.string(),
      evidence_keywords: z.array(z.string()),
    }),
  ),
});
