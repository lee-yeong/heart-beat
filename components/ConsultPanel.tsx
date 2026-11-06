"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { RecommendationItem } from "@/lib/types";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = ["추천해준 사람이 나랑 안 맞는 것 같아요", "대화가 잘 통하는 차분한 사람을 만나고 싶어요", "같이 운동이나 산책할 친구가 있으면 좋겠어요"];

/** AI 매칭 상담: 대화로 원하는 친구 상을 정리하고, 그 선호로 다시 추천받는다 */
export function ConsultPanel({ items, onClose, onRematch }: { items: RecommendationItem[]; onClose: () => void; onRematch: (preference: string) => void }) {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", content: "안녕하세요, AI 조교예요 ✨ 어떤 친구를 만나고 싶은지, 지금 추천이 왜 아쉬운지 편하게 말해 주세요. 상담 내용은 추천에만 쓰고 상대에게는 보이지 않아요." },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [turns.length, loading]);

  const ask = async (content: string) => {
    const body = content.trim();
    if (!body || loading) return;
    const next: Turn[] = [...turns, { role: "user", content: body }];
    setTurns(next);
    setText("");
    setLoading(true);
    try {
      const current = items.map((i) => `${i.candidate.nickname}(${i.candidate.department_name}): ${i.analysis.headline}`).join("\n");
      const r = await api<{ reply: string; preference_summary: string; ready: boolean }>("/api/consult", {
        method: "POST",
        json: { messages: next.slice(1), current_recommendations: current },
      });
      setTurns([...next, { role: "assistant", content: r.reply }]);
      if (r.preference_summary) setSummary(r.preference_summary);
      setReady(r.ready);
    } catch (e) {
      setTurns([...next, { role: "assistant", content: e instanceof Error ? e.message : "잠시 후 다시 말해 주세요." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center" onClick={onClose}>
      <div className="animate-pop-in flex h-[85dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-white shadow-2xl md:h-[640px] md:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-lg font-bold">✨ AI 조교 매칭 상담</p>
            <p className="text-xs text-ink-soft">대화로 원하는 친구 상을 정리해 다시 추천해요</p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl text-ink-soft" aria-label="닫기">
            ×
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {turns.map((t, i) => (
            <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${t.role === "user" ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-surface"}`}>
                {t.content}
              </p>
            </div>
          ))}
          {loading && <p className="text-sm text-ink-soft">AI 조교가 생각 중…</p>}
          {turns.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-primary-soft px-3 py-1.5 text-xs hover:bg-surface">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {summary && (
          <div className="mx-5 mb-3 rounded-2xl border border-primary-soft bg-surface/70 p-3">
            <p className="text-xs font-bold text-primary">AI가 정리한 원하는 친구 상</p>
            <p className="mt-1 text-sm">{summary}</p>
            <button
              type="button"
              onClick={() => onRematch(summary)}
              className={`mt-2.5 h-11 w-full rounded-xl text-sm font-bold text-white ${ready ? "bg-primary" : "bg-primary/70"}`}
            >
              이 내용으로 다시 추천받기 ♥
            </button>
          </div>
        )}

        <div className="flex gap-2 border-t border-line px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && ask(text)}
            placeholder="예: 나는 조용히 이야기 들어주는 사람이 좋아요"
            className="h-12 flex-1 rounded-2xl border-2 border-line px-4 text-[15px] outline-none focus:border-primary"
          />
          <button type="button" onClick={() => ask(text)} disabled={!text.trim() || loading} className="h-12 rounded-2xl bg-primary px-4 font-bold text-white disabled:bg-primary-soft">
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}
