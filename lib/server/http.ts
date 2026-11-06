import "server-only";
import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/** API 라우트 공통 래퍼: 오류를 JSON으로 바꾸고 캐시를 막는다. */
export function handler<T extends unknown[]>(fn: (...args: T) => Promise<unknown>) {
  return async (...args: T) => {
    try {
      const body = await fn(...args);
      return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: "unauthorized" }, { status: 401 });
      if (e instanceof HttpError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
      console.error("[api]", e);
      return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 500 });
    }
  };
}
