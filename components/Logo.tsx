/**
 * 교양필수 로고: 팀이 만든 INU 큐피드 로고 이미지 (public/logo.png).
 * 원본에서 배경을 투명하게 하고 사이트 색(파스텔 핑크 #F9B8CD, 진한 핑크 #EC2D75)으로 보정했다.
 * 학교 로고를 바탕으로 한 디자인이므로 학교 로고 사용 규정은 별도 확인 필요.
 */
export function LogoMark({ className = "h-10 w-auto" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="교양필수 로고" width={1334} height={760} className={`${className} select-none`} draggable={false} />;
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
