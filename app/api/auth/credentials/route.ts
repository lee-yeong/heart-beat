import { issueLoginToken, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { checkCredentials, hashPassword, verifyPassword } from "@/lib/server/password";

export const runtime = "nodejs";

/**
 * 로그인 정보 설정·변경 (로그인한 본인만).
 * - 아직 비밀번호가 없는 계정: 아이디·비밀번호를 새로 만든다
 * - 이미 있는 계정: 현재 비밀번호를 확인한 뒤 바꾼다 → 다른 기기의 로그인은 끊긴다
 */
export const POST = handler(async (req: Request) => {
  const me = await requireUser(req);
  if (me.is_seed) throw new HttpError(403, "시연용 계정은 로그인 정보를 바꿀 수 없어요.");
  const body = await req.json().catch(() => ({}));
  const loginId = typeof body?.login_id === "string" ? body.login_id.trim().toLowerCase() : me.login_id;
  const password = body?.password;
  const problem = checkCredentials(loginId, password);
  if (problem) throw new HttpError(400, problem, "invalid_credentials");

  if (me.password_hash && !(await verifyPassword(String(body?.current_password ?? ""), me.password_hash)))
    throw new HttpError(403, "현재 비밀번호가 올바르지 않아요.", "bad_current_password");

  const password_hash = await hashPassword(password as string);
  const { error } = await db().from("profiles").update({ login_id: loginId, password_hash }).eq("id", me.id);
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "이미 사용 중인 아이디예요.", "login_id_taken");
    throw error;
  }
  const token = await issueLoginToken({ id: me.id, access_token_hash: me.access_token_hash, password_hash });
  return { session: { userId: me.id, token }, login_id: loginId };
});
