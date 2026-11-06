"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AnalysisCard } from "@/components/AnalysisCard";
import { AppShell } from "@/components/AppShell";
import { ProfileCard } from "@/components/ProfileCard";
import { useMe } from "@/lib/use-me";

function ProfileContent() {
  const { me, error } = useMe();
  const params = useSearchParams();
  const isNew = params.get("new") === "1";
  const updated = params.get("updated") === "1";

  if (error) return <p className="py-20 text-center text-ink-soft">{error}</p>;
  if (!me) return <p className="py-20 text-center text-ink-soft">불러오는 중…</p>;

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">{isNew ? "학생증 발급 완료 ♥" : updated ? "학생증을 수정했어요 ♥" : "내 학생증"}</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{me.nickname}님의 학생증</h1>
        </div>
        <Link href="/profile/edit" className="shrink-0 rounded-xl border border-primary-soft bg-white px-4 py-2.5 text-sm font-bold text-primary-strong hover:bg-surface">
          ✏️ 학생증 수정
        </Link>
      </div>

      <div className="mt-6 grid gap-6">
        <div className="animate-pop-in">
          <ProfileCard profile={me} />
        </div>
        <div className="animate-pop-in space-y-4" style={{ animationDelay: "0.1s" }}>
          <AnalysisCard analysis={me.ai_analysis} source={me.ai_analysis_source} />
          <Link
            href="/recommendations"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-[0_6px_18px_rgba(255,107,154,0.35)] transition hover:bg-primary-strong"
          >
            AI 추천 수강 목록 보기 ♥
          </Link>
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <AppShell>
      <Suspense>
        <ProfileContent />
      </Suspense>
    </AppShell>
  );
}
