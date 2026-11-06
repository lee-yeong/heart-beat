"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApplySheet } from "@/components/ApplySheet";
import { AppShell } from "@/components/AppShell";
import { ConsultPanel } from "@/components/ConsultPanel";
import { DemoQR } from "@/components/DemoQR";
import { RecommendationCard } from "@/components/RecommendationCard";
import { StepLoader } from "@/components/StepLoader";
import { api } from "@/lib/api-client";
import type { RecommendationItem, RecommendationsResponse } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import { usePoll } from "@/lib/use-poll";

const STEPS = ["전공 분석 중", "성향 비교 중", "추천 근거 작성 중"];

export default function RecommendationsPage() {
  const { me, setMe } = useMe();
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [applying, setApplying] = useState<RecommendationItem | null>(null);
  const [consulting, setConsulting] = useState(false);
  const refillTried = useRef(false);

  const post = useCallback(async (json: Record<string, unknown>, msg?: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<RecommendationsResponse>("/api/recommendations", { method: "POST", json });
      setData(r);
      if (msg) setNotice(msg);
      return r;
    } catch (e) {
      setError(e instanceof Error ? e.message : "추천을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!me) return;
    api<RecommendationsResponse>("/api/recommendations")
      .then((r) => {
        if (r.generated) setData(r);
        else post({});
      })
      .catch((e) => setError(e?.message ?? "추천을 불러오지 못했어요."));
  }, [me, post]);

  // 승인 대기 중이면 5초마다 상대의 응답(승인·반려)을 확인
  usePoll(
    async () => {
      const r = await api<RecommendationsResponse>("/api/recommendations");
      if (r.generated) setData(r);
    },
    5000,
    !!data?.pending_request && !loading,
  );

  // 반려 등으로 카드가 3장보다 적어지면 AI가 빈자리를 새로 채운다 (페이지당 1번)
  useEffect(() => {
    if (!data?.generated || loading || data.pending_request || refillTried.current) return;
    const open = data.items.filter((i) => i.request?.status !== "accepted").length;
    if (open >= 3) return;
    refillTried.current = true;
    post({ refill: true }).then((r) => {
      if (r?.added) setNotice(`반려된 자리에 AI가 새로운 학생 ${r.added}명을 추천했어요 ♥`);
    });
  }, [data, loading, post]);

  const actionFor = (item: RecommendationItem) => {
    const base = "flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold transition";
    if (item.request?.status === "accepted" && item.request.room_id)
      return (
        <Link href={`/rooms/${item.request.room_id}`} className={`${base} bg-ink text-white hover:bg-black`}>
          수강 승인 완료 ♥ 강의실 입장
        </Link>
      );
    if (item.request?.status === "pending")
      return (
        <div className={`${base} border-2 border-primary bg-surface text-primary-strong`}>
          <span className="mr-2 h-2 w-2 animate-ping rounded-full bg-primary" />
          수강신청 승인 대기 중
        </div>
      );
    const blockedByPending = !!data?.pending_request;
    return (
      <button
        type="button"
        disabled={blockedByPending}
        onClick={() => setApplying(item)}
        className={`${base} bg-primary text-white shadow-[0_6px_18px_rgba(255,107,154,0.3)] hover:bg-primary-strong disabled:bg-primary-soft disabled:shadow-none`}
      >
        {blockedByPending ? "다른 수강신청 승인 대기 중" : "수강신청"}
      </button>
    );
  };

  return (
    <AppShell wide>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">2026학년도 2학기</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">AI 추천 수강 목록</h1>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            {me ? `${me.department_name} ${me.nickname}님과` : "당신과"} 잘 맞을 다른 과 학생을 AI가 골랐어요.
          </p>
        </div>
        {data?.generated && !loading && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setConsulting(true)} className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-strong">
              ✨ AI 조교와 상담하기
            </button>
            <button type="button" onClick={() => post({ refresh: true })} className="rounded-full border border-primary-soft px-4 py-2 text-sm font-medium text-primary-strong hover:bg-surface">
              ↻ 다시 추천
            </button>
          </div>
        )}
      </header>

      {me?.match_preference && !loading && (
        <p className="mt-4 rounded-xl bg-surface px-4 py-2.5 text-sm">
          <b className="text-primary-strong">상담 반영 중 ·</b> {me.match_preference}
        </p>
      )}
      {notice && !loading && <p className="mt-4 rounded-xl border border-primary-soft bg-white px-4 py-3 text-sm text-primary-strong">♥ {notice}</p>}
      {data?.pending_request && !loading && (
        <p className="mt-4 rounded-xl border border-primary-soft bg-surface px-4 py-3 text-sm text-primary-strong">
          ♥ 수강신청 승인 대기 중이에요. 상대가 승인하거나 반려하면 다른 학생에게 신청할 수 있어요.
        </p>
      )}
      {data?.source === "fallback" && !loading && (
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-ink-soft">AI 분석을 불러오지 못해 기본 추천을 표시합니다.</p>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6">
        {loading || (!data && !error) ? (
          <div className="flex justify-center py-10">
            <StepLoader title="AI 학사 분석 중" steps={STEPS} />
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="rounded-[22px] border border-line bg-white px-6 py-16 text-center">
            <p className="text-4xl">🌸</p>
            <p className="mt-3 font-semibold">아직 추천할 수 있는 다른 과 학생이 없어요.</p>
            <p className="mt-1 text-sm text-ink-soft">새 학생이 등록되면 다시 추천받아 보세요.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data?.items.map((item) => (
              <RecommendationCard
                key={item.candidate.id}
                item={item}
                action={
                  <>
                    {actionFor(item)}
                    {data.demo_mode && item.candidate.is_seed && <DemoQR profileId={item.candidate.id} nickname={item.candidate.nickname} />}
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

      {applying && (
        <ApplySheet
          item={applying}
          onClose={() => setApplying(null)}
          onSent={async () => {
            setApplying(null);
            setData(await api<RecommendationsResponse>("/api/recommendations"));
            setNotice("수강신청을 보냈어요! 상대가 승인하면 강의실이 열려요.");
          }}
        />
      )}
      {consulting && data && (
        <ConsultPanel
          items={data.items}
          onClose={() => setConsulting(false)}
          onRematch={async (preference) => {
            setConsulting(false);
            refillTried.current = true;
            if (me) setMe({ ...me, match_preference: preference });
            await post({ refresh: true, preference }, "상담 내용을 반영해 AI가 새로 추천했어요 ♥");
          }}
        />
      )}
    </AppShell>
  );
}
