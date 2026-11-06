import data from "@/data/departments.json";
import type { Department } from "./types";

export const DEPARTMENTS: Department[] = data.departments;

export function findDepartment(id: string | null | undefined): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}

/** 공백을 무시하고 학과명·단과대학명으로 검색 */
export function searchDepartments(query: string): Department[] {
  const q = query.replace(/\s+/g, "").toLowerCase();
  if (!q) return DEPARTMENTS;
  return DEPARTMENTS.filter((d) =>
    (d.name + d.college).replace(/\s+/g, "").toLowerCase().includes(q),
  );
}
