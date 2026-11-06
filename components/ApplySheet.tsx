"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { RecommendationItem } from "@/lib/types";
import { Badge } from "./ui";

const MAX = 100;

/** 수강신청 시트: 한마디 입력 + AI 멘트 추천 (고르면 입력칸에 채우기만, 자동 전송 없음) */
export function ApplySheet({ item, onClose, onSent }: { item: RecommendationItem; onClose: () => void; onSent: () => void }) {
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ suggestions: string[] }>("/api/requests/suggest", { method: "POST", json: { receiver_id: item.candidate.id } })
      .then((r) => setSuggestions(r.suggestions))
      .catch(() => setSuggestions([]));
  }, [item.candidate.id]);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await api("/api/requests", { method: "POST", json: { receiver_id: item.candidate.id, message: message.trim() || null } });
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "수강신청에 실패했어요.");
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center" onClick={onClose}>
      <div
        className="animate-pop-in w-full max-w-lg rounded-t-[28px] bg-white p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl md:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">
            <span className="text-primary">{item.candidate.nickname}</span>님에게 수강신청
          </p>
          <button type="button" onClick={onClose} className="text-2xl text-ink-soft" aria-label="닫기">
            ×
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">짧은 한마디를 함께 보내 보세요. 승인되면 강의실의 첫 메시지가 돼요.</p>

        <div className="mt-4">
          <Badge>✨ AI 추천 멘트</Badge>
          <div className="mt-2 space-y-2">
            {suggestions === null ? (
              <p className="flex items-center gap-2 py-2 text-sm text-ink-soft">
                <span className="h-2 w-2 animate-ping rounded-full bg-primary" /> 추천 근거를 보고 첫 인사를 고르는 중…
              </p>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMessage(s.slice(0, MAX))}
                  className={`w-full rounded-2xl border-2 px-4 py-2.5 text-left text-sm transition ${message === s ? "border-primary bg-surface" : "border-line hover:border-primary-soft"}`}
                >
                  {s}
                </button>
              ))
            )}
          </div>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
          rows={2}
          placeholder="직접 입력해도 돼요 (선택)"
          className="mt-4 w-full resize-none rounded-2xl border-2 border-line px-4 py-3 text-[15px] outline-none focus:border-primary"
        />
        <p className="text-right text-xs text-ink-soft">
          {message.length} / {MAX} · 연락처·SNS 아이디는 넣을 수 없어요
        </p>
        {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="mt-4 h-14 w-full rounded-2xl bg-primary text-lg font-bold text-white shadow-[0_6px_18px_rgba(255,107,154,0.35)] hover:bg-primary-strong disabled:bg-primary-soft"
        >
          {sending ? "신청 중…" : message.trim() ? "한마디와 함께 수강신청 ♥" : "수강신청 ♥"}
        </button>
      </div>
    </div>
  );
}
