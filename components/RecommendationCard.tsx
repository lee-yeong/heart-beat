"use client";

import { useState } from "react";
import type { RecommendationItem } from "@/lib/types";
import { Badge } from "./ui";

/** AI 추천 수강 목록의 후보 카드 */
export function RecommendationCard({ item, action }: { item: RecommendationItem; action?: React.ReactNode }) {
  const { candidate: c, analysis: a } = item;
  const [open, setOpen] = useState(false);
  const evidence = new Set(a.evidence_keywords);

  return (
    <article className="animate-pop-in flex flex-col rounded-[22px] border border-line bg-white p-5 shadow-[0_8px_30px_rgba(255,107,154,0.10)] md:p-6">
      <header className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-xl">🎓</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold">{c.nickname}</p>
            <span className="shrink-0 text-xs text-ink-soft">{c.year}학년</span>
          </div>
          <p className="truncate text-sm text-ink-soft">
            {c.college} · <b className="font-semibold text-ink">{c.department_name}</b>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">추천 {item.rank}</span>
      </header>

      <div className="mt-4 rounded-2xl bg-surface/70 p-4">
        <Badge>✨ AI 분석</Badge>
        <p className="mt-2.5 text-[17px] font-bold leading-snug">{a.headline}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{a.major_synergy}</p>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-ink-soft">추천 근거 키워드</p>
        <div className="flex flex-wrap gap-1.5">
          {a.evidence_keywords.map((k) => (
            <span key={k} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
              ♥ {k}
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[...c.traits, ...c.music_genres]
            .filter((k) => !evidence.has(k))
            .map((k) => (
              <span key={k} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft">
                {k}
              </span>
            ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-primary-soft px-4 py-3">
        <p className="text-xs font-semibold text-primary">첫 대화 주제</p>
        <p className="mt-1 text-[15px]">&ldquo;{a.first_topic}&rdquo;</p>
      </div>

      {open && (
        <dl className="mt-4 space-y-3 text-sm leading-relaxed">
          {a.common_points.length > 0 && (
            <Detail label="공통점">
              <ul className="list-inside list-disc">{a.common_points.map((p) => <li key={p}>{p}</li>)}</ul>
            </Detail>
          )}
          {a.complementary_points.length > 0 && (
            <Detail label="서로 보완되는 점">
              <ul className="list-inside list-disc">{a.complementary_points.map((p) => <li key={p}>{p}</li>)}</ul>
            </Detail>
          )}
          <Detail label="서로 다를 수 있는 점">{a.difference_note}</Detail>
        </dl>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-3 self-start text-sm font-medium text-ink-soft underline underline-offset-4">
        {open ? "접기" : "공통점·보완점·다른 점 보기"}
      </button>

      {action && <div className="mt-auto pt-5">{action}</div>}
    </article>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-0.5 text-xs font-semibold text-primary">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
