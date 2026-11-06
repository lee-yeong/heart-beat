"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/ui";
import { api, saveSession } from "@/lib/api-client";
import type { Session } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!loginId || !password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ session: Session }>("/api/auth/login", { method: "POST", json: { login_id: loginId, password } });
      saveSession(r.session);
      router.push("/recommendations");
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인하지 못했어요.");
      setBusy(false);
    }
  };

  const input = "h-14 w-full rounded-2xl border-2 border-line px-4 text-base outline-none focus:border-primary";

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-br from-surface via-white to-[#ffe9f1] px-5 py-10">
      <main className="w-full max-w-md rounded-[28px] border border-line bg-white p-8 shadow-[0_20px_60px_rgba(255,107,154,0.18)]">
        <Link href="/" aria-label="교양필수 홈">
          <Logo size="md" />
        </Link>
        <h1 className="mt-6 text-2xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-ink-soft">학적 등록할 때 만든 아이디로 들어와요.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input value={loginId} onChange={(e) => setLoginId(e.target.value.toLowerCase().trim())} placeholder="아이디" autoComplete="username" autoFocus className={input} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password" className={input} />
          {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
          <div className="pt-2">
            <PrimaryButton type="submit" disabled={!loginId || !password || busy}>
              {busy ? "로그인 중…" : "로그인"}
            </PrimaryButton>
          </div>
        </form>
        <p className="mt-5 text-center text-sm text-ink-soft">
          처음이에요?{" "}
          <Link href="/register" className="font-semibold text-primary-strong underline underline-offset-4">
            학적 등록(회원가입)
          </Link>
        </p>
      </main>
    </div>
  );
}
