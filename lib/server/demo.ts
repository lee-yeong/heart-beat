import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";

/** DEMO_MODE가 켜져 있고 비밀코드가 맞는지 확인 */
export function requireDemo(secret: unknown) {
  if (process.env.DEMO_MODE !== "true") throw new HttpError(404, "Not found");
  const expected = process.env.DEMO_ACCESS_SECRET ?? "";
  const given = typeof secret === "string" ? secret : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(403, "시연 비밀코드가 올바르지 않아요.", "bad_secret");
}

/**
 * 시드 계정용 고정 토큰 비밀값. 비밀코드와 계정 ID로 계산하므로
 * 여러 기기에서 같은 시드 계정으로 들어가도 서로 로그아웃되지 않는다.
 */
export const seedSecret = (profileId: string) =>
  createHmac("sha256", process.env.DEMO_ACCESS_SECRET ?? "").update(`seed:${profileId}`).digest("base64url");
