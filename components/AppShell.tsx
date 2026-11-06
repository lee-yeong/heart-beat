"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, loadSession } from "@/lib/api-client";
import type { NotificationsResponse } from "@/lib/types";
import { usePoll } from "@/lib/use-poll";
import { BellIcon, HeartIcon, IdCardIcon, SendIcon } from "./icons";
import { LogoMark } from "./Logo";
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
      {/* PC 왼쪽 메뉴: 평소엔 로고와 아이콘만 보이게 접혀 있고, 마우스를 올리면 펼쳐진다 */}
      <div className="sticky top-0 z-30 hidden h-dvh w-[84px] shrink-0 md:block">
        <aside className="group/nav absolute inset-y-0 left-0 flex w-[84px] flex-col overflow-hidden border-r border-line bg-white px-3 py-6 transition-[width,box-shadow] duration-200 ease-out hover:w-64 hover:shadow-[8px_0_30px_rgba(0,0,0,0.08)] focus-within:w-64">
          <Link href="/" className="flex h-14 shrink-0 items-center px-1.5" title="교양필수 홈">
            {/* 접혔을 때: 로고만 / 펼쳤을 때: 로고 + 교양필수 */}
            <span className="flex flex-col items-start">
              <LogoMark className="h-9 w-auto" />
              <span className="mt-1 whitespace-nowrap text-lg font-extrabold leading-none tracking-tight opacity-0 transition-opacity duration-150 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100">
                교양<span className="text-primary">필수</span>
              </span>
            </span>
          </Link>
          <nav className="flex flex-1 flex-col justify-center gap-1.5">
            {TABS.map(({ href, label, Icon }) => {
              const active = path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={`flex h-12 items-center gap-4 whitespace-nowrap rounded-2xl px-[17px] transition ${
                    active ? "bg-surface font-bold text-primary-strong" : "text-ink hover:bg-surface/70"
                  }`}
                >
                  <span className="relative shrink-0">
                    <Icon active={active} className="h-[26px] w-[26px]" />
                    {href === "/notifications" && <BadgeDot n={badge} className="-right-2.5 -top-2" />}
                  </span>
                  <span className="text-[15px] opacity-0 transition-opacity duration-150 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100">{label}</span>
                </Link>
              );
            })}
          </nav>
          <p className="whitespace-nowrap px-1.5 text-[11px] leading-relaxed text-ink-soft">
            <span className="group-hover/nav:hidden">26-2</span>
            <span className="hidden group-hover/nav:inline">2026학년도 2학기 · 실제 개설 교양 319개 분반 기반</span>
          </p>
        </aside>
      </div>

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
