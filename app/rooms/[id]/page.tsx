"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api-client";
import type { ChatMessage, MessagesResponse, RoomDetail } from "@/lib/types";
import { formatTime, isAtOrBefore, toMicros } from "@/lib/time";
import { usePoll } from "@/lib/use-poll";

type Pending = { client_message_id: string; content: string; failed: boolean; at: string };

const newClientId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [otherReadAt, setOtherReadAt] = useState("1970-01-01T00:00:00+00:00");
  const [blocked, setBlocked] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastAt = useRef<string | null>(null);
  const readSent = useRef<string>("");

  useEffect(() => {
    api<RoomDetail>(`/api/rooms/${id}`)
      .then((r) => {
        setRoom(r);
        setBlocked(r.blocked);
      })
      .catch((e) => {
        if (e?.status === 404) router.replace("/rooms");
        else setError(e?.message ?? "강의실을 불러오지 못했어요.");
      });
  }, [id, router]);

  // 2초 간격 polling: 새 메시지 + 상대 읽음 시각
  const poll = useCallback(async () => {
    const q = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
    const r = await api<MessagesResponse>(`/api/rooms/${id}/messages${q}`);
    setOtherReadAt(r.other_last_read_at);
    setBlocked(r.blocked);
    if (r.messages.length) {
      lastAt.current = r.messages[r.messages.length - 1].created_at;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...r.messages.filter((m) => !seen.has(m.id))];
      });
      const ids = new Set(r.messages.map((m) => m.client_message_id));
      setPending((p) => p.filter((x) => !ids.has(x.client_message_id)));
    }
  }, [id]);
  usePoll(poll, 2000, !!room);

  // 읽음 처리: 화면이 보이고 맨 아래를 보고 있을 때, 표시된 마지막 상대(또는 AI) 메시지까지
  const markRead = useCallback(() => {
    if (!room || document.hidden || !nearBottom.current) return;
    const lastOther = [...messages].reverse().find((m) => m.sender_id !== room.me_id);
    if (!lastOther) return;
    if (readSent.current && toMicros(lastOther.created_at) <= toMicros(readSent.current)) return;
    readSent.current = lastOther.created_at;
    api(`/api/rooms/${id}/read`, { method: "POST", json: { until: lastOther.created_at } }).catch(() => {
      readSent.current = "";
    });
  }, [messages, room, id]);
  useEffect(markRead, [markRead]);
  useEffect(() => {
    const onVis = () => markRead();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [markRead]);

  // 맨 아래를 보고 있었다면 새 메시지가 오면 따라 내려간다
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom.current) markRead();
  };

  const send = async (content: string, clientId = newClientId()) => {
    const body = content.trim();
    if (!body || blocked) return;
    nearBottom.current = true;
    setPending((p) => [...p.filter((x) => x.client_message_id !== clientId), { client_message_id: clientId, content: body, failed: false, at: new Date().toISOString() }]);
    try {
      const r = await api<{ message: ChatMessage }>(`/api/rooms/${id}/messages`, {
        method: "POST",
        json: { content: body, client_message_id: clientId },
      });
      setMessages((prev) => (prev.some((m) => m.id === r.message.id) ? prev : [...prev, r.message]));
      setPending((p) => p.filter((x) => x.client_message_id !== clientId));
    } catch (e) {
      setPending((p) => p.map((x) => (x.client_message_id === clientId ? { ...x, failed: true } : x)));
      setError(e instanceof Error ? e.message : "전송하지 못했어요.");
    }
  };

  const submit = () => {
    if (!text.trim()) return;
    send(text);
    setText("");
  };

  const block = async () => {
    if (!room || !confirm(`${room.other.nickname}님을 차단할까요? 차단하면 서로 메시지를 보낼 수 없어요.`)) return;
    await api("/api/blocks", { method: "POST", json: { user_id: room.other.id } }).catch(() => {});
    setBlocked(true);
    setMenu(false);
  };

  return (
    <AppShell bare>
      <div className="flex h-dvh flex-col bg-[#fffafc]">
        {/* 헤더 */}
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 md:px-6">
          <Link href="/rooms" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-soft hover:bg-surface" aria-label="강의실 목록">
            ‹
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-lg">🎓</div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{room?.other.nickname ?? "강의실"}</p>
            <p className="truncate text-xs text-ink-soft">
              {room ? `${room.other.college} · ${room.other.department_name} · ${room.other.year}학년` : ""}
            </p>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-soft hover:bg-surface" aria-label="강의실 메뉴">
              ⋯
            </button>
            {menu && (
              <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                <button type="button" onClick={block} disabled={blocked} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 disabled:text-ink-soft">
                  {blocked ? "차단된 상대" : "차단하기"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 메시지 영역 */}
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-5 md:px-8">
          <div className="mx-auto max-w-3xl space-y-3">
            {/* M4: 우리의 강의계획서가 이 자리에 들어간다 */}
            <div className="rounded-2xl border border-dashed border-primary-soft bg-white px-4 py-3 text-center text-sm text-ink-soft">
              📖 우리의 강의계획서를 준비하고 있어요 (M4)
            </div>

            {messages.map((m, i) => {
              if (m.type === "ai")
                return (
                  <div key={m.id} className="mx-auto max-w-md rounded-2xl border border-primary-soft bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">
                    <p className="mb-1 text-xs font-bold text-primary">✨ AI 조교</p>
                    {m.content}
                  </div>
                );
              const mine = m.sender_id === room?.me_id;
              const prev = messages[i - 1];
              const showName = !mine && (!prev || prev.sender_id !== m.sender_id);
              const unread = mine && !isAtOrBefore(m.created_at, otherReadAt);
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                    {showName && <span className="mb-1 ml-1 text-xs text-ink-soft">{room?.other.nickname}</span>}
                    <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                      <p
                        className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
                          mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-white text-ink"
                        }`}
                      >
                        {m.content}
                      </p>
                      <span className={`flex shrink-0 flex-col pb-0.5 text-[11px] leading-tight ${mine ? "items-end" : "items-start"}`}>
                        {unread && <b className="text-primary">1</b>}
                        <span className="text-ink-soft">{formatTime(m.created_at)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {pending.map((p) => (
              <div key={p.client_message_id} className="flex justify-end">
                <div className="flex max-w-[78%] items-end gap-1.5 flex-row-reverse">
                  <p className={`whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-3.5 py-2.5 text-[15px] leading-relaxed text-white ${p.failed ? "bg-gray-400" : "bg-primary/70"}`}>
                    {p.content}
                  </p>
                  <span className="pb-0.5 text-[11px] text-ink-soft">
                    {p.failed ? (
                      <button type="button" onClick={() => send(p.content, p.client_message_id)} className="font-semibold text-red-500 underline">
                        재전송
                      </button>
                    ) : (
                      "전송 중"
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 입력창 */}
        <div className="border-t border-line bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:px-8">
          <div className="mx-auto max-w-3xl">
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            {blocked ? (
              <p className="rounded-2xl bg-gray-50 py-3 text-center text-sm text-ink-soft">차단된 강의실이라 메시지를 보낼 수 없어요.</p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  maxLength={1000}
                  placeholder="메시지를 입력하세요"
                  className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border-2 border-line px-4 py-3 text-[15px] outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={!text.trim()}
                  className="h-12 shrink-0 rounded-2xl bg-primary px-5 font-bold text-white disabled:bg-primary-soft"
                >
                  전송
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
