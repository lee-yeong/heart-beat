"use client";

import type { ProfileInput } from "./types";

// 학적 등록 중간 입력을 브라우저에 임시 보관한다 (새로고침해도 이어서 입력).
const DRAFT_KEY = "gyoyang.registerDraft";

export type Draft = Partial<ProfileInput> & { step?: number };

export function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : {};
  } catch {
    return {};
  }
}

export function saveDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem("gyoyang.localProfile"); // M1 임시 저장값 정리
  } catch {}
}
