"use client";

import { useEffect, useState } from "react";

/** AI 대기 중 단계별 문구를 보여준다. 실제 응답이 오면 부모가 이 컴포넌트를 내린다. */
export function StepLoader({ title, steps, interval = 1600 }: { title: string; steps: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), interval);
    return () => clearInterval(t);
  }, [steps.length, interval]);

  return (
    <div className="w-full max-w-sm rounded-[24px] border border-line bg-white p-7 text-center shadow-[0_20px_60px_rgba(255,107,154,0.15)]">
      <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-surface text-2xl text-primary">
        ♥
      </div>
      <p className="mt-4 text-lg font-bold">{title}</p>
      <ol className="mt-5 space-y-2.5 text-left">
        {steps.map((s, idx) => (
          <li key={s} className={`flex items-center gap-3 text-[15px] transition ${idx <= i ? "text-ink" : "text-ink-soft/50"}`}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                idx < i ? "bg-primary text-white" : idx === i ? "border-2 border-primary text-primary" : "border-2 border-line"
              }`}
            >
              {idx < i ? "✓" : idx + 1}
            </span>
            {s}
            {idx === i && <span className="ml-auto h-2 w-2 animate-ping rounded-full bg-primary" />}
          </li>
        ))}
      </ol>
      <p className="mt-5 text-xs text-ink-soft">AI가 직접 읽고 판단하고 있어요. 10초 정도 걸려요.</p>
    </div>
  );
}
