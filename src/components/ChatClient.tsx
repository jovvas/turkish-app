"use client";

import { useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import DictionarySheet from "@/components/DictionarySheet";
import GrammarSheet from "@/components/GrammarSheet";
import ChatPanel, { type ChatPanelHandle } from "@/components/ChatPanel";

export default function ChatClient({
  books,
}: {
  books: { id: string; slug: string; title: string }[];
}) {
  const [showDict, setShowDict] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const panelRef = useRef<ChatPanelHandle>(null);

  return (
    <>
      <main
        className="mx-auto flex max-w-2xl flex-col"
        style={{
          height: "100dvh",
          paddingTop: "var(--safe-top)",
          paddingBottom: "calc(var(--safe-bottom) + 58px)",
        }}
      >
        <header className="flex shrink-0 items-center gap-1 border-b border-sand bg-paper/95 px-4 py-3 backdrop-blur">
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold leading-tight text-ink">
              Tutor
            </h1>
            <p className="text-xs text-ink/40">Ask anything about Turkish</p>
          </div>
          <button
            onClick={() => setShowDict(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg active:scale-95"
            aria-label="Words"
            title="Search / add a word"
          >
            📖
          </button>
          <button
            onClick={() => setShowGrammar(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg active:scale-95"
            aria-label="Grammar"
            title="Search / add a grammar topic"
          >
            📝
          </button>
          <button
            onClick={() => panelRef.current?.newChat()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-ink/40 active:scale-95"
            aria-label="New chat"
            title="New chat"
          >
            🗑
          </button>
        </header>

        <ChatPanel ref={panelRef} />
      </main>

      <BottomNav />

      <DictionarySheet
        open={showDict}
        onClose={() => setShowDict(false)}
        books={books}
      />

      <GrammarSheet
        open={showGrammar}
        onClose={() => setShowGrammar(false)}
        books={books}
      />
    </>
  );
}
