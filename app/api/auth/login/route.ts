import { issueLoginToken } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/password";
import { toPublic, type ProfileRow } from "@/lib/server/profiles";

export const runtime = "nodejs";

/** 아이디·비밀번호 로그인 */
export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const loginId = typeof body?.login_id === "string" ? body.login_id.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const fail = new HttpError(401, "아이디 또는 비밀번호가 올바르지 않아요.", "bad_credentials");
  if (!loginId || !password) throw fail;

  const { data: p } = await db().from("profiles").select("*").eq("login_id", loginId).maybeSingle<ProfileRow>();
  if (!p || !p.password_hash || !(await verifyPassword(password, p.password_hash))) throw fail;

  const token = await issueLoginToken({ id: p.id, access_token_hash: p.access_token_hash, password_hash: p.password_hash });
  return { profile: toPublic(p), session: { userId: p.id, token } };
});
