import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** 비밀번호 해시: "scrypt$<salt>$<hash>" (원문은 저장하지 않는다) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

/**
 * 아이디로 로그인한 사용자의 세션 비밀값.
 * 비밀번호 해시가 바뀌면(비밀번호 변경) 값도 바뀌어서 다른 기기의 세션이 끊긴다.
 * 같은 계정으로 여러 기기에서 로그인하면 같은 값을 받는다.
 */
export function loginSecret(userId: string, passwordHash: string) {
  const key = process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHmac("sha256", key).update(`login:${userId}:${passwordHash}`).digest("base64url");
}

export const LOGIN_ID_RE = /^[a-z0-9_]{4,20}$/;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 64;

export function checkCredentials(loginId: unknown, password: unknown): string | null {
  if (typeof loginId !== "string" || !LOGIN_ID_RE.test(loginId)) return "아이디는 영문 소문자·숫자·밑줄(_) 4~20자로 만들어 주세요.";
  if (typeof password !== "string" || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 만들어 주세요.`;
  return null;
}
