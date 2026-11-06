"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProfileCard } from "@/components/ProfileCard";
import { Badge } from "@/components/ui";
import { api } from "@/lib/api-client";
import type { NotificationsResponse, RequestView, RequestsResponse } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import { usePoll } from "@/lib/use-poll";

function timeAgo(ts: string) {
  const s = Math.max(0, (Date.now() - Date.parse(ts)) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { me } = useMe();
  const [data, setData] = useState<RequestsResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rematch, setRematch] = useState<NotificationsResponse["rematch"]>([]);
  const load = useCallback(async () => {
    const [r, n] = await Promise.all([api<RequestsResponse>("/api/requests"), api<NotificationsResponse>("/api/notifications")]);
    setData(r);
    setRematch(n.rematch);
  }, []);
  usePoll(load, 5000, !!me);

  const startRematch = async () => {
    setBusy("rematch");
    try {
      await api("/api/recommendations", { method: "POST", json: { rematch: true } });
      router.push("/recommendations");
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 추천하지 못했어요.");
      setBusy(null);
    }
  };
  const laterRematch = async () => {
    await api("/api/notifications/read", { method: "POST", json: { rematch: "dismiss" } }).catch(() => {});
    setRematch([]);
  };

  // 알림 페이지를 열면 내 요청 결과를 확인한 것으로 기록
  useEffect(() => {
    if (me) api("/api/notifications/read", { method: "POST" }).catch(() => {});
  }, [me, data?.sent.filter((s) => s.status !== "pending").length]);

  const respond = async (r: RequestView, action: "accept" | "reject") => {
    setBusy(r.id);
    setError(null);
    try {
      const res = await api<{ status: string; room_id: string | null }>(`/api/requests/${r.id}/respond`, { method: "POST", json: { action } });
      if (res.status === "accepted" && res.room_id) router.push(`/rooms/${res.room_id}`);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  const pending = data?.received.filter((r) => r.status === "pending") ?? [];
  const history = [
    ...(data?.sent ?? []).map((r) => ({ ...r, dir: "sent" as const })),
    ...(data?.received ?? []).filter((r) => r.status !== "pending").map((r) => ({ ...r, dir: "received" as const })),
  ].sort((a, b) => Date.parse(b.responded_at ?? b.created_at) - Date.parse(a.responded_at ?? a.created_at));

  return (
    <AppShell wide>
      <h1 className="text-2xl font-bold md:text-3xl">알림</h1>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {rematch.length > 0 && (
        <section className="animate-pop-in mt-6 rounded-[22px] border-2 border-primary bg-white p-5 shadow-[0_8px_30px_rgba(255,107,154,0.15)]">
          <p className="text-xs font-bold text-primary">✨ AI 조교</p>
          <p className="mt-1 text-lg font-bold">매칭을 다시 시작할까요?</p>
          <p className="mt-1 text-sm text-ink-soft">
            {rematch[0].ended_by_me ? `${rematch[0].other_nickname}님과의 수강을 철회했어요.` : `${rematch[0].other_nickname}님과의 강의가 수강 철회로 끝났어요.`}{" "}
            괜찮아요! 끝난 상대는 다시 추천하지 않고, 새로운 다른 과 학생을 골라 드릴게요.
          </p>
          <div className="mt-4 grid grid-cols-[1fr_2fr] gap-3">
            <button type="button" onClick={laterRematch} className="h-12 rounded-2xl border-2 border-line font-semibold text-ink-soft">
              나중에
            </button>
            <button type="button" disabled={busy !== null} onClick={startRematch} className="h-12 rounded-2xl bg-primary font-bold text-white disabled:opacity-50">
              {busy === "rematch" ? "AI가 고르는 중…" : "네, 다시 매칭해 주세요 ♥"}
            </button>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          수강 승인 요청
          {pending.length > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{pending.length}</span>}
        </h2>
        {!data ? (
          <p className="py-10 text-center text-ink-soft">불러오는 중…</p>
        ) : pending.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-line bg-white px-5 py-8 text-center text-sm text-ink-soft">
            아직 받은 수강신청이 없어요.
          </p>
        ) : (
          <div className="mt-4 grid gap-5">
            {pending.map((r) => (
              <article key={r.id} className="animate-pop-in rounded-[22px] border-2 border-primary-soft bg-white p-5 shadow-[0_8px_30px_rgba(255,107,154,0.12)]">
                <p className="text-[15px]">
                  <b className="text-primary-strong">{r.other.nickname}</b>님이 수강신청을 보냈어요 ♥
                  <span className="ml-2 text-xs text-ink-soft">{timeAgo(r.created_at)}</span>
                </p>
                {r.message && (
                  <p className="mt-3 rounded-2xl rounded-tl-md bg-primary px-4 py-2.5 text-[15px] text-white">💌 {r.message}</p>
                )}
                <div className="mt-4">
                  <ProfileCard profile={r.other} highlight={r.analysis?.evidence_keywords ?? []} compact />
                </div>
                {r.analysis && (
                  <div className="mt-4 rounded-2xl bg-surface/70 p-4">
                    <Badge>✨ AI 추천 근거</Badge>
                    <p className="mt-2 font-bold">{r.analysis.headline}</p>
                    <p className="mt-1.5 text-sm leading-relaxed">{r.analysis.major_synergy}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.analysis.evidence_keywords.map((k) => (
                        <span key={k} className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                          ♥ {k}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-ink-soft">서로 다를 수 있는 점 · {r.analysis.difference_note}</p>
                  </div>
                )}
                <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => respond(r, "reject")}
                    className="h-12 rounded-2xl border-2 border-line font-semibold text-ink-soft hover:bg-gray-50 disabled:opacity-50"
                  >
                    수강 반려
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => respond(r, "accept")}
                    className="h-12 rounded-2xl bg-primary font-bold text-white shadow-[0_6px_18px_rgba(255,107,154,0.35)] hover:bg-primary-strong disabled:opacity-50"
                  >
                    {busy === r.id ? "처리 중…" : "수강 승인 ♥"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">수강신청 기록</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">아직 기록이 없어요.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
            {history.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-4 text-[15px]">
                <span className="text-xl">{r.status === "accepted" ? "💌" : r.status === "rejected" ? "🍂" : "⏳"}</span>
                <p className="min-w-0 flex-1">
                  {r.dir === "sent" ? (
                    <>
                      <b>{r.other.nickname}</b>님에게 보낸 수강신청이{" "}
                      {r.status === "pending" ? "승인 대기 중이에요." : r.status === "accepted" ? "승인됐어요!" : "반려됐어요."}
                    </>
                  ) : (
                    <>
                      <b>{r.other.nickname}</b>님의 수강신청을 {r.status === "accepted" ? "승인했어요." : "반려했어요."}
                    </>
                  )}
                  <span className="ml-2 text-xs text-ink-soft">{timeAgo(r.responded_at ?? r.created_at)}</span>
                </p>
                {r.status === "accepted" && r.room_id && (
                  <Link href={`/rooms/${r.room_id}`} className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white">
                    강의실
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
