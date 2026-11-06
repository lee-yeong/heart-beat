import type { PublicProfile } from "@/lib/types";

type CardProfile = Pick<
  PublicProfile,
  "nickname" | "year" | "department_name" | "college" | "mbti" | "blood_type" | "traits" | "music_genres" | "favorite_music"
>;

/** 학생증 카드. highlight에 든 키워드는 진하게 강조한다 (추천 근거 표시용). */
export function ProfileCard({ profile, highlight = [], compact = false }: { profile: CardProfile; highlight?: string[]; compact?: boolean }) {
  const hl = new Set(highlight);
  return (
    <div className="overflow-hidden rounded-[20px] border border-primary-soft bg-white shadow-[0_8px_24px_rgba(255,107,154,0.15)]">
      <div className="bg-gradient-to-r from-primary to-[#ff9ab8] px-5 py-3 text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tracking-wide">교양필수 학생증</span>
          <span className="text-xs opacity-90">STUDENT ID ♥</span>
        </div>
      </div>
      <div className={`flex gap-4 px-5 ${compact ? "py-4" : "py-5"}`}>
        <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-surface text-3xl">🎓</div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold">{profile.nickname}</p>
          <p className={`mt-0.5 text-sm ${hl.has(profile.department_name) || hl.has(profile.college) ? "font-semibold text-primary-strong" : "text-ink-soft"}`}>
            {profile.college} · {profile.department_name}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">{profile.year}학년</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-dashed border-primary-soft px-5 py-4 text-sm">
        <div>
          <dt className="text-xs text-ink-soft">MBTI</dt>
          <dd className="font-semibold">{profile.mbti}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-soft">혈액형</dt>
          <dd className="font-semibold">{profile.blood_type}</dd>
        </div>
        <div className="col-span-2">
          <dt className="mb-1.5 text-xs text-ink-soft">전공 밖의 나</dt>
          <dd className="flex flex-wrap gap-1.5">
            {profile.traits.map((t) => (
              <span
                key={t}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${hl.has(t) ? "bg-primary text-white" : "bg-surface text-primary-strong"}`}
              >
                #{t}
              </span>
            ))}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="mb-1.5 text-xs text-ink-soft">좋아하는 음악</dt>
          <dd className="flex flex-wrap gap-1.5">
            {profile.music_genres.map((g) => (
              <span
                key={g}
                className={`rounded-full border px-2.5 py-1 text-xs ${hl.has(g) ? "border-primary bg-primary text-white" : "border-primary-soft"}`}
              >
                ♪ {g}
              </span>
            ))}
            {profile.favorite_music && <span className="px-1 py-1 text-xs text-ink-soft">“{profile.favorite_music}”</span>}
          </dd>
        </div>
      </dl>
    </div>
  );
}
