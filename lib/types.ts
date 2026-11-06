// 팀 공통 타입. 바꿀 때는 팀에 먼저 알린다.

export type Department = { id: string; name: string; college: string };

export type Course = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  professor: string | null;
  day: string | null;
  time: string | null;
  building: string | null;
  room: string | null;
  credits: number | null;
  online: boolean;
};

export type ProfileInput = {
  nickname: string;
  year: number;
  department_id: string;
  mbti: string; // MBTI 16종 또는 "잘 몰라요"
  blood_type: string; // A/B/O/AB/비공개
  traits: string[];
  music_genres: string[];
  favorite_music: string | null;
};

export type AcademicAnalysis = {
  summary: string;
  major_lens: string;
  personal_traits: string[];
  conversation_style: string;
};

export type AiSource = "ai" | "fallback";

/** 다른 사용자에게 보여도 되는 프로필 */
export type PublicProfile = {
  id: string;
  nickname: string;
  year: number;
  department_id: string;
  department_name: string;
  college: string;
  mbti: string;
  blood_type: string;
  traits: string[];
  music_genres: string[];
  favorite_music: string | null;
  ai_analysis: AcademicAnalysis | null;
  ai_analysis_source: AiSource | null;
  is_seed: boolean;
};

export type MatchAnalysis = {
  candidate_id: string;
  headline: string;
  major_synergy: string;
  common_points: string[];
  complementary_points: string[];
  difference_note: string;
  first_topic: string;
  evidence_keywords: string[];
};

export type RequestStatus = "pending" | "accepted" | "rejected";

export type RecommendationItem = {
  rank: number;
  candidate: PublicProfile;
  analysis: MatchAnalysis;
  /** 이 후보에게 보낸 수강신청 상태 (없으면 null) */
  request: { id: string; status: RequestStatus; room_id: string | null } | null;
};

export type RecommendationsResponse = {
  generated: boolean;
  source: AiSource | null;
  generated_at: string | null;
  items: RecommendationItem[];
  /** 승인 대기 중인 내 보낸 요청 (있으면 다른 후보 신청 불가) */
  pending_request: { id: string; receiver_id: string } | null;
};

export type RequestView = {
  id: string;
  status: RequestStatus;
  created_at: string;
  responded_at: string | null;
  analysis: MatchAnalysis | null;
  other: PublicProfile;
  room_id: string | null;
};

export type RequestsResponse = { sent: RequestView[]; received: RequestView[] };

export type NotificationsResponse = {
  badge: number;
  pending_received: number;
  unseen_results: number;
  unread_rooms: number;
};

export type RoomSummary = {
  id: string;
  other: PublicProfile;
  last_message: { content: string; created_at: string; type: "user" | "ai" } | null;
  unread: number;
  created_at: string;
};

export type RoomDetail = {
  id: string;
  other: PublicProfile;
  me_id: string;
  course_id: string | null;
  syllabus: unknown;
  syllabus_status: "pending" | "ready" | "failed";
  blocked: boolean;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  sender_id: string | null;
  type: "user" | "ai";
  content: string;
  created_at: string;
  client_message_id: string | null;
};

export type MessagesResponse = { messages: ChatMessage[]; other_last_read_at: string; blocked: boolean };

export type Session = { userId: string; token: string };
