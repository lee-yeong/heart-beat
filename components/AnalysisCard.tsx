import type { AcademicAnalysis, AiSource } from "@/lib/types";
import { Badge } from "./ui";

/** AI 학사 분석 카드 */
export function AnalysisCard({ analysis, source }: { analysis: AcademicAnalysis | null; source: AiSource | null }) {
  return (
    <section className="rounded-[20px] border border-line bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>✨ AI 학사 분석</Badge>
        {source === "fallback" && <Badge tone="gray">기본 분석</Badge>}
      </div>
      {!analysis ? (
        <p className="mt-3 text-[15px] text-ink-soft">분석 결과가 아직 없어요.</p>
      ) : (
        <>
          <p className="mt-4 text-lg font-bold leading-snug md:text-xl">&ldquo;{analysis.summary}&rdquo;</p>
          <dl className="mt-5 space-y-4 text-[15px] leading-relaxed">
            <div>
              <dt className="mb-1 text-xs font-semibold text-primary">전공으로 본 나</dt>
              <dd>{analysis.major_lens}</dd>
            </div>
            <div>
              <dt className="mb-1.5 text-xs font-semibold text-primary">대표 성향</dt>
              <dd className="flex flex-wrap gap-2">
                {analysis.personal_traits.map((t) => (
                  <span key={t} className="rounded-xl bg-surface px-3 py-1.5 text-sm">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-semibold text-primary">대화 스타일</dt>
              <dd>{analysis.conversation_style}</dd>
            </div>
          </dl>
          {source === "fallback" && (
            <p className="mt-4 text-xs text-ink-soft">AI 분석을 불러오지 못해 기본 분석을 표시합니다.</p>
          )}
        </>
      )}
    </section>
  );
}
