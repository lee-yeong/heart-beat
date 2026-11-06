// 전체 흐름 테스트 (실제 AI 호출, 시드 15명 필요).
// 사용: node scripts/tests/flow-test.mjs <DEMO_ACCESS_SECRET>
// 다른 서버: BASE_URL=https://xxx.vercel.app node scripts/tests/flow-test.mjs <secret>
// 주의: 테스트 계정·강의실이 DB에 남는다. 끝나면 /demo의 "시연 데이터 초기화"로 정리.
const base = process.env.BASE_URL || "http://localhost:3000";
const secret = process.argv[2];
let pass = 0, fail = 0;
const ok = (cond, label, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "✅" : "❌"} ${label}${extra ? "  — " + extra : ""}`); };

async function call(method, p, body, token) {
  const res = await fetch(base + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ...data };
}
const t0 = () => Date.now();
const secs = (s) => ((Date.now() - s) / 1000).toFixed(1) + "s";

// 1) 새 사용자 C 등록
let s = t0();
const c = await call("POST", "/api/profiles", {
  nickname: "테스트C", year: 2, department_id: "dept-001", mbti: "INFJ", blood_type: "A",
  traits: ["섬세함", "호기심 많음", "경청을 잘함"], music_genres: ["인디", "재즈"], favorite_music: "검정치마",
  login_id: `flow_${Date.now().toString(36)}`, password: "flowtest123",
});
const C = c.session.token;
ok(c.profile?.ai_analysis_source === "ai", "C 등록 + AI 학사 분석", secs(s));

// 2) 추천
s = t0();
let rec = await call("POST", "/api/recommendations", {}, C);
ok(rec.items?.length === 3 && rec.source === "ai", "AI 추천 3명", `${secs(s)} · ${rec.items?.map((i) => i.candidate.nickname).join(", ")}`);
ok(rec.demo_mode === true, "demo_mode 플래그");
const target = rec.items.find((i) => i.candidate.is_seed);
const other = rec.items.find((i) => i.candidate.is_seed && i.candidate.id !== target.candidate.id);

// 3) 한마디 추천
s = t0();
const sug = await call("POST", "/api/requests/suggest", { receiver_id: target.candidate.id }, C);
ok(sug.suggestions?.length === 3 && sug.source === "ai", "AI 한마디 추천 3개", `${secs(s)} · ${sug.suggestions?.[0]}`);

// 연락처가 든 한마디는 거부
const bad = await call("POST", "/api/requests", { receiver_id: target.candidate.id, message: "인스타 @test_1234 로 연락줘요" }, C);
ok(bad.status === 400 && bad.code === "contact_locked", "한마디에 연락처 → 거부");

// 4) 한마디와 함께 수강신청
const req = await call("POST", "/api/requests", { receiver_id: target.candidate.id, message: sug.suggestions[0] }, C);
ok(req.status === 200, "한마디와 함께 수강신청", target.candidate.nickname);

// 5) 시드 S로 시연 로그인
const wrong = await call("POST", "/api/demo/session", { secret: "wrong" });
ok(wrong.status === 403, "틀린 비밀코드 → 거부");
const notSeed = await call("POST", "/api/demo/session", { secret, profile_id: c.session.userId });
ok(notSeed.status === 404, "실제 가입자로 시연 로그인 → 거부");
const sd = await call("POST", "/api/demo/session", { secret, profile_id: target.candidate.id });
const S = sd.session?.token;
ok(!!S, "시드 계정 시연 로그인");
const sd2 = await call("POST", "/api/demo/session", { secret, profile_id: target.candidate.id });
ok(sd2.session?.token === S, "같은 시드는 같은 토큰 (기기 2대 동시 사용 가능)");

// 6) S가 받은 요청 확인
const sReq = await call("GET", "/api/requests", null, S);
const incoming = sReq.received?.find((r) => r.other.id === c.session.userId);
ok(incoming?.message === sug.suggestions[0], "받는 사람에게 한마디 표시");
ok(!!incoming?.analysis?.headline, "받는 사람에게 AI 추천 근거 표시");

// 7) 승인 → 강의실
const acc = await call("POST", `/api/requests/${incoming.id}/respond`, { action: "accept" }, S);
const roomId = acc.room_id;
ok(!!roomId, "수강 승인 → 강의실 생성");
let msgs = await call("GET", `/api/rooms/${roomId}/messages`, null, C);
ok(msgs.messages?.[0]?.type === "ai" && msgs.messages[0].content.includes("3일"), "첫 메시지: AI 조교 3일 수강 기간 공지");
ok(msgs.messages?.[1]?.client_message_id === "intro", "두 번째 메시지: 수강신청 한마디");
ok(msgs.phase === "trial", "단계: 수강 기간");

// 8) 강의계획서 (두 기기 동시 요청)
s = t0();
const [y1, y2] = await Promise.all([call("POST", `/api/rooms/${roomId}/syllabus`, null, C), call("POST", `/api/rooms/${roomId}/syllabus`, null, S)]);
ok([y1.status, y2.status].sort().join() === "in_progress,ready", "강의계획서 동시 요청 → 한 번만 생성", `${secs(s)} · ${y1.status}/${y2.status}`);
let detail;
for (let i = 0; i < 20; i++) {
  detail = await call("GET", `/api/rooms/${roomId}`, null, C);
  if (detail.syllabus) break;
  await new Promise((r) => setTimeout(r, 1500));
}
const sy = detail.syllabus;
ok(!!sy && sy.source === "ai", "AI 강의계획서 생성", sy ? `「${sy.course.name}」 ${sy.course.professor} ${sy.course.day} ${sy.course.time} ${sy.course.building} — ${sy.subtitle}` : "없음");
ok(sy?.weeks?.length === 3 && sy?.ice_breakers?.length === 3, "3주 계획 + 질문 3개");
ok(!!sy && sy.final_exam.includes(`${sy.course.building} 1층 입구`), "만남 장소 = 실제 건물 1층 입구", sy?.final_exam);
msgs = await call("GET", `/api/rooms/${roomId}/messages`, null, C);
ok(msgs.messages.filter((m) => m.client_message_id === "ai-syllabus").length === 1, "AI 조교 강의계획서 메시지 1번만");

// 9) 연락처 차단
const phone = await call("POST", `/api/rooms/${roomId}/messages`, { content: "제 번호 010-1234-5678 이에요", client_message_id: "t1" }, C);
ok(phone.status === 400 && phone.code === "contact_locked", "수강 기간 중 전화번호 → 거부");
const insta = await call("POST", `/api/rooms/${roomId}/messages`, { content: "인스타 하세요?", client_message_id: "t2" }, C);
ok(insta.status === 400, "수강 기간 중 '인스타' → 거부");
const normal = await call("POST", `/api/rooms/${roomId}/messages`, { content: "안녕하세요! 강의계획서 재밌네요 ㅎㅎ", client_message_id: "t3" }, C);
ok(normal.status === 200, "일반 메시지 전송");

// 10) 대화 주제 추천
s = t0();
const tp = await call("POST", `/api/rooms/${roomId}/topics`, null, C);
ok(tp.questions?.length === 3 && tp.source === "ai", "AI 대화 주제 3개", `${secs(s)} · ${tp.questions?.[0]}`);
const tp2 = await call("POST", `/api/rooms/${roomId}/topics`, null, C);
ok(tp2.status === 429, "주제 추천 연타 → 잠시 후 다시");

// 11) 3일 경과(시연) → 계속 수강 → 연락처 허용
const early = await call("POST", `/api/rooms/${roomId}/decision`, { decision: "continue" }, C);
ok(early.status === 400, "수강 기간 중 계속 수강 → 아직 불가");
await call("POST", `/api/rooms/${roomId}/decision`, { decision: "skip_trial" }, C);
const d1 = await call("POST", `/api/rooms/${roomId}/decision`, { decision: "continue" }, C);
ok(d1.phase === "deciding", "C만 계속 수강 → 상대 대기");
const phone2 = await call("POST", `/api/rooms/${roomId}/messages`, { content: "010-1234-5678", client_message_id: "t4" }, C);
ok(phone2.status === 400, "한쪽만 선택했을 땐 여전히 연락처 거부");
const d2 = await call("POST", `/api/rooms/${roomId}/decision`, { decision: "continue" }, S);
ok(d2.phase === "confirmed", "둘 다 계속 수강 → 수강 확정");
const phone3 = await call("POST", `/api/rooms/${roomId}/messages`, { content: "제 인스타는 @test_cc 예요", client_message_id: "t5" }, C);
ok(phone3.status === 200, "수강 확정 후 연락처 공유 허용");

// 12) 수강 철회 → 재매칭 제안
await call("POST", `/api/rooms/${roomId}/decision`, { decision: "end" }, S);
const afterEnd = await call("POST", `/api/rooms/${roomId}/messages`, { content: "안녕", client_message_id: "t6" }, C);
ok(afterEnd.status === 403, "철회 후 메시지 전송 불가");
const nC = await call("GET", "/api/notifications", null, C);
ok(nC.rematch?.length === 1, "C에게 '매칭을 다시 시작할까요?' 알림", JSON.stringify(nC.rematch?.[0] ?? {}));

// 13) 반려 → 빈자리 채우기
const req2 = await call("POST", "/api/requests", { receiver_id: other.candidate.id }, C);
ok(req2.status === 200, "두 번째 후보에게 수강신청", other.candidate.nickname);
const td = await call("POST", "/api/demo/session", { secret, profile_id: other.candidate.id });
const T = td.session.token;
const tReq = (await call("GET", "/api/requests", null, T)).received.find((r) => r.other.id === c.session.userId);
await call("POST", `/api/requests/${tReq.id}/respond`, { action: "reject" }, T);
s = t0();
const refill = await call("POST", "/api/recommendations", { refill: true }, C);
ok(refill.added >= 1 && !refill.items.some((i) => i.candidate.id === other.candidate.id), "반려 후 빈자리 새 추천", `${secs(s)} · 추가 ${refill.added}명 · ${refill.items.map((i) => i.candidate.nickname).join(", ")}`);

// 14) 재매칭 수락 → 끝난 상대 제외
s = t0();
const rm = await call("POST", "/api/recommendations", { rematch: true }, C);
ok(rm.items?.length >= 1 && !rm.items.some((i) => i.candidate.id === target.candidate.id), "재매칭: 끝난 상대 제외", `${secs(s)} · ${rm.items?.map((i) => i.candidate.nickname).join(", ")}`);
const nC2 = await call("GET", "/api/notifications", null, C);
ok((nC2.rematch?.length ?? 0) === 0, "재매칭 후 제안 알림 사라짐");

// 15) AI 매칭 상담 → 선호 반영 추천
s = t0();
const cs = await call("POST", "/api/consult", { messages: [{ role: "user", content: "추천해준 사람들이 다 너무 활발해요. 조용하게 깊은 이야기 나눌 수 있는 사람이 좋아요." }] }, C);
ok(!!cs.reply && cs.source === "ai", "AI 상담 답변", `${secs(s)} · ${cs.reply?.slice(0, 60)}`);
ok(!!cs.preference_summary, "선호 정리", cs.preference_summary);
s = t0();
const pr = await call("POST", "/api/recommendations", { refresh: true, preference: cs.preference_summary }, C);
ok(pr.items?.length >= 1 && pr.source === "ai", "선호 반영 재추천", `${secs(s)} · ${pr.items?.map((i) => `${i.candidate.nickname}(${i.candidate.traits.join("/")})`).join(", ")}`);
const me = await call("GET", "/api/profiles/me", null, C);
ok(me.profile?.match_preference === cs.preference_summary, "선호는 본인 프로필에 저장");
const pub = pr.items?.[0]?.candidate;
ok(pub && !("match_preference" in pub), "다른 사람 프로필엔 상담 선호 미노출");

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
