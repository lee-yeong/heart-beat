"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, loadSession } from "@/lib/api-client";
import type { NotificationsResponse } from "@/lib/types";
import { usePoll } from "@/lib/use-poll";
import { BellIcon, HeartIcon, IdCardIcon, SendIcon } from "./icons";
import { Logo, LogoMark } from "./Logo";
import { MiniMessenger } from "./MiniMessenger";
import { NotificationsPanel } from "./NotificationsPanel";

export const TABS = [
  { href: "/recommendations", label: "AI 추천 수강", short: "추천", Icon: HeartIcon },
  { href: "/notifications", label: "알림", short: "알림", Icon: BellIcon },
  { href: "/rooms", label: "강의실", short: "강의실", Icon: SendIcon },
  { href: "/profile", label: "학생증", short: "학생증", Icon: IdCardIcon },
];

/** 5초마다 알림 배지 수를 가져온다 */
function useBadge(enabled: boolean) {
  const [badge, setBadge] = useState(0);
  usePoll(
    async () => {
      const r = await api<NotificationsResponse>("/api/notifications");
      setBadge(r.badge);
    },
    5000,
    enabled,
  );
  return badge;
}

/** 화면 너비 기준 (md: 768px, xl: 1280px) */
function useWidth() {
  const [w, setW] = useState({ md: false, xl: false });
  useEffect(() => {
    const md = window.matchMedia("(min-width: 768px)");
    const xl = window.matchMedia("(min-width: 1280px)");
    const update = () => setW({ md: md.matches, xl: xl.matches });
    update();
    md.addEventListener("change", update);
    xl.addEventListener("change", update);
    return () => {
      md.removeEventListener("change", update);
      xl.removeEventListener("change", update);
    };
  }, []);
  return w;
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
 * - PC: 왼쪽 아이콘 레일(로고는 왼쪽 위, 메뉴는 세로 가운데, 마우스를 올리면 이름 표시)
 *       + 가운데 본문 + 오른쪽 알림 패널(1280px 이상) + 오른쪽 아래 작은 메시지 창
 * - 모바일: 하단 탭바 (bare 모드에서는 숨김 — 채팅 화면용)
 */
export function AppShell({ children, wide = false, bare = false }: { children: ReactNode; wide?: boolean; bare?: boolean }) {
  const path = usePathname();
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => setHasSession(!!loadSession()), []);
  const badge = useBadge(hasSession);
  const { md, xl } = useWidth();

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgRoom, setMsgRoom] = useState<string | null>(null);
  const openRoom = (id: string) => {
    setMsgRoom(id);
    setMsgOpen(true);
  };

  const inRooms = path.startsWith("/rooms");
  const showPanel = hasSession && xl && !bare && !path.startsWith("/notifications");
  const showMessenger = hasSession && md && !inRooms;

  return (
    <div className="flex min-h-dvh w-full">
      {/* PC 왼쪽 아이콘 레일 */}
      <aside className="sticky top-0 z-30 hidden h-dvh w-24 shrink-0 flex-col items-center border-r border-line bg-white py-6 md:flex">
        <Link href="/" className="self-start pl-4" title="교양필수 홈">
          <Logo size="sm" />
        </Link>
        <nav className="flex flex-1 flex-col items-center justify-center gap-3">
          {TABS.map(({ href, label, Icon }) => {
            const active = path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                  active ? "bg-surface text-primary-strong" : "text-ink hover:bg-surface/70 hover:text-primary-strong"
                }`}
              >
                <span className="relative transition group-hover:scale-110">
                  <Icon active={active} className="h-[26px] w-[26px]" />
                  {href === "/notifications" && <BadgeDot n={badge} className="-right-2.5 -top-2" />}
                </span>
                {/* 마우스를 올리면 메뉴 이름 */}
                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 -translate-x-1 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:translate-x-0 group-hover:opacity-100">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
        <span className="group relative cursor-default text-[10px] text-ink-soft">
          26-2
          <span className="pointer-events-none absolute bottom-0 left-full ml-3 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100">
            2026학년도 2학기 · 실제 개설 교양 319개 분반 기반
          </span>
        </span>
      </aside>

      {/* 본문 */}
      <div className="flex min-w-0 flex-1 flex-col bg-white md:bg-[#fffafc]">
        {bare ? (
          children
        ) : (
          <>
            {/* 모바일 상단 로고 */}
            <header className="flex items-center px-5 pt-4 md:hidden">
              <Link href="/" aria-label="교양필수 홈" className="flex items-center gap-2">
                <LogoMark className="h-8 w-auto" />
                <span className="font-extrabold">
                  교양<span className="text-primary">필수</span>
                </span>
              </Link>
            </header>
            <main className={`mx-auto w-full flex-1 px-5 pb-24 pt-4 md:px-10 md:pb-28 md:pt-12 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>{children}</main>
          </>
        )}
      </div>

      {/* PC 오른쪽 알림 패널 */}
      {showPanel && <NotificationsPanel onOpenRoom={openRoom} />}

      {/* PC 오른쪽 아래 작은 메시지 창 */}
      {showMessenger && (
        <MiniMessenger open={msgOpen} roomId={msgRoom} onOpen={() => setMsgOpen(true)} onClose={() => setMsgOpen(false)} onSelect={setMsgRoom} />
      )}

      {/* 모바일 하단 탭 */}
      {!bare && (
        <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {TABS.map(({ href, short, Icon }) => {
            const active = path.startsWith(href);
            return (
              <Link key={href} href={href} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active ? "text-primary-strong" : "text-ink-soft"}`}>
                <span className="relative">
                  <Icon active={active} className="h-6 w-6" />
                  {href === "/notifications" && <BadgeDot n={badge} className="-right-3 -top-1.5" />}
                </span>
                {short}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
