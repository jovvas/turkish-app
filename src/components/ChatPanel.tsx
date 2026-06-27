"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  clearChat,
  getServerSnapshot,
  getSnapshot,
  setChat,
  subscribe,
  type ChatMsg as Msg,
} from "@/lib/chatStore";

export type ChatPanelHandle = {
  newChat: () => void;
  hasMessages: () => boolean;
};

const SUGGESTIONS = [
  "How does the -yor present tense work?",
  "Translate and break down: Yarın okula gidiyorum",
  "Let's practice a simple conversation",
  "Quiz me on numbers 1–10",
];

// The conversation core — message list + input + streaming. Rendered as the
// flex children of a column, so it works both as a full page (Tutor tab) and
// inside a bottom sheet (from the reader). The host controls "new chat" via ref.
const ChatPanel = forwardRef<ChatPanelHandle, {}>(function ChatPanel(_props, ref) {
  const messages = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function newChat() {
    if (streaming) return;
    if (
      messages.length > 0 &&
      !confirm("Start a new chat? This clears the conversation.")
    )
      return;
    clearChat();
    setError(null);
    setInput("");
  }

  useImperativeHandle(
    ref,
    () => ({ newChat, hasMessages: () => messages.length > 0 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages.length, streaming]
  );

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    const next: Msg[] = [...messages, { role: "user", content }];
    setChat([...next, { role: "assistant", content: "" }]);
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
        setChat((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (!acc.trim()) {
        setChat((m) => {
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
      setChat((m) => {
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

  const empty = messages.length === 0;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {empty ? (
          <div className="mx-auto mt-4 max-w-md text-center">
            <div className="mb-3 text-4xl">💬</div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Merhaba! How can I help you learn?
            </h2>
            <p className="mt-1 text-sm text-ink/50">
              Ask about grammar or words, practice a conversation, get a sentence
              broken down, or ask to be quizzed.
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
                      isUser ? "bg-brand text-white" : "bg-white text-ink"
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
    </>
  );
});

export default ChatPanel;

function Dot() {
  return (
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-duration:0.9s]" />
  );
}
