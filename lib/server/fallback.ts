import "server-only";
import type { AcademicAnalysis, MatchAnalysis } from "@/lib/types";
import { MUSIC_NONE } from "@/lib/options";
import { josa } from "@/lib/josa";
import type { ProfileRow } from "./profiles";

// AI 호출이 실패했을 때 쓰는 규칙 기반 대체 결과. 화면에는 "기본 결과"로 구분해 표시한다.

type ProfileLike = Pick<ProfileRow, "department_name" | "college" | "traits" | "music_genres" | "favorite_music">;

export function fallbackAnalysis(p: ProfileLike): AcademicAnalysis {
  const [t1, t2, t3] = p.traits;
  const music = p.music_genres.includes(MUSIC_NONE) ? null : p.music_genres.join("·");
  return {
    summary: `${josa(t1, "과", "와")} ${josa(t2, "을", "를")} 함께 가진 ${p.department_name} 학생이에요.`,
    major_lens: `${p.college}에서 배우는 관점으로 세상을 바라보는 데 익숙할 수 있어요.`,
    personal_traits: [t1, t2, t3].filter(Boolean).map((t) => `${josa(t, "이", "가")} 돋보이는`),
    conversation_style: music
      ? `${music} 이야기로 대화를 열면 금방 편해질 수 있어요.`
      : `요즘 관심사나 수업 이야기로 대화를 열면 편해질 수 있어요.`,
  };
}

const COMPLEMENTS: [string, string, string][] = [
  ["계획적", "즉흥적", "한 명이 계획을 세우고 한 명이 즉흥적인 재미를 더할 수 있어요"],
  ["차분함", "활발함", "차분함과 활발함이 대화의 균형을 맞춰줄 수 있어요"],
  ["경청을 잘함", "활발함", "이야기를 잘 듣는 사람과 이야기를 잘 꺼내는 사람이에요"],
  ["경청을 잘함", "유머러스함", "유머를 잘 받아주는 사람이 있어서 대화가 즐거울 수 있어요"],
  ["낯가림", "다정함", "다정한 상대 덕분에 낯가림이 금방 풀릴 수 있어요"],
  ["섬세함", "솔직함", "섬세함과 솔직함이 서로를 편하게 해줄 수 있어요"],
];

const shared = (a: string[], b: string[]) => a.filter((x) => b.includes(x) && x !== MUSIC_NONE);

function complements(a: string[], b: string[]) {
  return COMPLEMENTS.filter(([x, y]) => (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))).map(
    ([, , text]) => text,
  );
}

export function fallbackScore(me: ProfileLike, c: ProfileLike) {
  return (
    shared(me.traits, c.traits).length * 2 +
    shared(me.music_genres, c.music_genres).length * 2 +
    complements(me.traits, c.traits).length * 2 +
    (me.college !== c.college ? 1 : 0)
  );
}

export function fallbackMatch(me: ProfileLike, candidates: (ProfileLike & { id: string })[]): MatchAnalysis[] {
  return [...candidates]
    .sort((a, b) => fallbackScore(me, b) - fallbackScore(me, a))
    .slice(0, 3)
    .map((c) => {
      const commonTraits = shared(me.traits, c.traits);
      const commonMusic = shared(me.music_genres, c.music_genres);
      const comp = complements(me.traits, c.traits);
      const evidence = [...commonTraits, ...commonMusic];
      if (evidence.length < 2) evidence.push(me.department_name, c.department_name);
      return {
        candidate_id: c.id,
        headline: `${josa(me.department_name, "과", "와")} ${c.department_name}의 만남`,
        major_synergy: `${josa(me.department_name, "과", "와")} ${josa(c.department_name, "은", "는")} 서로 모르는 수업 이야기가 많아서 들려줄 게 많을 수 있어요.`,
        common_points: [...commonTraits, ...commonMusic.map((g) => `${g} 좋아함`)],
        complementary_points: comp.length ? comp.slice(0, 2) : ["서로 다른 전공의 시선으로 같은 주제를 새롭게 볼 수 있어요"],
        difference_note: "평소 생활 리듬이나 관심 분야는 꽤 다를 수 있어요.",
        first_topic: commonMusic[0]
          ? `요즘 자주 듣는 ${commonMusic[0]} 곡이 뭐예요?`
          : `${c.department_name}에서는 요즘 어떤 수업이 제일 재밌어요?`,
        evidence_keywords: [...new Set(evidence)].slice(0, 5),
      };
    });
}
