import { generate } from "@/lib/server/ai";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { handler, HttpError } from "@/lib/server/http";
import { toAiProfile, type ProfileRow } from "@/lib/server/profiles";
import { TOPICS_SYSTEM, wrapProfile } from "@/lib/server/prompts";
import { getRoomForUser, otherId } from "@/lib/server/relations";
import { QuestionsSchema } from "@/lib/server/schemas";
import { toSyllabusView } from "@/lib/server/syllabus";

export const runtime = "nodejs";
export const maxDuration = 60;

// 같은 사람이 너무 자주 누르지 않도록 (서버 인스턴스 메모리 기준, 5초)
const lastCall = new Map<string, number>();

/** AI 조교 대화 주제 추천: 버튼을 눌렀을 때만, 두 프로필과 최근 대화를 참고해 질문 3개 */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireUser(req);
  const { id } = await ctx.params;
  const room = await getRoomForUser(id, me.id);
  if (!room) throw new HttpError(404, "강의실을 찾을 수 없어요.");
  const key = `${room.id}:${me.id}`;
  if (Date.now() - (lastCall.get(key) ?? 0) < 5000) throw new HttpError(429, "잠시 후 다시 눌러 주세요.");
  lastCall.set(key, Date.now());

  const [{ data: other }, { data: recent }] = await Promise.all([
    db().from("profiles").select("*").eq("id", otherId(room, me.id)).single<ProfileRow>(),
    db().from("messages").select("sender_id, type, content").eq("room_id", room.id).eq("type", "user").order("created_at", { ascending: false }).limit(20),
  ]);
  if (!other) throw new HttpError(404, "상대를 찾을 수 없어요.");
  const syllabus = toSyllabusView(room.syllabus);
  const history = (recent ?? []).reverse().map((m) => ({ from: m.sender_id === me.id ? "me" : "other", text: m.content.slice(0, 200) }));

  const result = await generate({
    name: "topics",
    system: TOPICS_SYSTEM,
    user: [
      wrapProfile("me", toAiProfile(me)),
      wrapProfile("other", toAiProfile(other)),
      syllabus ? `<syllabus>${syllabus.course.name} — ${syllabus.subtitle}</syllabus>` : "",
      `<recent_messages>\n${JSON.stringify(history)}\n</recent_messages>`,
      "질문 3개를 제안해 주세요.",
    ].join("\n"),
    schema: QuestionsSchema,
    maxTokens: 3000,
    validate: (v) => (v.questions.length === 3 && v.questions.every((q) => q.trim().length > 0 && q.length <= 80) ? null : "질문은 정확히 3개, 각 80자 이내"),
  });
  if (result) return { questions: result.questions, source: "ai" };
  return {
    questions: [
      `${other.department_name}에서는 요즘 어떤 걸 배우고 있어요?`,
      "요즘 제일 자주 듣는 노래가 뭐예요?",
      syllabus ? `「${syllabus.course.name}」 수업이 실제로 있다면 들어볼 생각 있어요?` : "학교에서 제일 좋아하는 장소가 어디예요?",
    ],
    source: "fallback",
  };
});
