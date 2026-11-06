"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api-client";
import type { RoomSummary } from "@/lib/types";
import { formatTime } from "@/lib/time";
import { useMe } from "@/lib/use-me";
import { usePoll } from "@/lib/use-poll";

export default function RoomsPage() {
  const { me } = useMe();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const load = useCallback(async () => setRooms((await api<{ rooms: RoomSummary[] }>("/api/rooms")).rooms), []);
  usePoll(load, 5000, !!me);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold md:text-3xl">강의실</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">수강 승인이 된 친구와 대화할 수 있어요.</p>
      {!rooms ? (
        <p className="py-16 text-center text-ink-soft">불러오는 중…</p>
      ) : rooms.length === 0 ? (
        <div className="mt-6 rounded-[22px] border border-line bg-white px-6 py-14 text-center">
          <p className="text-4xl">💬</p>
          <p className="mt-3 font-semibold">아직 열린 강의실이 없어요.</p>
          <Link href="/recommendations" className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white">
            AI 추천 수강 목록 보기
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-white">
          {rooms.map((r) => (
            <li key={r.id}>
              <Link href={`/rooms/${r.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface/50">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface text-xl">🎓</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{r.other.nickname}</p>
                    <span className="truncate text-xs text-ink-soft">{r.other.department_name}</span>
                    {r.ended && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-ink-soft">수강 철회</span>}
                  </div>
                  <p className={`mt-0.5 truncate text-sm ${r.unread ? "font-semibold text-ink" : "text-ink-soft"}`}>
                    {r.last_message ? (r.last_message.type === "ai" ? `AI 조교 · ${r.last_message.content}` : r.last_message.content) : "강의실이 열렸어요"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {r.last_message && <span className="text-xs text-ink-soft">{formatTime(r.last_message.created_at)}</span>}
                  {r.unread > 0 && (
                    <span className="min-w-5 rounded-full bg-primary px-1.5 text-center text-xs font-bold leading-5 text-white">{r.unread}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
