// 학과 목록 원본(md) → data/departments.json 변환
// 사용법: node scripts/convert-departments.mjs
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(new URL("../data/departments/인천대_학과목록.md", import.meta.url), "utf8");
const departments = [];
let college = null;
for (const line of src.split(/\r?\n/)) {
  const h = line.match(/^##\s+(.+)$/);
  if (h) { college = h[1].trim(); continue; }
  const d = line.match(/^-\s+(.+)$/);
  if (d && college) {
    const name = d[1].trim();
    departments.push({ id: `dept-${String(departments.length + 1).padStart(3, "0")}`, name, college });
  }
}
writeFileSync(
  new URL("../data/departments.json", import.meta.url),
  JSON.stringify({ source: "인천대학교 홈페이지 단과대학 소개", departments }, null, 1),
);
console.log(`departments: ${departments.length}, colleges: ${new Set(departments.map((d) => d.college)).size}`);
