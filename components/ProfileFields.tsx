"use client";

import { useMemo, useState } from "react";
import { findDepartment, searchDepartments } from "@/lib/departments";
import { SelectChip } from "./ui";

/** 여러 개 고르는 칩 묶음 (최대 개수, 단독 선택 항목 지원) */
export function MultiChips({
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

/** 전공 검색·선택 */
export function DepartmentPicker({ value, onChange, maxHeight = "max-h-[46dvh] md:max-h-[420px]" }: { value?: string; onChange: (id: string) => void; maxHeight?: string }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchDepartments(q), [q]);
  const selected = findDepartment(value);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const d of results) map.set(d.college, [...(map.get(d.college) ?? []), d]);
    return [...map.entries()];
  }, [results]);

  return (
    <div>
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
      <div className={`mt-4 space-y-5 overflow-y-auto pb-2 ${maxHeight}`}>
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
    </div>
  );
}
