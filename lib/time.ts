// Postgres timestamptz는 마이크로초까지 있다. JS Date는 밀리초까지만 다뤄서
// 읽음 비교가 어긋날 수 있으므로 마이크로초 단위 숫자로 바꿔 비교한다.
export function toMicros(ts: string): number {
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return NaN;
  const frac = ts.match(/\.(\d+)/)?.[1] ?? "";
  const micros = Number((frac + "000000").slice(3, 6)); // 밀리초 아래 3자리
  return Math.floor(ms) * 1000 + micros;
}

export const isAtOrBefore = (a: string, b: string) => toMicros(a) <= toMicros(b);

/** 말풍선 옆 시각 (오후 3:05) */
export function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}
