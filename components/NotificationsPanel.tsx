"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/lib/api-client";
import type { NotificationsResponse, RequestsResponse, RequestView } from "@/lib/types";
import { usePoll } from "@/lib/use-poll";

/** 넓은 PC 화면 오른쪽에 항상 보이는 알림 패널 (인스타그램 PC의 오른쪽 열처럼) */
export function NotificationsPanel({ onOpenRoom }: { onOpenRoom: (roomId: string) => void }) {
  const router = useRouter();
  const [reqs, setReqs] = useState<RequestsResponse | null>(null);
  const [notif, setNotif] = useState<NotificationsResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, n] = await Promise.all([api<RequestsResponse>("/api/requests"), api<NotificationsResponse>("/api/notifications")]);
    setReqs(r);
    setNotif(n);
  }, []);
  usePoll(load, 5000);

  const respond = async (r: RequestView, action: "accept" | "reject") => {
    setBusy(r.id);
    try {
      const res = await api<{ status: string; room_id: string | null }>(`/api/requests/${r.id}/respond`, { method: "POST", json: { action } });
      if (res.room_id) onOpenRoom(res.room_id);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const pending = reqs?.received.filter((r) => r.status === "pending") ?? [];
  const results = (reqs?.sent ?? []).filter((r) => r.status !== "pending").slice(0, 3);

  return (
    <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 overflow-y-auto border-l border-line bg-white px-5 py-8 xl:block">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">알림</h2>
        <Link href="/notifications" className="text-xs font-semibold text-primary-strong">
          모두 보기
        </Link>
      </div>

      {notif?.rematch?.length ? (
        <div className="mt-4 rounded-2xl border-2 border-primary bg-surface/50 p-3.5">
          <p className="text-sm font-bold">✨ 매칭을 다시 시작할까요?</p>
          <p className="mt-1 text-xs text-ink-soft">{notif.rematch[0].other_nickname}님과의 강의가 수강 철회로 끝났어요.</p>
          <button
            type="button"
            onClick={async () => {
              await api("/api/recommendations", { method: "POST", json: { rematch: true } });
              router.push("/recommendations");
            }}
            className="mt-2.5 h-9 w-full rounded-xl bg-primary text-sm font-bold text-white"
          >
            네, 다시 매칭해 주세요
          </button>
        </div>
      ) : null}

      <p className="mt-6 text-xs font-semibold text-ink-soft">수강 승인 요청 {pending.length > 0 && <b className="text-primary">{pending.length}</b>}</p>
      {!reqs ? (
        <p className="mt-3 text-sm text-ink-soft">불러오는 중…</p>
      ) : pending.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">새 수강신청이 없어요.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pending.map((r) => (
            <li key={r.id} className="animate-pop-in rounded-2xl border border-primary-soft p-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface">🎓</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{r.other.nickname}</p>
                  <p className="truncate text-xs text-ink-soft">{r.other.department_name}</p>
                </div>
              </div>
              {r.message && <p className="mt-2 rounded-xl bg-primary px-3 py-2 text-xs text-white">💌 {r.message}</p>}
              {r.analysis && <p className="mt-2 text-xs text-ink-soft">✨ {r.analysis.headline}</p>}
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy !== null} onClick={() => respond(r, "reject")} className="h-9 rounded-xl border border-line text-xs font-semibold text-ink-soft">
                  수강 반려
                </button>
                <button type="button" disabled={busy !== null} onClick={() => respond(r, "accept")} className="h-9 rounded-xl bg-primary text-xs font-bold text-white">
                  {busy === r.id ? "처리 중…" : "수강 승인 ♥"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {results.length > 0 && (
        <>
          <p className="mt-6 text-xs font-semibold text-ink-soft">내 수강신청 결과</p>
          <ul className="mt-2 space-y-2">
            {results.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span>{r.status === "accepted" ? "💌" : "🍂"}</span>
                <span className="min-w-0 flex-1 truncate">
                  <b>{r.other.nickname}</b>님이 {r.status === "accepted" ? "수강 승인했어요" : "수강 반려했어요"}
                </span>
                {r.room_id && (
                  <button type="button" onClick={() => onOpenRoom(r.room_id!)} className="shrink-0 text-xs font-semibold text-primary-strong">
                    대화
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
