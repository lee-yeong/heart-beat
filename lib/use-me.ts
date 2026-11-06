"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, loadSession } from "./api-client";
import type { PublicProfile } from "./types";

/** 로그인한 본인 프로필. 세션이 없거나 만료되면 학적 등록으로 보낸다. */
export function useMe() {
  const router = useRouter();
  const [me, setMe] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadSession()) {
      router.replace("/register");
      return;
    }
    api<{ profile: PublicProfile }>("/api/profiles/me")
      .then((r) => setMe(r.profile))
      .catch((e) => {
        if (e?.status === 401) router.replace("/register");
        else setError(e?.message ?? "불러오지 못했어요.");
      });
  }, [router]);

  return { me, error };
}
