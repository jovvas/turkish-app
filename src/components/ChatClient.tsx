"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import DictionarySheet from "@/components/DictionarySheet";
import GrammarSheet from "@/components/GrammarSheet";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "How does the -yor present tense work?",
  "Translate and break down: Yarın okula gidiyorum",
  "Let's practice a simple conversation",
  "Quiz me on numbers 1–10",
];

export default function ChatClient({
  books,
}: {
  books: { id: string; slug: string; title: string }[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDict, setShowDict] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "The tutor could not reply.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (!acc.trim()) {
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Sorry, I didn't catch that — try asking again.",
          };
          return copy;
        });
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
      // drop the empty assistant bubble we optimistically added
      setMessages((m) => {
        const copy = m.slice();
        if (
          copy.length &&
          copy[copy.length - 1].role === "assistant" &&
          !copy[copy.length - 1].content
        ) {
          copy.pop();
        }
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  function newChat() {
    if (streaming) return;
    if (messages.length > 0 && !confirm("Start a new chat? This clears the conversation."))
      return;
    setMessages([]);
    setError(null);
    setInput("");
  }

  const empty = messages.length === 0;

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
        {/* header */}
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
            onClick={newChat}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-ink/40 active:scale-95"
            aria-label="New chat"
            title="New chat"
          >
            🗑
          </button>
        </header>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {empty ? (
            <div className="mx-auto mt-6 max-w-md text-center">
              <div className="mb-3 text-4xl">💬</div>
              <h2 className="font-display text-lg font-semibold text-ink">
                Merhaba! How can I help you learn?
              </h2>
              <p className="mt-1 text-sm text-ink/50">
                Ask about grammar or words, practice a conversation, get a
                sentence broken down, or ask to be quizzed.
              </p>
              <div className="mt-5 space-y-2 text-left">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-left text-sm text-ink/80 shadow-card transition active:scale-[0.99]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {messages.map((m, i) => {
                const isUser = m.role === "user";
                const isLast = i === messages.length - 1;
                const thinking = !isUser && isLast && streaming && !m.content;
                return (
                  <li
                    key={i}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-card ${
                        isUser
                          ? "bg-brand text-white"
                          : "bg-white text-ink"
                      }`}
                    >
                      {thinking ? (
                        <span className="inline-flex gap-1 py-1 align-middle">
                          <Dot /> <Dot /> <Dot />
                        </span>
                      ) : (
                        m.content
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {error ? (
            <p className="mx-auto mt-4 max-w-md rounded-xl bg-red-50 px-4 py-2 text-center text-sm text-brand">
              {error}
            </p>
          ) : null}

          <div ref={bottomRef} />
        </div>

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex shrink-0 items-end gap-2 border-t border-sand bg-paper px-3 py-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask in English, Serbian or Turkish…"
            className="flex-1 rounded-2xl border border-sand bg-white px-4 py-2.5 outline-none focus:border-brand"
            enterKeyHint="send"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg text-white shadow-card active:scale-95 disabled:opacity-40"
            aria-label="Send"
          >
            ↑
          </button>
        </form>
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

function Dot() {
  return (
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-duration:0.9s]" />
  );
}
