"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api, clearSession, saveSession } from "@/lib/api-client";
import type { Session } from "@/lib/types";
import { useMe } from "@/lib/use-me";

const input = "h-12 w-full rounded-xl border-2 border-line px-4 text-[15px] outline-none focus:border-primary";

export default function SettingsPage() {
  const router = useRouter();
  const { me, setMe } = useMe();

  // 로그인 정보
  const [loginId, setLoginId] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [credMsg, setCredMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // 회원탈퇴
  const [leaving, setLeaving] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [leaveErr, setLeaveErr] = useState<string | null>(null);

  const saveCredentials = async () => {
    if (!me) return;
    if (password !== password2) return setCredMsg({ ok: false, text: "새 비밀번호가 서로 달라요." });
    setBusy(true);
    setCredMsg(null);
    try {
      const r = await api<{ session: Session; login_id: string }>("/api/auth/credentials", {
        method: "POST",
        json: { login_id: me.has_password ? me.login_id : loginId, password, current_password: current },
      });
      saveSession(r.session);
      setMe({ ...me, login_id: r.login_id, has_password: true });
      setCurrent("");
      setPassword("");
      setPassword2("");
      setCredMsg({ ok: true, text: me.has_password ? "비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요." : "아이디를 만들었어요. 이제 다른 기기에서도 로그인할 수 있어요." });
    } catch (e) {
      setCredMsg({ ok: false, text: e instanceof Error ? e.message : "저장하지 못했어요." });
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    if (!confirm_("로그아웃할까요?")) return;
    clearSession();
    router.push("/");
  };

  const leave = async () => {
    setLeaveErr(null);
    try {
      await api("/api/profiles/me", { method: "DELETE", json: { confirm } });
      clearSession();
      alert("탈퇴했어요. 그동안 교양필수를 이용해 주셔서 고마워요.");
      router.push("/");
    } catch (e) {
      setLeaveErr(e instanceof Error ? e.message : "탈퇴하지 못했어요.");
    }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold md:text-3xl">설정</h1>
      {!me ? (
        <p className="py-16 text-center text-ink-soft">불러오는 중…</p>
      ) : (
        <div className="mt-6 space-y-5">
          {/* 학생증 */}
          <Section title="학생증">
            <Row label="닉네임" value={`${me.nickname} · ${me.department_name} ${me.year}학년`} />
            <Link href="/profile/edit" className="mt-3 flex h-12 items-center justify-center rounded-xl bg-primary font-bold text-white hover:bg-primary-strong">
              학생증 수정하기
            </Link>
          </Section>

          {/* 로그인 정보 */}
          <Section title={me.has_password ? "로그인 정보" : "로그인 정보 만들기"}>
            {me.is_seed ? (
              <p className="text-sm text-ink-soft">시연용 계정은 /demo 페이지로 들어와요.</p>
            ) : (
              <div className="space-y-2.5">
                {me.has_password ? (
                  <Row label="아이디" value={me.login_id ?? "-"} />
                ) : (
                  <>
                    <p className="text-sm text-ink-soft">아이디를 만들어 두면 다른 기기에서도 로그인할 수 있어요.</p>
                    <input value={loginId} onChange={(e) => setLoginId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))} placeholder="아이디 (영문 소문자·숫자·_ 4~20자)" autoComplete="username" className={input} />
                  </>
                )}
                {me.has_password && <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="현재 비밀번호" autoComplete="current-password" className={input} />}
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value.slice(0, 64))} placeholder={me.has_password ? "새 비밀번호 (6자 이상)" : "비밀번호 (6자 이상)"} autoComplete="new-password" className={input} />
                <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value.slice(0, 64))} placeholder="비밀번호 확인" autoComplete="new-password" className={input} />
                {credMsg && <p className={`rounded-xl px-4 py-2.5 text-sm ${credMsg.ok ? "bg-surface text-primary-strong" : "bg-red-50 text-red-600"}`}>{credMsg.text}</p>}
                <button
                  type="button"
                  onClick={saveCredentials}
                  disabled={busy || password.length < 6 || (!me.has_password && loginId.length < 4) || (me.has_password && !current)}
                  className="h-12 w-full rounded-xl border-2 border-primary font-bold text-primary-strong hover:bg-surface disabled:border-line disabled:text-ink-soft"
                >
                  {busy ? "저장 중…" : me.has_password ? "비밀번호 바꾸기" : "아이디·비밀번호 만들기"}
                </button>
              </div>
            )}
          </Section>

          {/* 계정 */}
          <Section title="계정">
            <button type="button" onClick={logout} className="flex h-12 w-full items-center justify-between rounded-xl px-1 text-[15px] hover:bg-surface/60">
              로그아웃 <span className="text-ink-soft">›</span>
            </button>
            {!me.is_seed && (
              <>
                <div className="my-1 border-t border-line" />
                {!leaving ? (
                  <button type="button" onClick={() => setLeaving(true)} className="flex h-12 w-full items-center justify-between rounded-xl px-1 text-[15px] text-red-600 hover:bg-red-50">
                    회원탈퇴 <span>›</span>
                  </button>
                ) : (
                  <div className="space-y-2.5 rounded-xl bg-red-50/60 p-4">
                    <p className="text-sm font-semibold text-red-600">정말 탈퇴할까요? 되돌릴 수 없어요.</p>
                    <p className="text-xs text-ink-soft">학생증, 추천, 수강신청, 강의실과 메시지가 모두 지워지고 상대의 강의실에서도 사라져요. 확인을 위해 닉네임 “{me.nickname}”을 입력해 주세요.</p>
                    <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={me.nickname} className={input} />
                    {leaveErr && <p className="text-sm text-red-600">{leaveErr}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setLeaving(false)} className="h-11 rounded-xl border-2 border-line font-semibold text-ink-soft">
                        취소
                      </button>
                      <button type="button" onClick={leave} disabled={confirm !== me.nickname} className="h-11 rounded-xl bg-red-500 font-bold text-white disabled:bg-red-200">
                        탈퇴하기
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>
        </div>
      )}
    </AppShell>
  );
}

const confirm_ = (msg: string) => (typeof window !== "undefined" ? window.confirm(msg) : false);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line bg-white p-5">
      <h2 className="mb-3 text-sm font-bold text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[15px]">
      <span className="text-ink-soft">{label}</span>
      <span className="truncate font-semibold">{value}</span>
    </div>
  );
}
