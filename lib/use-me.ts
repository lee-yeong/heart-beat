"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, loadSession } from "./api-client";
import type { PublicProfile } from "./types";

/** 본인 프로필 (+ 본인만 보는 AI 상담 선호) */
export type Me = PublicProfile & { match_preference: string | null; login_id: string | null; has_password: boolean };

/** 로그인한 본인 프로필. 세션이 없거나 만료되면 학적 등록으로 보낸다. */
export function useMe() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/register");
      return;
    }
    api<{ profile: Me }>("/api/profiles/me")
      .then((r) => setMe(r.profile))
      .catch((e) => {
        if (e?.status === 401) router.replace("/register");
        else setError(e?.message ?? "불러오지 못했어요.");
      });
  }, [router]);

  return { me, setMe, error };
}
