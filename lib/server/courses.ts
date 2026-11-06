import "server-only";
import data from "@/data/courses.json";
import type { Course } from "@/lib/types";
import type { ProfileRow } from "./profiles";

export const SEMESTER: string = data.semester;
const ALL: Course[] = data.courses as Course[];

export const findCourse = (id: string) => ALL.find((c) => c.id === id);

// 단과대학별로 잘 맞을 교양 영역 (category의 "·" 뒤 부분)
const COLLEGE_AREAS: Record<string, string[]> = {
  인문대학: ["인문"],
  사범대학: ["인문", "사회"],
  자연과학대학: ["과학기술"],
  공과대학: ["과학기술"],
  "인공지능대학(정보기술대학)": ["과학기술"],
  생명과학기술대학: ["과학기술"],
  도시과학대학: ["과학기술", "사회"],
  사회과학대학: ["사회"],
  글로벌정경대학: ["사회"],
  경영대학: ["사회"],
  동북아국제통상학부: ["사회", "외국어"],
  법학부: ["사회"],
  예술체육대학: ["예술체육"],
  융합자유전공대학: ["INU세미나"],
};

const area = (c: Course) => c.category?.split("·")[1] ?? "";

/**
 * 강의계획서 후보 과목을 최대 20개 추린다 (코드 필터).
 * - 온라인·장소 미정 과목 제외, 같은 과목명은 1개만
 * - 두 사람의 단과대학 영역과 취향(음악·호기심)에 맞는 영역 가산점, 약간의 무작위
 */
export function pickCourseCandidates(a: ProfileRow, b: ProfileRow, limit = 20): Course[] {
  const seen = new Set<string>();
  const offline = ALL.filter((c) => {
    if (c.online || !c.building || !c.time || seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
  const prefer = new Map<string, number>();
  const bump = (k: string, n: number) => prefer.set(k, (prefer.get(k) ?? 0) + n);
  for (const p of [a, b]) {
    for (const k of COLLEGE_AREAS[p.college] ?? []) bump(k, 2);
    if (!p.music_genres.includes("음악 잘 안 들음")) bump("예술체육", 1);
    if (p.traits.includes("호기심 많음")) bump("INU세미나", 1);
    if (p.traits.includes("활발함")) bump("예술체육", 1);
  }
  return offline
    .map((c) => ({ c, score: (prefer.get(area(c)) ?? 0) + Math.random() * 2.5 }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(({ c }) => c);
}

/** 만남 장소: 건물을 알면 "○○호관 1층 입구", 모르면 "교내 공개 장소" */
export const meetingSpot = (c: Course) => (c.building ? `${c.building} 1층 입구` : "교내 공개 장소");
