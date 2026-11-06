"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "@/lib/api-client";

const FEATURES = [
  ["🎓", "학적 등록", "버튼만 눌러서 1분이면 끝"],
  ["♥", "AI 추천 수강 목록", "AI가 고른 3명과 그 이유"],
  ["📖", "우리의 강의계획서", "실제 교양으로 만든 첫 만남 계획"],
];

export default function Landing() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 이미 학적 등록을 마쳤다면 추천 화면으로
    if (loadSession()) router.replace("/recommendations");
    else setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <main className="flex min-h-dvh w-full bg-gradient-to-b from-surface via-white to-white md:items-center md:bg-gradient-to-br md:from-surface md:via-white md:to-[#ffe9f1]">
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 pb-8 pt-16 md:grid-cols-2 md:items-center md:gap-16 md:px-12 md:py-16">
        {/* 왼쪽: 컨셉 */}
        <section className="animate-pop-in">
          <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            2026학년도 2학기 개설 ♥
          </span>
          <h1 className="mt-5 text-[40px] font-extrabold leading-tight tracking-tight md:text-6xl">
            교양<span className="text-primary">필수</span>
          </h1>
          <p className="mt-3 text-xl font-semibold leading-snug md:mt-5 md:text-3xl">
            우리 사이엔
            <br />
            무슨 일이 생길까?
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft md:mt-6 md:text-lg">
            2학년부터는 과팅도 없고, 다른 과 사람을 만날 계기가 없죠.
            <br className="hidden md:block" /> AI가 당신의 전공과 &lsquo;전공 밖의 나&rsquo;를 분석해
            <br className="hidden md:block" /> 잘 맞을 다른 과 학생을 이어드려요.
          </p>
        </section>

        {/* 오른쪽: 시작 카드 */}
        <section className="flex flex-col md:rounded-[28px] md:border md:border-line md:bg-white md:p-10 md:shadow-[0_20px_60px_rgba(255,107,154,0.18)]">
          <h2 className="hidden text-2xl font-bold md:block">이번 학기, 다른 과 친구 수강신청 ♥</h2>
          <ol className="space-y-3 md:mt-6">
            {FEATURES.map(([icon, title, sub], i) => (
              <li
                key={title}
                className="animate-pop-in flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3.5"
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lg text-primary">
                  {icon}
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-ink-soft">{sub}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-auto pt-10 md:pt-8">
            <Link
              href="/register"
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-[0_6px_18px_rgba(255,107,154,0.35)] transition hover:bg-primary-strong"
            >
              학적 등록하기
            </Link>
            <p className="mt-3 text-center text-xs text-ink-soft">
              학교 이메일 인증은 준비 중이에요. 지금은 닉네임으로 시연용 등록을 해요.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
