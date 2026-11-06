// 받침에 따라 조사를 고른다. josa("디자인학부", "과", "와") → "디자인학부와"
export function josa(word: string, withBatchim: string, withoutBatchim: string) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return `${word}${withoutBatchim}`;
  return `${word}${code % 28 ? withBatchim : withoutBatchim}`;
}
