"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChoiceButton, PrimaryButton, ProgressBar, SelectChip } from "@/components/ui";
import { api, saveSession } from "@/lib/api-client";
import { clearDraft, loadDraft, saveDraft, type Draft } from "@/lib/draft";
import { StepLoader } from "@/components/StepLoader";
import { findDepartment, searchDepartments } from "@/lib/departments";
import {
  BLOOD_TYPES, FAVORITE_MUSIC_MAX, MBTI_TYPES, MBTI_UNKNOWN, MUSIC_GENRES, MUSIC_MAX, MUSIC_MIN,
  MUSIC_NONE, NICKNAME_MAX, TRAITS, TRAITS_MAX, TRAITS_MIN, YEARS,
} from "@/lib/options";
import type { ProfileInput, PublicProfile, Session } from "@/lib/types";

const TOTAL = 8;

export default function RegisterPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({});
  const [step, setStep] = useState(1);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = loadDraft();
    setDraft(d);
    setStep(d.step && d.step >= 1 && d.step <= TOTAL ? d.step : 1);
    setReady(true);
  }, []);

  const update = (patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft({ ...next, step });
      return next;
    });
  };

  const goto = (s: number) => {
    setStep(s);
    saveDraft({ ...draft, step: s });
    window.scrollTo({ top: 0 });
  };

  const valid = useMemo(() => {
    switch (step) {
      case 1: return !!draft.nickname?.trim() && draft.nickname.trim().length <= NICKNAME_MAX;
      case 2: return !!draft.year;
      case 3: return !!findDepartment(draft.department_id);
      case 4: return !!draft.mbti;
      case 5: return !!draft.blood_type;
      case 6: return (draft.traits?.length ?? 0) >= TRAITS_MIN && (draft.traits?.length ?? 0) <= TRAITS_MAX;
      case 7: return (draft.music_genres?.length ?? 0) >= MUSIC_MIN;
      case 8: return (draft.favorite_music?.length ?? 0) <= FAVORITE_MUSIC_MAX;
      default: return false;
    }
  }, [step, draft]);

  const next = async () => {
    if (!valid || submitting) return;
    if (step < TOTAL) return goto(step + 1);
    const profile: ProfileInput = {
      nickname: draft.nickname!.trim(),
      year: draft.year!,
      department_id: draft.department_id!,
      mbti: draft.mbti!,
      blood_type: draft.blood_type!,
      traits: draft.traits!,
      music_genres: draft.music_genres!,
      favorite_music: draft.favorite_music?.trim() || null,
    };
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ profile: PublicProfile; session: Session }>("/api/profiles", {
        method: "POST",
        json: profile,
      });
      saveSession(res.session);
      clearDraft();
      router.push("/profile?new=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "잠시 후 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  if (submitting) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-br from-surface via-white to-[#ffe9f1] px-6">
        <StepLoader title="학생증 발급 중" steps={["학적 정보 확인 중", "전공 분석 중", "AI 학사 분석 작성 중"]} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full md:items-center md:justify-center md:bg-gradient-to-br md:from-surface md:via-white md:to-[#ffe9f1] md:py-10">
    <main className="flex min-h-dvh w-full flex-col bg-white px-5 pb-6 pt-4 md:min-h-[720px] md:max-w-2xl md:rounded-[28px] md:border md:border-line md:px-12 md:pb-10 md:pt-8 md:shadow-[0_20px_60px_rgba(255,107,154,0.18)]">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (step > 1 ? goto(step - 1) : router.push("/"))}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-xl text-ink-soft hover:bg-surface"
          aria-label="이전"
        >
          ‹
        </button>
        <div className="flex-1">
          <ProgressBar step={step} total={TOTAL} />
        </div>
      </header>

      <section key={step} className="animate-pop-in mt-8 flex-1">
        {step === 1 && (
          <Step title="닉네임을 정해주세요" desc="강의실에서 상대에게 보이는 이름이에요.">
            <input
              autoFocus
              value={draft.nickname ?? ""}
              maxLength={NICKNAME_MAX}
              onChange={(e) => update({ nickname: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && next()}
              placeholder="예: 송도산책러"
              className="h-14 w-full rounded-2xl border-2 border-line px-4 text-lg outline-none focus:border-primary"
            />
            <p className="mt-2 text-right text-xs text-ink-soft">
              {draft.nickname?.length ?? 0} / {NICKNAME_MAX}
            </p>
          </Step>
        )}

        {step === 2 && (
          <Step title="몇 학년이에요?" desc="2학년부터 4학년까지 등록할 수 있어요.">
            <div className="grid grid-cols-3 gap-3">
              {YEARS.map((y) => (
                <ChoiceButton key={y} selected={draft.year === y} onClick={() => update({ year: y })}>
                  {y}학년
                </ChoiceButton>
              ))}
            </div>
          </Step>
        )}

        {step === 3 && <DepartmentStep value={draft.department_id} onChange={(id) => update({ department_id: id })} />}

        {step === 4 && (
          <Step title="MBTI를 알려주세요" desc="재미로만 참고해요. 추천을 결정하진 않아요.">
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              {MBTI_TYPES.map((m) => (
                <ChoiceButton key={m} selected={draft.mbti === m} onClick={() => update({ mbti: m })}>
                  <span className="text-[15px]">{m}</span>
                </ChoiceButton>
              ))}
            </div>
            <div className="mt-3">
              <ChoiceButton selected={draft.mbti === MBTI_UNKNOWN} onClick={() => update({ mbti: MBTI_UNKNOWN })}>
                {MBTI_UNKNOWN}
              </ChoiceButton>
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step title="혈액형은요?" desc="이것도 재미 요소예요. 비공개도 괜찮아요.">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {BLOOD_TYPES.map((b) => (
                <ChoiceButton key={b} selected={draft.blood_type === b} onClick={() => update({ blood_type: b })}>
                  {b === "비공개" ? b : `${b}형`}
                </ChoiceButton>
              ))}
            </div>
          </Step>
        )}

        {step === 6 && (
          <Step
            title="전공 밖의 나는 어떤 사람인가요?"
            desc={`나를 잘 나타내는 키워드를 ${TRAITS_MIN}~${TRAITS_MAX}개 골라주세요.`}
            counter={`${draft.traits?.length ?? 0} / ${TRAITS_MAX}`}
          >
            <MultiChips
              options={TRAITS}
              value={draft.traits ?? []}
              max={TRAITS_MAX}
              onChange={(traits) => update({ traits })}
            />
          </Step>
        )}

        {step === 7 && (
          <Step
            title="좋아하는 음악 장르는요?"
            desc={`${MUSIC_MIN}~${MUSIC_MAX}개 골라주세요.`}
            counter={`${draft.music_genres?.length ?? 0} / ${MUSIC_MAX}`}
          >
            <MultiChips
              options={MUSIC_GENRES}
              value={draft.music_genres ?? []}
              max={MUSIC_MAX}
              exclusive={MUSIC_NONE}
              onChange={(music_genres) => update({ music_genres })}
            />
          </Step>
        )}

        {step === 8 && (
          <Step title="요즘 자주 듣는 가수나 곡이 있나요?" desc="선택 사항이에요. 첫 대화 소재가 될 수 있어요.">
            <input
              autoFocus
              value={draft.favorite_music ?? ""}
              maxLength={FAVORITE_MUSIC_MAX}
              onChange={(e) => update({ favorite_music: e.target.value })}
              placeholder="예: 잔나비 - 주저하는 연인들을 위해"
              className="h-14 w-full rounded-2xl border-2 border-line px-4 text-base outline-none focus:border-primary"
            />
            <p className="mt-2 text-right text-xs text-ink-soft">
              {draft.favorite_music?.length ?? 0} / {FAVORITE_MUSIC_MAX}
            </p>
          </Step>
        )}
      </section>

      <div className="sticky bottom-0 bg-white pb-[env(safe-area-inset-bottom)] pt-4">
        {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        <PrimaryButton onClick={next} disabled={!valid}>
          {step < TOTAL ? "다음" : draft.favorite_music?.trim() ? "학생증 발급받기" : "건너뛰고 학생증 발급받기"}
        </PrimaryButton>
      </div>
    </main>
    </div>
  );
}

function Step({
  title,
  desc,
  counter,
  children,
}: {
  title: string;
  desc?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold leading-snug md:text-3xl">{title}</h2>
      <div className="mb-6 mt-2 flex items-center justify-between gap-2">
        {desc && <p className="text-[15px] text-ink-soft">{desc}</p>}
        {counter && <span className="shrink-0 text-sm font-semibold text-primary">{counter}</span>}
      </div>
      {children}
    </div>
  );
}

function MultiChips({
  options,
  value,
  max,
  exclusive,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  max: number;
  exclusive?: string;
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) => {
    if (value.includes(o)) return onChange(value.filter((v) => v !== o));
    if (o === exclusive) return onChange([o]); // "음악 잘 안 들음"은 단독 선택
    const base = value.filter((v) => v !== exclusive);
    if (base.length >= max) return;
    onChange([...base, o]);
  };
  const full = value.filter((v) => v !== exclusive).length >= max;
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => {
        const selected = value.includes(o);
        return (
          <SelectChip key={o} selected={selected} disabled={!selected && full && o !== exclusive} onClick={() => toggle(o)}>
            {o}
          </SelectChip>
        );
      })}
    </div>
  );
}

function DepartmentStep({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchDepartments(q), [q]);
  const selected = findDepartment(value);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const d of results) map.set(d.college, [...(map.get(d.college) ?? []), d]);
    return [...map.entries()];
  }, [results]);

  return (
    <Step title="전공을 선택해주세요" desc="같은 과 학생은 추천에서 빠져요.">
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="학과명 검색 (예: 컴퓨터, 디자인)"
          className="h-13 w-full rounded-2xl border-2 border-line py-3 pl-11 pr-4 text-base outline-none focus:border-primary"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">⌕</span>
      </div>
      {selected && (
        <p className="mt-3 rounded-xl bg-surface px-4 py-2.5 text-sm">
          선택한 전공: <b className="text-primary-strong">{selected.name}</b>
          <span className="text-ink-soft"> · {selected.college}</span>
        </p>
      )}
      <div className="mt-4 max-h-[46dvh] space-y-5 overflow-y-auto pb-2 md:max-h-[420px]">
        {grouped.length === 0 && <p className="py-8 text-center text-sm text-ink-soft">검색 결과가 없어요.</p>}
        {grouped.map(([college, list]) => (
          <div key={college}>
            <p className="mb-2 text-xs font-semibold text-ink-soft">{college}</p>
            <div className="flex flex-wrap gap-2">
              {list.map((d) => (
                <SelectChip key={d.id} selected={value === d.id} onClick={() => onChange(d.id)}>
                  {d.name}
                </SelectChip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Step>
  );
}
