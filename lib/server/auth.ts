import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import type { ProfileRow } from "./profiles";

// 토큰 형식: "<user_id>.<secret>". DB에는 secret의 SHA-256 해시만 저장한다.

export function newSecret() {
  const secret = randomBytes(32).toString("base64url");
  return { secret, hash: hashSecret(secret) };
}

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export const makeToken = (userId: string, secret: string) => `${userId}.${secret}`;

/** 아이디·비밀번호가 있는 계정의 세션 토큰을 발급한다 (DB의 토큰 해시를 맞춰 둔다). */
export async function issueLoginToken(p: { id: string; access_token_hash: string; password_hash: string }) {
  const { loginSecret } = await import("./password");
  const secret = loginSecret(p.id, p.password_hash);
  const hash = hashSecret(secret);
  if (p.access_token_hash !== hash) await db().from("profiles").update({ access_token_hash: hash }).eq("id", p.id);
  return makeToken(p.id, secret);
}

export class AuthError extends Error {
  status = 401;
}

/** Authorization: Bearer <token>을 검증하고 본인 프로필을 돌려준다. */
export async function requireUser(req: Request): Promise<ProfileRow> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const dot = token.indexOf(".");
  if (dot <= 0) throw new AuthError("로그인이 필요해요.");
  const userId = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !secret) throw new AuthError("로그인이 필요해요.");

  const { data } = await db().from("profiles").select("*").eq("id", userId).maybeSingle<ProfileRow>();
  if (!data) throw new AuthError("등록 정보를 찾을 수 없어요.");
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(data.access_token_hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AuthError("로그인 정보가 올바르지 않아요.");
  return data;
}
