"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** 시연용: 후보 계정으로 로그인하는 링크와 QR (QR에는 후보 ID만 담고 토큰은 넣지 않는다) */
export function DemoQR({ profileId, nickname }: { profileId: string; nickname: string }) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const link = `${window.location.origin}/demo?as=${profileId}`;
    setUrl(link);
    QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#2b2b2b", light: "#ffffff" } }).then(setSvg);
  }, [open, profileId]);

  return (
    <div className="mt-3 rounded-xl border border-dashed border-line px-3 py-2 text-xs text-ink-soft">
      <button type="button" onClick={() => setOpen((v) => !v)} className="font-semibold underline underline-offset-2">
        🧪 시연용 · {nickname}(으)로 로그인 QR {open ? "닫기" : "보기"}
      </button>
      {open && (
        <div className="mt-2 flex items-center gap-3">
          {svg ? <div className="h-28 w-28 shrink-0" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="h-28 w-28" />}
          <p className="break-all">
            다른 휴대폰으로 찍으면 이 후보 계정으로 들어가 수강신청을 받을 수 있어요. (시연 비밀코드 필요)
            <br />
            <span className="text-[11px]">{url}</span>
          </p>
        </div>
      )}
    </div>
  );
}
