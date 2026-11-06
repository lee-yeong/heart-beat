/**
 * 교양필수 로고: 파스텔 핑크 INU 글자 + N 왼쪽 아래 하트 + N 오른쪽 위 화살촉 (큐피드 화살).
 * 학교 로고 원본 파일을 쓰지 않고 도형으로 새로 그렸다. (학교 로고 사용 규정은 별도 확인 필요)
 */
const LETTER = "#F9B8CD"; // 연한 파스텔 핑크
const ACCENT = "#EC2D75"; // 진한 핑크

export function LogoMark({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 232 120" className={className} role="img" aria-label="교양필수 로고">
      {/* I */}
      <rect x="14" y="24" width="22" height="72" rx="4" fill={LETTER} />
      {/* N */}
      <path d="M58 96 V28 a4 4 0 0 1 4-4 H76 L104 66 V24 H124 V92 a4 4 0 0 1-4 4 H106 L78 54 V96 Z" fill={LETTER} />
      {/* U */}
      <path d="M146 28 a4 4 0 0 1 4-4 H166 V64 A16 16 0 0 0 198 64 V24 H214 a4 4 0 0 1 4 4 V64 A36 32 0 0 1 146 64 Z" fill={LETTER} />

      {/* 화살: N 오른쪽 위로 날아가는 화살대 + 화살촉 */}
      <line x1="114" y1="40" x2="141" y2="13" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
      <line x1="114" y1="40" x2="141" y2="13" stroke={ACCENT} strokeWidth="6" strokeLinecap="round" />
      <path d="M155 1 L128 6 a3 3 0 0 0-1.6 5 L145 29.6 a3 3 0 0 0 5-1.6 Z" fill={ACCENT} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />

      {/* 하트: N 왼쪽 아래 */}
      <path
        d="M0 11 C-7 5 -17 -1 -17 -10 C-17 -16.5 -12 -21 -6.5 -21 C-3.3 -21 -1.2 -19.2 0 -16.5 C1.2 -19.2 3.3 -21 6.5 -21 C12 -21 17 -16.5 17 -10 C17 -1 7 5 0 11 Z"
        fill={ACCENT}
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinejoin="round"
        transform="translate(56 98) rotate(-28) scale(1.25)"
      />
    </svg>
  );
}

/** 로고 + 교양필수 글자 (세로 배치) */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const mark = { sm: "h-9", md: "h-12", lg: "h-20 md:h-28" }[size];
  const text = { sm: "text-sm", md: "text-xl", lg: "text-[40px] md:text-6xl" }[size];
  return (
    <span className="inline-flex flex-col items-start">
      <LogoMark className={`${mark} w-auto`} />
      <span className={`${text} mt-1 font-extrabold leading-none tracking-tight`}>
        교양<span className="text-primary">필수</span>
      </span>
    </span>
  );
}
