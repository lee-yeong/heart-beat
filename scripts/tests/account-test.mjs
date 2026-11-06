// 계정 기능 테스트: 가입 → 중복 아이디 → 로그인 → 학생증 수정 → 비밀번호 변경 → 탈퇴 (끝나면 테스트 계정은 스스로 탈퇴)
// 사용: node scripts/tests/account-test.mjs   (다른 서버: BASE_URL=https://xxx.vercel.app)
const base = process.env.BASE_URL || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (c, label, extra = "") => { c ? pass++ : fail++; console.log(`${c ? "✅" : "❌"} ${label}${extra ? "  — " + extra : ""}`); };
async function call(method, p, body, token) {
  const res = await fetch(base + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
}
const id = `tester_${Date.now().toString(36)}`;
const profile = { nickname: "계정테스트", year: 3, department_id: "dept-005", mbti: "ENFP", blood_type: "B", traits: ["활발함", "솔직함", "즉흥적"], music_genres: ["힙합"], favorite_music: null };

// 가입 검증
ok((await call("POST", "/api/profiles", { ...profile, login_id: "AB", password: "123456" })).status === 400, "잘못된 아이디 형식 → 거부");
ok((await call("POST", "/api/profiles", { ...profile, login_id: id, password: "123" })).status === 400, "짧은 비밀번호 → 거부");
const su = await call("POST", "/api/profiles", { ...profile, login_id: id, password: "pass1234" });
ok(su.status === 200 && !!su.session?.token, "회원가입", id);
const t1 = su.session.token;
ok(!("password_hash" in su.profile) && !("login_id" in su.profile), "가입 응답에 비밀번호 해시 없음");
ok((await call("POST", "/api/profiles", { ...profile, login_id: id, password: "pass1234" })).status === 409, "같은 아이디로 가입 → 409");

// 로그인
ok((await call("POST", "/api/auth/login", { login_id: id, password: "wrong!!" })).status === 401, "틀린 비밀번호 → 401");
ok((await call("POST", "/api/auth/login", { login_id: "nobody_xyz", password: "pass1234" })).status === 401, "없는 아이디 → 401 (같은 안내)");
const li = await call("POST", "/api/auth/login", { login_id: id.toUpperCase(), password: "pass1234" });
ok(li.status === 200 && li.session.token === t1, "로그인 (대문자 입력도 OK) → 가입 때와 같은 토큰 (기기 여러 대 동시 로그인)");
const me = await call("GET", "/api/profiles/me", null, t1);
ok(me.profile?.login_id === id && me.profile?.has_password === true && !("password_hash" in me.profile), "내 정보: 아이디 표시, 해시 비노출");

// 학생증 수정
const s = Date.now();
const ed = await call("PATCH", "/api/profiles/me", { ...profile, nickname: "수정된닉", department_id: "dept-038", traits: ["차분함", "섬세함", "경청을 잘함"], music_genres: ["재즈", "클래식"], favorite_music: "쳇 베이커" }, t1);
ok(ed.status === 200 && ed.profile.nickname === "수정된닉" && ed.profile.department_name === "디자인학부", "학생증 수정", `${((Date.now() - s) / 1000).toFixed(1)}s`);
ok(ed.profile.ai_analysis_source === "ai", "수정 후 AI 학사 분석 다시", ed.profile.ai_analysis?.summary);
ok((await call("PATCH", "/api/profiles/me", { ...profile, traits: ["활발함"] }, t1)).status === 400, "잘못된 수정(특징 1개) → 거부");

// 비밀번호 변경 → 기존 토큰 무효화
ok((await call("POST", "/api/auth/credentials", { password: "newpass99", current_password: "wrong" }, t1)).status === 403, "현재 비밀번호 틀림 → 변경 거부");
const ch = await call("POST", "/api/auth/credentials", { password: "newpass99", current_password: "pass1234" }, t1);
ok(ch.status === 200 && ch.session.token !== t1, "비밀번호 변경 → 새 토큰");
ok((await call("GET", "/api/profiles/me", null, t1)).status === 401, "옛 토큰(다른 기기) → 로그아웃됨");
ok((await call("POST", "/api/auth/login", { login_id: id, password: "pass1234" })).status === 401, "옛 비밀번호로 로그인 → 거부");
const li2 = await call("POST", "/api/auth/login", { login_id: id, password: "newpass99" });
ok(li2.status === 200, "새 비밀번호로 로그인");
const t2 = li2.session.token;

// 탈퇴
ok((await call("DELETE", "/api/profiles/me", { confirm: "틀린닉" }, t2)).status === 400, "닉네임 확인 틀림 → 탈퇴 거부");
ok((await call("DELETE", "/api/profiles/me", { confirm: "수정된닉" }, t2)).status === 200, "회원탈퇴");
ok((await call("GET", "/api/profiles/me", null, t2)).status === 401, "탈퇴 후 토큰 무효");
ok((await call("POST", "/api/auth/login", { login_id: id, password: "newpass99" })).status === 401, "탈퇴 후 로그인 불가");

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
