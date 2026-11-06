/**
 * 교양필수 로고 (팀 스케치 기준): 끝이 사선으로 잘린 파스텔 핑크 INU 글자
 * + N 오른쪽 위 두꺼운 꺾쇠 화살촉 + N 왼쪽 아래 왼쪽 아래를 향한 큰 하트.
 * 학교 로고 원본 파일을 쓰지 않고 도형으로 새로 그렸다. (학교 로고 사용 규정은 별도 확인 필요)
 */
const LETTER = "#F9B8CD"; // 연한 파스텔 핑크
const ACCENT = "#EC2D75"; // 진한 핑크

export function LogoMark({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="50 44 418 236" className={className} role="img" aria-label="교양필수 로고">
      <g fill={LETTER}>
        {/* I: 위는 살짝 벌어지고 아래는 사선으로 잘림 */}
        <path d="M60 90 H106 L98 104 V196 L68 226 V104 Z" />
        {/* N */}
        <path d="M165 132 L204 98 L238 172 V98 H268 V218 L240 246 L198 156 L193 156 V228 H165 Z" />
        {/* U: 왼쪽 위 사선, 오른쪽 위 살짝 벌어짐 */}
        <path d="M340 118 L368 90 V170 A25 25 0 0 0 418 170 V90 H458 L452 104 V175 A56 55 0 0 1 340 175 Z" />
      </g>

      {/* N 오른쪽 위: 두꺼운 꺾쇠 화살촉 */}
      <path d="M222 82 L258 55 H325 V92 L290 150 V82 Z" fill={ACCENT} />

      {/* N 왼쪽 아래: 왼쪽 아래를 향한 큰 하트 */}
      <path
        d="M0 11 C-7 5 -17 -1 -17 -10 C-17 -16.5 -12 -21 -6.5 -21 C-3.3 -21 -1.2 -19.2 0 -16.5 C1.2 -19.2 3.3 -21 6.5 -21 C12 -21 17 -16.5 17 -10 C17 -1 7 5 0 11 Z"
        fill={ACCENT}
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
        transform="translate(152 228) rotate(45) scale(2.5)"
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
