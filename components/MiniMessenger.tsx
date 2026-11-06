"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/lib/api-client";
import type { RoomSummary } from "@/lib/types";
import { formatTime } from "@/lib/time";
import { usePoll } from "@/lib/use-poll";
import { ChatView } from "./ChatView";
import { CloseIcon, ExpandIcon, SendIcon } from "./icons";

/** PC 화면 오른쪽 아래에 떠 있는 작은 메시지 창 (인스타그램 PC의 메시지 팝업처럼) */
export function MiniMessenger({ open, roomId, onOpen, onClose, onSelect }: {
  open: boolean;
  roomId: string | null;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (id: string | null) => void;
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const load = useCallback(async () => setRooms((await api<{ rooms: RoomSummary[] }>("/api/rooms")).rooms), []);
  usePoll(load, 5000);
  const unread = rooms?.filter((r) => r.unread > 0 && !r.ended).length ?? 0;

  if (!open)
    return (
      <button
        type="button"
        onClick={onOpen}
        className="fixed bottom-6 right-6 z-40 hidden items-center gap-2.5 rounded-2xl border border-line bg-white py-3 pl-4 pr-5 font-bold shadow-[0_10px_30px_rgba(0,0,0,0.12)] transition hover:shadow-[0_10px_30px_rgba(255,107,154,0.3)] md:flex"
      >
        <span className="relative">
          <SendIcon className="h-6 w-6" />
          {unread > 0 && <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-white ring-2 ring-white">{unread}</span>}
        </span>
        메시지
      </button>
    );

  return (
    <div className="animate-pop-in fixed bottom-6 right-6 z-40 hidden h-[600px] max-h-[calc(100dvh-48px)] w-[400px] flex-col overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] md:flex">
      {roomId ? (
        <>
          <div className="flex items-center justify-end gap-1 border-b border-line px-2 py-1.5">
            <button type="button" onClick={() => router.push(`/rooms/${roomId}`)} className="rounded-full p-1.5 text-ink-soft hover:bg-surface" title="크게 보기">
              <ExpandIcon />
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-soft hover:bg-surface" title="닫기">
              <CloseIcon />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ChatView roomId={roomId} compact onBack={() => onSelect(null)} />
          </div>
        </>
      ) : (
        <>
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="text-lg font-bold">메시지</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => router.push("/rooms")} className="rounded-full p-1.5 text-ink-soft hover:bg-surface" title="크게 보기">
                <ExpandIcon />
              </button>
              <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-soft hover:bg-surface" title="닫기">
                <CloseIcon />
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {!rooms ? (
              <p className="p-6 text-sm text-ink-soft">불러오는 중…</p>
            ) : rooms.length === 0 ? (
              <p className="p-6 text-sm text-ink-soft">수강 승인이 되면 여기에서 대화할 수 있어요.</p>
            ) : (
              rooms.map((r) => (
                <button key={r.id} type="button" onClick={() => onSelect(r.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface/60">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-xl">🎓</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <b className="truncate">{r.other.nickname}</b>
                      {r.ended && <span className="rounded-full bg-gray-100 px-1.5 text-[10px] text-ink-soft">수강 철회</span>}
                    </span>
                    <span className={`block truncate text-sm ${r.unread ? "font-semibold text-ink" : "text-ink-soft"}`}>
                      {r.last_message ? (r.last_message.type === "ai" ? "AI 조교 · " : "") + r.last_message.content : "강의실이 열렸어요"}
                      {r.last_message && <span className="text-ink-soft"> · {formatTime(r.last_message.created_at)}</span>}
                    </span>
                  </span>
                  {r.unread > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
