// 학적 등록 선택지 (기획서 그대로)
export const YEARS = [2, 3, 4] as const;

export const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
] as const;
export const MBTI_UNKNOWN = "잘 몰라요";

export const BLOOD_TYPES = ["A", "B", "O", "AB", "비공개"] as const;

export const TRAITS = [
  "다정함", "성실함", "유머러스함", "차분함", "솔직함", "호기심 많음",
  "계획적", "즉흥적", "경청을 잘함", "낯가림", "활발함", "섬세함",
] as const;
export const TRAITS_MIN = 3;
export const TRAITS_MAX = 5;

export const MUSIC_GENRES = [
  "발라드", "인디", "힙합", "록·밴드", "K-POP", "R&B",
  "재즈", "클래식", "J-POP", "팝", "EDM", "음악 잘 안 들음",
] as const;
export const MUSIC_NONE = "음악 잘 안 들음";
export const MUSIC_MIN = 1;
export const MUSIC_MAX = 3;

export const NICKNAME_MAX = 12;
export const FAVORITE_MUSIC_MAX = 40;
