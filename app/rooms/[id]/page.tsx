"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ChatView } from "@/components/ChatView";

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell bare>
      <div className="h-dvh">
        <ChatView roomId={id} />
      </div>
    </AppShell>
  );
}
