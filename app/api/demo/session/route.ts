import { hashSecret, makeToken } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { requireDemo, seedSecret } from "@/lib/server/demo";
import { handler, HttpError } from "@/lib/server/http";
import { toPublic, type ProfileRow } from "@/lib/server/profiles";

export const runtime = "nodejs";

/**
 * 시연용 로그인.
 * - profile_id 없이: 시드 계정 목록
 * - profile_id 있으면: 해당 시드 계정의 세션 발급 (가상 시드 계정만, 실제 가입자는 불가)
 */
export const POST = handler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  requireDemo(body?.secret);

  if (!body?.profile_id) {
    const { data, error } = await db().from("profiles").select("*").eq("is_seed", true).order("created_at");
    if (error) throw error;
    return { profiles: (data as ProfileRow[]).map(toPublic) };
  }

  const id = String(body.profile_id);
  const { data: p } = await db().from("profiles").select("*").eq("id", id).eq("is_seed", true).maybeSingle<ProfileRow>();
  if (!p) throw new HttpError(404, "시연용 계정만 선택할 수 있어요.");
  const secret = seedSecret(p.id);
  const hash = hashSecret(secret);
  if (p.access_token_hash !== hash) await db().from("profiles").update({ access_token_hash: hash }).eq("id", p.id);
  return { profile: toPublic(p), session: { userId: p.id, token: makeToken(p.id, secret) } };
});
