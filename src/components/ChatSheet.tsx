"use client";

import { useRef } from "react";
import ChatPanel, { type ChatPanelHandle } from "@/components/ChatPanel";

// The Tutor as a bottom sheet, so it can be opened from inside the reader
// without leaving the book. Shares the exact same chat as the Tutor tab.
export default function ChatSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<ChatPanelHandle>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end fade-in">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        className="sheet-in relative flex h-[85dvh] flex-col rounded-t-3xl bg-paper"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-sand" />

        <header className="flex shrink-0 items-center gap-1 px-4 py-2">
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold leading-tight text-ink">
              Tutor
            </h3>
            <p className="text-xs text-ink/40">Ask anything about Turkish</p>
          </div>
          <button
            onClick={() => panelRef.current?.newChat()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-ink/40 active:scale-95"
            aria-label="New chat"
            title="New chat"
          >
            🗑
          </button>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-ink/40 active:scale-95"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <ChatPanel ref={panelRef} />
      </div>
    </div>
  );
}
