"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SyllabusCard } from "@/components/SyllabusCard";
import { api } from "@/lib/api-client";
import type { ChatMessage, MessagesResponse, RoomDetail } from "@/lib/types";
import { formatTime, isAtOrBefore, toMicros } from "@/lib/time";
import { usePoll } from "@/lib/use-poll";

type Pending = { client_message_id: string; content: string; failed: boolean };
type Phase = RoomDetail["phase"];

const newClientId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function remaining(ts: string) {
  const ms = Date.parse(ts) - Date.now();
  if (ms <= 0) return "곧 종료";
  const h = Math.floor(ms / 3_600_000);
  return h >= 24 ? `${Math.ceil(h / 24)}일 남음` : `${Math.max(1, h)}시간 남음`;
}

/**
 * 강의실 채팅. 전체 화면(/rooms/[id])과 PC의 작은 메시지 창(compact)에서 함께 쓴다.
 * compact에서는 강의계획서를 접어서 보여주고, onBack으로 목록에 돌아간다.
 */
export function ChatView({ roomId: id, compact = false, onBack }: { roomId: string; compact?: boolean; onBack?: () => void }) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [otherReadAt, setOtherReadAt] = useState("1970-01-01T00:00:00+00:00");
  const [blocked, setBlocked] = useState(false);
  const [phase, setPhase] = useState<Phase>("trial");
  const [cont, setCont] = useState({ mine: false, other: false });
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [topics, setTopics] = useState<string[] | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const lastAt = useRef<string | null>(null);
  const readSent = useRef<string>("");
  const syllabusRequested = useRef(false);

  const loadRoom = useCallback(async () => {
    const r = await api<RoomDetail>(`/api/rooms/${id}`);
    setRoom(r);
    setBlocked(r.blocked);
    setPhase(r.phase);
    setCont({ mine: r.my_continue, other: r.other_continue });
    return r;
  }, [id]);

  useEffect(() => {
    loadRoom().catch((e) => {
      if (e?.status === 404) (onBack ? onBack() : router.replace("/rooms"));
      else setError(e?.message ?? "강의실을 불러오지 못했어요.");
    });
  }, [loadRoom, router]);

  // 강의계획서: 없으면 생성 요청 (두 기기가 동시에 열어도 서버가 한 번만 만든다)
  useEffect(() => {
    if (!room || room.syllabus || syllabusRequested.current) return;
    syllabusRequested.current = true;
    api<{ status: string }>(`/api/rooms/${id}/syllabus`, { method: "POST" })
      .then(() => loadRoom())
      .catch(() => {});
  }, [room, id, loadRoom]);
  usePoll(loadRoom, 3000, !!room && !room.syllabus);

  // 2초 간격 polling: 새 메시지 + 상대 읽음 시각 + 수강 단계
  const poll = useCallback(async () => {
    const q = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
    const r = await api<MessagesResponse>(`/api/rooms/${id}/messages${q}`);
    setOtherReadAt(r.other_last_read_at);
    setBlocked(r.blocked);
    setPhase(r.phase);
    setCont({ mine: r.my_continue, other: r.other_continue });
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

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending.length, room?.syllabus]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom.current) markRead();
  };

  const locked = blocked || phase === "ended";

  const send = async (content: string, clientId = newClientId()) => {
    const body = content.trim();
    if (!body || locked) return;
    nearBottom.current = true;
    setError(null);
    setPending((p) => [...p.filter((x) => x.client_message_id !== clientId), { client_message_id: clientId, content: body, failed: false }]);
    try {
      const r = await api<{ message: ChatMessage }>(`/api/rooms/${id}/messages`, { method: "POST", json: { content: body, client_message_id: clientId } });
      setMessages((prev) => (prev.some((m) => m.id === r.message.id) ? prev : [...prev, r.message]));
      setPending((p) => p.filter((x) => x.client_message_id !== clientId));
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "contact_locked") {
        // 연락처가 든 메시지는 보내지 않고 입력창으로 되돌린다
        setPending((p) => p.filter((x) => x.client_message_id !== clientId));
        setText(body);
      } else {
        setPending((p) => p.map((x) => (x.client_message_id === clientId ? { ...x, failed: true } : x)));
      }
      setError(err.message ?? "전송하지 못했어요.");
    }
  };

  const submit = () => {
    if (!text.trim()) return;
    send(text);
    setText("");
    setTopics(null);
  };

  const decide = async (decision: "continue" | "end" | "skip_trial") => {
    if (decision === "end" && !confirm("정말 수강을 철회할까요? 강의실이 닫히고, AI 조교가 새 매칭을 제안해 드려요.")) return;
    setMenu(false);
    try {
      const r = await api<{ phase: Phase }>(`/api/rooms/${id}/decision`, { method: "POST", json: { decision } });
      setPhase(r.phase);
      await Promise.all([loadRoom(), poll()]);
      if (decision === "end" && !compact) router.push("/notifications");
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했어요.");
    }
  };

  const block = async () => {
    if (!room || !confirm(`${room.other.nickname}님을 차단할까요? 차단하면 서로 메시지를 보낼 수 없어요.`)) return;
    await api("/api/blocks", { method: "POST", json: { user_id: room.other.id } }).catch(() => {});
    setBlocked(true);
    setMenu(false);
  };

  const recommendTopics = async () => {
    setTopicsLoading(true);
    setError(null);
    try {
      setTopics((await api<{ questions: string[] }>(`/api/rooms/${id}/topics`, { method: "POST" })).questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "주제를 불러오지 못했어요.");
    } finally {
      setTopicsLoading(false);
    }
  };

  const px = compact ? "px-3" : "px-4 md:px-8";

  return (
      <div className="flex h-full min-h-0 flex-col bg-[#fffafc]">
        {/* 헤더 */}
        <header className={`flex items-center gap-3 border-b border-line bg-white ${compact ? "px-3 py-2.5" : "px-4 py-3 md:px-6"}`}>
          {onBack ? (
            <button type="button" onClick={onBack} className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-soft hover:bg-surface" aria-label="강의실 목록">
              ‹
            </button>
          ) : (
            <Link href="/rooms" className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-soft hover:bg-surface" aria-label="강의실 목록">
              ‹
            </Link>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface text-lg">🎓</div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{room?.other.nickname ?? "강의실"}</p>
            <p className="truncate text-xs text-ink-soft">{room ? `${room.other.college} · ${room.other.department_name} · ${room.other.year}학년` : ""}</p>
          </div>
          <PhaseChip phase={phase} trialEndsAt={room?.trial_ends_at} />
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-ink-soft hover:bg-surface" aria-label="강의실 메뉴">
              ⋯
            </button>
            {menu && (
              <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                {room?.demo_mode && phase === "trial" && (
                  <button type="button" onClick={() => decide("skip_trial")} className="w-full px-4 py-3 text-left text-sm hover:bg-surface">
                    ⏩ 3일 뒤로 이동 (시연용)
                  </button>
                )}
                <button type="button" onClick={() => decide("end")} disabled={phase === "ended"} className="w-full px-4 py-3 text-left text-sm hover:bg-surface disabled:text-ink-soft">
                  {phase === "ended" ? "수강 철회된 강의" : "수강 철회"}
                </button>
                <button type="button" onClick={block} disabled={blocked} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 disabled:text-ink-soft">
                  {blocked ? "차단된 상대" : "차단하기"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 수강 기간 공지 (상단 고정) */}
        {phase === "trial" && (
          <div className={`border-b border-primary-soft bg-surface px-4 py-2 text-center text-xs text-primary-strong ${compact ? "" : "md:text-sm"}`}>
            📢 수강 기간 중에는 실명·나이·전화번호·인스타 아이디를 공개할 수 없어요 · {room ? remaining(room.trial_ends_at) : ""}
          </div>
        )}

        {/* 메시지 영역 */}
        <div ref={scrollRef} onScroll={onScroll} className={`min-h-0 flex-1 overflow-y-auto py-4 ${px}`}>
          <div className="mx-auto max-w-3xl space-y-3">
            {room?.syllabus ? (
              <SyllabusCard s={room.syllabus} defaultOpen={!compact} />
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-soft bg-white px-4 py-5 text-sm text-ink-soft">
                <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                AI 조교가 이번 학기 실제 개설 교양으로 두 분의 강의계획서를 만들고 있어요…
              </div>
            )}

            {messages.map((m, i) => {
              if (m.type === "ai")
                return (
                  <div key={m.id} className="mx-auto max-w-md whitespace-pre-wrap rounded-2xl border border-primary-soft bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">
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
                    {m.client_message_id === "intro" && <span className="mb-1 text-[11px] text-primary">💌 수강신청 한마디</span>}
                    <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                      <p className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-white text-ink"}`}>
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
                <div className="flex max-w-[78%] flex-row-reverse items-end gap-1.5">
                  <p className={`whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-3.5 py-2.5 text-[15px] leading-relaxed text-white ${p.failed ? "bg-gray-400" : "bg-primary/70"}`}>{p.content}</p>
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

            {/* 3일이 지나면: 계속 수강할지 선택 */}
            {phase === "deciding" && !blocked && (
              <div className="mx-auto max-w-md rounded-2xl border-2 border-primary bg-white p-4 text-center shadow-sm">
                <p className="font-bold">⏰ 3일 수강 기간이 끝났어요</p>
                <p className="mt-1 text-sm text-ink-soft">대화를 계속 이어갈까요? 두 분 모두 계속 수강하면 번호·인스타를 교환할 수 있어요.</p>
                <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
                  <button type="button" onClick={() => decide("end")} className="h-11 rounded-xl border-2 border-line text-sm font-semibold text-ink-soft">
                    수강 철회
                  </button>
                  <button type="button" disabled={cont.mine} onClick={() => decide("continue")} className="h-11 rounded-xl bg-primary text-sm font-bold text-white disabled:bg-primary-soft">
                    {cont.mine ? (cont.other ? "수강 확정!" : "상대의 선택을 기다리는 중") : "계속 수강하기 ♥"}
                  </button>
                </div>
                {cont.other && !cont.mine && <p className="mt-2 text-xs text-primary">상대는 이미 계속 수강하기를 눌렀어요!</p>}
              </div>
            )}
          </div>
        </div>

        {/* 입력창 */}
        <div className={`border-t border-line bg-white pb-[max(12px,env(safe-area-inset-bottom))] pt-3 ${px}`}>
          <div className="mx-auto max-w-3xl">
            {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            {locked ? (
              <p className="rounded-2xl bg-gray-50 py-3 text-center text-sm text-ink-soft">
                {phase === "ended" ? "수강이 철회된 강의실이에요." : "차단된 강의실이라 메시지를 보낼 수 없어요."}
              </p>
            ) : (
              <>
                {topics && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {topics.map((q) => (
                      <button key={q} type="button" onClick={() => setText(q)} className="rounded-full border border-primary-soft bg-surface px-3 py-1.5 text-left text-xs text-ink hover:border-primary">
                        💬 {q}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={recommendTopics}
                    disabled={topicsLoading}
                    className="rounded-full border border-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-strong hover:bg-surface disabled:opacity-60"
                  >
                    {topicsLoading ? "AI 조교가 생각 중…" : "✨ 대화 주제 추천"}
                  </button>
                  {phase === "confirmed" && <span className="text-xs text-ink-soft">수강 확정 ♥ 이제 연락처를 교환할 수 있어요</span>}
                </div>
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
                  <button type="button" onClick={submit} disabled={!text.trim()} className="h-12 shrink-0 rounded-2xl bg-primary px-5 font-bold text-white disabled:bg-primary-soft">
                    전송
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
  );
}

function PhaseChip({ phase, trialEndsAt }: { phase: Phase; trialEndsAt?: string }) {
  const map: Record<Phase, [string, string]> = {
    trial: ["bg-surface text-primary-strong", `수강 기간${trialEndsAt ? ` · ${remaining(trialEndsAt)}` : ""}`],
    deciding: ["bg-primary text-white", "수강 결정"],
    confirmed: ["bg-ink text-white", "수강 확정 ♥"],
    ended: ["bg-gray-100 text-ink-soft", "수강 철회"],
  };
  const [cls, label] = map[phase];
  return <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${cls}`}>{label}</span>;
}
