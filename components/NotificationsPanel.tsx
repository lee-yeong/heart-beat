"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { NotificationsResponse, PublicProfile, RequestsResponse, RequestView, RoomSummary } from "@/lib/types";
import { usePoll } from "@/lib/use-poll";

type Activity = {
  key: string;
  at: string;
  who: PublicProfile;
  text: React.ReactNode;
  action?: { label: string; onClick: () => void; tone?: "primary" | "muted" }[];
  highlight?: boolean;
};

function timeAgo(ts: string) {
  const s = Math.max(0, (Date.now() - Date.parse(ts)) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간`;
  return `${Math.floor(s / 86400)}일`;
}

const Avatar = ({ big = false }: { big?: boolean }) => (
  <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-surface to-primary-soft ${big ? "h-12 w-12 text-xl" : "h-10 w-10 text-lg"}`}>🎓</span>
);

/**
 * PC 오른쪽 활동 열 (인스타그램 PC의 오른쪽 열처럼): 위에 내 프로필, 아래에 누가 무엇을 했는지.
 * 받은 수강신청은 여기서 바로 승인·반려할 수 있다.
 */
export function NotificationsPanel({ onOpenRoom }: { onOpenRoom: (roomId: string) => void }) {
  const router = useRouter();
  const [me, setMe] = useState<PublicProfile | null>(null);
  const [reqs, setReqs] = useState<RequestsResponse | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [notif, setNotif] = useState<NotificationsResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api<{ profile: PublicProfile }>("/api/profiles/me").then((r) => setMe(r.profile)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const [r, n, rm] = await Promise.all([
      api<RequestsResponse>("/api/requests"),
      api<NotificationsResponse>("/api/notifications"),
      api<{ rooms: RoomSummary[] }>("/api/rooms"),
    ]);
    setReqs(r);
    setNotif(n);
    setRooms(rm.rooms);
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

  // 누가 무엇을 했는지 시간순으로 모은다
  const items: Activity[] = [];
  for (const r of reqs?.received ?? []) {
    if (r.status === "pending")
      items.push({
        key: `rp-${r.id}`,
        at: r.created_at,
        who: r.other,
        highlight: true,
        text: (
          <>
            <b>{r.other.nickname}</b>님이 수강신청을 보냈어요{r.message ? ` · “${r.message}”` : ""}
          </>
        ),
        action: [
          { label: busy === r.id ? "…" : "승인", onClick: () => respond(r, "accept"), tone: "primary" },
          { label: "반려", onClick: () => respond(r, "reject"), tone: "muted" },
        ],
      });
    else
      items.push({
        key: `rd-${r.id}`,
        at: r.responded_at ?? r.created_at,
        who: r.other,
        text: (
          <>
            <b>{r.other.nickname}</b>님의 수강신청을 {r.status === "accepted" ? "승인했어요" : "반려했어요"}
          </>
        ),
        action: r.room_id ? [{ label: "대화", onClick: () => onOpenRoom(r.room_id!) }] : undefined,
      });
  }
  for (const r of reqs?.sent ?? []) {
    items.push({
      key: `s-${r.id}`,
      at: r.responded_at ?? r.created_at,
      who: r.other,
      text:
        r.status === "pending" ? (
          <>
            <b>{r.other.nickname}</b>님에게 수강신청을 보냈어요 · 대기 중
          </>
        ) : r.status === "accepted" ? (
          <>
            <b>{r.other.nickname}</b>님이 수강 승인했어요 ♥
          </>
        ) : (
          <>
            <b>{r.other.nickname}</b>님이 수강 반려했어요
          </>
        ),
      action: r.room_id ? [{ label: "대화", onClick: () => onOpenRoom(r.room_id!) }] : undefined,
    });
  }
  for (const room of rooms) {
    if (room.unread > 0 && room.last_message && !room.ended)
      items.push({
        key: `m-${room.id}`,
        at: room.last_message.created_at,
        who: room.other,
        highlight: true,
        text: (
          <>
            <b>{room.other.nickname}</b>
            {room.last_message.type === "ai" ? " 강의실에 AI 조교 메시지가 왔어요" : `님이 메시지를 보냈어요 (${room.unread})`}
          </>
        ),
        action: [{ label: "보기", onClick: () => onOpenRoom(room.id), tone: "primary" }],
      });
  }
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return (
    <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 overflow-y-auto pb-10 pt-10 lg:block xl:w-[320px]">
      {/* 내 프로필 */}
      {me && (
        <div className="flex items-center gap-3">
          <Avatar big />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold">{me.nickname}</p>
            <p className="truncate text-sm text-ink-soft">
              {me.department_name} · {me.year}학년
            </p>
          </div>
          <Link href="/profile" className="shrink-0 text-xs font-bold text-primary-strong">
            학생증
          </Link>
        </div>
      )}

      {notif?.rematch?.length ? (
        <div className="mt-6 rounded-2xl bg-surface p-3.5">
          <p className="text-sm font-bold">✨ 매칭을 다시 시작할까요?</p>
          <p className="mt-0.5 text-xs text-ink-soft">{notif.rematch[0].other_nickname}님과의 강의가 수강 철회로 끝났어요.</p>
          <button
            type="button"
            onClick={async () => {
              await api("/api/recommendations", { method: "POST", json: { rematch: true } });
              router.push("/recommendations");
            }}
            className="mt-2 text-sm font-bold text-primary-strong"
          >
            네, 다시 매칭해 주세요 →
          </button>
        </div>
      ) : null}

      <div className="mt-7 flex items-center justify-between">
        <p className="text-sm font-bold text-ink-soft">내 활동</p>
        <Link href="/notifications" className="text-xs font-bold text-ink hover:text-primary-strong">
          모두 보기
        </Link>
      </div>

      {!reqs ? (
        <p className="mt-4 text-sm text-ink-soft">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">아직 오고 간 수강신청이 없어요.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {items.slice(0, 8).map((it) => (
            <li key={it.key} className={`flex items-center gap-3 rounded-xl px-1 py-2 ${it.highlight ? "bg-surface/60" : ""}`}>
              <Avatar />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] leading-snug">{it.text}</p>
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  {it.who.department_name} · {timeAgo(it.at)}
                </p>
              </div>
              {it.action && (
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {it.action.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      disabled={busy !== null}
                      onClick={a.onClick}
                      className={`text-xs font-bold ${a.tone === "muted" ? "text-ink-soft" : "text-primary-strong"} hover:underline disabled:opacity-50`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-[11px] leading-relaxed text-ink-soft/80">
        교양필수 · 2026학년도 2학기 실제 개설 교양 기반
        <br />© 2026 교양필수 · 바이브코딩 대회 출품작
      </p>
    </aside>
  );
}
