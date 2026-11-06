/**
 * 교양필수 로고: 인천대(INU) 글자를 큐피드 화살이 꿰뚫는 모양.
 * 학교 로고 원본 파일을 쓰지 않고 SVG로 새로 그렸다. (학교 로고 사용 규정은 별도 확인 필요)
 */
export function LogoMark({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 110" className={className} role="img" aria-label="교양필수 로고">
      {/* INU 글자 */}
      <g fill="#F7A9C4" fontFamily="Pretendard Variable, Pretendard, Arial Black, sans-serif" fontWeight="900">
        <text x="14" y="88" fontSize="66">I</text>
        <text x="58" y="88" fontSize="66">N</text>
        <text x="134" y="88" fontSize="66">U</text>
      </g>
      {/* N 왼쪽 아래 노란 꺾쇠 (화살 깃) */}
      <path d="M52 70 L52 100 L82 100" fill="none" stroke="#F5B335" strokeWidth="10" strokeLinejoin="miter" />
      {/* 화살대: N에서 오른쪽 위로, 흰 테두리로 글자와 분리 */}
      <line x1="96" y1="64" x2="176" y2="26" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" />
      <line x1="96" y1="64" x2="176" y2="26" stroke="#E5266E" strokeWidth="6" strokeLinecap="round" />
      {/* 하트 화살촉 (뾰족한 끝이 날아가는 방향) */}
      <path
        d="M0 10 C-14 0 -12 -12 -4 -12 C0 -12 0 -8 0 -6 C0 -8 0 -12 4 -12 C12 -12 14 0 0 10 Z"
        fill="#E5266E"
        transform="translate(188 19) rotate(-116) scale(1.3)"
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
