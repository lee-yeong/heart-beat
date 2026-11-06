"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, saveSession } from "@/lib/api-client";
import type { PublicProfile, Session } from "@/lib/types";

const SECRET_KEY = "gyoyang.demoSecret";
const readSecret = () => {
  try {
    return localStorage.getItem(SECRET_KEY) ?? "";
  } catch {
    return "";
  }
};

function DemoContent() {
  const router = useRouter();
  const as = useSearchParams().get("as");
  const [secret, setSecret] = useState("");
  const [profiles, setProfiles] = useState<PublicProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const login = useCallback(
    async (s: string, profileId: string) => {
      setBusy(profileId);
      try {
        const r = await api<{ session: Session }>("/api/demo/session", { method: "POST", json: { secret: s, profile_id: profileId } });
        saveSession(r.session);
        router.push("/notifications");
      } catch (e) {
        setError(e instanceof Error ? e.message : "로그인하지 못했어요.");
        setBusy(null);
      }
    },
    [router],
  );

  const unlock = useCallback(
    async (s: string) => {
      setError(null);
      try {
        const r = await api<{ profiles: PublicProfile[] }>("/api/demo/session", { method: "POST", json: { secret: s } });
        try {
          localStorage.setItem(SECRET_KEY, s);
        } catch {}
        setProfiles(r.profiles);
        if (as) login(s, as);
      } catch (e) {
        setError(e instanceof Error ? e.message : "비밀코드를 확인해주세요.");
      }
    },
    [as, login],
  );

  useEffect(() => {
    const saved = readSecret();
    if (saved) {
      setSecret(saved);
      unlock(saved);
    }
  }, [unlock]);

  const reset = async () => {
    if (!confirm("시연 데이터를 초기화할까요?\n시드 15명만 남기고 다른 가입자, 모든 수강신청·강의실·메시지가 지워져요. 되돌릴 수 없어요.")) return;
    setBusy("reset");
    try {
      const r = await api<{ removed_users: number }>("/api/demo/reset", { method: "POST", json: { secret } });
      alert(`초기화했어요. (가입자 ${r.removed_users}명 삭제)`);
      try {
        localStorage.removeItem("gyoyang.session");
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "초기화하지 못했어요.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-10">
      <p className="text-sm font-semibold text-primary">🧪 시연 모드</p>
      <h1 className="mt-1 text-2xl font-bold">시연용 계정으로 들어가기</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">가상 시드 학생 15명 중 한 명으로 로그인해 수강신청을 받아볼 수 있어요. 실제 가입자 계정으로는 들어갈 수 없어요.</p>

      {!profiles && (
        <div className="mt-6 flex gap-2">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && unlock(secret)}
            placeholder="시연 비밀코드"
            className="h-12 flex-1 rounded-2xl border-2 border-line px-4 outline-none focus:border-primary"
          />
          <button type="button" onClick={() => unlock(secret)} className="h-12 rounded-2xl bg-primary px-5 font-bold text-white">
            확인
          </button>
        </div>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {as && profiles && busy === as && <p className="mt-6 text-center text-ink-soft">QR로 선택한 계정으로 들어가는 중…</p>}

      {profiles && (
        <>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {profiles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => login(secret, p.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left transition hover:border-primary disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface">🎓</span>
                  <span className="min-w-0">
                    <b className="block truncate">{p.nickname}</b>
                    <span className="block truncate text-xs text-ink-soft">
                      {p.department_name} · {p.year}학년
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={reset} disabled={busy !== null} className="mt-8 text-sm text-red-500 underline underline-offset-4">
            시연 데이터 초기화
          </button>
        </>
      )}
    </main>
  );
}

export default function DemoPage() {
  return (
    <Suspense>
      <DemoContent />
    </Suspense>
  );
}
