import "server-only";
import type { AcademicAnalysis, AiSource, PublicProfile } from "@/lib/types";

export type ProfileRow = {
  id: string;
  access_token_hash: string;
  nickname: string;
  year: number;
  department_id: string;
  department_name: string;
  college: string;
  mbti: string;
  blood_type: string;
  traits: string[];
  music_genres: string[];
  favorite_music: string | null;
  ai_analysis: AcademicAnalysis | null;
  ai_analysis_source: AiSource | null;
  notifications_seen_at: string;
  is_seed: boolean;
  created_at: string;
};

/** 외부에 보여도 되는 필드만 남긴다 (토큰 해시 제외). */
export function toPublic(p: ProfileRow): PublicProfile {
  return {
    id: p.id,
    nickname: p.nickname,
    year: p.year,
    department_id: p.department_id,
    department_name: p.department_name,
    college: p.college,
    mbti: p.mbti,
    blood_type: p.blood_type,
    traits: p.traits,
    music_genres: p.music_genres,
    favorite_music: p.favorite_music,
    ai_analysis: p.ai_analysis,
    ai_analysis_source: p.ai_analysis_source,
    is_seed: p.is_seed,
  };
}

/** AI에 보낼 프로필 데이터 (닉네임·ID 외 식별 정보 없음) */
export function toAiProfile(p: ProfileRow) {
  return {
    id: p.id,
    nickname: p.nickname,
    year: p.year,
    department: p.department_name,
    college: p.college,
    traits: p.traits,
    music_genres: p.music_genres,
    favorite_music: p.favorite_music,
    mbti_for_fun_only: p.mbti,
    blood_type_for_fun_only: p.blood_type,
  };
}
