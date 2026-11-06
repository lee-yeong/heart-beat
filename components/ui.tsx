"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** 상단 진행률 바 */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="w-full" aria-label={`${total}단계 중 ${step}단계`}>
      <div className="mb-1.5 flex justify-between text-xs font-medium text-ink-soft">
        <span>학적 등록</span>
        <span className="text-primary">
          {step} / {total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-soft/60">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** 큼직한 선택 버튼 (한 개만 고르는 항목) */
export function ChoiceButton({
  selected,
  children,
  sub,
  ...props
}: { selected: boolean; sub?: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`flex min-h-14 w-full flex-col items-center justify-center rounded-2xl border-2 px-3 py-3 text-base font-semibold transition active:scale-[0.98] ${
        selected
          ? "border-primary bg-primary text-white shadow-[0_4px_14px_rgba(255,107,154,0.35)]"
          : "border-line bg-white text-ink hover:border-primary-soft"
      }`}
      {...props}
    >
      {children}
      {sub && <span className={`mt-0.5 text-xs font-normal ${selected ? "text-white/85" : "text-ink-soft"}`}>{sub}</span>}
    </button>
  );
}

/** 칩 (여러 개 고르는 항목) */
export function SelectChip({
  selected,
  children,
  ...props
}: { selected: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`rounded-full border-2 px-4 py-2.5 text-[15px] font-medium transition active:scale-95 disabled:opacity-40 ${
        selected
          ? "border-primary bg-primary text-white"
          : "border-primary-soft bg-white text-ink hover:bg-surface"
      }`}
      {...props}
    >
      {selected && <span className="mr-1">♥</span>}
      {children}
    </button>
  );
}

/** 화면 하단 고정 주 버튼 */
export function PrimaryButton({ children, ...props }: { children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="h-14 w-full rounded-2xl bg-primary text-lg font-bold text-white shadow-[0_6px_18px_rgba(255,107,154,0.35)] transition hover:bg-primary-strong active:scale-[0.99] disabled:bg-primary-soft disabled:shadow-none"
      {...props}
    >
      {children}
    </button>
  );
}

/** 'AI 분석', '실제 개설 과목' 같은 라벨 */
export function Badge({ children, tone = "pink" }: { children: ReactNode; tone?: "pink" | "gray" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        tone === "pink" ? "bg-surface text-primary-strong" : "bg-gray-100 text-ink-soft"
      }`}
    >
      {children}
    </span>
  );
}
