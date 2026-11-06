import "server-only";
import type { AiSource, Course, SyllabusContent, SyllabusView } from "@/lib/types";
import { josa } from "@/lib/josa";
import { generate } from "./ai";
import { findCourse, meetingSpot, pickCourseCandidates, SEMESTER } from "./courses";
import { db } from "./db";
import { toAiProfile, type ProfileRow } from "./profiles";
import { SYLLABUS_SYSTEM, wrapProfile } from "./prompts";
import type { RoomRow } from "./relations";
import { SyllabusSchema } from "./schemas";

type Stored = SyllabusContent & { source: AiSource };

export function toSyllabusView(stored: unknown): SyllabusView | null {
  const s = stored as Stored | null;
  if (!s?.course_id) return null;
  const course = findCourse(s.course_id);
  if (!course) return null;
  return { ...s, course, semester: SEMESTER };
}

function fallbackSyllabus(a: ProfileRow, b: ProfileRow, course: Course): SyllabusContent {
  const spot = meetingSpot(course);
  return {
    course_id: course.id,
    subtitle: `${a.department_name} × ${b.department_name} 특강`,
    reason: `${josa(a.department_name, "과", "와")} ${b.department_name}, 서로 다른 시선으로 함께 이야기하기 좋은 과목이에요.`,
    weeks: [
      { week: 1, topic: "서로의 전공 수업 하나씩 소개하기" },
      { week: 2, topic: `요즘 자주 듣는 ${a.music_genres[0] ?? "음악"} 한 곡씩 공유하기` },
      { week: 3, topic: "이 과목을 들으면 뭘 배울지 상상해 보기" },
    ],
    midterm: "서로의 전공에서 제일 신기했던 사실 하나씩 보내기",
    final_exam: `수업이 없는 시간에 ${spot}에서 만나 30분 동안 캠퍼스 한 바퀴 산책하기. 시간은 두 분이 정해 보세요.`,
    ice_breakers: [
      `${b.department_name}에서는 요즘 어떤 수업이 제일 재밌어요?`,
      "이 과목이 실제로 열린다면 같이 들어볼 생각 있어요?",
      "학교에서 제일 좋아하는 장소가 어디예요?",
    ],
  };
}

function validate(v: SyllabusContent, candidates: Course[]): string | null {
  const course = candidates.find((c) => c.id === v.course_id);
  if (!course) return `course_id ${v.course_id}는 후보에 없음`;
  if (v.weeks.length !== 3) return "weeks는 정확히 3개";
  if (v.ice_breakers.length !== 3) return "ice_breakers는 정확히 3개";
  if (!v.final_exam.includes(meetingSpot(course))) return `final_exam에 장소 "${meetingSpot(course)}"를 글자 그대로 넣어야 함`;
  if (/\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\s*시\s*\d{0,2}\s*분?에/.test(v.final_exam)) return "final_exam에 구체적인 날짜·시간을 정하면 안 됨";
  return null;
}

/**
 * 강의계획서 생성. 두 기기가 동시에 요청해도 한 번만 만들도록 선점(claim)한다.
 * 선점에 실패하면 null (다른 요청이 만드는 중) → 클라이언트가 잠시 뒤 다시 조회.
 */
export async function ensureSyllabus(room: RoomRow): Promise<"ready" | "in_progress"> {
  if (room.syllabus_status === "ready" && room.syllabus) return "ready";

  const staleBefore = new Date(Date.now() - 60_000).toISOString();
  const { data: claimed, error } = await db()
    .from("rooms")
    .update({ syllabus_claimed_at: new Date().toISOString(), syllabus_status: "pending" })
    .eq("id", room.id)
    .neq("syllabus_status", "ready")
    .or(`syllabus_claimed_at.is.null,syllabus_claimed_at.lt.${staleBefore}`)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!claimed) return "in_progress";

  const { data: people, error: pErr } = await db().from("profiles").select("*").in("id", [room.user_a_id, room.user_b_id]);
  if (pErr) throw pErr;
  const a = (people as ProfileRow[]).find((p) => p.id === room.user_a_id)!;
  const b = (people as ProfileRow[]).find((p) => p.id === room.user_b_id)!;
  const candidates = pickCourseCandidates(a, b);

  const result = await generate({
    name: "syllabus",
    system: SYLLABUS_SYSTEM,
    user: [
      "두 학생과 이번 학기 실제 개설 교양 후보입니다.",
      wrapProfile("a", toAiProfile(a)),
      wrapProfile("b", toAiProfile(b)),
      `<courses>\n${JSON.stringify(
        candidates.map((c) => ({ id: c.id, name: c.name, category: c.category, day: c.day, time: c.time, building: c.building, meeting_spot: meetingSpot(c) })),
        null,
        1,
      )}\n</courses>`,
    ].join("\n"),
    schema: SyllabusSchema,
    maxTokens: 6000,
    validate: (v) => validate(v, candidates),
  });

  const content: Stored = result
    ? { ...result, weeks: result.weeks.map((w, i) => ({ week: i + 1, topic: w.topic })), source: "ai" }
    : { ...fallbackSyllabus(a, b, candidates[0]), source: "fallback" };
  const course = findCourse(content.course_id)!;

  const { error: saveErr } = await db()
    .from("rooms")
    .update({ syllabus: content, course_id: content.course_id, syllabus_status: "ready" })
    .eq("id", room.id);
  if (saveErr) throw saveErr;

  // AI 조교가 강의계획서와 첫 질문을 보낸다 (방마다 한 번)
  await db()
    .from("messages")
    .upsert(
      {
        room_id: room.id,
        sender_id: null,
        type: "ai",
        client_message_id: "ai-syllabus",
        content: `📖 우리의 강의계획서가 나왔어요!\n「${course.name}」 — ${content.subtitle}\n\n첫 질문으로 이건 어때요?\n“${content.ice_breakers[0]}”`,
      },
      { onConflict: "room_id,client_message_id", ignoreDuplicates: true },
    );
  return "ready";
}
