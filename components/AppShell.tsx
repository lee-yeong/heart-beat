"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, loadSession } from "@/lib/api-client";
import type { NotificationsResponse } from "@/lib/types";
import { usePoll } from "@/lib/use-poll";

export const TABS = [
  { href: "/recommendations", label: "AI 추천 수강", short: "추천", icon: "♥" },
  { href: "/notifications", label: "알림", short: "알림", icon: "🔔" },
  { href: "/rooms", label: "강의실", short: "강의실", icon: "💬" },
  { href: "/profile", label: "학생증", short: "학생증", icon: "🎓" },
];

/** 5초마다 알림 배지 수를 가져온다 */
function useBadge() {
  const [badge, setBadge] = useState(0);
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => setHasSession(!!loadSession()), []);
  usePoll(
    async () => {
      const r = await api<NotificationsResponse>("/api/notifications");
      setBadge(r.badge);
    },
    5000,
    hasSession,
  );
  return badge;
}

function BadgeDot({ n, className }: { n: number; className: string }) {
  if (n <= 0) return null;
  return (
    <span className={`absolute min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-4 text-white ring-2 ring-white ${className}`}>
      {n > 9 ? "9+" : n}
    </span>
  );
}

/**
 * 탭 화면 공통 레이아웃.
 * - PC(md 이상): 인스타그램 PC처럼 왼쪽 고정 사이드바 + 화면을 넓게 쓰는 본문
 * - 모바일: 하단 탭바 (bare 모드에서는 숨김 — 채팅 화면용)
 */
export function AppShell({ children, wide = false, bare = false }: { children: ReactNode; wide?: boolean; bare?: boolean }) {
  const path = usePathname();
  const badge = useBadge();

  return (
    <div className="flex min-h-dvh w-full">
      {/* PC 사이드바 */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-8 md:flex xl:w-72">
        <Link href="/" className="px-3 text-2xl font-extrabold tracking-tight">
          교양<span className="text-primary">필수</span>
        </Link>
        <p className="mt-1 px-3 text-xs text-ink-soft">우리 사이엔 무슨 일이 생길까?</p>
        <nav className="mt-10 flex flex-col gap-1">
          {TABS.map((t) => {
            const active = path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex items-center gap-4 rounded-xl px-3 py-3 text-[15px] transition ${
                  active ? "bg-surface font-bold text-primary-strong" : "text-ink hover:bg-surface/60"
                }`}
              >
                <span className="relative w-6 text-center text-xl leading-none">
                  {t.icon}
                  {t.href === "/notifications" && <BadgeDot n={badge} className="-right-2.5 -top-2" />}
                </span>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-surface p-4 text-xs leading-relaxed text-ink-soft">
          2026학년도 2학기
          <br />
          실제 개설 교양 319개 분반 기반
        </div>
      </aside>

      {/* 본문 */}
      <div className="flex min-w-0 flex-1 flex-col bg-white md:bg-[#fffafc]">
        {bare ? (
          children
        ) : (
          <main className={`mx-auto w-full flex-1 px-5 pb-24 pt-6 md:px-10 md:pb-12 md:pt-12 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
            {children}
          </main>
        )}
      </div>

      {/* 모바일 하단 탭 */}
      {!bare && (
        <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {TABS.map((t) => {
            const active = path.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active ? "text-primary" : "text-ink-soft"}`}
              >
                <span className="relative text-lg leading-none">
                  {t.icon}
                  {t.href === "/notifications" && <BadgeDot n={badge} className="-right-3 -top-1.5" />}
                </span>
                {t.short}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
