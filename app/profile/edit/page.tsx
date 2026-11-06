"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DepartmentPicker, MultiChips } from "@/components/ProfileFields";
import { StepLoader } from "@/components/StepLoader";
import { ChoiceButton, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api-client";
import { findDepartment } from "@/lib/departments";
import {
  BLOOD_TYPES, FAVORITE_MUSIC_MAX, MBTI_TYPES, MBTI_UNKNOWN, MUSIC_GENRES, MUSIC_MAX, MUSIC_MIN, MUSIC_NONE,
  NICKNAME_MAX, TRAITS, TRAITS_MAX, TRAITS_MIN, YEARS,
} from "@/lib/options";
import type { ProfileInput } from "@/lib/types";
import { useMe } from "@/lib/use-me";

/** 학생증 수정: 한 화면에서 모든 항목을 고치고, 저장하면 AI 학사 분석을 다시 한다 */
export default function ProfileEditPage() {
  const router = useRouter();
  const { me } = useMe();
  const [f, setF] = useState<ProfileInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me && !f)
      setF({
        nickname: me.nickname,
        year: me.year,
        department_id: me.department_id,
        mbti: me.mbti,
        blood_type: me.blood_type,
        traits: me.traits,
        music_genres: me.music_genres,
        favorite_music: me.favorite_music,
      });
  }, [me, f]);

  const set = (patch: Partial<ProfileInput>) => setF((prev) => (prev ? { ...prev, ...patch } : prev));
  const valid =
    !!f &&
    !!f.nickname.trim() &&
    f.nickname.trim().length <= NICKNAME_MAX &&
    !!findDepartment(f.department_id) &&
    f.traits.length >= TRAITS_MIN &&
    f.traits.length <= TRAITS_MAX &&
    f.music_genres.length >= MUSIC_MIN &&
    (f.favorite_music?.length ?? 0) <= FAVORITE_MUSIC_MAX;

  const save = async () => {
    if (!f || !valid) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/profiles/me", { method: "PATCH", json: { ...f, nickname: f.nickname.trim(), favorite_music: f.favorite_music?.trim() || null } });
      router.push("/profile?updated=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
      setSaving(false);
    }
  };

  if (saving)
    return (
      <AppShell>
        <div className="flex justify-center py-16">
          <StepLoader title="학생증 다시 발급 중" steps={["바뀐 정보 확인 중", "전공 분석 중", "AI 학사 분석 다시 작성 중"]} />
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <h1 className="text-2xl font-bold md:text-3xl">학생증 수정</h1>
      <p className="mt-1.5 text-sm text-ink-soft">저장하면 AI가 학사 분석을 다시 하고, 다음 추천에 바뀐 정보가 반영돼요.</p>
      {!f ? (
        <p className="py-16 text-center text-ink-soft">불러오는 중…</p>
      ) : (
        <div className="mt-6 space-y-5">
          <Field title="닉네임">
            <input
              value={f.nickname}
              maxLength={NICKNAME_MAX}
              onChange={(e) => set({ nickname: e.target.value })}
              className="h-12 w-full rounded-xl border-2 border-line px-4 text-base outline-none focus:border-primary"
            />
          </Field>
          <Field title="학년">
            <div className="grid grid-cols-3 gap-2">
              {YEARS.map((y) => (
                <ChoiceButton key={y} selected={f.year === y} onClick={() => set({ year: y })}>
                  {y}학년
                </ChoiceButton>
              ))}
            </div>
          </Field>
          <Field title="전공">
            <DepartmentPicker value={f.department_id} onChange={(id) => set({ department_id: id })} maxHeight="max-h-72" />
          </Field>
          <Field title="MBTI">
            <div className="grid grid-cols-4 gap-2">
              {[...MBTI_TYPES, MBTI_UNKNOWN].map((m) => (
                <ChoiceButton key={m} selected={f.mbti === m} onClick={() => set({ mbti: m })}>
                  <span className="text-sm">{m}</span>
                </ChoiceButton>
              ))}
            </div>
          </Field>
          <Field title="혈액형">
            <div className="grid grid-cols-5 gap-2">
              {BLOOD_TYPES.map((b) => (
                <ChoiceButton key={b} selected={f.blood_type === b} onClick={() => set({ blood_type: b })}>
                  <span className="text-sm">{b === "비공개" ? b : `${b}형`}</span>
                </ChoiceButton>
              ))}
            </div>
          </Field>
          <Field title={`전공 밖의 나 (${TRAITS_MIN}~${TRAITS_MAX}개)`} counter={`${f.traits.length} / ${TRAITS_MAX}`}>
            <MultiChips options={TRAITS} value={f.traits} max={TRAITS_MAX} onChange={(traits) => set({ traits })} />
          </Field>
          <Field title={`좋아하는 음악 장르 (${MUSIC_MIN}~${MUSIC_MAX}개)`} counter={`${f.music_genres.length} / ${MUSIC_MAX}`}>
            <MultiChips options={MUSIC_GENRES} value={f.music_genres} max={MUSIC_MAX} exclusive={MUSIC_NONE} onChange={(music_genres) => set({ music_genres })} />
          </Field>
          <Field title="좋아하는 가수·곡 (선택)">
            <input
              value={f.favorite_music ?? ""}
              maxLength={FAVORITE_MUSIC_MAX}
              onChange={(e) => set({ favorite_music: e.target.value })}
              placeholder="예: 잔나비 - 주저하는 연인들을 위해"
              className="h-12 w-full rounded-xl border-2 border-line px-4 text-base outline-none focus:border-primary"
            />
          </Field>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          <div className="sticky bottom-20 grid grid-cols-[1fr_2fr] gap-3 bg-white/90 py-3 backdrop-blur md:bottom-0">
            <button type="button" onClick={() => router.back()} className="h-14 rounded-2xl border-2 border-line font-semibold text-ink-soft">
              취소
            </button>
            <PrimaryButton onClick={save} disabled={!valid}>
              저장하고 다시 분석받기
            </PrimaryButton>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ title, counter, children }: { title: string; counter?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">{title}</h2>
        {counter && <span className="text-xs font-semibold text-primary">{counter}</span>}
      </div>
      {children}
    </section>
  );
}
