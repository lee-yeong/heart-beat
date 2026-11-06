"use client";

import { useState } from "react";
import type { SyllabusView } from "@/lib/types";
import { Badge } from "./ui";

/** 우리의 강의계획서: 실제 과목 정보(원본)와 AI가 재해석한 내용을 구분해 보여준다 */
export function SyllabusCard({ s, defaultOpen = true }: { s: SyllabusView; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const c = s.course;
  return (
    <section className="overflow-hidden rounded-[22px] border border-primary-soft bg-white shadow-[0_8px_30px_rgba(255,107,154,0.12)]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 bg-gradient-to-r from-primary to-[#ff9ab8] px-5 py-3.5 text-left text-white">
        <span className="text-xl">📖</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold opacity-90">우리의 강의계획서</p>
          <p className="truncate font-bold">{c.name}</p>
        </div>
        <span className="text-sm opacity-90">{open ? "접기 ▲" : "펼치기 ▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 p-5">
          {/* 실제 개설 과목: courses.json 원본 그대로 */}
          <div className="rounded-2xl border border-line bg-[#fafafa] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gray">🏫 실제 개설 과목</Badge>
              <span className="text-xs text-ink-soft">{s.semester}</span>
            </div>
            <p className="mt-2 text-lg font-bold">{c.name}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <Info label="영역" value={c.category} />
              <Info label="교수" value={c.professor} />
              <Info label="시간" value={c.day && c.time ? `${c.day} ${c.time}` : null} />
              <Info label="장소" value={c.building ? `${c.building} ${c.room ?? ""}`.trim() : null} />
              <Info label="학점" value={c.credits ? `${c.credits}학점` : null} />
            </dl>
          </div>

          {/* AI가 재해석한 내용 */}
          <div className="rounded-2xl bg-surface/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>✨ AI가 재해석한 내용</Badge>
              {s.source === "fallback" && <Badge tone="gray">기본 계획서</Badge>}
            </div>
            <p className="mt-2.5 text-[17px] font-bold leading-snug">“{s.subtitle}”</p>
            <p className="mt-1.5 text-sm leading-relaxed">{s.reason}</p>

            <ol className="mt-4 space-y-2">
              {s.weeks.map((w) => (
                <li key={w.week} className="flex gap-3 rounded-xl bg-white px-3 py-2.5 text-sm">
                  <span className="shrink-0 font-bold text-primary">{w.week}주차</span>
                  <span>{w.topic}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-xl bg-white px-3 py-2.5">
                <p className="text-xs font-bold text-primary">중간고사 · 대화 과제</p>
                <p className="mt-0.5">{s.midterm}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2.5">
                <p className="text-xs font-bold text-primary">기말고사 · 첫 만남 제안</p>
                <p className="mt-0.5">{s.final_exam}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-bold text-primary">아이스브레이커</p>
              <ul className="space-y-1 text-sm">
                {s.ice_breakers.map((q) => (
                  <li key={q}>💬 {q}</li>
                ))}
              </ul>
            </div>
            {s.source === "fallback" && <p className="mt-3 text-xs text-ink-soft">AI 분석을 불러오지 못해 기본 계획서를 표시합니다.</p>}
          </div>
          <p className="text-center text-xs text-ink-soft">다음 학기 개설 여부는 수강 편람에서 확인하세요.</p>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="truncate font-medium">{value ?? "정보 없음"}</dd>
    </div>
  );
}
