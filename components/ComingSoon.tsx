import { AppShell } from "./AppShell";

/** 아직 구현 전인 탭 화면 */
export function ComingSoon({ title, milestone }: { title: string; milestone: string }) {
  return (
    <AppShell>
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <span className="text-5xl">🌸</span>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{milestone}에서 열려요.</p>
      </div>
    </AppShell>
  );
}
