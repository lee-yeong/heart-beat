"use client";

import { useEffect, useRef } from "react";

/**
 * 일정 간격으로 fn을 호출한다.
 * - 이전 호출이 끝나기 전에는 겹쳐 부르지 않는다.
 * - 탭이 숨겨지면 멈추고, 다시 보이면 즉시 한 번 부른다.
 */
export function usePoll(fn: () => Promise<unknown>, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const tick = async () => {
      if (stopped || running || document.hidden) return schedule();
      running = true;
      try {
        await fnRef.current();
      } catch {
        /* 다음 주기에 다시 시도 */
      } finally {
        running = false;
        schedule();
      }
    };
    const schedule = () => {
      if (stopped) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, intervalMs);
    };
    const onVisible = () => {
      if (!document.hidden) tick();
    };

    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, enabled]);
}
